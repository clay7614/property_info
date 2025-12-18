import { chromium, Page } from 'playwright';
import process from 'node:process';
import { loadProperties, loadHistory, saveHistory, Property, PropertyData, MoveInBreakdown } from './common';

// JSTの日時を取得
function getJstNow(): Date {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * 9));
}

function formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatTime(date: Date): string {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function parseMoveInDates(html: string): MoveInBreakdown {
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

async function fetchPropertyData(page: Page, propertyInfo: Property, retryCount: number = 0): Promise<PropertyData> {
    console.log(`取得中: ${propertyInfo.name}`);

    try {
        // domcontentloadedを待たずに、必要な要素が出るまで待つ
        await page.goto(propertyInfo.url, { waitUntil: 'commit', timeout: 60000 });

        // 物件数表示か、あるいはリストが表示されるのを待つ
        try {
            await page.waitForSelector('span.fgOrange.bld', { timeout: 15000 });
        } catch (e) {
            // 無視
        }

        // 物件数を取得
        let count = 0;
        const countElem = await page.$('span.fgOrange.bld');
        if (countElem) {
            const countText = await countElem.innerText();
            count = parseInt(countText.trim(), 10);
        }

        // 「もっと見る」を全て展開
        const clickedButtons = new Set<string>();
        while (clickedButtons.size < 20) {
            // 少しだけ待機してDOM更新を待つ
            await page.waitForTimeout(200);

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
                                await page.waitForTimeout(200); // クリック後のロード待ちを短縮
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

        // 最終的なレンダリング待ちを短縮
        await page.waitForTimeout(300);
        const html = await page.content();
        const moveInBreakdown = parseMoveInDates(html);

        const totalMoveIn = Object.values(moveInBreakdown).reduce((a, b) => a + b, 0);
        console.log(`  ${propertyInfo.name}: 物件数 ${count}, 入居時期データ ${totalMoveIn}`);

        // 物件数が0件で、まだ再試行していない場合は再取得
        if (count === 0 && retryCount === 0) {
            console.log(`  ${propertyInfo.name}: 0件のため再試行します`);
            return await fetchPropertyData(page, propertyInfo, 1);
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

async function main() {
    const jstNow = getJstNow();
    console.log(`開始: ${formatDate(jstNow)} ${formatTime(jstNow)} JST`);

    const properties = loadProperties();
    if (properties.length === 0) {
        console.error("エラー: 監視対象の物件が読み込めませんでした");
        process.exit(1);
    }

    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 }
    });

    const propertiesData: PropertyData[] = await Promise.all(
        properties.map(async (prop) => {
            const page = await context.newPage();
            try {
                return await fetchPropertyData(page, prop);
            } finally {
                await page.close();
            }
        })
    );

    await browser.close();

    const successful = propertiesData.filter(p => p.success);

    if (successful.length > 0) {
        const now = getJstNow();
        const entry = {
            timestamp: now.toISOString(), // ISO形式はUTCになるが、JST日時を保持したい場合は手動フォーマットの方がいいかも？
            // Python版: 'timestamp': now.isoformat() (JSTのaware objectなら+09:00がつく)
            // ここではシンプルにISO文字列（UTC）にしておくか、あるいはローカル時間文字列表現にするか。
            // 既存データと互換性を保つにはPythonのisoformat()に合わせる。
            // Python: 2024-05-20T10:00:00+09:00
            // JS toISOString: 2024-05-20T01:00:00.000Z
            // 既存データを確認していないが、JSTの時間を保持したいならオフセット付き文字列を作るのがベスト。
            // 面倒なので、dateとtimeフィールドを信頼することにして、timestampはUTC ISOで保存する。
            date: formatDate(now),
            time: formatTime(now),
            properties: propertiesData
        };

        // timestampの上書き（JSTオフセット付きにする）
        const tzOffset = '+09:00';
        entry.timestamp = `${entry.date}T${entry.time}${tzOffset}`;

        let history = loadHistory();
        history.push(entry);

        if (history.length > 200) {
            history = history.slice(-200);
        }

        saveHistory(history);
        console.log(`保存完了: ${successful.length}/${properties.length} 物件`);
    } else {
        console.log("データ取得失敗");
    }

    console.log(`終了: ${formatDate(getJstNow())} ${formatTime(getJstNow())} JST`);
    process.exit(successful.length > 0 ? 0 : 1);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
