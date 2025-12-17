import * as fs from 'fs';
import * as path from 'path';

export const PROPERTIES_FILE = 'data/properties.json';
export const HISTORY_FILE = 'data/property_history.json';

export interface Property {
    id: string;
    name: string;
    url: string;
}

export interface MoveInBreakdown {
    [key: string]: number;
}

export interface PropertyData {
    id: string;
    name: string;
    url: string;
    count: number;
    moveInBreakdown: MoveInBreakdown;
    success: boolean;
    error?: string;
}

export interface HistoryEntry {
    timestamp: string;
    date: string;
    time: string;
    properties: PropertyData[];
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
