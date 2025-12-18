/**
 * SUUMO 物件情報トラッカー - 共通型定義
 */

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

export interface ChangeInfo {
    changes: string[];
    hasMarch2026Change: boolean;
}
