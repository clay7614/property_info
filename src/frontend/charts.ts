/**
 * グラフ描画モジュール
 */
import { HistoryEntry } from '../shared/types';

declare const Chart: any;

let propertyChart: any = null;
let moveInChart: any = null;

export function updateCharts(history: HistoryEntry[], range: string) {
    let filteredHistory = history;
    
    if (range !== 'all') {
        const days = parseInt(range, 10);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        filteredHistory = history.filter(h => new Date(h.timestamp) >= cutoff);
    }
    
    updatePropertyChart(filteredHistory);
    updateMoveInChart(filteredHistory);
}

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
                legend: { position: 'top' },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: '物件数' }
                }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false }
        }
    });
}

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
    
    const categoryColors: {[key: string]: string} = {
        '即入居可': 'rgba(34, 197, 94, 0.7)',
        '相談': 'rgba(245, 158, 11, 0.7)'
    };
    
    const monthColors = [
        'rgba(59, 130, 246, 0.7)', 'rgba(236, 72, 153, 0.7)', 'rgba(168, 85, 247, 0.7)',
        'rgba(20, 184, 166, 0.7)', 'rgba(132, 204, 22, 0.7)', 'rgba(251, 146, 60, 0.7)',
        'rgba(239, 68, 68, 0.7)', 'rgba(34, 211, 238, 0.7)', 'rgba(163, 230, 53, 0.7)',
        'rgba(251, 191, 36, 0.7)', 'rgba(192, 132, 252, 0.7)', 'rgba(74, 222, 128, 0.7)'
    ];
    
    function getColorForCategory(category: string) {
        if (categoryColors[category]) return categoryColors[category];
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
            plugins: { legend: { position: 'top' } },
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, title: { display: true, text: '件数' } }
            }
        }
    });
}
