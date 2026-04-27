import * as Utils from './utils.js';
import * as Narratives from './narratives.js';
import { initI18n, setLanguage, getCurrentLanguage, t } from './i18n.js';
import * as Mapping from './mapping.js';
import * as History from './history.js';
import * as Exporter from './export.js';
import { Router } from './router.js';

// DOM Elements
const elements = {
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('file-input'),
    resetBtn: document.getElementById('reset-btn'),
    introState: document.getElementById('intro-state'),
    loadingState: document.getElementById('loading-state'),
    dashboardState: document.getElementById('dashboard-state'),
    themeToggle: document.getElementById('theme-toggle'),
    langSelector: document.getElementById('lang-selector'),
    startAnalysisBtn: document.getElementById('start-analysis-btn'),
    viewHistoryBtn: document.getElementById('view-history-btn'),
    analysisSection: document.getElementById('analysis-section'),
    historySection: document.getElementById('history-section'),
    previewImage: document.getElementById('preview-image'),
    fileBasicInfo: document.getElementById('file-basic-info'),
    mapContainerCard: document.getElementById('map-container-card'),
    metadataContainer: document.getElementById('metadata-container'),
    gpsCoords: document.getElementById('gps-coords'),
    mapActions: document.getElementById('map-actions'),
    expertAnalysisCard: document.getElementById('expert-analysis-card'),
    expertAnalysisContent: document.getElementById('expert-analysis-content'),
    historyList: document.getElementById('history-list'),
    historySearch: document.getElementById('history-search'),
    clearHistoryBtn: document.getElementById('clear-history'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    // New Multi-Asset Elements
    combinedAnalysisCard: document.getElementById('combined-analysis-card'),
    combinedAnalysisContent: document.getElementById('combined-analysis-content'),
    assetSelectorContainer: document.getElementById('asset-selector-container'),
    assetSelectorList: document.getElementById('asset-selector-list'),
    assetCountBadge: document.getElementById('asset-count-badge'),
    modeBtns: document.querySelectorAll('.mode-btn'),
    historyFilterBtns: document.querySelectorAll('.filter-btn'),
    exportContainer: document.getElementById('export-container'),
    exportMainBtn: document.getElementById('export-main-btn'),
    exportMenu: document.getElementById('export-menu'),
    logo: document.querySelector('.logo'),
    showPathToggle: document.getElementById('show-path-toggle'),
    sanitizeMainBtn: document.getElementById('sanitize-main-btn'),
    prevModeBtn: document.getElementById('prev-mode-btn'),
    nextModeBtn: document.getElementById('next-mode-btn')
};

let state = {
    map: null,
    marker: null,
    markerGroup: null,
    pathLayer: null,
    currentPreviewUrl: null,
    assets: [],
    activeAssetIndex: 0,
    uploadMode: 'single', // 'single' or 'batch'
    historyFilter: 'all',
    forensicId: null
};

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    await initI18n();
    initTheme();
    initLang();
    initTabs();
    initHistory();
    initDropzone();
    initExport();
    initRouter();
    initToast();
    
    elements.startAnalysisBtn.addEventListener('click', () => {
        Router.navigate('#/upload');
    });
    
    elements.viewHistoryBtn.addEventListener('click', () => {
        Router.navigate('#/history');
    });

    elements.resetBtn.addEventListener('click', () => {
        window.location.hash = '#/';
    });
    elements.showPathToggle.addEventListener('change', () => {
        if (state.assets.length > 1) {
            renderMultiAssetDashboard();
        }
    });

    elements.logo.addEventListener('click', () => {
        window.location.hash = '#/';
    });
    if (window.lucide) lucide.createIcons();
});

function initTheme() {
    const savedTheme = localStorage.getItem('forensic_theme') || 'light';
    applyTheme(savedTheme);

    elements.themeToggle.addEventListener('click', () => {
        const isDark = document.body.classList.contains('dark-mode');
        const newTheme = isDark ? 'light' : 'dark';
        applyTheme(newTheme);
        localStorage.setItem('forensic_theme', newTheme);
    });
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

function initTabs() {
    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            const path = tabId === 'upload' ? '#/upload' : `#/${tabId}`;
            Router.navigate(path);
        });
    });
}

function switchTab(tabId) {
    elements.tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
    elements.tabContents.forEach(c => c.classList.toggle('active', c.id === `tab-${tabId}`));
    if (tabId === 'history') refreshHistory();
}


function initRouter() {
    const routes = [
        { 
            path: '#/', 
            action: () => {
                switchState('intro');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        },
        { 
            path: '#/upload', 
            action: () => {
                switchState('intro');
                switchTab('upload');
                elements.analysisSection.scrollIntoView({ behavior: 'smooth' });
            }
        },
        { 
            path: '#/history', 
            action: () => {
                switchState('intro');
                switchTab('history');
                elements.historySection.scrollIntoView({ behavior: 'smooth' });
            }
        },
        { 
            path: '#/dashboard', 
            guard: () => state.assets && state.assets.length > 0,
            action: () => {
                switchState('dashboard');
                elements.resetBtn.classList.remove('hidden');
                elements.exportContainer.classList.remove('hidden');
            }
        }
    ];

    state.router = new Router(routes);
}

function refreshHistory() {
    History.renderHistoryItems(elements.historyList, elements.historySearch.value, state.historyFilter, loadFromHistory);
}

function initHistory() {
    elements.historySearch.addEventListener('input', (e) => {
        refreshHistory();
    });

    elements.historyFilterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            state.historyFilter = btn.dataset.filter;
            elements.historyFilterBtns.forEach(b => b.classList.toggle('active', b === btn));
            refreshHistory();
        });
    });

    elements.clearHistoryBtn.addEventListener('click', () => {
        Utils.showConfirm({
            title: t('history_clear_confirm_title'),
            message: t('history_clear_confirm_msg'),
            confirmText: t('history_clear_confirm_btn'),
            type: 'danger',
            onConfirm: () => {
                History.clearHistory();
                refreshHistory();
            }
        });
    });
}

function initExport() {
    elements.exportMainBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.exportMenu.classList.toggle('active');
    });

    document.addEventListener('click', () => {
        elements.exportMenu.classList.remove('active');
    });

    elements.exportMenu.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            const format = btn.dataset.format;
            const title = state.assets.length > 1 
                ? t('history_more', {name: state.assets[0].fileName, n: state.assets.length - 1})
                : state.assets[0].fileName;

            switch(format) {
                case 'pdf': Exporter.exportToPdf(state.assets, title, state.forensicId); break;
                case 'md': Exporter.exportToMd(state.assets, title, state.forensicId); break;
                case 'json': Exporter.exportToJson(state.assets, title, state.forensicId); break;
                case 'csv': Exporter.exportToCsv(state.assets, title, state.forensicId); break;
                case 'clipboard': Exporter.copyToClipboard(state.assets, title, state.forensicId); break;
            }
        });
    });
}

function initDropzone() {
    // Mode toggle
    const setUploadMode = (mode) => {
        state.uploadMode = mode;
        elements.modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
        elements.fileInput.multiple = (mode === 'batch');
        elements.dropzone.classList.toggle('remove-mode', mode === 'remove');
    };

    elements.modeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            setUploadMode(btn.dataset.mode);
        });
    });

    if (elements.prevModeBtn && elements.nextModeBtn) {
        const modes = ['single', 'batch', 'remove'];
        
        elements.prevModeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const currentIndex = modes.indexOf(state.uploadMode);
            const prevIndex = (currentIndex - 1 + modes.length) % modes.length;
            setUploadMode(modes[prevIndex]);
        });

        elements.nextModeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const currentIndex = modes.indexOf(state.uploadMode);
            const nextIndex = (currentIndex + 1) % modes.length;
            setUploadMode(modes[nextIndex]);
        });
    }
    
    elements.sanitizeMainBtn.addEventListener('click', () => {
        const currentAsset = state.assets[state.activeAssetIndex];
        if (currentAsset) {
            if (currentAsset.fileObject) {
                handleSanitization(currentAsset.fileObject);
            } else {
                Utils.showConfirm({
                    title: t('reupload_required_title'),
                    message: t('reupload_required_msg'),
                    confirmText: t('go_to_upload'),
                    onConfirm: () => resetApp()
                });
            }
        }
    });
    elements.dropzone.addEventListener('click', () => {
        elements.fileInput.click();
    });

    elements.dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.dropzone.classList.add('dragover');
    });

    elements.dropzone.addEventListener('dragleave', () => {
        elements.dropzone.classList.remove('dragover');
    });

    elements.dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFiles(e.dataTransfer.files);
        }
    });

    elements.fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFiles(e.target.files);
            e.target.value = ''; // Reset input value so the same file can be picked again
        }
    });
}

// Main Logic
async function handleFiles(fileList) {
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    const MAX_BATCH_FILES = 50;
    
    const incomingFiles = Array.from(fileList);
    
    if (incomingFiles.length > MAX_BATCH_FILES) {
        alert(t('err_batch_limit', {n: MAX_BATCH_FILES}));
        return;
    }

    const files = incomingFiles.filter(f => {
        const isImage = f.type.startsWith('image/');
        const isForensicFormat = /\.(heic|heif|tiff|tif|dng|cr2|nef|arw|orf|srw|raw)$/i.test(f.name);
        
        if (!isImage && !isForensicFormat) return false;
        
        if (f.size > MAX_FILE_SIZE) {
            console.warn(`File ${f.name} ignored: Exceeds 100MB limit.`);
            return false;
        }
        return true;
    });

    if (files.length === 0) {
        alert(t('err_invalid_files'));
        return;
    }

    if (state.uploadMode === 'remove') {
        // Just process the first file for removal in this mode
        const file = files[0];
        handleSanitization(file);
        switchState('intro');
        return;
    }

    switchState('loading');
    state.assets = [];
    state.activeAssetIndex = 0;

    for (const file of files) {
        try {
            const options = { tiff: true, xmp: true, icc: true, iptc: true, jfif: true, ihdr: true, gps: true };
            const exifData = await exifr.parse(file, options);
            const thumbUrl = await History.createThumbnail(file);
            
            state.assets.push({
                id: Date.now() + Math.random(),
                fileName: file.name,
                fileObject: file,
                fileSize: file.size,
                fileType: file.type,
                fileDate: file.lastModified,
                exifData: exifData || {},
                thumbUrl: thumbUrl,
                locationData: null
            });
        } catch (error) {
            console.error(`Error processing ${file.name}:`, error);
        }
    }

    if (state.assets.length > 0) {
        // Save the entire session
        const session = History.saveSession(state.assets);
        state.forensicId = session.forensicId;
        renderMultiAssetDashboard();
        Router.navigate('#/dashboard');
    } else {
        renderNoExif();
        Router.navigate('#/');
    }
}

async function handleSanitization(file) {
    Utils.showRemovalModal({
        onConfirm: async (options) => {
            switchState('loading');
            try {
                let cleanedBlob;
                if (options.all) {
                    cleanedBlob = await Utils.stripAllMetadata(file);
                } else {
                    cleanedBlob = await Utils.stripSpecificMetadata(file, options);
                }
                
                Utils.downloadBlob(cleanedBlob, file.name);
                
                // Show success modal
                Utils.showConfirm({
                    title: t('sanitization_complete_title'),
                    message: t('sanitization_complete_msg'),
                    confirmText: t('done'),
                    type: 'info'
                });
            } catch (err) {
                console.error("Sanitization failed:", err);
                alert(t('err_sanitize_failed'));
            }
            switchState(state.assets.length > 0 ? 'dashboard' : 'intro');
        },
        onCancel: () => {
            switchState(state.assets.length > 0 ? 'dashboard' : 'intro');
        }
    });
}

async function renderMultiAssetDashboard() {
    // 1. Asset Selector
    renderAssetSelector();
    
    // 2. Combined Analysis
    renderCombinedAnalysis();

    // 3. Map (Multi-pin)
    await initMultiPinMap();

    // 4. Initial Asset View
    switchAsset(0);
}

function renderAssetSelector() {
    elements.assetSelectorContainer.classList.remove('hidden');
    elements.assetCountBadge.textContent = t('asset_count', {n: state.assets.length});
    elements.assetSelectorList.innerHTML = '';

    state.assets.forEach((asset, index) => {
        const btn = document.createElement('button');
        btn.className = `asset-thumb-btn ${index === state.activeAssetIndex ? 'active' : ''}`;
        btn.innerHTML = `<img src="${asset.thumbUrl}" alt="${asset.fileName}">`;
        btn.addEventListener('click', () => switchAsset(index));
        elements.assetSelectorList.appendChild(btn);
    });
}

function renderCombinedAnalysis() {
    if (state.assets.length <= 1) {
        elements.combinedAnalysisCard.classList.add('hidden');
        return;
    }

    const findings = Narratives.generateCombinedAnalysis(state.assets);
    elements.combinedAnalysisContent.innerHTML = '';
    
    if (findings.length > 0) {
        elements.combinedAnalysisCard.classList.remove('hidden');
        findings.forEach(f => {
            const item = document.createElement('div');
            item.className = 'expert-item';
            item.innerHTML = `
                <div class="expert-item-header">
                    <i data-lucide="${f.icon}"></i>
                    <span>${f.title}</span>
                </div>
                <div class="expert-narrative-bubble">
                    <p>${f.narrative}</p>
                </div>
            `;
            elements.combinedAnalysisContent.appendChild(item);
        });
    } else {
        elements.combinedAnalysisCard.classList.add('hidden');
    }
    if (window.lucide) lucide.createIcons();
}

async function initMultiPinMap() {
    const firstGeo = state.assets.find(a => a.exifData?.latitude != null);
    if (!firstGeo) {
        elements.mapContainerCard.classList.add('hidden');
        return;
    }

    elements.mapContainerCard.classList.remove('hidden');
    
    if (!state.map) {
        const { map } = Mapping.initMap(firstGeo.exifData.latitude, firstGeo.exifData.longitude);
        state.map = map;
    }

    if (state.markerGroup && state.map) {
        state.map.removeLayer(state.markerGroup);
    }
    if (state.pathLayer && state.map) {
        state.map.removeLayer(state.pathLayer);
    }

    state.markerGroup = Mapping.renderMultiMarkers(state.assets, state.map);
    
    if (elements.showPathToggle.checked) {
        Mapping.renderInvestigationPath(state.assets, state.map).then(layer => {
            if (layer) state.pathLayer = layer;
        });
    }
}

async function switchAsset(index) {
    state.activeAssetIndex = index;
    const asset = state.assets[index];
    
    // Update Selector UI
    const btns = elements.assetSelectorList.querySelectorAll('.asset-thumb-btn');
    btns.forEach((b, i) => b.classList.toggle('active', i === index));

    // Update Dashboard UI
    if (asset.fileObject) {
        if (state.currentPreviewUrl) URL.revokeObjectURL(state.currentPreviewUrl);
        state.currentPreviewUrl = URL.createObjectURL(asset.fileObject);
        elements.previewImage.src = state.currentPreviewUrl;
    } else {
        elements.previewImage.src = asset.thumbUrl;
    }
    
    renderBasicFileInfo({ 
        name: asset.fileName, 
        size: asset.fileSize || 0, 
        lastModified: asset.fileDate || Date.now(), 
        type: asset.fileType || 'image/jpeg' 
    });
    
    // Handle reverse geocoding if needed
    if (asset.exifData?.latitude != null && !asset.locationData) {
        asset.locationData = await Mapping.reverseGeocode(asset.exifData.latitude, asset.exifData.longitude);
    }

    renderExpertAnalysis(asset);
    renderMetadata(asset.exifData);
    
    if (asset.exifData?.latitude != null) {
        elements.gpsCoords.textContent = t('gps_coords', {
            lat: asset.exifData.latitude.toFixed(6),
            lng: asset.exifData.longitude.toFixed(6)
        });
        Mapping.updateMapLinks(asset.exifData.latitude, asset.exifData.longitude, elements.mapActions);
        elements.mapContainerCard.classList.remove('no-gps');
    } else {
        elements.gpsCoords.textContent = t('no_gps');
        elements.mapActions.innerHTML = '';
        elements.mapContainerCard.classList.add('no-gps');
    }
}

function loadFromHistory(session) {
    // Session structure from history.js: { assets: [...], isBatch: bool, ... }
    state.assets = session.assets;
    state.activeAssetIndex = 0;
    state.forensicId = session.forensicId;
    renderMultiAssetDashboard();
    Router.navigate('#/dashboard');
}

function renderExpertAnalysis(asset) {
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

    const geoNarrative = Narratives.generateGeospatialNarrative(data.latitude, data.longitude, asset.locationData);
    appendExpertItem('map-pin', t('analysis_geospatial'), geoNarrative);

    categories.forEach(cat => {
        const props = categorized[cat.name];
        if (props && Object.keys(props).length > 0) {
            appendExpertItem(cat.icon, t(cat.analysis), cat.generator(props));
        }
    });

    if (window.lucide) lucide.createIcons();
}

function appendExpertItem(icon, title, narrative) {
    const item = document.createElement('div');
    item.className = 'expert-item';
    item.innerHTML = `
        <div class="expert-item-header">
            <i data-lucide="${icon}"></i>
            <span>${Utils.escapeHTML(title)}</span>
        </div>
        <div class="expert-narrative-bubble">
            <p>${narrative}</p>
        </div>
    `;
    elements.expertAnalysisContent.appendChild(item);
}

function renderMetadata(data) {
    elements.metadataContainer.innerHTML = '';
    const categorized = Utils.categorizeExif(data);

    for (const [category, props] of Object.entries(categorized)) {
        const keys = Object.keys(props);
        if (keys.length === 0) continue;

        const card = document.createElement('div');
        const isImportant = ['Device Hardware', 'Exposure Settings', 'Optics & Lens', 'Image Quality', 'Timeline & Date'].includes(category);
        const isSecondary = ['Standards & Info', 'Miscellaneous'].includes(category);
        
        const catKey = Utils.getCategoryKey(category);
        const translatedCategory = t(catKey);
        
        card.className = `card ${isImportant ? 'important-card' : ''} ${isSecondary ? 'secondary-card' : ''}`;
        card.innerHTML = `
            <div class="card-header">
                <i data-lucide="${Utils.getCategoryIcon(category)}"></i>
                <h3>${translatedCategory}</h3>
            </div>
            <div class="card-body">
                <details class="raw-data-toggle">
                    <summary>${t('view_details', {cat: translatedCategory})}</summary>
                    <div class="data-grid mt-4">
                        ${keys.sort().map(key => `
                            <div class="data-item">
                                <div class="data-label">${Utils.escapeHTML(Utils.formatLabel(key))}</div>
                                <div class="data-value">${Utils.escapeHTML(Utils.formatValue(key, props[key]))}</div>
                            </div>
                        `).join('')}
                    </div>
                </details>
            </div>
        `;
        elements.metadataContainer.appendChild(card);
    }
    if (window.lucide) lucide.createIcons();
}

function renderBasicFileInfo(file) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    const lastModified = Utils.formatFullDate(file.lastModified);
    elements.fileBasicInfo.innerHTML = `
        <div class="info-item">
            <span class="info-label">${t('file_name')}</span>
            <span class="info-value">${Utils.escapeHTML(file.name)}</span>
        </div>
        <div class="info-item">
            <span class="info-label">${t('file_type')}</span>
            <span class="info-value">${Utils.escapeHTML(file.type || 'Unknown')}</span>
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

function renderNoExif() {
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

function switchState(s) {
    elements.introState.classList.add('hidden');
    elements.loadingState.classList.add('hidden');
    elements.dashboardState.classList.add('hidden');
    
    if (s === 'intro') {
        elements.introState.classList.remove('hidden');
        elements.resetBtn.classList.add('hidden');
        elements.exportContainer.classList.add('hidden');
        elements.sanitizeMainBtn.classList.add('hidden');
    } else if (s === 'loading') {
        elements.loadingState.classList.remove('hidden');
        elements.resetBtn.classList.add('hidden');
        elements.exportContainer.classList.add('hidden');
        elements.sanitizeMainBtn.classList.add('hidden');
    } else if (s === 'dashboard') {
        elements.dashboardState.classList.remove('hidden');
        elements.resetBtn.classList.remove('hidden');
        elements.exportContainer.classList.remove('hidden');
        elements.sanitizeMainBtn.classList.remove('hidden');
        if (state.map) setTimeout(() => state.map.invalidateSize(), 100);
    }
}

function resetApp() {
    elements.fileInput.value = '';
    elements.metadataContainer.innerHTML = '';
    elements.expertAnalysisContent.innerHTML = '';
    elements.expertAnalysisCard.classList.add('hidden');
    elements.exportContainer.classList.add('hidden');
    elements.sanitizeMainBtn.classList.add('hidden');
    state.assets = [];
    Router.navigate('#/');
}
function initLang() {
    const langToggle = document.getElementById('lang-toggle');
    const langLabel = document.getElementById('current-lang-label');
    
    if (langToggle) {
        // Set initial label
        langLabel.textContent = getCurrentLanguage().toUpperCase();
        
        langToggle.addEventListener('click', async () => {
            const nextLang = getCurrentLanguage() === 'en' ? 'id' : 'en';
            await setLanguage(nextLang);
            langLabel.textContent = nextLang.toUpperCase();
            
            // Re-render certain parts if needed (most are handled by translatePage)
            // But if we are in the middle of a dashboard view, we might need to refresh narratives
            if (state.assets.length > 0) {
                renderAssetSelector();
                renderCombinedAnalysis();
                switchAsset(state.activeAssetIndex);
            }
            
            // Refresh history if it's open
            if (document.querySelector('.tab-btn[data-tab="history"]').classList.contains('active')) {
                refreshHistory();
            }
        });
    }
}

function initToast() {
    document.addEventListener('toast', (e) => {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = e.detail.message;
        
        container.appendChild(toast);
        
        // Remove after animation
        setTimeout(() => {
            toast.remove();
        }, 3000);
    });
}
