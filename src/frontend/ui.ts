/**
 * UI操作モジュール
 */
import { PropertyData, MoveInBreakdown, ChangeInfo } from '../shared/types';

export function displayProperties(properties: PropertyData[]) {
    const grid = document.getElementById('propertiesGrid');
    if (!grid) return;
    
    const cards = properties.map(property => {
        const moveInHtml = formatMoveInBreakdown(property.moveInBreakdown);
        const url = property.url || '#';
        
        return `
            <div class="property-card fade-in">
                <h3 class="property-name">${property.name}</h3>
                <div class="property-stats">
                    <div class="stat-row">
                        <span class="stat-label">掲載物件数</span>
                        <span class="stat-value">${property.count}</span>
                    </div>
                </div>
                <div class="move-in-breakdown">
                    <div class="move-in-list">
                        ${moveInHtml}
                    </div>
                </div>
                <div class="card-actions">
                    <a href="${url}" target="_blank" rel="noopener noreferrer" class="property-link">
                        <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 8px;">open_in_new</span>
                        詳細を見る
                    </a>
                </div>
            </div>
        `;
    }).join('');
    
    grid.innerHTML = cards;
}

export function updateSummary(properties: PropertyData[]) {
    const total = properties.reduce((sum, p) => sum + (p.count || 0), 0);
    const totalEl = document.getElementById('totalProperties');
    if (totalEl) totalEl.textContent = total.toString();
    
    const march2026 = properties.reduce((sum, p) => {
        if (!p.moveInBreakdown) return sum;
        let count = 0;
        Object.entries(p.moveInBreakdown).forEach(([key, value]) => {
            if (isMarch2026(key)) count += value;
        });
        return sum + count;
    }, 0);
    const marchEl = document.getElementById('marchCount');
    if (marchEl) marchEl.textContent = march2026.toString();
    
    const immediate = properties.reduce((sum, p) => sum + (p.moveInBreakdown?.['即入居可'] || 0), 0);
    const immediateEl = document.getElementById('immediateCount');
    if (immediateEl) immediateEl.textContent = immediate.toString();
    
    const consult = properties.reduce((sum, p) => sum + (p.moveInBreakdown?.['相談'] || 0), 0);
    const consultEl = document.getElementById('consultCount');
    if (consultEl) consultEl.textContent = consult.toString();
}

export function showChangeAlert(changeInfo: ChangeInfo) {
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

export function dismissAlert() {
    const alertEl = document.getElementById('changeAlert');
    if (alertEl) alertEl.style.display = 'none';
}

export function isMarch2026(dateStr: string) {
    return dateStr.includes('26年3月') || dateStr.includes("'26年3月");
}

function formatMoveInBreakdown(breakdown: MoveInBreakdown) {
    if (!breakdown || Object.keys(breakdown).length === 0) {
        return '<span class="move-in-tag">情報なし</span>';
    }
    
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
