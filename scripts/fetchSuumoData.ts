import { chromium } from 'playwright';
import { loadProperties, loadHistory, saveHistory, PropertyData } from './common';
import { getJstNow, formatDate, formatTime } from './utils/dateUtils';
import { SuumoScraper } from './core/SuumoScraper';

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

    const page = await context.newPage();
    const propertiesData: PropertyData[] = [];
    const scraper = new SuumoScraper();

    for (const prop of properties) {
        const data = await scraper.fetchPropertyData(page, prop);
        propertiesData.push(data);
    }

    await browser.close();

    const successful = propertiesData.filter(p => p.success);

    if (successful.length > 0) {
        const now = getJstNow();
        const entry = {
            timestamp: now.toISOString(), // 保存用のUTC(ISO)
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
