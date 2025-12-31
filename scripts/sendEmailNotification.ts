import * as nodemailer from 'nodemailer';
import { loadHistory, HistoryEntry, PropertyData, MoveInBreakdown } from './common';

// 環境変数の定義
const SMTP_SERVER = process.env.SMTP_SERVER || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER;
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'clays7614@gmail.com';
const FORCE_SEND = process.env.FORCE_SEND === 'true';

interface Change {
    property: string;
    type: 'count' | 'move_in';
    message: string;
    is_march_2026?: boolean;
    key?: string;
}

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

function detectChanges(currentProperties: PropertyData[], previousProperties: PropertyData[]): Change[] | null {
    if (!previousProperties || previousProperties.length === 0) {
        return null;
    }

    const changes: Change[] = [];

    for (const current of currentProperties) {
        const prev = previousProperties.find(p => p.id === current.id);
        if (!prev) continue;

        // 物件数の変化
        if (current.count !== prev.count) {
            const diff = current.count - prev.count;
            const direction = diff > 0 ? '増加' : '減少';
            changes.push({
                property: current.name,
                type: 'count',
                message: `物件数: ${prev.count}件 → ${current.count}件 (${Math.abs(diff)}件${direction})`
            });
        }

        // 入居時期の変化をチェック
        const currentBreakdown = current.moveInBreakdown || {};
        const prevBreakdown = prev.moveInBreakdown || {};

        const allKeys = new Set([...Object.keys(currentBreakdown), ...Object.keys(prevBreakdown)]);

        for (const key of allKeys) {
            const currCount = currentBreakdown[key] || 0;
            const prevCount = prevBreakdown[key] || 0;

            if (currCount !== prevCount) {
                const diff = currCount - prevCount;
                const direction = diff > 0 ? '増加' : '減少';
                const isMarch2026 = key.includes('26年3月');
                changes.push({
                    property: current.name,
                    type: 'move_in',
                    key: key,
                    is_march_2026: isMarch2026,
                    message: `${key}: ${prevCount}件 → ${currCount}件 (${Math.abs(diff)}件${direction})`
                });
            }
        }
    }

    return changes.length > 0 ? changes : null;
}

function formatMoveInBreakdown(breakdown: MoveInBreakdown): string {
    if (!breakdown || Object.keys(breakdown).length === 0) {
        return "データなし";
    }

    const march2026: string[] = [];
    const flexible: string[] = [];
    const scheduled: string[] = [];

    for (const [key, count] of Object.entries(breakdown)) {
        if (key.includes('26年3月')) {
            march2026.push(`  * ${key}: ${count}件`);
        } else if (['即入居可', '相談'].includes(key)) {
            flexible.push(`  * ${key}: ${count}件`);
        } else {
            scheduled.push(`  * ${key}: ${count}件`);
        }
    }

    const result: string[] = [];
    if (march2026.length > 0) {
        result.push("  【26年3月入居 *注目*】");
        march2026.sort().forEach(s => result.push(s));
    }
    if (flexible.length > 0) {
        result.push("  【即入居可・相談】");
        flexible.sort().forEach(s => result.push(s));
    }
    if (scheduled.length > 0) {
        result.push("  【時期指定】");
        scheduled.sort().forEach(s => result.push(s));
    }

    return result.join('\n');
}

function countMarch2026(properties: PropertyData[]): number {
    let total = 0;
    for (const prop of properties) {
        const breakdown = prop.moveInBreakdown || {};
        for (const [key, count] of Object.entries(breakdown)) {
            if (key.includes('26年3月')) {
                total += count;
            }
        }
    }
    return total;
}

function createEmailContent(data: HistoryEntry, changes: Change[] | null): string {
    const { timestamp, date, time, properties } = data;
    const marchCount = countMarch2026(properties);

    const lines: string[] = [
        "=".repeat(50),
        "SUUMO 物件情報 変更通知",
        "=".repeat(50),
        `検出日時: ${date} ${time}`,
        "",
    ];

    if (changes && changes.length > 0) {
        lines.push("変更内容:", "-".repeat(40));

        const changesByProperty: { [key: string]: Change[] } = {};
        for (const change of changes) {
            if (!changesByProperty[change.property]) {
                changesByProperty[change.property] = [];
            }
            changesByProperty[change.property].push(change);
        }

        for (const [propName, propChanges] of Object.entries(changesByProperty)) {
            lines.push(`[物件] ${propName}`);
            for (const change of propChanges) {
                if (change.is_march_2026) {
                    lines.push(`  * ${change.message} *注目*`);
                } else {
                    lines.push(`  - ${change.message}`);
                }
            }
            lines.push("");
        }
        lines.push("-".repeat(40));
        lines.push("");
    }

    if (marchCount > 0) {
        lines.push(
            "*".repeat(25),
            `26年3月入居: 現在${marchCount}件`,
            "*".repeat(25),
            ""
        );
    }

    let totalCount = 0;
    for (const prop of properties) {
        totalCount += prop.count;

        lines.push("-".repeat(40));
        lines.push(`[物件] ${prop.name}`);
        lines.push(`   空室数: ${prop.count}件`);
        lines.push(`   URL: ${prop.url}`);
        lines.push("");
    }

    lines.push(
        "=".repeat(50),
        `合計空室数: ${totalCount}件`,
        "=".repeat(50),
        "",
        "このメールは自動送信されています。",
        "詳細はWebサイトをご確認ください。",
        "",
        "Webサイト: https://clay7614.github.io/property_info/"
    );

    return lines.join('\n');
}

async function sendEmail(subject: string, body: string, toEmail: string): Promise<boolean> {
    if (!SMTP_USER || !SMTP_PASSWORD) {
        console.error("SMTP認証情報が設定されていません");
        return false;
    }

    const transporter = nodemailer.createTransport({
        host: SMTP_SERVER,
        port: SMTP_PORT,
        secure: false, // 587 uses STARTTLS, so secure is false
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASSWORD,
        },
    });

    try {
        await transporter.sendMail({
            from: FROM_EMAIL,
            to: toEmail,
            subject: subject,
            text: body,
        });
        console.log(`メール送信成功: ${toEmail}`);
        return true;
    } catch (e) {
        console.error(`メール送信失敗: ${e}`);
        return false;
    }
}

async function main() {
    console.log(`変更通知メール開始: ${new Date().toLocaleString()}`);

    const data = loadLatestData();
    if (!data) {
        console.error("データがありません");
        process.exit(1);
    }

    const previousData = loadPreviousData();
    let changes: Change[] | null = null;

    if (previousData) {
        changes = detectChanges(data.properties, previousData.properties);
    }

    const hasMarch2026Change = changes ? changes.some(c => c.is_march_2026) : false;

    if (!changes) {
        console.log("物件情報に変更がありません");
        if (!FORCE_SEND) {
            process.exit(0);
        }
        console.log("FORCE_SEND=true のため送信を継続します");
    } else if (!hasMarch2026Change) {
        console.log("変更はありましたが、26年3月入居の物件に変化がないため送信をスキップします");
        if (!FORCE_SEND) {
            process.exit(0);
        }
        console.log("FORCE_SEND=true のため送信を継続します");
    } else {
        console.log(`26年3月入居の変更を検出しました（${changes.length}件の変更中）`);
    }

    const body = createEmailContent(data, changes);
    const marchCount = countMarch2026(data.properties);
    const dateStr = data.date;
    const timeStr = data.time;

    let subject = "";
    if (hasMarch2026Change) {
        subject = `【26年3月入居に変更あり】SUUMO物件情報 ${dateStr} ${timeStr}`;
    } else if (marchCount > 0) {
        subject = `【物件情報更新】SUUMO ${dateStr} ${timeStr} (26年3月: ${marchCount}件)`;
    } else {
        subject = `【物件情報更新】SUUMO ${dateStr} ${timeStr}`;
    }

    const success = await sendEmail(subject, body, NOTIFICATION_EMAIL);

    console.log(`変更通知メール終了: ${new Date().toLocaleString()}`);
    process.exit(success ? 0 : 1);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
