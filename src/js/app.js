import * as Utils from './utils.js';
import * as Narratives from './narratives.js';
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
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    exportContainer: document.getElementById('export-container'),
    exportMainBtn: document.getElementById('export-main-btn'),
    exportMenu: document.getElementById('export-menu'),
    logo: document.querySelector('.logo'),
    showPathToggle: document.getElementById('show-path-toggle')
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
    historyFilter: 'all'
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initTabs();
    initHistory();
    initDropzone();
    initExport();
    initRouter();
    
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
                elements.resetBtn.classList.add('hidden');
                elements.exportContainer.classList.add('hidden');
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
            title: 'Delete All Records',
            message: 'This will permanently remove all forensic sessions from your browser storage. This action cannot be reversed.',
            confirmText: 'Purge All Records',
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
                ? `${state.assets[0].fileName} + ${state.assets.length - 1} others`
                : state.assets[0].fileName;

            switch(format) {
                case 'pdf': Exporter.exportToPdf(state.assets, title); break;
                case 'md': Exporter.exportToMd(state.assets, title); break;
                case 'csv': Exporter.exportToCsv(state.assets); break;
                case 'txt': Exporter.exportToTxt(state.assets, title); break;
            }
        });
    });
}

function initDropzone() {
    // Mode toggle
    elements.modeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            state.uploadMode = btn.dataset.mode;
            elements.modeBtns.forEach(b => b.classList.toggle('active', b === btn));
            elements.fileInput.multiple = (state.uploadMode === 'batch');
        });
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
        }
    });
}

// Main Logic
async function handleFiles(fileList) {
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    const MAX_BATCH_FILES = 50;
    
    const incomingFiles = Array.from(fileList);
    
    if (incomingFiles.length > MAX_BATCH_FILES) {
        alert(`Batch limit exceeded. Please upload a maximum of ${MAX_BATCH_FILES} files at once.`);
        return;
    }

    const files = incomingFiles.filter(f => {
        if (!f.type.startsWith('image/')) return false;
        if (f.size > MAX_FILE_SIZE) {
            console.warn(`File ${f.name} ignored: Exceeds 100MB limit.`);
            return false;
        }
        return true;
    });

    if (files.length === 0) {
        alert('Please select valid image files (max 100MB each).');
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
        History.saveSession(state.assets);
        renderMultiAssetDashboard();
        Router.navigate('#/dashboard');
    } else {
        renderNoExif();
        Router.navigate('#/');
    }
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
    elements.assetCountBadge.textContent = `${state.assets.length} Assets`;
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
        elements.gpsCoords.textContent = `LAT: ${asset.exifData.latitude.toFixed(6)} | LNG: ${asset.exifData.longitude.toFixed(6)}`;
        Mapping.updateMapLinks(asset.exifData.latitude, asset.exifData.longitude, elements.mapActions);
        elements.mapContainerCard.classList.remove('no-gps');
    } else {
        elements.gpsCoords.textContent = 'No GPS signatures found in this asset.';
        elements.mapActions.innerHTML = '';
        elements.mapContainerCard.classList.add('no-gps');
    }
}

function loadFromHistory(session) {
    // Session structure from history.js: { assets: [...], isBatch: bool, ... }
    state.assets = session.assets;
    state.activeAssetIndex = 0;
    renderMultiAssetDashboard();
    Router.navigate('#/dashboard');
}

function renderExpertAnalysis(asset) {
    const data = asset.exifData;
    const categorized = Utils.categorizeExif(data);
    elements.expertAnalysisContent.innerHTML = '';
    elements.expertAnalysisCard.classList.remove('hidden');

    const geoNarrative = Narratives.generateGeospatialNarrative(data.latitude, data.longitude, asset.locationData);
    appendExpertItem('map-pin', 'Geospatial Analysis', geoNarrative);

    const categories = [
        { name: 'Device Hardware', generator: Narratives.generateHardwareNarrative, icon: 'camera' },
        { name: 'Exposure Settings', generator: Narratives.generateExposureNarrative, icon: 'aperture' },
        { name: 'Optics & Lens', generator: Narratives.generateOpticsNarrative, icon: 'focus' },
        { name: 'Image Quality', generator: Narratives.generateQualityNarrative, icon: 'file-image' },
        { name: 'Timeline & Date', generator: Narratives.generateTimelineNarrative, icon: 'clock' }
    ];

    categories.forEach(cat => {
        const props = categorized[cat.name];
        if (props && Object.keys(props).length > 0) {
            appendExpertItem(cat.icon, `${cat.name} Analysis`, cat.generator(props));
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
        
        card.className = `card ${isImportant ? 'important-card' : ''} ${isSecondary ? 'secondary-card' : ''}`;
        card.innerHTML = `
            <div class="card-header">
                <i data-lucide="${Utils.getCategoryIcon(category)}"></i>
                <h3>${category}</h3>
            </div>
            <div class="card-body">
                <details class="raw-data-toggle">
                    <summary>View ${isImportant ? 'Technical' : category} Details</summary>
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
    const lastModified = new Date(file.lastModified).toLocaleString();
    elements.fileBasicInfo.innerHTML = `
        <div><span>Name:</span> <span>${Utils.escapeHTML(Utils.truncate(file.name, 25))}</span></div>
        <div><span>Type:</span> <span>${Utils.escapeHTML(file.type || 'Unknown')}</span></div>
        <div><span>Size:</span> <span>${sizeInMB} MB</span></div>
        <div><span>File System Date:</span> <span>${Utils.escapeHTML(lastModified)}</span></div>
    `;
}

function renderNoExif() {
    elements.metadataContainer.innerHTML = `
        <div class="card">
            <div class="no-data">
                <i data-lucide="shield-alert"></i>
                <h3>No EXIF Data Found</h3>
                <p class="text-muted">This image has been stripped of its metadata or did not contain any to begin with.</p>
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
    } else if (s === 'loading') {
        elements.loadingState.classList.remove('hidden');
        elements.resetBtn.classList.add('hidden');
    } else if (s === 'dashboard') {
        elements.dashboardState.classList.remove('hidden');
        elements.resetBtn.classList.remove('hidden');
        elements.exportContainer.classList.remove('hidden');
        if (state.map) setTimeout(() => state.map.invalidateSize(), 100);
    }
}

function resetApp() {
    elements.fileInput.value = '';
    elements.metadataContainer.innerHTML = '';
    elements.expertAnalysisContent.innerHTML = '';
    elements.expertAnalysisCard.classList.add('hidden');
    elements.exportContainer.classList.add('hidden');
    state.assets = [];
    Router.navigate('#/');
}
