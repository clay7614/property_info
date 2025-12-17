import { loadHistory, HistoryEntry } from './common';
import { NotificationService, EmailSender, Change } from './core/NotificationService';

// 環境変数の定義
const SMTP_SERVER = process.env.SMTP_SERVER || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER;
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'clays7614@gmail.com';
const FORCE_SEND = process.env.FORCE_SEND === 'true';

function loadLatestData(): HistoryEntry | null {
    const history = loadHistory();
    if (history.length > 0) {
        return history[history.length - 1];
    }
    return null;
}

function loadPreviousData(): HistoryEntry | null {
    const history = loadHistory();
    if (history.length >= 2) {
        return history[history.length - 2];
    }
    return null;
}

async function main() {
    console.log(`変更通知メール開始: ${new Date().toLocaleString()}`);

    const data = loadLatestData();
    if (!data) {
        console.error("データがありません");
        process.exit(1);
    }

    const previousData = loadPreviousData();
    const service = new NotificationService();
    let changes: Change[] | null = null;

    if (previousData) {
        changes = service.detectChanges(data.properties, previousData.properties);
    }

    if (!changes) {
        console.log("物件情報に変更がありません");
        if (!FORCE_SEND) {
            process.exit(0);
        }
        console.log("FORCE_SEND=true のため送信を継続します");
    } else {
        console.log(`変更を検出しました（${changes.length}件）`);
    }

    const body = service.createEmailContent(data, changes);
    const marchCount = service.countMarch2026(data.properties);
    const dateStr = data.date;
    const timeStr = data.time;
    const hasMarch2026Change = changes ? changes.some(c => c.is_march_2026) : false;

    let subject = "";
    if (hasMarch2026Change) {
        subject = `【26年3月入居に変更あり】SUUMO物件情報 ${dateStr} ${timeStr}`;
    } else if (marchCount > 0) {
        subject = `【物件情報更新】SUUMO ${dateStr} ${timeStr} (26年3月: ${marchCount}件)`;
    } else {
        subject = `【物件情報更新】SUUMO ${dateStr} ${timeStr}`;
    }

    const emailSender = new EmailSender(SMTP_SERVER, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, FROM_EMAIL);
    const success = await emailSender.send(NOTIFICATION_EMAIL, subject, body);

    console.log(`変更通知メール終了: ${new Date().toLocaleString()}`);
    process.exit(success ? 0 : 1);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
