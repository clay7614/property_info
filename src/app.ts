/**
 * SUUMO 物件情報トラッカー - メインエントリポイント
 */

import { HistoryEntry, PropertyData } from './shared/types';
import { initTheme, toggleTheme } from './frontend/theme';
import { updateCharts } from './frontend/charts';
import { displayProperties, updateSummary, showChangeAlert, dismissAlert } from './frontend/ui';
import { fetchHistory, savePreviousData, loadPreviousData, detectChanges } from './frontend/data';

// データキャッシュ
let cachedHistory: HistoryEntry[] = [];
let previousData: PropertyData[] | null = null;

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    initTheme();
    
    // イベントリスナーの設定
    document.getElementById('refreshBtn')?.addEventListener('click', loadData);
    document.getElementById('exportBtn')?.addEventListener('click', exportData);
    document.getElementById('clearBtn')?.addEventListener('click', clearLocalData);
    document.getElementById('historyBtn')?.addEventListener('click', showHistoryManager);
    document.getElementById('themeToggle')?.addEventListener('click', () => {
        toggleTheme(() => {
            if (cachedHistory.length > 0) {
                const activeRange = (document.querySelector('.chart-btn.active') as HTMLElement)?.dataset.range || '7';
                updateCharts(cachedHistory, activeRange);
            }
        });
    });
    
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            document.querySelectorAll('.chart-btn.active')?.forEach(b => b.classList.remove('active'));
            target.classList.add('active');
            updateCharts(cachedHistory, target.dataset.range || '7');
        });
    });
    
    previousData = loadPreviousData();
    await loadData();
}

async function loadData() {
    const refreshBtn = document.getElementById('refreshBtn') as HTMLButtonElement;
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.textContent = '読み込み中...';
    }
    
    const propertiesGrid = document.getElementById('propertiesGrid');
    if (propertiesGrid) {
        propertiesGrid.innerHTML = '<div class="loading">データを読み込み中...</div>';
    }
    
    try {
        cachedHistory = await fetchHistory();
        
        if (cachedHistory.length === 0) {
            if (propertiesGrid) {
                propertiesGrid.innerHTML = '<div class="error">データがありません。</div>';
            }
            return;
        }
        
        const latestEntry = cachedHistory[cachedHistory.length - 1];
        
        const changeInfo = detectChanges(latestEntry.properties, previousData);
        if (changeInfo) {
            showChangeAlert(changeInfo);
        }
        
        savePreviousData(latestEntry.properties);
        previousData = latestEntry.properties;
        
        displayProperties(latestEntry.properties);
        updateSummary(latestEntry.properties);
        updateCharts(cachedHistory, '7');
        
        const lastUpdate = new Date(latestEntry.timestamp);
        const lastUpdatedEl = document.getElementById('lastUpdated');
        if (lastUpdatedEl) {
            lastUpdatedEl.textContent = `最終データ取得: ${lastUpdate.toLocaleString('ja-JP')}`;
        }
        
    } catch (error: any) {
        console.error('Error loading data:', error);
        if (propertiesGrid) {
            propertiesGrid.innerHTML = `<div class="error">読み込み失敗: ${error.message}</div>`;
        }
    } finally {
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.textContent = 'データ再読み込み';
        }
    }
}

function exportData() {
    if (cachedHistory.length === 0) return;
    const dataStr = JSON.stringify(cachedHistory, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `suumo_data_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function clearLocalData() {
    if (confirm('キャッシュをクリアしますか？')) {
        cachedHistory = [];
        updateCharts([], '7');
    }
}

// 履歴管理
function showHistoryManager() {
    const modal = document.getElementById('historyModal');
    const historyList = document.getElementById('historyList');
    if (!modal || !historyList) return;

    if (cachedHistory.length === 0) {
        historyList.innerHTML = '<p>履歴なし</p>';
    } else {
        historyList.innerHTML = cachedHistory.map((entry, index) => {
            const date = new Date(entry.timestamp);
            return `
                <div class="history-item">
                    <label>
                        <input type="checkbox" data-index="${index}">
                        <span>${date.toLocaleString('ja-JP')}</span>
                    </label>
                </div>
            `;
        }).reverse().join('');
    }
    modal.style.display = 'flex';
}

function closeHistoryModal() {
    const modal = document.getElementById('historyModal');
    if (modal) modal.style.display = 'none';
}

function deleteSelectedHistory() {
    const checkboxes = document.querySelectorAll('#historyList input[type="checkbox"]:checked') as NodeListOf<HTMLInputElement>;
    if (checkboxes.length === 0) return;
    
    const indices = Array.from(checkboxes).map(cb => parseInt(cb.dataset.index || '0', 10)).sort((a, b) => b - a);
    indices.forEach(index => cachedHistory.splice(index, 1));
    
    updateCharts(cachedHistory, '7');
    showHistoryManager();
}

// グローバル公開
(window as any).closeHistoryModal = closeHistoryModal;
(window as any).deleteSelectedHistory = deleteSelectedHistory;
(window as any).dismissAlert = dismissAlert;
