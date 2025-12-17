import { Page } from 'playwright';
import { Property, PropertyData, MoveInBreakdown } from '../common';

export class SuumoScraper {
    private parseMoveInDates(html: string): MoveInBreakdown {
        const breakdown: MoveInBreakdown = {};
        const tdRegex = /<td[^>]*>(.*?)<\/td>/gi;
        let match;

        while ((match = tdRegex.exec(html)) !== null) {
            let text = match[1].replace(/<[^>]+>/g, '').trim();
            text = text.replace(/\s+/g, '');

            if (['即入居可', '即'].includes(text)) {
                breakdown['即入居可'] = (breakdown['即入居可'] || 0) + 1;
            } else if (text === '相談') {
                breakdown['相談'] = (breakdown['相談'] || 0) + 1;
            } else {
                // 例: '24年3月', '24年3月上旬'
                const dateMatch = text.match(/^'?(\d{2})年(\d{1,2})月([上中下]旬)?$/);
                if (dateMatch) {
                    const [, year, month, period] = dateMatch;
                    const key = period ? `${year}年${month}月${period}` : `${year}年${month}月`;
                    breakdown[key] = (breakdown[key] || 0) + 1;
                }
            }
        }
        return breakdown;
    }

    public async fetchPropertyData(page: Page, propertyInfo: Property, retryCount: number = 0): Promise<PropertyData> {
        console.log(`取得中: ${propertyInfo.name}`);

        try {
            await page.goto(propertyInfo.url, { waitUntil: 'domcontentloaded', timeout: 60000 });

            try {
                await page.waitForSelector('.property_view_note-list, span.fgOrange.bld', { timeout: 10000 });
            } catch (e) {
                // 要素が見つからなくても、ページ自体はロードされているので続行
            }

            // 物件数を取得
            let count = 0;
            try {
                const countElem = await page.$('span.fgOrange.bld');
                if (countElem) {
                    const countText = await countElem.innerText();
                    count = parseInt(countText.trim(), 10);
                }
            } catch (e) {
                // 無視
            }

            // 「もっと見る」を全て展開
            const clickedButtons = new Set<string>();
            while (clickedButtons.size < 20) {
                await page.waitForTimeout(500);

                const moreButtons = await page.$$('a:has-text("もっと見る")');
                let clicked = false;

                for (const btn of moreButtons) {
                    if (await btn.isVisible()) {
                        const box = await btn.boundingBox();
                        if (box) {
                            const btnId = `${Math.round(box.x)},${Math.round(box.y)}`;
                            if (!clickedButtons.has(btnId)) {
                                try {
                                    await btn.scrollIntoViewIfNeeded();
                                    await btn.click();
                                    clickedButtons.add(btnId);
                                    clicked = true;
                                    await page.waitForTimeout(1000); // クリック後のロード待ち
                                    break;
                                } catch (e) {
                                    continue;
                                }
                            }
                        }
                    }
                }

                if (!clicked) {
                    break;
                }
            }

            // 最終的なレンダリングを少し待つ
            await page.waitForTimeout(1000);
            const html = await page.content();
            const moveInBreakdown = this.parseMoveInDates(html);

            const totalMoveIn = Object.values(moveInBreakdown).reduce((a, b) => a + b, 0);
            console.log(`  物件数: ${count}, 入居時期データ: ${totalMoveIn}`);

            // 物件数が0件で、まだ再試行していない場合は再取得
            if (count === 0 && retryCount === 0) {
                console.log(`  0件のため再試行します（5秒待機後）`);
                await page.waitForTimeout(5000);
                return await this.fetchPropertyData(page, propertyInfo, 1);
            }

            return {
                id: propertyInfo.id,
                name: propertyInfo.name,
                url: propertyInfo.url,
                count: count,
                moveInBreakdown: moveInBreakdown,
                success: true
            };

        } catch (e) {
            console.error(`  エラー: ${e}`);
            return {
                id: propertyInfo.id,
                name: propertyInfo.name,
                url: propertyInfo.url,
                count: 0,
                moveInBreakdown: {},
                success: false,
                error: String(e)
            };
        }
    }
}
