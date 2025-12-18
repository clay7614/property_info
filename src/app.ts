/**
 * SUUMO 物件情報トラッカー - フロントエンド
 */

import { PropertyData, HistoryEntry, ChangeInfo, MoveInBreakdown } from './shared/types';

// Chart.js のグローバル宣言
declare const Chart: any;

// サーバーデータのURL
const SERVER_DATA_URL = 'data/property_history.json';

// グラフのインスタンス
let propertyChart: any = null;
let moveInChart: any = null;

// データキャッシュ
let cachedHistory: HistoryEntry[] = [];

// 前回の表示データ（変更検知用）
let previousData: PropertyData[] | null = null;

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    // テーマの初期化
    initTheme();
    
    // イベントリスナーの設定
    document.getElementById('refreshBtn')?.addEventListener('click', loadData);
    document.getElementById('exportBtn')?.addEventListener('click', exportData);
    document.getElementById('clearBtn')?.addEventListener('click', clearLocalData);
    document.getElementById('historyBtn')?.addEventListener('click', showHistoryManager);
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
    
    // グラフ範囲ボタンのイベント
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
            target.classList.add('active');
            updateCharts(target.dataset.range || '7');
        });
    });
    
    // 前回のデータを読み込み
    loadPreviousData();
    
    // データを読み込み
    await loadData();
}

// テーマ関連の関数
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    
    // グラフを再描画（テーマ変更時に色を更新するため）
    if (cachedHistory.length > 0) {
        const activeRange = (document.querySelector('.chart-btn.active') as HTMLElement)?.dataset.range || '7';
        updateCharts(activeRange);
    }
}

function updateThemeIcon(theme: string) {
    const btn = document.getElementById('themeToggle');
    if (btn) {
        btn.textContent = theme === 'dark' ? 'Light' : 'Dark';
    }
}

// 前回のデータを保存・読み込み
function savePreviousData(data: PropertyData[]) {
    localStorage.setItem('previousPropertyData', JSON.stringify(data));
}

function loadPreviousData() {
    const saved = localStorage.getItem('previousPropertyData');
    if (saved) {
        previousData = JSON.parse(saved);
    }
}

// 変更を検出
function detectChanges(currentProperties: PropertyData[]): ChangeInfo | null {
    if (!previousData) return null;
    
    const changes: string[] = [];
    let hasMarch2026Change = false;
    
    currentProperties.forEach(current => {
        const prev = previousData?.find(p => p.id === current.id);
        if (!prev) return;
        
        // 物件数の変化
        if (current.count !== prev.count) {
            const diff = current.count - prev.count;
            const direction = diff > 0 ? '増加' : '減少';
            changes.push(`${current.name}: ${Math.abs(diff)}件${direction}`);
        }
        
        // 入居時期の変化をチェック
        const currentMoveIn = current.moveInBreakdown || {};
        const prevMoveIn = prev.moveInBreakdown || {};
        
        // 26年3月入居の変化を特別にチェック
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

// アラートを表示
function showChangeAlert(changeInfo: ChangeInfo) {
    const alertEl = document.getElementById('changeAlert');
    const messageEl = document.getElementById('alertMessage');
    
    if (!alertEl || !messageEl) return;

    if (changeInfo.hasMarch2026Change) {
        alertEl.classList.add('highlight-march');
    } else {
        alertEl.classList.remove('highlight-march');
    }
    
    messageEl.innerHTML = changeInfo.changes.join('<br>');
    alertEl.style.display = 'flex';
}

// アラートを閉じる
function dismissAlert() {
    const alertEl = document.getElementById('changeAlert');
    if (alertEl) alertEl.style.display = 'none';
}

// サーバーからデータを読み込み
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
        const response = await fetch(SERVER_DATA_URL + '?t=' + Date.now());
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        cachedHistory = await response.json();
        
        if (cachedHistory.length === 0) {
            if (propertiesGrid) {
                propertiesGrid.innerHTML = '<div class="error">データがありません。GitHub Actionsでデータが取得されるまでお待ちください。</div>';
            }
            return;
        }
        
        // 最新のデータを表示
        const latestEntry = cachedHistory[cachedHistory.length - 1];
        
        // 変更を検出
        const changeInfo = detectChanges(latestEntry.properties);
        if (changeInfo) {
            showChangeAlert(changeInfo);
        }
        
        // 現在のデータを保存（次回の比較用）
        savePreviousData(latestEntry.properties);
        previousData = latestEntry.properties;
        
        displayProperties(latestEntry.properties);
        updateSummary(latestEntry.properties);
        updateCharts('7');
        
        // 最終更新時間を表示
        const lastUpdate = new Date(latestEntry.timestamp);
        const lastUpdatedEl = document.getElementById('lastUpdated');
        if (lastUpdatedEl) {
            lastUpdatedEl.textContent = `最終データ取得: ${lastUpdate.toLocaleString('ja-JP')}`;
        }
        
        console.log(`Loaded ${cachedHistory.length} entries from server`);
        
    } catch (error: any) {
        console.error('Error loading data:', error);
        if (propertiesGrid) {
            propertiesGrid.innerHTML = `
                <div class="error">
                    データの読み込みに失敗しました。<br>
                    <small>${error.message}</small>
                </div>
            `;
        }
    } finally {
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.textContent = 'データ再読み込み';
        }
    }
}

// 物件情報を表示
function displayProperties(properties: PropertyData[]) {
    const grid = document.getElementById('propertiesGrid');
    if (!grid) return;
    
    const cards = properties.map(property => {
        const moveInHtml = formatMoveInBreakdown(property.moveInBreakdown);
        
        // 物件データから直接URLを取得
        const url = property.url || '#';
        
        return `
            <div class="property-card fade-in">
                <h3 class="property-name">${property.name}</h3>
                <div class="property-stats">
                    <div class="stat-row">
                        <span class="stat-label">掲載中の物件数</span>
                        <span class="stat-value">${property.count}件</span>
                    </div>
                </div>
                <div class="move-in-breakdown">
                    <h4>入居時期の内訳</h4>
                    <div class="move-in-list">
                        ${moveInHtml}
                    </div>
                </div>
                <a href="${url}" target="_blank" rel="noopener noreferrer" class="property-link">
                    SUUMOで詳細を見る →
                </a>
            </div>
        `;
    }).join('');
    
    grid.innerHTML = cards;
}

// 26年3月かどうかを判定
function isMarch2026(dateStr: string) {
    return dateStr.includes('26年3月') || dateStr.includes("'26年3月");
}

// 入居時期の内訳をHTMLにフォーマット
function formatMoveInBreakdown(breakdown: MoveInBreakdown) {
    if (!breakdown || Object.keys(breakdown).length === 0) {
        return '<span class="move-in-tag">情報なし</span>';
    }
    
    // 入居時期をソート（26年3月 → 即入居可 → 相談 → 日付順）
    const sortedEntries = Object.entries(breakdown).sort((a, b) => {
        if (isMarch2026(a[0])) return -1;
        if (isMarch2026(b[0])) return 1;
        if (a[0] === '即入居可') return -1;
        if (b[0] === '即入居可') return 1;
        if (a[0] === '相談') return -1;
        if (b[0] === '相談') return 1;
        return a[0].localeCompare(b[0], 'ja');
    });
    
    return sortedEntries.map(([date, count]) => {
        let className = 'move-in-tag';
        if (isMarch2026(date)) className += ' march-2026';
        else if (date === '即入居可') className += ' immediate';
        else if (date === '相談') className += ' consult';
        return `<span class="${className}">${date}: ${count}件</span>`;
    }).join('');
}

// サマリーを更新
function updateSummary(properties: PropertyData[]) {
    // 総物件数
    const total = properties.reduce((sum, p) => sum + (p.count || 0), 0);
    const totalEl = document.getElementById('totalProperties');
    if (totalEl) totalEl.textContent = total.toString();
    
    // 26年3月入居の数
    const march2026 = properties.reduce((sum, p) => {
        if (!p.moveInBreakdown) return sum;
        let count = 0;
        Object.entries(p.moveInBreakdown).forEach(([key, value]) => {
            if (isMarch2026(key)) {
                count += value;
            }
        });
        return sum + count;
    }, 0);
    const marchEl = document.getElementById('marchCount');
    if (marchEl) marchEl.textContent = march2026.toString();
    
    // 即入居可の数
    const immediate = properties.reduce((sum, p) => {
        return sum + (p.moveInBreakdown?.['即入居可'] || 0);
    }, 0);
    const immediateEl = document.getElementById('immediateCount');
    if (immediateEl) immediateEl.textContent = immediate.toString();
    
    // 相談の数
    const consult = properties.reduce((sum, p) => {
        return sum + (p.moveInBreakdown?.['相談'] || 0);
    }, 0);
    const consultEl = document.getElementById('consultCount');
    if (consultEl) consultEl.textContent = consult.toString();
}

// グラフを更新
function updateCharts(range: string) {
    let filteredHistory = cachedHistory;
    
    if (range !== 'all') {
        const days = parseInt(range, 10);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        filteredHistory = cachedHistory.filter(h => new Date(h.timestamp) >= cutoff);
    }
    
    updatePropertyChart(filteredHistory);
    updateMoveInChart(filteredHistory);
}

// 物件数推移グラフを更新
function updatePropertyChart(history: HistoryEntry[]) {
    const canvas = document.getElementById('propertyChart') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    if (propertyChart) {
        propertyChart.destroy();
    }
    
    if (history.length === 0) {
        propertyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['データなし'],
                datasets: [{
                    label: '物件数',
                    data: [0],
                    borderColor: 'rgba(37, 99, 235, 0.5)',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
            }
        });
        return;
    }
    
    const labels = history.map(h => {
        const date = new Date(h.timestamp);
        return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    });
    
    // 最新のデータから物件リストを取得
    const latestEntry = history[history.length - 1];
    const properties = latestEntry.properties;
    
    const datasets: any[] = properties.map((property, index) => {
        const colors = [
            { border: 'rgb(37, 99, 235)', background: 'rgba(37, 99, 235, 0.1)' },
            { border: 'rgb(34, 197, 94)', background: 'rgba(34, 197, 94, 0.1)' },
            { border: 'rgb(245, 158, 11)', background: 'rgba(245, 158, 11, 0.1)' },
            { border: 'rgb(239, 68, 68)', background: 'rgba(239, 68, 68, 0.1)' },
            { border: 'rgb(168, 85, 247)', background: 'rgba(168, 85, 247, 0.1)' },
            { border: 'rgb(236, 72, 153)', background: 'rgba(236, 72, 153, 0.1)' }
        ];
        
        const colorIndex = index % colors.length;
        
        const data = history.map(h => {
            const p = h.properties.find(pr => pr.id === property.id);
            return p ? p.count : null;
        });
        
        return {
            label: property.name,
            data: data,
            borderColor: colors[colorIndex].border,
            backgroundColor: colors[colorIndex].background,
            fill: true,
            tension: 0.3
        };
    });
    
    // 合計のデータセットを追加
    const totalData = history.map(h => {
        return h.properties.reduce((sum, p) => sum + (p.count || 0), 0);
    });
    
    datasets.push({
        label: '合計',
        data: totalData,
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: false,
        borderWidth: 3,
        borderDash: [5, 5]
    });
    
    propertyChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '物件数'
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

// 入居時期グラフを更新（すべての入居時期を表示）
function updateMoveInChart(history: HistoryEntry[]) {
    const canvas = document.getElementById('moveInChart') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    if (moveInChart) {
        moveInChart.destroy();
    }
    
    if (history.length === 0) {
        moveInChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['データなし'],
                datasets: [{
                    label: '件数',
                    data: [0]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
            }
        });
        return;
    }
    
    const labels = history.map(h => {
        const date = new Date(h.timestamp);
        return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit' });
    });
    
    // すべての入居時期カテゴリを収集
    const allCategories = new Set<string>();
    history.forEach(h => {
        h.properties.forEach(p => {
            if (p.moveInBreakdown) {
                Object.keys(p.moveInBreakdown).forEach(key => allCategories.add(key));
            }
        });
    });
    
    // カテゴリをソート（即入居可 → 相談 → 日付順）
    const sortedCategories = Array.from(allCategories).sort((a, b) => {
        if (a === '即入居可') return -1;
        if (b === '即入居可') return 1;
        if (a === '相談') return -1;
        if (b === '相談') return 1;
        return a.localeCompare(b, 'ja');
    });
    
    // カテゴリごとの色を定義
    const categoryColors: {[key: string]: string} = {
        '即入居可': 'rgba(34, 197, 94, 0.7)',
        '相談': 'rgba(245, 158, 11, 0.7)'
    };
    
    // 月ごとの色を生成
    const monthColors = [
        'rgba(59, 130, 246, 0.7)',   // 1月 - 青
        'rgba(236, 72, 153, 0.7)',   // 2月 - ピンク
        'rgba(168, 85, 247, 0.7)',   // 3月 - 紫
        'rgba(20, 184, 166, 0.7)',   // 4月 - ティール
        'rgba(132, 204, 22, 0.7)',   // 5月 - ライム
        'rgba(251, 146, 60, 0.7)',   // 6月 - オレンジ
        'rgba(239, 68, 68, 0.7)',    // 7月 - 赤
        'rgba(34, 211, 238, 0.7)',   // 8月 - シアン
        'rgba(163, 230, 53, 0.7)',   // 9月 - 黄緑
        'rgba(251, 191, 36, 0.7)',   // 10月 - アンバー
        'rgba(192, 132, 252, 0.7)',  // 11月 - バイオレット
        'rgba(74, 222, 128, 0.7)'    // 12月 - エメラルド
    ];
    
    function getColorForCategory(category: string) {
        if (categoryColors[category]) {
            return categoryColors[category];
        }
        // 月を抽出して色を決定
        const monthMatch = category.match(/(\d{1,2})月/);
        if (monthMatch) {
            const month = parseInt(monthMatch[1], 10);
            return monthColors[(month - 1) % 12];
        }
        return 'rgba(100, 116, 139, 0.7)';
    }
    
    const datasets: any[] = sortedCategories.map(category => {
        const data = history.map(h => {
            let total = 0;
            h.properties.forEach(p => {
                if (p.moveInBreakdown && p.moveInBreakdown[category]) {
                    total += p.moveInBreakdown[category];
                }
            });
            return total;
        });
        
        return {
            label: category,
            data: data,
            borderColor: getColorForCategory(category),
            backgroundColor: getColorForCategory(category) + '33',
            fill: false,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6
        };
    });
    
    moveInChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '件数'
                    }
                }
            }
        }
    });
}

// データをエクスポート
function exportData() {
    if (cachedHistory.length === 0) {
        alert('エクスポートするデータがありません。');
        return;
    }
    
    const dataStr = JSON.stringify(cachedHistory, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `suumo_property_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ローカルデータをクリア（キャッシュのみ）
function clearLocalData() {
    if (confirm('ローカルキャッシュをクリアしますか？\nサーバーのデータは削除されません。')) {
        cachedHistory = [];
        updateCharts('7');
        alert('ローカルキャッシュをクリアしました。\n「データ再読み込み」でサーバーからデータを取得できます。');
    }
}

// 履歴管理モーダルを表示
function showHistoryManager() {
    const modal = document.getElementById('historyModal');
    const historyList = document.getElementById('historyList');
    
    if (!modal || !historyList) return;

    if (cachedHistory.length === 0) {
        historyList.innerHTML = '<p>履歴データがありません。</p>';
    } else {
        const items = cachedHistory.map((entry, index) => {
            const date = new Date(entry.timestamp);
            const totalCount = entry.properties.reduce((sum, p) => sum + (p.count || 0), 0);
            return `
                <div class="history-item">
                    <label>
                        <input type="checkbox" data-index="${index}">
                        <span class="history-date">${date.toLocaleString('ja-JP')}</span>
                        <span class="history-count">合計: ${totalCount}件</span>
                    </label>
                </div>
            `;
        }).reverse().join('');
        historyList.innerHTML = items;
    }
    
    modal.style.display = 'flex';
}

// 履歴管理モーダルを閉じる
function closeHistoryModal() {
    const modal = document.getElementById('historyModal');
    if (modal) modal.style.display = 'none';
}

// 選択した履歴を削除
function deleteSelectedHistory() {
    const checkboxes = document.querySelectorAll('#historyList input[type="checkbox"]:checked') as NodeListOf<HTMLInputElement>;
    
    if (checkboxes.length === 0) {
        alert('削除する項目を選択してください。');
        return;
    }
    
    if (!confirm(`${checkboxes.length}件の履歴を削除しますか？\n\n注意: この操作はローカル表示にのみ影響します。\nサーバーのデータを削除するには、JSONファイルを直接編集してください。`)) {
        return;
    }
    
    // インデックスを降順でソート（後ろから削除するため）
    const indices = Array.from(checkboxes)
        .map(cb => parseInt(cb.dataset.index || '0', 10))
        .sort((a, b) => b - a);
    
    indices.forEach(index => {
        cachedHistory.splice(index, 1);
    });
    
    // UIを更新
    if (cachedHistory.length > 0) {
        const latestEntry = cachedHistory[cachedHistory.length - 1];
        displayProperties(latestEntry.properties);
        updateSummary(latestEntry.properties);
        const lastUpdate = new Date(latestEntry.timestamp);
        const lastUpdatedEl = document.getElementById('lastUpdated');
        if (lastUpdatedEl) {
            lastUpdatedEl.textContent = `最終データ取得: ${lastUpdate.toLocaleString('ja-JP')}`;
        }
    } else {
        const grid = document.getElementById('propertiesGrid');
        if (grid) grid.innerHTML = '<div class="error">データがありません。</div>';
        const lastUpdatedEl = document.getElementById('lastUpdated');
        if (lastUpdatedEl) lastUpdatedEl.textContent = '最終データ取得: --';
    }
    
    updateCharts('7');
    showHistoryManager(); // リストを更新
    alert(`${indices.length}件の履歴を削除しました。`);
}

// グローバルに公開する関数（HTML onclick用）
(window as any).closeHistoryModal = closeHistoryModal;
(window as any).deleteSelectedHistory = deleteSelectedHistory;
(window as any).dismissAlert = dismissAlert;
