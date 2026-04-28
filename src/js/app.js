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
    nextModeBtn: document.getElementById('next-mode-btn'),
    stagedFilesContainer: document.getElementById('staged-files-container'),
    stagedFilesList: document.getElementById('staged-files-list'),
    clearStagedBtn: document.getElementById('clear-staged-btn'),
    startStagedBtn: document.getElementById('start-staged-btn')
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

    window.addEventListener('resize', () => {
        document.querySelectorAll('.expert-tabs-container').forEach(container => {
            const activeBtn = container.querySelector('.expert-tab-btn.active');
            if (activeBtn) {
                updateCircularTabs(container, activeBtn.dataset.id);
            }
        });
    });

    if (window.lucide) lucide.createIcons();
});

// MODUL: Inisialisasi Tema (Dark/Light Mode)
// FUNGSI: Menginisialisasi tema aplikasi (dark/light) dari cache
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

// FUNGSI: Mengubah/memperbarui CSS class tema pada elemen body
function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// FUNGSI: Menautkan tombol navigasi atas ke router URL
function initTabs() {
    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            const path = tabId === 'upload' ? '#/upload' : `#/${tabId}`;
            Router.navigate(path);
        });
    });
}

// MODUL: Kontrol Navigasi Tab Utama
// FUNGSI: Mematikan/menghidupkan kelas visual tab yang aktif
function switchTab(tabId) {
    elements.tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
    elements.tabContents.forEach(c => c.classList.toggle('active', c.id === `tab-${tabId}`));
    if (tabId === 'history') refreshHistory();
}


// FUNGSI: Menentukan alur routing halaman/state antarmuka
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

// FUNGSI: Membaca ulang daftar log riwayat ke kanvas
function refreshHistory() {
    History.renderHistoryItems(elements.historyList, elements.historySearch.value, state.historyFilter, loadFromHistory);
}

// FUNGSI: Menyambungkan filter/pencarian teks pada log riwayat
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

// FUNGSI: Menghubungkan tombol ekspor data format (JSON/PDF/CSV)
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

// FUNGSI: Menangkap peristiwa seret-lepas (drag-drop) file gambar
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
    elements.dropzone.addEventListener('click', (e) => {
        if (e.target !== elements.fileInput) {
            elements.fileInput.click();
        }
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
            e.target.value = ''; 
        }
    });

    // Staging list triggers
    elements.clearStagedBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.stagedFiles = [];
        renderStagedFiles();
    });

    elements.startStagedBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (state.stagedFiles && state.stagedFiles.length > 0) {
            const finalFiles = [...state.stagedFiles];
            state.stagedFiles = [];
            renderStagedFiles();
            await processBatchFiles(finalFiles);
        }
    });
}

// FUNGSI: Menggambar barisan antrean berkas tertunda ke UI
function renderStagedFiles() {
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
                    <span class="staged-file-name" title="${file.name}">${file.name}</span>
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
            renderStagedFiles();
        });
    });

    if (window.lucide) lucide.createIcons();
}

// Main Logic
// FUNGSI: Memproses ekstraksi data biner untuk seluruh file batch
async function processBatchFiles(files) {
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
        const session = History.saveSession(state.assets);
        state.forensicId = session.forensicId;
        renderMultiAssetDashboard();
        Router.navigate('#/dashboard');
    } else {
        renderNoExif();
        Router.navigate('#/');
    }
}

// FUNGSI: Mengelompokkan pemicu mode tunggal vs mode batch
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
        const file = files[0];
        handleSanitization(file);
        switchState('intro');
        return;
    }

    if (state.uploadMode === 'batch') {
        if (!state.stagedFiles) state.stagedFiles = [];
        
        // Avoid duplicate files in staging
        files.forEach(f => {
            if (!state.stagedFiles.some(sf => sf.name === f.name && sf.size === f.size)) {
                state.stagedFiles.push(f);
            }
        });

        renderStagedFiles();

        Utils.showConfirm({
            title: t('batch_confirm_title') || 'Batch Analysis Staging',
            message: t('batch_confirm_msg', {count: state.stagedFiles.length}) || `You currently have ${state.stagedFiles.length} file(s) staged. Run analysis now?`,
            confirmText: t('process_now') || 'Process Now',
            cancelText: t('add_more') || 'Add More',
            onConfirm: async () => {
                const finalFiles = [...state.stagedFiles];
                state.stagedFiles = []; // Clear staging
                await processBatchFiles(finalFiles);
            },
            onCancel: () => {
                // Keep the files in staging
            }
        });
    } else {
        // Single mode
        await processBatchFiles(files);
    }
}

// FUNGSI: Mengelola alur sanitasi pembersihan metadata foto
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

// MODUL: Pemetaan & Visualisasi Dashboard Multi-Aset (Batch)
// FUNGSI: Menggambar wadah dasbor komparasi multi-aset
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

// FUNGSI: Merender pemilih item gambar di panel kiri
function renderAssetSelector() {
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
        <button class="asset-filter-btn ${state.assetFilter === 'geo' ? 'active' : ''}" data-filter="geo">
            <i data-lucide="map-pin"></i><span>Geotagged</span>
        </button>
        <button class="asset-filter-btn ${state.assetFilter === 'stripped' ? 'active' : ''}" data-filter="stripped">
            <i data-lucide="alert-triangle"></i><span>Stripped</span>
        </button>
    `;
    
    if (window.lucide) lucide.createIcons();

    // Attach click listeners to filter buttons
    filterContainer.querySelectorAll('.asset-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            state.assetFilter = btn.dataset.filter;
            renderAssetSelector();
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

        if (state.assetFilter === 'geo' && !hasGeo) return;
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
                <img src="${asset.thumbUrl}" alt="${asset.fileName}">
                <div class="asset-card-badges">${badgesHtml}</div>
            </div>
            <div class="asset-card-info">
                <span class="asset-card-name">${Utils.escapeHTML(asset.fileName)}</span>
                <span class="asset-card-size">${sizeInMB} MB</span>
            </div>
        `;

        btn.addEventListener('click', () => switchAsset(index));
        elements.assetSelectorList.appendChild(btn);
    });
    
    if (elements.assetSelectorList.children.length === 0) {
        elements.assetSelectorList.innerHTML = `<div class="text-muted" style="padding: 16px; text-align: center; width: 100%;">${t('no_metadata_tags')}</div>`;
    }

    if (window.lucide) lucide.createIcons();
}

// FUNGSI: Mengatur perputaran sirkular tab analitik expert
function updateCircularTabs(container, activeId) {
    const buttons = Array.from(container.querySelectorAll('.expert-tab-btn'));
    const N = buttons.length;
    if (N <= 1) return;

    // Temporarily remove overflow class to measure true size
    const wasOverflowing = container.classList.contains('is-overflowing');
    container.classList.remove('is-overflowing');

    // Check for overflow
    const isOverflowing = container.scrollWidth > container.clientWidth;

    // Toggle arrows
    const wrapper = container.parentElement;
    if (wrapper && wrapper.classList.contains('tabs-wrapper')) {
        const arrows = wrapper.querySelectorAll('.tabs-arrow');
        arrows.forEach(arrow => {
            arrow.style.display = isOverflowing ? 'flex' : 'none';
        });
    }

    if (!isOverflowing) {
        // Restore original order
        const sortedButtons = buttons.sort((a, b) => parseInt(a.dataset.index) - parseInt(b.dataset.index));
        sortedButtons.forEach(btn => container.appendChild(btn));
        
        // Update active class
        buttons.forEach(b => b.classList.toggle('active', b.dataset.id === activeId));
        
        // Reset scroll
        container.scrollLeft = 0;
        return;
    }

    // Re-add overflow class
    container.classList.add('is-overflowing');

    const activeBtn = buttons.find(b => b.dataset.id === activeId);
    if (!activeBtn) return;
    const activeIdx = buttons.indexOf(activeBtn);

    const prevIdx = (activeIdx - 1 + N) % N;
    const nextIdx = (activeIdx + 1) % N;

    const orderedIndices = [prevIdx, activeIdx, nextIdx];
    let curr = (nextIdx + 1) % N;
    while (curr !== prevIdx) {
        orderedIndices.push(curr);
        curr = (curr + 1) % N;
    }

    // Lock container height to prevent temporary layout collapse and scroll jumping
    const currentHeight = container.getBoundingClientRect().height;
    container.style.height = `${currentHeight}px`;

    // Rearrange DOM nodes
    orderedIndices.forEach(idx => {
        container.appendChild(buttons[idx]);
    });

    // Clear the explicit height lock
    container.style.height = '';

    // Update active class
    buttons.forEach(b => b.classList.toggle('active', b.dataset.id === activeId));

    // Center active tab
    requestAnimationFrame(() => {
        const newActiveBtn = container.querySelector('.expert-tab-btn.active');
        if (newActiveBtn) {
            container.scrollLeft = newActiveBtn.offsetLeft - (container.clientWidth / 2) + (newActiveBtn.clientWidth / 2);
        }
    });
}

// FUNGSI: Menyusun data naratif gabungan banyak berkas
function renderCombinedAnalysis() {
    if (state.assets.length <= 1) {
        elements.combinedAnalysisCard.classList.add('hidden');
        return;
    }

    const findings = Narratives.generateCombinedAnalysis(state.assets);
    elements.combinedAnalysisContent.innerHTML = '';
    
    const parent = elements.combinedAnalysisContent.parentNode;
    const existingTabs = parent.querySelector('.combined-tabs');
    if (existingTabs) existingTabs.remove();

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
                        <p>${f.narrative}</p>
                    </div>
                </div>
            `;
            
            btn.addEventListener('click', () => {
                const contentBlock = elements.combinedAnalysisContent;
                const currentHeight = contentBlock.getBoundingClientRect().height;
                contentBlock.style.minHeight = `${currentHeight}px`;

                contentBlock.querySelectorAll('.expert-tab-pane').forEach(p => p.classList.remove('active'));
                pane.classList.add('active');
                
                updateCircularTabs(tabsContainer, `combined-${index}`);

                requestAnimationFrame(() => {
                    contentBlock.style.minHeight = '';
                });
            });
            
            tabsContainer.appendChild(btn);
            elements.combinedAnalysisContent.appendChild(pane);
        });
        
        parent.insertBefore(tabsContainer, elements.combinedAnalysisContent);
        
        updateCircularTabs(tabsContainer, `combined-0`);
        
    } else {
        elements.combinedAnalysisCard.classList.add('hidden');
    }
    if (window.lucide) lucide.createIcons();
}

// FUNGSI: Menyiapkan peta beralamat dinamis (OpenStreetMap)
async function initMultiPinMap() {
    elements.mapContainerCard.classList.remove('hidden');
    
    const firstGeo = state.assets.find(a => a.exifData?.latitude != null);
    const startLat = firstGeo ? firstGeo.exifData.latitude : 0;
    const startLng = firstGeo ? firstGeo.exifData.longitude : 0;

    if (!state.map) {
        const { map } = Mapping.initMap(startLat, startLng);
        state.map = map;
    } else {
        state.map.setView([startLat, startLng], firstGeo ? 13 : 2);
    }

    if (!firstGeo && state.map) {
        state.map.setZoom(2);
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

// FUNGSI: Mengganti fokus aset tampilan dasar
async function switchAsset(index) {
    state.activeAssetIndex = index;
    const asset = state.assets[index];
    
    // Update Selector UI
    const btns = elements.assetSelectorList.querySelectorAll('.asset-thumb-btn');
    btns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.index) === index));

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

// FUNGSI: Memuat log sesi forensik masa lampau
function loadFromHistory(session) {
    // Session structure from history.js: { assets: [...], isBatch: bool, ... }
    state.assets = session.assets;
    state.activeAssetIndex = 0;
    state.forensicId = session.forensicId;
    renderMultiAssetDashboard();
    Router.navigate('#/dashboard');
}

// FUNGSI: Menampilkan analisis forensik pintar individu
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
                const currentHeight = contentBlock.getBoundingClientRect().height;
                contentBlock.style.minHeight = `${currentHeight}px`;

                contentBlock.querySelectorAll('.expert-tab-pane').forEach(p => p.classList.remove('active'));
                pane.classList.add('active');
                
                updateCircularTabs(tabsContainer, item.id);

                requestAnimationFrame(() => {
                    contentBlock.style.minHeight = '';
                });
            });
            
            tabsContainer.appendChild(btn);
            elements.expertAnalysisContent.appendChild(pane);
        });

        const wrapper = document.createElement('div');
        wrapper.className = 'tabs-wrapper';
        
        const arrowLeft = document.createElement('div');
        arrowLeft.className = 'tabs-arrow left';
        arrowLeft.innerHTML = '&lt;';
        
        const arrowRight = document.createElement('div');
        arrowRight.className = 'tabs-arrow right';
        arrowRight.innerHTML = '&gt;';
        
        wrapper.appendChild(arrowLeft);
        wrapper.appendChild(tabsContainer);
        wrapper.appendChild(arrowRight);

        parent.insertBefore(wrapper, elements.expertAnalysisContent);
        
        updateCircularTabs(tabsContainer, items[0].id);
    }

    if (window.lucide) lucide.createIcons();
}

// FUNGSI: Melakukan parsing tabel raw metadata asli
function renderMetadata(data) {
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
                    ` : `<div class="text-muted" style="padding: 24px; text-align: center; opacity: 0.7;">${t('no_metadata_tags')}</div>`}
                </div>
            `;
            pane.appendChild(card);

            btn.addEventListener('click', () => {
                const currentHeight = parent.getBoundingClientRect().height;
                parent.style.minHeight = `${currentHeight}px`;

                parent.querySelectorAll('.expert-tab-pane').forEach(p => p.classList.remove('active'));
                pane.classList.add('active');
                
                updateCircularTabs(tabsContainer, `meta-${item.key}`);

                requestAnimationFrame(() => {
                    parent.style.minHeight = '';
                });
            });

            tabsContainer.appendChild(btn);
            parent.appendChild(pane);
        });

        const wrapper = document.createElement('div');
        wrapper.className = 'tabs-wrapper';
        
        const arrowLeft = document.createElement('div');
        arrowLeft.className = 'tabs-arrow left';
        arrowLeft.innerHTML = '&lt;';
        
        const arrowRight = document.createElement('div');
        arrowRight.className = 'tabs-arrow right';
        arrowRight.innerHTML = '&gt;';
        
        wrapper.appendChild(arrowLeft);
        wrapper.appendChild(tabsContainer);
        wrapper.appendChild(arrowRight);

        parent.prepend(wrapper);
        
        updateCircularTabs(tabsContainer, `meta-${items[0].key}`);
    }

    if (window.lucide) lucide.createIcons();
}

// FUNGSI: Memasang informasi file dasar (Name, Size, Type)
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

// FUNGSI: Memberikan pesan peringatan jika tag EXIF kosong
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

// FUNGSI: Mengubah mode tampilan halaman kerja aplikasi
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
        
        setTimeout(() => {
            document.querySelectorAll('.expert-tabs-container').forEach(container => {
                const activeBtn = container.querySelector('.expert-tab-btn.active');
                if (activeBtn) {
                    updateCircularTabs(container, activeBtn.dataset.id);
                }
            });
        }, 100);
    }
}

// FUNGSI: Mengembalikan status variabel ke titik nol (Awal)
function resetApp() {
    elements.fileInput.value = '';
    elements.metadataContainer.innerHTML = '';
    elements.expertAnalysisContent.innerHTML = '';
    elements.expertAnalysisCard.classList.add('hidden');
    elements.exportContainer.classList.add('hidden');
    elements.sanitizeMainBtn.classList.add('hidden');
    state.assets = [];
    state.stagedFiles = [];
    state.assetFilter = 'all';
    renderStagedFiles();
    
    const filterContainer = elements.assetSelectorContainer ? elements.assetSelectorContainer.querySelector('.asset-selector-filters') : null;
    if (filterContainer) filterContainer.remove();

    Router.navigate('#/');
}
// FUNGSI: Mengelola pilihan multibahasa (ID/EN/AR)
function initLang() {
    const langToggle = document.getElementById('lang-toggle');
    const langLabel = document.getElementById('current-lang-label');
    const langDropdown = document.getElementById('lang-dropdown');
    const langContainer = document.getElementById('lang-selector-container');
    
    if (langToggle && langDropdown) {
        // Set initial label
        langLabel.textContent = getCurrentLanguage().toUpperCase();
        
        const updateActiveOption = () => {
            document.querySelectorAll('.lang-option').forEach(opt => {
                if (opt.getAttribute('data-lang') === getCurrentLanguage()) {
                    opt.classList.add('active');
                } else {
                    opt.classList.remove('active');
                }
            });
        };
        updateActiveOption();
        
        langToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            langDropdown.classList.toggle('hidden');
            langContainer.classList.toggle('open');
        });
        
        document.querySelectorAll('.lang-option').forEach(button => {
            button.addEventListener('click', async (e) => {
                const selectedLang = e.target.getAttribute('data-lang');
                if (selectedLang) {
                    await setLanguage(selectedLang);
                    langLabel.textContent = selectedLang.toUpperCase();
                    updateActiveOption();
                    langDropdown.classList.add('hidden');
                    langContainer.classList.remove('open');
                    
                    if (state.assets.length > 0) {
                        renderAssetSelector();
                        renderCombinedAnalysis();
                        switchAsset(state.activeAssetIndex);
                    }
                    
                    if (document.querySelector('.tab-btn[data-tab="history"]').classList.contains('active')) {
                        refreshHistory();
                    }
                }
            });
        });
        
        document.addEventListener('click', (e) => {
            if (!langContainer.contains(e.target)) {
                langDropdown.classList.add('hidden');
                langContainer.classList.remove('open');
            }
        });
    }
}

// FUNGSI: Memunculkan notifikasi ringkas pop-up ke layar
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
