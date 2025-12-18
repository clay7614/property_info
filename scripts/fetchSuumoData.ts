import axios from 'axios';
import * as cheerio from 'cheerio';
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
    const $ = cheerio.load(html);
    
    $('td').each((_, el) => {
        let text = $(el).text().replace(/\s+/g, '').trim();

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
    });
    
    return breakdown;
}

async function fetchPropertyData(propertyInfo: Property): Promise<PropertyData> {
    console.log(`取得中: ${propertyInfo.name}`);

    try {
        const response = await axios.get(propertyInfo.url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 30000
        });

        const $ = cheerio.load(response.data);
        
        // 物件数を取得
        let count = 0;
        const countText = $('span.fgOrange.bld').first().text().trim();
        if (countText) {
            count = parseInt(countText, 10);
        }

        const moveInBreakdown = parseMoveInDates(response.data);
        const totalMoveIn = Object.values(moveInBreakdown).reduce((a, b) => a + b, 0);
        
        console.log(`  ${propertyInfo.name}: 物件数 ${count}, 入居時期データ ${totalMoveIn}`);

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
    console.log(`開始: ${formatDate(jstNow)} ${formatTime(jstNow)} JST (Cheerio版)`);

    const properties = loadProperties();
    if (properties.length === 0) {
        console.error("エラー: 監視対象の物件が読み込めませんでした");
        process.exit(1);
    }

    const results: PropertyData[] = await Promise.all(
        properties.map(p => fetchPropertyData(p))
    );

    const successful = results.filter(p => p.success);

    if (successful.length > 0) {
        const now = getJstNow();
        const entry = {
            timestamp: '',
            date: formatDate(now),
            time: formatTime(now),
            properties: results
        };

        // timestampの設定（JSTオフセット付き）
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

