import * as Utils from './utils.js';

const HISTORY_KEY = 'exif_forensic_history';
const MAX_HISTORY = 20;

export async function createThumbnail(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const maxDim = 600; // Increased from 300 for high-DPI support
                let w = img.width;
                let h = img.height;
                if (w > h) {
                    if (w > maxDim) { h *= maxDim / w; w = maxDim; }
                } else {
                    if (h > maxDim) { w *= maxDim / h; h = maxDim; }
                }
                canvas.width = w;
                canvas.height = h;
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.8)); // Increased quality from 0.7
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

export function saveSession(assets) {
    if (!assets || assets.length === 0) return;
    
    const history = getHistory();
    const firstAsset = assets[0];
    
    const session = {
        id: Date.now(),
        date: new Date().toISOString(),
        isBatch: assets.length > 1,
        assetCount: assets.length,
        // Save minimal data to avoid localStorage limits
        assets: assets.map(a => ({
            id: a.id,
            fileName: a.fileName,
            fileSize: a.fileSize,
            fileType: a.fileType,
            fileDate: a.fileDate,
            exifData: a.exifData,
            thumbUrl: a.thumbUrl
        })),
        mainThumb: firstAsset.thumbUrl,
        sessionTitle: assets.length > 1 
            ? `${firstAsset.fileName} + ${assets.length - 1} more` 
            : firstAsset.fileName
    };
    
    history.unshift(session);
    if (history.length > MAX_HISTORY) history.pop();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function getHistory() {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        // Basic validation: ensure every item has required fields
        return Array.isArray(parsed) ? parsed.filter(item => item && item.assets) : [];
    } catch (e) {
        console.error('Failed to parse history:', e);
        return [];
    }
}

export function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
}

export function deleteHistoryItem(id) {
    const history = getHistory();
    const updated = history.filter(item => item.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export function renderHistoryItems(container, query = '', filter = 'all', onLoad) {
    let history = getHistory();
    
    // Apply Type Filter
    if (filter === 'single') {
        history = history.filter(item => !item.isBatch);
    } else if (filter === 'batch') {
        history = history.filter(item => item.isBatch);
    }

    // Apply Search Query
    const filtered = history.filter(item => 
        item.sessionTitle.toLowerCase().includes(query.toLowerCase())
    );
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-history">
                <i data-lucide="database"></i>
                <p>${query || filter !== 'all' ? `No matches found for "${Utils.escapeHTML(query)}"` : 'No previous analyses found'}</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }
    
    container.innerHTML = '';
    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = `history-card ${item.isBatch ? 'batch-item' : ''}`;
        card.innerHTML = `
            <div class="history-thumb">
                <img src="${item.mainThumb}" alt="${item.sessionTitle}">
                ${item.isBatch ? `<div class="batch-badge"><i data-lucide="layers"></i> ${item.assetCount}</div>` : ''}
            </div>
            <div class="history-info">
                <div class="history-name">${Utils.escapeHTML(item.sessionTitle)}</div>
                <div class="history-meta">
                    <span class="history-date">
                        ${new Date(item.date).toLocaleDateString('en-GB')} • ${new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span>${item.isBatch ? `${item.assetCount} Assets` : Utils.escapeHTML(item.assets[0]?.exifData?.Make || 'Unknown')}</span>
                </div>
            </div>
            <button class="history-delete-btn" title="Delete record" data-id="${item.id}">
                <i data-lucide="trash-2"></i>
            </button>
        `;
        
        card.addEventListener('click', (e) => {
            if (e.target.closest('.history-delete-btn')) {
                e.stopPropagation();
                Utils.showConfirm({
                    title: 'Delete Forensic Record',
                    message: `Are you sure you want to permanently purge the record for "${item.sessionTitle}"? This action cannot be reversed.`,
                    confirmText: 'Purge Record',
                    type: 'danger',
                    onConfirm: () => {
                        deleteHistoryItem(item.id);
                        renderHistoryItems(container, query, filter, onLoad);
                    }
                });
                return;
            }
            onLoad(item);
        });
        
        container.appendChild(card);
    });
    
    if (window.lucide) lucide.createIcons();
}
