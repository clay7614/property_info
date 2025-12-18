/**
 * データ管理モジュール
 */
import { PropertyData, HistoryEntry, ChangeInfo } from '../shared/types';
import { isMarch2026 } from './ui';

const SERVER_DATA_URL = 'data/property_history.json';

export async function fetchHistory(): Promise<HistoryEntry[]> {
    const response = await fetch(SERVER_DATA_URL + '?t=' + Date.now());
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
}

export function savePreviousData(data: PropertyData[]) {
    localStorage.setItem('previousPropertyData', JSON.stringify(data));
}

export function loadPreviousData(): PropertyData[] | null {
    const saved = localStorage.getItem('previousPropertyData');
    return saved ? JSON.parse(saved) : null;
}

export function detectChanges(currentProperties: PropertyData[], previousData: PropertyData[] | null): ChangeInfo | null {
    if (!previousData) return null;
    
    const changes: string[] = [];
    let hasMarch2026Change = false;
    
    currentProperties.forEach(current => {
        const prev = previousData.find(p => p.id === current.id);
        if (!prev) return;
        
        if (current.count !== prev.count) {
            const diff = current.count - prev.count;
            const direction = diff > 0 ? '増加' : '減少';
            changes.push(`${current.name}: ${Math.abs(diff)}件${direction}`);
        }
        
        const currentMoveIn = current.moveInBreakdown || {};
        const prevMoveIn = prev.moveInBreakdown || {};
        
        const marchKeys = Object.keys(currentMoveIn).filter(k => isMarch2026(k));
        const prevMarchKeys = Object.keys(prevMoveIn).filter(k => isMarch2026(k));
        
        const currentMarchTotal = marchKeys.reduce((sum, k) => sum + currentMoveIn[k], 0);
        const prevMarchTotal = prevMarchKeys.reduce((sum, k) => sum + prevMoveIn[k], 0);
        
        if (currentMarchTotal !== prevMarchTotal) {
            const diff = currentMarchTotal - prevMarchTotal;
            if (diff > 0) {
                changes.push(`[注目] ${current.name}: 26年3月入居が${diff}件増加！`);
                hasMarch2026Change = true;
            } else {
                changes.push(`${current.name}: 26年3月入居が${Math.abs(diff)}件減少`);
            }
        }
    });
    
    return changes.length > 0 ? { changes, hasMarch2026Change } : null;
}
