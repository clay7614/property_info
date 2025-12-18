/**
 * グラフ描画モジュール
 */
import { HistoryEntry } from '../shared/types';

declare const Chart: any;

let propertyChart: any = null;
let moveInChart: any = null;

/**
 * CSS変数から色を取得する
 */
function getM3Color(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function getChartColors() {
    return {
        primary: getM3Color('--md-sys-color-primary'),
        secondary: getM3Color('--md-sys-color-secondary'),
        tertiary: getM3Color('--md-sys-color-tertiary'),
        error: getM3Color('--md-sys-color-error'),
        outline: getM3Color('--md-sys-color-outline-variant'),
        text: getM3Color('--md-sys-color-on-surface'),
        textVariant: getM3Color('--md-sys-color-on-surface-variant'),
    };
}

export function updateCharts(history: HistoryEntry[], range: string) {
    const colors = getChartColors();
    
    // Chart.jsのグローバル設定をM3に合わせる
    if (typeof Chart !== 'undefined') {
        Chart.defaults.color = colors.textVariant;
        Chart.defaults.font.family = "'Noto Sans JP', sans-serif";
        Chart.defaults.borderColor = colors.outline;
    }

    let filteredHistory = history;
    
    if (range !== 'all') {
        const days = parseInt(range, 10);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        filteredHistory = history.filter(h => new Date(h.timestamp) >= cutoff);
    }
    
    updatePropertyChart(filteredHistory, colors);
    updateMoveInChart(filteredHistory, colors);
}

function updatePropertyChart(history: HistoryEntry[], colors: any) {
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
                    borderColor: colors.primary,
                    backgroundColor: colors.primary + '1A',
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
    
    const latestEntry = history[history.length - 1];
    const properties = latestEntry.properties;
    
    const palette = [
        colors.primary,
        colors.secondary,
        colors.tertiary,
        '#8B5CF6', // Violet
        '#EC4899', // Pink
        '#06B6D4', // Cyan
    ];
    
    const datasets: any[] = properties.map((property, index) => {
        const color = palette[index % palette.length];
        
        const data = history.map(h => {
            const p = h.properties.find(pr => pr.id === property.id);
            return p ? p.count : null;
        });
        
        return {
            label: property.name,
            data: data,
            borderColor: color,
            backgroundColor: color + '1A',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            borderWidth: 2
        };
    });
    
    const totalData = history.map(h => {
        return h.properties.reduce((sum, p) => sum + (p.count || 0), 0);
    });
    
    datasets.push({
        label: '合計',
        data: totalData,
        borderColor: colors.text,
        backgroundColor: 'transparent',
        fill: false,
        borderWidth: 3,
        borderDash: [5, 5],
        tension: 0.4,
        pointRadius: 0
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
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: { size: 12, weight: '500' }
                    }
                },
                tooltip: { 
                    mode: 'index', 
                    intersect: false,
                    backgroundColor: colors.text,
                    titleColor: getM3Color('--md-sys-color-surface'),
                    bodyColor: getM3Color('--md-sys-color-surface'),
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: colors.outline },
                    ticks: { padding: 10 }
                }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false }
        }
    });
}

function updateMoveInChart(history: HistoryEntry[], colors: any) {
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
                datasets: [{ label: '件数', data: [0] }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
        return;
    }
    
    const labels = history.map(h => {
        const date = new Date(h.timestamp);
        return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit' });
    });
    
    const allCategories = new Set<string>();
    history.forEach(h => {
        h.properties.forEach(p => {
            if (p.moveInBreakdown) {
                Object.keys(p.moveInBreakdown).forEach(key => allCategories.add(key));
            }
        });
    });
    
    const sortedCategories = Array.from(allCategories).sort((a, b) => {
        if (a === '即入居可') return -1;
        if (b === '即入居可') return 1;
        if (a === '相談') return -1;
        if (b === '相談') return 1;
        return a.localeCompare(b, 'ja');
    });
    
    const palette = [
        colors.primary,
        colors.secondary,
        colors.tertiary,
        '#8B5CF6', '#EC4899', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'
    ];
    
    const datasets: any[] = sortedCategories.map((category, index) => {
        const color = palette[index % palette.length];
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
            borderColor: color,
            backgroundColor: color + '33',
            fill: false,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            borderWidth: 2
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
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: { size: 12, weight: '500' }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: colors.text,
                    titleColor: getM3Color('--md-sys-color-surface'),
                    bodyColor: getM3Color('--md-sys-color-surface'),
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: colors.outline },
                    ticks: { padding: 10 }
                }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false }
        }
    });
}
