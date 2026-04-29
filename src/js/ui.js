import * as Utils from './utils.js';
import * as Narratives from './narratives.js';
import { t } from './i18n.js';

// FUNGSI: Menggambar barisan antrean berkas tertunda ke UI
export function renderStagedFiles(state, elements) {
    if (!state.stagedFiles || state.stagedFiles.length === 0) {
        elements.stagedFilesContainer.classList.add('hidden');
        elements.stagedFilesList.innerHTML = '';
        return;
    }

    elements.stagedFilesContainer.classList.remove('hidden');
    elements.stagedFilesList.innerHTML = state.stagedFiles.map((file, idx) => {
        const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        return `
            <div class="staged-file-item">
                <div class="staged-file-info">
                    <span class="staged-file-name" title="${Utils.escapeHTML(file.name)}">${Utils.escapeHTML(file.name)}</span>
                    <span class="staged-file-size">${sizeInMB} MB</span>
                </div>
                <button class="remove-staged-item" data-index="${idx}" aria-label="Remove item">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        `;
    }).join('');

    elements.stagedFilesList.querySelectorAll('.remove-staged-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            state.stagedFiles.splice(index, 1);
            renderStagedFiles(state, elements);
        });
    });

    if (window.lucide) lucide.createIcons();
}

// FUNGSI: Merender pemilih item gambar di panel kiri
export function renderAssetSelector(state, elements, onAssetSelect) {
    elements.assetSelectorContainer.classList.remove('hidden');
    elements.assetCountBadge.textContent = t('asset_count', {n: state.assets.length});
    elements.assetSelectorList.innerHTML = '';

    // Check/create quick filters
    let filterContainer = elements.assetSelectorContainer.querySelector('.asset-selector-filters');
    if (!filterContainer) {
        filterContainer = document.createElement('div');
        filterContainer.className = 'asset-selector-filters';
        elements.assetSelectorContainer.insertBefore(filterContainer, elements.assetSelectorList);
    }
    
    // Initialize filter state if not present
    if (!state.assetFilter) state.assetFilter = 'all';

    const filterAllText = t('filter_all', {}, 'narratives') || 'All Assets';
    
    // Render filter buttons
    filterContainer.innerHTML = `
        <button class="asset-filter-btn ${state.assetFilter === 'all' ? 'active' : ''}" data-filter="all">
            <i data-lucide="layers"></i><span>${filterAllText}</span>
        </button>
        <button class="asset-filter-btn ${state.assetFilter === 'complete' ? 'active' : ''}" data-filter="complete">
            <i data-lucide="check-circle"></i><span>${t('filter_complete', {}, 'narratives') || 'Complete'}</span>
        </button>
        <button class="asset-filter-btn ${state.assetFilter === 'stripped' ? 'active' : ''}" data-filter="stripped">
            <i data-lucide="alert-triangle"></i><span>${t('filter_stripped', {}, 'narratives') || 'Stripped'}</span>
        </button>
    `;
    
    if (window.lucide) lucide.createIcons();

    // Attach click listeners to filter buttons
    filterContainer.querySelectorAll('.asset-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            state.assetFilter = btn.dataset.filter;
            renderAssetSelector(state, elements, onAssetSelect);
        });
    });

    // Populate filtered assets
    state.assets.forEach((asset, index) => {
        const hasHW = asset.exifData?.Make || asset.exifData?.Model;
        const hasTime = asset.exifData?.DateTimeOriginal || asset.exifData?.CreateDate || asset.exifData?.DateTime;
        const hasGeo = asset.exifData?.latitude != null && asset.exifData?.longitude != null;

        const isFullyStripped = !hasHW && !hasTime && !hasGeo;
        const isPartiallyStripped = (hasHW || hasTime || hasGeo) && !(hasHW && hasTime && hasGeo);
        
        const isStripped = isFullyStripped || isPartiallyStripped;

        if (state.assetFilter === 'complete' && isStripped) return;
        if (state.assetFilter === 'stripped' && !isStripped) return;

        const btn = document.createElement('button');
        btn.className = `asset-thumb-btn ${index === state.activeAssetIndex ? 'active' : ''}`;
        btn.dataset.index = index;
        
        let badgesHtml = '';
        if (hasGeo) {
            badgesHtml += `<span class="badge-geo" title="${t('analysis_geospatial')}"><i data-lucide="map-pin"></i></span>`;
        }
        if (isStripped) {
            badgesHtml += `<span class="badge-stripped" title="${t('empty_all', {}, 'narratives')}"><i data-lucide="alert-triangle"></i></span>`;
        }

        const sizeInMB = (asset.fileSize / (1024 * 1024)).toFixed(2);

        btn.innerHTML = `
            <div class="asset-card-thumb">
                <img src="${asset.thumbUrl}" alt="${Utils.escapeHTML(asset.fileName)}">
                <div class="asset-card-badges">${badgesHtml}</div>
            </div>
            <div class="asset-card-info">
                <span class="asset-card-name">${Utils.escapeHTML(asset.fileName)}</span>
                <span class="asset-card-size">${sizeInMB} MB</span>
            </div>
        `;

        btn.addEventListener('click', () => onAssetSelect(index));
        elements.assetSelectorList.appendChild(btn);
    });
    
    if (elements.assetSelectorList.children.length === 0) {
        elements.assetSelectorList.innerHTML = `<div class="text-muted" style="padding: 16px; text-align: center; width: 100%;">${t('no_metadata_tags', {}, 'narratives')}</div>`;
    }

    if (window.lucide) lucide.createIcons();
}

// FUNGSI: Menyusun data naratif gabungan banyak berkas
export function renderCombinedAnalysis(state, elements) {
    if (state.assets.length <= 1) {
        elements.combinedAnalysisCard.classList.add('hidden');
        return;
    }

    const findings = Narratives.generateCombinedAnalysis(state.assets);
    elements.combinedAnalysisContent.innerHTML = '';
    
    const parent = elements.combinedAnalysisContent.parentNode;
    const existingWrapper = parent.querySelector('.tabs-wrapper');
    if (existingWrapper) existingWrapper.remove();

    if (findings.length > 0) {
        elements.combinedAnalysisCard.classList.remove('hidden');
        
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'expert-tabs-container combined-tabs';
        
        findings.forEach((f, index) => {
            const btn = document.createElement('button');
            btn.className = `expert-tab-btn ${index === 0 ? 'active' : ''}`;
            btn.dataset.id = `combined-${index}`;
            btn.dataset.index = index;
            btn.innerHTML = `<i data-lucide="${f.icon}"></i><span>${Utils.escapeHTML(f.title)}</span>`;
            
            const pane = document.createElement('div');
            pane.className = `expert-tab-pane ${index === 0 ? 'active' : ''}`;
            pane.innerHTML = `
                <div class="expert-item">
                    <div class="expert-item-header">
                        <i data-lucide="${f.icon}"></i>
                        <span>${Utils.escapeHTML(f.title)}</span>
                    </div>
                    <div class="expert-narrative-bubble">
                        <div>${f.narrative}</div>
                    </div>
                </div>
            `;
            
            btn.addEventListener('click', () => {
                const contentBlock = elements.combinedAnalysisContent;
                contentBlock.querySelectorAll('.expert-tab-pane').forEach(p => p.classList.remove('active'));
                pane.classList.add('active');
                
                tabsContainer.querySelectorAll('.expert-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
            
            tabsContainer.appendChild(btn);
            elements.combinedAnalysisContent.appendChild(pane);
        });
        
        const wrapper = document.createElement('div');
        wrapper.className = 'tabs-wrapper';
        parent.insertBefore(wrapper, elements.combinedAnalysisContent);
        injectTabArrows(wrapper, tabsContainer);
        
    } else {
        elements.combinedAnalysisCard.classList.add('hidden');
    }
    if (window.lucide) lucide.createIcons();
}

// FUNGSI: Menampilkan analisis forensik pintar individu
export function renderExpertAnalysis(asset, elements) {
    const data = asset.exifData;
    const categorized = Utils.categorizeExif(data);
    elements.expertAnalysisContent.innerHTML = '';
    elements.expertAnalysisCard.classList.remove('hidden');

    const categories = [
        { name: 'Device Hardware', key: 'cat_hardware', analysis: 'analysis_hardware', generator: Narratives.generateHardwareNarrative, icon: 'camera' },
        { name: 'Exposure Settings', key: 'cat_exposure', analysis: 'analysis_exposure', generator: Narratives.generateExposureNarrative, icon: 'aperture' },
        { name: 'Optics & Lens', key: 'cat_optics', analysis: 'analysis_optics', generator: Narratives.generateOpticsNarrative, icon: 'focus' },
        { name: 'Image Quality', key: 'cat_quality', analysis: 'analysis_quality', generator: Narratives.generateQualityNarrative, icon: 'file-image' },
        { name: 'Timeline & Date', key: 'cat_timeline', analysis: 'analysis_timeline', generator: Narratives.generateTimelineNarrative, icon: 'clock' }
    ];

    const hasAnyImportant = ['Device Hardware', 'Exposure Settings', 'Optics & Lens', 'Image Quality', 'Timeline & Date'].some(catName => {
        const props = categorized[catName];
        return props && Object.keys(props).length > 0;
    });
    const hasGeo = data.latitude != null && data.longitude != null;
    const isCompletelyStripped = !hasAnyImportant && !hasGeo;

    const items = [];
    
    // Geospatial
    let geoNarrative = Narratives.generateGeospatialNarrative(data.latitude, data.longitude, asset.locationData);
    if (!hasGeo && isCompletelyStripped) {
        geoNarrative = `<div class="expert-empty-state" style="color: #ea580c;"><strong>${t('empty_all', {}, 'narratives')}</strong></div>`;
    } else if (!hasGeo) {
        geoNarrative = `<span class="text-muted">${t('empty_geospatial', {}, 'narratives')}</span>`;
    }
    items.push({ icon: 'map-pin', title: t('analysis_geospatial'), narrative: geoNarrative, id: 'geo' });

    categories.forEach(cat => {
        const props = categorized[cat.name];
        const hasData = props && Object.keys(props).length > 0;
        
        let narrative = '';
        if (hasData) {
            narrative = cat.generator(props);
        } else if (isCompletelyStripped) {
            narrative = `<div class="expert-empty-state" style="color: #ea580c;"><strong>${t('empty_all', {}, 'narratives')}</strong></div>`;
        } else {
            const fallbackKey = `empty_${cat.key.replace('cat_', '')}`;
            narrative = `<span class="text-muted">${t(fallbackKey, {}, 'narratives')}</span>`;
        }
            
        items.push({ icon: cat.icon, title: t(cat.analysis), narrative, id: cat.key });
    });

    const parent = elements.expertAnalysisContent.parentNode;
    const existingWrapper = parent.querySelector('.tabs-wrapper');
    if (existingWrapper) existingWrapper.remove();

    if (items.length > 0) {
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'expert-tabs-container expert-tabs';

        items.forEach((item, index) => {
            const btn = document.createElement('button');
            btn.className = `expert-tab-btn ${index === 0 ? 'active' : ''}`;
            btn.dataset.id = item.id;
            btn.dataset.index = index;
            btn.innerHTML = `<i data-lucide="${item.icon}"></i><span>${Utils.escapeHTML(item.title)}</span>`;
            
            const pane = document.createElement('div');
            pane.className = `expert-tab-pane ${index === 0 ? 'active' : ''}`;
            pane.innerHTML = `
                <div class="expert-item">
                    <div class="expert-item-header">
                        <i data-lucide="${item.icon}"></i>
                        <span>${Utils.escapeHTML(item.title)}</span>
                    </div>
                    <div class="expert-narrative-bubble">
                        <p>${item.narrative}</p>
                    </div>
                </div>
            `;
            
            btn.addEventListener('click', () => {
                const contentBlock = elements.expertAnalysisContent;
                contentBlock.querySelectorAll('.expert-tab-pane').forEach(p => p.classList.remove('active'));
                pane.classList.add('active');
                
                tabsContainer.querySelectorAll('.expert-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
            
            tabsContainer.appendChild(btn);
            elements.expertAnalysisContent.appendChild(pane);
        });

        const wrapper = document.createElement('div');
        wrapper.className = 'tabs-wrapper';
        parent.insertBefore(wrapper, elements.expertAnalysisContent);
        
        injectTabArrows(wrapper, tabsContainer);
    }

    if (window.lucide) lucide.createIcons();
}

// FUNGSI: Melakukan parsing tabel raw metadata asli
export function renderMetadata(data, elements) {
    elements.metadataContainer.innerHTML = '';
    const categorized = Utils.categorizeExif(data);

    const items = [];
    for (const [category, props] of Object.entries(categorized)) {
        const catKey = Utils.getCategoryKey(category);
        const isImportant = ['Device Hardware', 'Exposure Settings', 'Optics & Lens', 'Image Quality', 'Timeline & Date'].includes(category);
        const isSecondary = ['Standards & Info', 'Miscellaneous'].includes(category);
        
        items.push({
            category,
            props,
            key: catKey,
            isImportant,
            isSecondary,
            icon: Utils.getCategoryIcon(category)
        });
    }

    const parent = elements.metadataContainer;
    const existingWrapper = parent.querySelector('.tabs-wrapper');
    if (existingWrapper) existingWrapper.remove();

    if (items.length > 0) {
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'expert-tabs-container metadata-tabs';

        items.forEach((item, index) => {
            const translatedCategory = t(item.key);
            const btn = document.createElement('button');
            btn.className = `expert-tab-btn ${index === 0 ? 'active' : ''}`;
            btn.dataset.id = `meta-${item.key}`;
            btn.dataset.index = index;
            btn.innerHTML = `<i data-lucide="${item.icon}"></i><span>${translatedCategory}</span>`;
            
            const pane = document.createElement('div');
            pane.className = `expert-tab-pane ${index === 0 ? 'active' : ''}`;
            
            const card = document.createElement('div');
            card.className = `card ${item.isImportant ? 'important-card' : ''} ${item.isSecondary ? 'secondary-card' : ''}`;
            
            const keys = Object.keys(item.props);
            card.innerHTML = `
                <div class="card-header">
                    <i data-lucide="${item.icon}"></i>
                    <h3>${translatedCategory}</h3>
                </div>
                <div class="card-body">
                    ${keys.length > 0 ? `
                        <div class="data-grid">
                            ${keys.sort().map(key => `
                                <div class="data-item">
                                    <div class="data-label">${Utils.escapeHTML(Utils.formatLabel(key))}</div>
                                    <div class="data-value">${Utils.escapeHTML(Utils.formatValue(key, item.props[key]))}</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `<div class="text-muted" style="padding: 24px; text-align: center; opacity: 0.7;">${t('no_metadata_tags', {}, 'narratives')}</div>`}
                </div>
            `;
            pane.appendChild(card);

            btn.addEventListener('click', () => {
                parent.querySelectorAll('.expert-tab-pane').forEach(p => p.classList.remove('active'));
                pane.classList.add('active');
                
                tabsContainer.querySelectorAll('.expert-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });

            tabsContainer.appendChild(btn);
            parent.appendChild(pane);
        });

        const wrapper = document.createElement('div');
        wrapper.className = 'tabs-wrapper';
        parent.prepend(wrapper);
        
        injectTabArrows(wrapper, tabsContainer);
    }

    if (window.lucide) lucide.createIcons();
}

// FUNGSI: Memasang informasi file dasar (Name, Size, Type)
export function renderBasicFileInfo(file, elements) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    const lastModified = Utils.formatFullDate(file.lastModified);
    elements.fileBasicInfo.innerHTML = `
        <div class="info-item">
            <span class="info-label">${t('file_name')}</span>
            <span class="info-value">${Utils.escapeHTML(file.name)}</span>
        </div>
        <div class="info-item">
            <span class="info-label">${t('file_type')}</span>
            <span class="info-value">${Utils.escapeHTML(file.type || t('unknown', {}, 'reports'))}</span>
        </div>
        <div class="info-item">
            <span class="info-label">${t('file_size')}</span>
            <span class="info-value">${sizeInMB} MB</span>
        </div>
        <div class="info-item">
            <span class="info-label">${t('file_date')}</span>
            <span class="info-value">${Utils.escapeHTML(lastModified)}</span>
        </div>
    `;
}

// FUNGSI: Memberikan pesan peringatan jika tag EXIF kosong
export function renderNoExif(elements) {
    elements.metadataContainer.innerHTML = `
        <div class="card">
            <div class="no-data">
                <i data-lucide="shield-alert"></i>
                <h3 data-i18n="no_exif_title">${t('no_exif_title')}</h3>
                <p class="text-muted" data-i18n="no_exif_desc">${t('no_exif_desc')}</p>
            </div>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}

// FUNGSI: Memasang panah navigasi statis untuk tab
export function injectTabArrows(wrapper, tabsContainer) {
    const arrowLeft = document.createElement('div');
    arrowLeft.className = 'tabs-arrow left';
    arrowLeft.innerHTML = '&lt;';
    
    const arrowRight = document.createElement('div');
    arrowRight.className = 'tabs-arrow right';
    arrowRight.innerHTML = '&gt;';
    
    const cycleTab = (direction) => {
        const buttons = Array.from(tabsContainer.querySelectorAll('.expert-tab-btn'));
        const activeIndex = buttons.findIndex(b => b.classList.contains('active'));
        if (buttons.length > 0) {
            const nextIndex = (activeIndex + direction + buttons.length) % buttons.length;
            buttons[nextIndex].click();
        }
    };
    
    arrowLeft.addEventListener('click', () => cycleTab(-1));
    arrowRight.addEventListener('click', () => cycleTab(1));
    
    wrapper.appendChild(arrowLeft);
    wrapper.appendChild(tabsContainer);
    wrapper.appendChild(arrowRight);
}
