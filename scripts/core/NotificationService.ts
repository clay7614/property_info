import * as nodemailer from 'nodemailer';
import { HistoryEntry, PropertyData, MoveInBreakdown } from '../common';

export interface Change {
    property: string;
    type: 'count' | 'move_in';
    message: string;
    is_march_2026?: boolean;
    key?: string;
}

export class EmailSender {
    private transporter: nodemailer.Transporter | null = null;
    private fromEmail: string;

    constructor(
        private host: string,
        private port: number,
        private user?: string,
        private pass?: string,
        fromEmail?: string
    ) {
        this.fromEmail = fromEmail || user || '';

        if (user && pass) {
            this.transporter = nodemailer.createTransport({
                host,
                port,
                secure: false, // 587 uses STARTTLS
                auth: { user, pass },
            });
        }
    }

    public async send(to: string, subject: string, body: string): Promise<boolean> {
        if (!this.transporter) {
            console.error("SMTP認証情報が設定されていません");
            return false;
        }

        try {
            await this.transporter.sendMail({
                from: this.fromEmail,
                to: to,
                subject: subject,
                text: body,
            });
            console.log(`メール送信成功: ${to}`);
            return true;
        } catch (e) {
            console.error(`メール送信失敗: ${e}`);
            return false;
        }
    }
}

export class NotificationService {
    public detectChanges(currentProperties: PropertyData[], previousProperties: PropertyData[]): Change[] | null {
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

    public formatMoveInBreakdown(breakdown: MoveInBreakdown): string {
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

    public countMarch2026(properties: PropertyData[]): number {
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

    public createEmailContent(data: HistoryEntry, changes: Change[] | null): string {
        const { timestamp, date, time, properties } = data;
        const marchCount = this.countMarch2026(properties);

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

            if (prop.moveInBreakdown) {
                lines.push("   入居時期:");
                lines.push(this.formatMoveInBreakdown(prop.moveInBreakdown));
            }

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
}
