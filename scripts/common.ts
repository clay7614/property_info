import * as fs from 'fs';
import * as path from 'path';
import { Property, HistoryEntry } from '../src/shared/types';

export * from '../src/shared/types';

export const PROPERTIES_FILE = 'data/properties.json';
export const HISTORY_FILE = 'data/property_history.json';

/**
 * JSTの日時を取得
 */
export function getJstNow(): Date {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * 9));
}

/**
 * 日付を YYYY-MM-DD 形式でフォーマット
 */
export function formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * 時刻を HH:mm:ss 形式でフォーマット
 */
export function formatTime(date: Date): string {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

export function loadProperties(): Property[] {
    if (fs.existsSync(PROPERTIES_FILE)) {
        try {
            const data = fs.readFileSync(PROPERTIES_FILE, 'utf-8');
            return JSON.parse(data);
        } catch (e) {
            console.error(`エラー: ${PROPERTIES_FILE} の読み込みに失敗しました: ${e}`);
            return [];
        }
    } else {
        console.error(`エラー: ${PROPERTIES_FILE} が見つかりません`);
        return [];
    }
}

export function saveProperties(properties: Property[]): boolean {
    try {
        const dir = path.dirname(PROPERTIES_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(PROPERTIES_FILE, JSON.stringify(properties, null, 2), 'utf-8');
        return true;
    } catch (e) {
        console.error(`エラー: ${PROPERTIES_FILE} への書き込みに失敗しました: ${e}`);
        return false;
    }
}

export function loadHistory(): HistoryEntry[] {
    if (fs.existsSync(HISTORY_FILE)) {
        try {
            const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
            return JSON.parse(data);
        } catch (e) {
            console.error(`エラー: ${HISTORY_FILE} の読み込みに失敗しました: ${e}`);
            return [];
        }
    }
    return [];
}

export function saveHistory(history: HistoryEntry[]): boolean {
    try {
        const dir = path.dirname(HISTORY_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
        return true;
    } catch (e) {
        console.error(`エラー: ${HISTORY_FILE} への書き込みに失敗しました: ${e}`);
        return false;
    }
}
