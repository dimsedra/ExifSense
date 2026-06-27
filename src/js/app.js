import * as Utils from './utils.js';
import * as Narratives from './narratives.js';
import { initI18n, setLanguage, getCurrentLanguage, t } from './i18n.js';
import * as Mapping from './mapping.js';
import * as History from './history.js';
import * as Exporter from './export.js';
import * as UI from './ui.js';
import { Router } from './router.js';
import { initParticles } from './particles.js';
import { initSanitizer, startSanitizerStudio } from './sanitizer.js';

// DOM Elements
const elements = {
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('file-input'),
    resetBtn: document.getElementById('reset-btn'),
    introState: document.getElementById('intro-state'),
    loadingState: document.getElementById('loading-state'),
    dashboardState: document.getElementById('dashboard-state'),
    sanitizeState: document.getElementById('sanitize-state'),
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
    startStagedBtn: document.getElementById('start-staged-btn'),

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
    forensicId: null,
    investigatorIdentity: null,
    verifiedManifest: null,
    verifiedMatchedAssets: {}
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
    initCopyHash();
    initParticles();
    initSanitizer(state, elements, switchState);
    
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

    // MOBILE: Scroll nudge — when a forensic <details> expands on a narrow viewport,
    // briefly animate the inner table right-then-back so users discover it's swipeable.
    document.addEventListener('toggle', (e) => {
        if (!e.target.matches('details') || !e.target.open) return;
        if (window.innerWidth > 768) return; // desktop doesn't need the hint
        const scrollEl = e.target.querySelector('.forensic-scroll-container');
        if (!scrollEl) return;
        // Wait for the <details> to finish opening and paint
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (scrollEl.scrollWidth <= scrollEl.clientWidth) return; // not overflowing, skip
                const nudge = Math.min(60, scrollEl.scrollWidth - scrollEl.clientWidth);
                scrollEl.scrollTo({ left: nudge, behavior: 'smooth' });
                setTimeout(() => scrollEl.scrollTo({ left: 0, behavior: 'smooth' }), 500);
            });
        });
    }, true); // capture phase so it fires even if event stops propagating
});

// MODUL: Inisialisasi Tema (Dark/Light Mode)
// FUNGSI: Menginisialisasi tema aplikasi (dark/light) dari cache
function initTheme() {
    applyTheme('dark');
}

// FUNGSI: Mengubah/memperbarui CSS class tema pada elemen body
function applyTheme(theme) {
    document.body.classList.add('dark-mode');
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
                startSanitizerStudio(currentAsset.fileObject, currentAsset.exifData);
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
        UI.renderStagedFiles(state, elements);
    });

    elements.startStagedBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (state.stagedFiles && state.stagedFiles.length > 0) {
            const finalFiles = [...state.stagedFiles];
            state.stagedFiles = [];
            UI.renderStagedFiles(state, elements);
            await processBatchFiles(finalFiles);
        }
    });
}




// Main Logic
// FUNGSI: Memproses ekstraksi data biner untuk seluruh file batch
async function processBatchFiles(files) {
    switchState('loading');
    state.assets = [];
    state.activeAssetIndex = 0;

    // Introduce a quick loading screen gimmick
    await new Promise(resolve => setTimeout(resolve, 1500));

    for (const file of files) {
        try {
            const options = { tiff: true, xmp: true, icc: true, iptc: true, jfif: true, ihdr: true, gps: true };
            const exifData = await exifr.parse(file, options);
            const thumbUrl = await History.createThumbnail(file);
            
            // Calculate cryptographic hashes locally
            const sha256 = await Utils.calculateFileHash(file, 'SHA-256');
            const sha1 = await Utils.calculateFileHash(file, 'SHA-1');

            const asset = {
                id: Date.now() + Math.random(),
                fileName: file.name,
                fileObject: file,
                fileSize: file.size,
                fileType: file.type,
                fileDate: file.lastModified,
                exifData: exifData || {},
                thumbUrl: thumbUrl,
                locationData: null,
                sha256,
                sha1
            };

            // Run integrity heuristics
            asset.integrityAlerts = Utils.analyzeFileIntegrity(asset);

            state.assets.push(asset);
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
        UI.renderNoExif(elements);
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

    const extensionEquivalents = {
        'jpg': ['jpg', 'jpeg'],
        'jpeg': ['jpg', 'jpeg'],
        'tif': ['tif', 'tiff'],
        'tiff': ['tif', 'tiff'],
        'heic': ['heic', 'heif'],
        'heif': ['heic', 'heif']
    };

    const files = [];
    for (const f of incomingFiles) {
        if (f.size > MAX_FILE_SIZE) {
            console.warn(`File ${f.name} ignored: Exceeds 100MB limit.`);
            continue;
        }

        const detection = await Utils.detectFileType(f);
        if (!detection.isValid) {
            console.warn(`File ${f.name} rejected: Unrecognized file signature.`);
            Utils.showToast(t('err_invalid_signature', { name: f.name }));
            continue;
        }

        const originalExt = f.name.includes('.') ? f.name.split('.').pop().toLowerCase() : '';
        const isEquivalent = originalExt === detection.extension || 
            (extensionEquivalents[detection.extension] && extensionEquivalents[detection.extension].includes(originalExt));

        let processedFile = f;
        if (!isEquivalent) {
            console.warn(`File ${f.name} has extension mismatch/missing. Expected: .${detection.extension}, Found: .${originalExt || 'none'}`);
            
            const baseName = f.name.includes('.') ? f.name.substring(0, f.name.lastIndexOf('.')) : f.name;
            const newName = `${baseName}.${detection.extension}`;
            processedFile = new File([f], newName, { type: detection.mimeType });
            
            Utils.showToast(t('warn_extension_mismatch', { name: f.name, detected: detection.detectedFormat }));
        }

        files.push(processedFile);
    }

    if (files.length === 0) {
        if (incomingFiles.length > 0) {
            // Already toasted individual unrecognized signature / size errors
            return;
        }
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

        UI.renderStagedFiles(state, elements);

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
    switchState('loading');
    try {
        const options = { tiff: true, xmp: true, icc: true, iptc: true, jfif: true, ihdr: true, gps: true };
        const exifData = await exifr.parse(file, options);
        startSanitizerStudio(file, exifData);
    } catch (err) {
        console.error("Failed to parse EXIF for sanitization:", err);
        startSanitizerStudio(file, {});
    }
}

// MODUL: Pemetaan & Visualisasi Dashboard Multi-Aset (Batch)
// FUNGSI: Menggambar wadah dasbor komparasi multi-aset
async function renderMultiAssetDashboard() {
    // 1. Asset Selector
    UI.renderAssetSelector(state, elements, switchAsset);
    
    // 2. Combined Analysis
    UI.renderCombinedAnalysis(state, elements);

    // 3. Map (Multi-pin)
    await initMultiPinMap();

    // 4. Initial Asset View
    switchAsset(0);
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
    
    UI.renderBasicFileInfo({ 
        name: asset.fileName, 
        size: asset.fileSize || 0, 
        lastModified: asset.fileDate || Date.now(), 
        type: asset.fileType || 'image/jpeg',
        sha256: asset.sha256,
        sha1: asset.sha1
    }, elements);
    
    // Handle reverse geocoding if needed
    if (asset.exifData?.latitude != null && !asset.locationData) {
        asset.locationData = await Mapping.reverseGeocode(asset.exifData.latitude, asset.exifData.longitude);
    }

    // Lock right column height to prevent scroll jumping on wipe
    const colRight = elements.metadataContainer.closest('.col-right');
    if (colRight) {
        colRight.style.minHeight = `${colRight.getBoundingClientRect().height}px`;
    }

    // Dynamically update Expert Analysis header with active filename
    const expertHeaderTitle = document.querySelector('#expert-analysis-card .card-header h3');
    if (expertHeaderTitle) {
        expertHeaderTitle.setAttribute('data-i18n', 'dynamic_asset_analysis');
        expertHeaderTitle.setAttribute('data-i18n-param-name', asset.fileName);
        expertHeaderTitle.textContent = t('dynamic_asset_analysis', { name: asset.fileName });
    }

    UI.renderExpertAnalysis(asset, elements);
    UI.renderMetadata(asset.exifData, elements);
    
    if (colRight) {
        requestAnimationFrame(() => {
            colRight.style.minHeight = '';
        });
    }
    if (asset.exifData?.latitude != null) {
        elements.gpsCoords.textContent = t('gps_coords', {
            lat: asset.exifData.latitude.toFixed(6),
            lng: asset.exifData.longitude.toFixed(6)
        });
        Mapping.updateMapLinks(asset.exifData.latitude, asset.exifData.longitude, elements.mapActions);
        elements.mapContainerCard.classList.remove('no-gps');
        if (state.map && state.markerGroup) {
            Mapping.highlightMarker(asset.id, state.markerGroup, state.map);
        }
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













// FUNGSI: Mengubah mode tampilan halaman kerja aplikasi
function switchState(s) {
    elements.introState.classList.add('hidden');
    elements.loadingState.classList.add('hidden');
    elements.dashboardState.classList.add('hidden');
    elements.sanitizeState.classList.add('hidden');
    
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
    } else if (s === 'sanitize') {
        elements.sanitizeState.classList.remove('hidden');
        elements.resetBtn.classList.add('hidden');
        elements.exportContainer.classList.add('hidden');
        elements.sanitizeMainBtn.classList.add('hidden');
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
    UI.renderStagedFiles(state, elements);
    
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
                        UI.renderAssetSelector(state, elements, switchAsset);
                        UI.renderCombinedAnalysis(state, elements);
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

// FUNGSI: Menginisialisasi handler penyalinan hash ke clipboard
function initCopyHash() {
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-copy-hash');
        if (btn) {
            const hash = btn.dataset.hash;
            if (hash) {
                try {
                    await navigator.clipboard.writeText(hash);
                    document.dispatchEvent(new CustomEvent('toast', { detail: { message: t('hash_copied', {}, 'ui') } }));
                } catch (err) {
                    console.error('Failed to copy hash:', err);
                }
            }
        }
    });
}

function showToast(message) {
    document.dispatchEvent(new CustomEvent('toast', { detail: { message } }));
}
