import * as Utils from './utils.js';
import * as History from './history.js';
import { t } from './i18n.js';
import { Router } from './router.js';

export function isSanitizerActive() {
    return !!activeFile || batchEntries.length > 0;
}

export function isBatchSanitizerActive() {
    return batchEntries.length > 0;
}

let state = null;
let elements = null;
let switchStateFn = null;
let onSanitizedFn = null;
let onBatchSanitizedFn = null;

let activeFile = null;
let activeExif = null;
let sanitizeMap = null;
let sanitizeMarker = null;
let activeTabKey = null;

// Batch sanitizer state
let batchEntries = [];
let batchActiveIndex = 0;
let batchGlobalOptions = { gps: false, device: false, camera: false, date: false };
let batchOverrides = {}; // { [index]: { gps, device, camera, date } }

// DOM Elements local to Sanitizer Studio
const sanitizerElements = {
    previewImage: document.getElementById('sanitize-preview-image'),
    fileInfo: document.getElementById('sanitize-file-info'),
    mapCard: document.getElementById('sanitize-map-card'),
    mapDiv: document.getElementById('sanitize-map'),
    privacyOverlay: document.getElementById('sanitize-privacy-overlay'),
    previewContainer: document.getElementById('sanitize-metadata-preview-container'),
    privacyAnalysisContainer: document.getElementById('sanitize-privacy-analysis-container'),
    
    // Presets
    presetMaxPrivacy: document.getElementById('preset-max-privacy'),
    presetPhotoShare: document.getElementById('preset-photo-share'),
    presetLocationOnly: document.getElementById('preset-location-only'),
    
    // Toggles (OFF = KEEP / ON = REMOVE)
    toggleGps: document.getElementById('sanitize-toggle-gps'),
    toggleDevice: document.getElementById('sanitize-toggle-device'),
    toggleCamera: document.getElementById('sanitize-toggle-camera'),
    toggleDate: document.getElementById('sanitize-toggle-date'),
    
    // Details
    gpsDetails: document.getElementById('sanitize-gps-details'),
    deviceDetails: document.getElementById('sanitize-device-details'),
    cameraDetails: document.getElementById('sanitize-camera-details'),
    dateDetails: document.getElementById('sanitize-date-details'),
    
    // Actions
    cancelBtn: document.getElementById('sanitize-cancel-btn'),
    downloadBtn: document.getElementById('sanitize-download-btn')
};

export function initSanitizer(appState, appElements, switchState, onSanitized) {
    state = appState;
    elements = appElements;
    switchStateFn = switchState;
    onSanitizedFn = onSanitized;
    
    // Register event listeners
    if (sanitizerElements.presetMaxPrivacy) {
        sanitizerElements.presetMaxPrivacy.addEventListener('click', () => applyPreset('max-privacy'));
    }
    if (sanitizerElements.presetPhotoShare) {
        sanitizerElements.presetPhotoShare.addEventListener('click', () => applyPreset('photo-share'));
    }
    if (sanitizerElements.presetLocationOnly) {
        sanitizerElements.presetLocationOnly.addEventListener('click', () => applyPreset('location-only'));
    }
    
    // Watch toggles for live visual updates
    const toggleMap = {
        'sanitize-toggle-gps': 'gps',
        'sanitize-toggle-device': 'device',
        'sanitize-toggle-camera': 'camera',
        'sanitize-toggle-date': 'date'
    };
    [
        sanitizerElements.toggleGps,
        sanitizerElements.toggleDevice,
        sanitizerElements.toggleCamera,
        sanitizerElements.toggleDate
    ].forEach(toggle => {
        if (toggle) {
            toggle.addEventListener('change', () => {
                if (batchEntries.length > 0) {
                    const key = toggleMap[toggle.id];
                    if (key) batchGlobalOptions[key] = toggle.checked;
                }
                updateVisuals();
            });
        }
    });
    
    // Actions
    if (sanitizerElements.cancelBtn) {
        sanitizerElements.cancelBtn.addEventListener('click', handleCancel);
    }
    if (sanitizerElements.downloadBtn) {
        sanitizerElements.downloadBtn.addEventListener('click', executeSanitization);
    }
}

export async function startSanitizerStudio(file, exifData) {
    activeFile = file;
    activeExif = exifData || {};
    activeTabKey = null; // Reset tab selection for new session
    
    // 1. Set Preview Image
    if (sanitizerElements.previewImage) {
        sanitizerElements.previewImage.src = URL.createObjectURL(file);
    }
    
    // 2. Set Basic Info
    if (sanitizerElements.fileInfo) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        sanitizerElements.fileInfo.innerHTML = `
            <div class="info-item">
                <span class="info-label" data-i18n="info_filename">Filename</span>
                <span class="info-value font-mono text-sm">${Utils.escapeHTML(file.name)}</span>
            </div>
            <div class="info-item">
                <span class="info-label" data-i18n="info_filesize">File Size</span>
                <span class="info-value">${sizeMB} MB</span>
            </div>
            <div class="info-item">
                <span class="info-label" data-i18n="info_format">Format</span>
                <span class="info-value font-mono">${file.type.split('/')[1]?.toUpperCase() || 'JPEG'}</span>
            </div>
        `;
    }
    
    // 3. Populate Selective Details Labels
    populateDetailsLabels();
    
    // 4. Initialize Map if GPS exists
    initSanitizerMap();
    
    // 5. Default Toggle States (start checked = false -> KEEP)
    resetToggles();
    
    // 6. Update Peta & Overlay & Render Metadata
    updateVisuals();
    
    // 7. Transition view via Router hash state
    Router.navigate('#/sanitize');
}

function resetToggles() {
    // Default: OFF (unchecked) meaning KEEP. ON (checked) means REMOVE.
    // If no data exists, disable the toggle.
    const hasGPS = activeExif.latitude !== undefined && activeExif.longitude !== undefined;
    if (sanitizerElements.toggleGps) {
        sanitizerElements.toggleGps.checked = false;
        sanitizerElements.toggleGps.disabled = !hasGPS;
    }
    
    const hasDevice = activeExif.Make || activeExif.Model;
    if (sanitizerElements.toggleDevice) {
        sanitizerElements.toggleDevice.checked = false;
        sanitizerElements.toggleDevice.disabled = !hasDevice;
    }
    
    const hasCamera = activeExif.ApertureValue !== undefined || activeExif.ISO !== undefined || activeExif.ExposureTime !== undefined || activeExif.FocalLength !== undefined;
    if (sanitizerElements.toggleCamera) {
        sanitizerElements.toggleCamera.checked = false;
        sanitizerElements.toggleCamera.disabled = !hasCamera;
    }
    
    const hasDate = activeExif.DateTimeOriginal || activeExif.DateTimeDigitized || activeExif.DateTime;
    if (sanitizerElements.toggleDate) {
        sanitizerElements.toggleDate.checked = false;
        sanitizerElements.toggleDate.disabled = !hasDate;
    }
}

function populateDetailsLabels() {
    // GPS
    if (sanitizerElements.gpsDetails) {
        if (activeExif.latitude !== undefined && activeExif.longitude !== undefined) {
            sanitizerElements.gpsDetails.textContent = `Coordinates: ${activeExif.latitude.toFixed(5)}, ${activeExif.longitude.toFixed(5)}`;
        } else {
            sanitizerElements.gpsDetails.textContent = t('no_location_found') || 'No location coordinates found';
        }
    }
    
    // Device
    if (sanitizerElements.deviceDetails) {
        if (activeExif.Make || activeExif.Model) {
            sanitizerElements.deviceDetails.textContent = `${activeExif.Make || ''} ${activeExif.Model || ''}`.trim();
        } else {
            sanitizerElements.deviceDetails.textContent = t('no_device_found') || 'No device details found';
        }
    }
    
    // Camera settings
    if (sanitizerElements.cameraDetails) {
        const parts = [];
        if (activeExif.ApertureValue) parts.push(`f/${activeExif.ApertureValue}`);
        if (activeExif.ISO) parts.push(`ISO ${activeExif.ISO}`);
        if (activeExif.ExposureTime) parts.push(`${activeExif.ExposureTime}s`);
        if (activeExif.FocalLength) parts.push(`${activeExif.FocalLength}mm`);
        
        if (parts.length > 0) {
            sanitizerElements.cameraDetails.textContent = parts.join(', ');
        } else {
            sanitizerElements.cameraDetails.textContent = t('no_exposure_found') || 'No camera exposure settings found';
        }
    }
    
    // Date
    if (sanitizerElements.dateDetails) {
        const rawDate = activeExif.DateTimeOriginal || activeExif.DateTimeDigitized || activeExif.DateTime;
        if (rawDate) {
            sanitizerElements.dateDetails.textContent = Utils.formatFullDate(rawDate);
        } else {
            sanitizerElements.dateDetails.textContent = t('no_date_found') || 'No timestamp found';
        }
    }
}

function initSanitizerMap() {
    const hasGPS = activeExif.latitude !== undefined && activeExif.longitude !== undefined;
    
    if (!hasGPS) {
        if (sanitizerElements.mapCard) {
            sanitizerElements.mapCard.classList.add('hidden');
        }
        return;
    }
    
    if (sanitizerElements.mapCard) {
        sanitizerElements.mapCard.classList.remove('hidden');
    }
    
    const lat = activeExif.latitude;
    const lng = activeExif.longitude;
    
    if (sanitizeMap) {
        // Map already exists, just update view and marker
        sanitizeMap.setView([lat, lng], 13);
        if (sanitizeMarker) {
            sanitizeMarker.setLatLng([lat, lng]);
        } else {
            sanitizeMarker = L.marker([lat, lng]).addTo(sanitizeMap);
        }
        setTimeout(() => sanitizeMap.invalidateSize(), 100);
        return;
    }
    
    // Create map
    sanitizeMap = L.map('sanitize-map', {
        zoomControl: false,
        attributionControl: false
    }).setView([lat, lng], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(sanitizeMap);
    
    sanitizeMarker = L.marker([lat, lng]).addTo(sanitizeMap);
    
    setTimeout(() => sanitizeMap.invalidateSize(), 100);
}

function updateVisuals() {
    // Checked (true) means REMOVE. Unchecked (false) means KEEP.
    const isGpsRemoveChecked = sanitizerElements.toggleGps ? sanitizerElements.toggleGps.checked : false;
    
    if (sanitizerElements.mapDiv) {
        if (!isGpsRemoveChecked) { // Not checked = KEEP = Show map normal
            sanitizerElements.mapDiv.classList.remove('map-blurred');
            if (sanitizerElements.privacyOverlay) sanitizerElements.privacyOverlay.classList.add('hidden');
            if (sanitizeMap) {
                setTimeout(() => sanitizeMap.invalidateSize(), 50);
            }
        } else { // Checked = REMOVE = Blur map & show gembok
            sanitizerElements.mapDiv.classList.add('map-blurred');
            if (sanitizerElements.privacyOverlay) sanitizerElements.privacyOverlay.classList.remove('hidden');
        }
    }
    
    // Redraw reactive privacy analysis
    renderPrivacyAnalysis();
    
    // Redraw reactive metadata preview
    renderReactiveMetadata();
}

function renderPrivacyAnalysis() {
    if (!sanitizerElements.privacyAnalysisContainer) return;
    
    // Checked (true) means REMOVE/STRIP
    const removeGps = sanitizerElements.toggleGps ? sanitizerElements.toggleGps.checked : false;
    const removeDevice = sanitizerElements.toggleDevice ? sanitizerElements.toggleDevice.checked : false;
    const removeCamera = sanitizerElements.toggleCamera ? sanitizerElements.toggleCamera.checked : false;
    const removeDate = sanitizerElements.toggleDate ? sanitizerElements.toggleDate.checked : false;
    
    // Presence check
    const hasGps = activeExif.latitude !== undefined && activeExif.longitude !== undefined;
    const hasDevice = !!(activeExif.Make || activeExif.Model);
    
    const cameraParts = [];
    if (activeExif.ApertureValue || activeExif.FNumber) cameraParts.push(`f/${activeExif.ApertureValue || activeExif.FNumber}`);
    if (activeExif.ISO) cameraParts.push(`ISO ${activeExif.ISO}`);
    if (activeExif.ExposureTime) cameraParts.push(`${activeExif.ExposureTime}s`);
    if (activeExif.FocalLength) cameraParts.push(`${activeExif.FocalLength}mm`);
    const hasCamera = cameraParts.length > 0 || !!activeExif.LensModel;
    
    const rawDate = activeExif.DateTimeOriginal || activeExif.DateTimeDigitized || activeExif.DateTime;
    const hasDate = !!rawDate;
    
    // Check if any existing sensitive data is being KEPT
    const isGpsAtRisk = hasGps && !removeGps;
    const isDateAtRisk = hasDate && !removeDate;
    const isDeviceAtRisk = hasDevice && !removeDevice;
    const isCameraAtRisk = hasCamera && !removeCamera;
    
    const isAnyAtRisk = isGpsAtRisk || isDateAtRisk || isDeviceAtRisk || isCameraAtRisk;
    
    // Score Badge / Header
    let statusClass = isAnyAtRisk ? 'risk' : 'safe';
    let statusTitle = isAnyAtRisk ? t('privacy_score_risk') : t('privacy_score_safe');
    let statusDesc = isAnyAtRisk ? t('privacy_desc_risk') : t('privacy_desc_safe');
    let statusIcon = isAnyAtRisk ? 'shield-alert' : 'shield-check';
    let statusColor = isAnyAtRisk ? '#ea580c' : '#10b981';
    let statusBg = isAnyAtRisk ? 'rgba(234, 88, 12, 0.05)' : 'rgba(16, 185, 129, 0.05)';
    let statusBorder = isAnyAtRisk ? 'rgba(234, 88, 12, 0.2)' : 'rgba(16, 185, 129, 0.2)';
    
    // Render the score header
    let html = `
        <div style="background: ${statusBg}; border: 1px solid ${statusBorder}; padding: 1rem; border-radius: 8px; margin-bottom: 1.25rem; display: flex; gap: 0.75rem; align-items: flex-start;">
            <div style="color: ${statusColor}; margin-top: 0.15rem;">
                <i data-lucide="${statusIcon}" style="width: 24px; height: 24px;"></i>
            </div>
            <div>
                <h4 style="margin: 0 0 0.25rem; font-size: 0.95rem; font-weight: 600; color: var(--text-main);">${statusTitle}</h4>
                <p style="margin: 0; font-size: 0.8rem; line-height: 1.4; color: var(--text-muted);">${statusDesc}</p>
            </div>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 0.85rem;">
    `;
    
    // 1. GPS Item
    let gpsIcon = 'info';
    let gpsIconColor = 'var(--text-muted)';
    let gpsText = t('privacy_item_gps_none');
    
    if (hasGps) {
        if (removeGps) {
            gpsIcon = 'check-circle';
            gpsIconColor = '#10b981';
            gpsText = t('privacy_item_gps_safe');
        } else {
            gpsIcon = 'alert-triangle';
            gpsIconColor = '#ea580c';
            gpsText = t('privacy_item_gps_risk', { coords: `${activeExif.latitude.toFixed(5)}, ${activeExif.longitude.toFixed(5)}` });
        }
    }
    html += renderChecklistItem(gpsIcon, gpsIconColor, gpsText);
    
    // 2. Date Item
    let dateIcon = 'info';
    let dateIconColor = 'var(--text-muted)';
    let dateText = t('privacy_item_date_none');
    
    if (hasDate) {
        if (removeDate) {
            dateIcon = 'check-circle';
            dateIconColor = '#10b981';
            dateText = t('privacy_item_date_safe');
        } else {
            dateIcon = 'alert-triangle';
            dateIconColor = '#ea580c';
            dateText = t('privacy_item_date_risk', { time: Utils.formatFullDate(rawDate) });
        }
    }
    html += renderChecklistItem(dateIcon, dateIconColor, dateText);
    
    // 3. Device Item
    let deviceIcon = 'info';
    let deviceIconColor = 'var(--text-muted)';
    let deviceText = t('privacy_item_device_none');
    
    if (hasDevice) {
        if (removeDevice) {
            deviceIcon = 'check-circle';
            deviceIconColor = '#10b981';
            deviceText = t('privacy_item_device_safe');
        } else {
            deviceIcon = 'alert-triangle';
            deviceIconColor = '#ea580c';
            const deviceName = `${activeExif.Make || ''} ${activeExif.Model || ''}`.trim();
            deviceText = t('privacy_item_device_risk', { device: deviceName });
        }
    }
    html += renderChecklistItem(deviceIcon, deviceIconColor, deviceText);
    
    // 4. Camera settings Item
    let cameraIcon = 'info';
    let cameraIconColor = 'var(--text-muted)';
    let cameraText = t('privacy_item_camera_none');
    
    if (hasCamera) {
        if (removeCamera) {
            cameraIcon = 'check-circle';
            cameraIconColor = '#10b981';
            cameraText = t('privacy_item_camera_safe');
        } else {
            cameraIcon = 'alert-triangle';
            cameraIconColor = '#ea580c';
            const settingsStr = [cameraParts.join(', '), activeExif.LensModel].filter(Boolean).join(' | ');
            cameraText = t('privacy_item_camera_risk', { settings: settingsStr });
        }
    }
    html += renderChecklistItem(cameraIcon, cameraIconColor, cameraText);
    
    html += `</div>`;
    
    sanitizerElements.privacyAnalysisContainer.innerHTML = html;
    
    if (window.lucide) {
        window.lucide.createIcons({
            attrs: {
                class: 'lucide-icon'
            },
            node: sanitizerElements.privacyAnalysisContainer
        });
    }
}

function renderChecklistItem(icon, color, text) {
    return `
        <div style="display: flex; gap: 0.65rem; align-items: flex-start; font-size: 0.85rem; line-height: 1.45;">
            <div style="color: ${color}; flex-shrink: 0; margin-top: 0.1rem;">
                <i data-lucide="${icon}" style="width: 16px; height: 16px;"></i>
            </div>
            <div style="color: var(--text-main);">${text}</div>
        </div>
    `;
}

function applyPreset(presetName) {
    // Checked (true) = REMOVE, Unchecked (false) = KEEP
    if (presetName === 'max-privacy') {
        if (sanitizerElements.toggleGps && !sanitizerElements.toggleGps.disabled) sanitizerElements.toggleGps.checked = true;
        if (sanitizerElements.toggleDevice && !sanitizerElements.toggleDevice.disabled) sanitizerElements.toggleDevice.checked = true;
        if (sanitizerElements.toggleCamera && !sanitizerElements.toggleCamera.disabled) sanitizerElements.toggleCamera.checked = true;
        if (sanitizerElements.toggleDate && !sanitizerElements.toggleDate.disabled) sanitizerElements.toggleDate.checked = true;
    } else if (presetName === 'photo-share') {
        if (sanitizerElements.toggleGps && !sanitizerElements.toggleGps.disabled) sanitizerElements.toggleGps.checked = true;
        if (sanitizerElements.toggleDevice && !sanitizerElements.toggleDevice.disabled) sanitizerElements.toggleDevice.checked = false;
        if (sanitizerElements.toggleCamera && !sanitizerElements.toggleCamera.disabled) sanitizerElements.toggleCamera.checked = false;
        if (sanitizerElements.toggleDate && !sanitizerElements.toggleDate.disabled) sanitizerElements.toggleDate.checked = true;
    } else if (presetName === 'location-only') {
        if (sanitizerElements.toggleGps && !sanitizerElements.toggleGps.disabled) sanitizerElements.toggleGps.checked = false;
        if (sanitizerElements.toggleDevice && !sanitizerElements.toggleDevice.disabled) sanitizerElements.toggleDevice.checked = true;
        if (sanitizerElements.toggleCamera && !sanitizerElements.toggleCamera.disabled) sanitizerElements.toggleCamera.checked = true;
        if (sanitizerElements.toggleDate && !sanitizerElements.toggleDate.disabled) sanitizerElements.toggleDate.checked = true;
    }
    updateVisuals();
}

function handleCancel() {
    if (batchEntries.length > 0) {
        cleanupBatchSanitizer();
    }
    Router.navigate(state.assets && state.assets.length > 0 ? '#/dashboard' : '#/');
}

async function executeSanitization() {
    if (batchEntries.length > 0) {
        await executeBatchSanitization();
        return;
    }
    if (!activeFile) return;
    
    // Checked (true) means REMOVE/STRIP.
    const options = {
        gps: sanitizerElements.toggleGps ? sanitizerElements.toggleGps.checked : false,
        device: sanitizerElements.toggleDevice ? sanitizerElements.toggleDevice.checked : false,
        camera: sanitizerElements.toggleCamera ? sanitizerElements.toggleCamera.checked : false,
        date: sanitizerElements.toggleDate ? sanitizerElements.toggleDate.checked : false
    };
    
    if (switchStateFn) {
        switchStateFn('loading');
    }
    
    try {
        let cleanedBlob;
        // If all options are checked to be removed, run stripAllMetadata directly
        const stripAll = options.gps && options.device && options.camera && options.date;
        
        if (stripAll) {
            cleanedBlob = await Utils.stripAllMetadata(activeFile);
        } else {
            cleanedBlob = await Utils.stripSpecificMetadata(activeFile, options);
        }
        
        Utils.downloadBlob(cleanedBlob, activeFile.name);
        
        // --- Create sanitized asset for history + dashboard ---
        const cleanedFile = new File([cleanedBlob], activeFile.name, { type: activeFile.type || 'image/jpeg' });
        
        const parseOptions = { tiff: true, xmp: true, icc: true, iptc: true, jfif: true, ihdr: true, gps: true };
        const remainingExif = await exifr.parse(cleanedFile, parseOptions);
        const thumbUrl = await History.createThumbnail(cleanedFile);
        const sha256 = await Utils.calculateFileHash(cleanedFile, 'SHA-256');
        const sha1 = await Utils.calculateFileHash(cleanedFile, 'SHA-1');
        
        const sanitizedAsset = {
            id: Date.now() + Math.random(),
            fileName: activeFile.name,
            fileObject: cleanedFile,
            fileSize: cleanedFile.size,
            fileType: cleanedFile.type,
            fileDate: Date.now(),
            exifData: remainingExif || {},
            thumbUrl: thumbUrl,
            locationData: null,
            sha256,
            sha1,
            isSanitized: true,
            sanitizeOptions: options,
            integrityAlerts: []
        };
        sanitizedAsset.integrityAlerts = Utils.analyzeFileIntegrity(sanitizedAsset);
        
        if (onSanitizedFn) {
            onSanitizedFn(sanitizedAsset, options);
        }
    } catch (err) {
        console.error("Sanitization failed:", err);
        if (switchStateFn) switchStateFn('sanitize');
        alert(t('err_sanitize_failed') || 'Failed to clean metadata. Please try again.');
    }
}

function renderReactiveMetadata() {
    if (!sanitizerElements.previewContainer) return;
    sanitizerElements.previewContainer.innerHTML = '';
    
    const categorized = Utils.categorizeExif(activeExif);
    const items = [];
    
    // Determine which toggles are checked (checked = REMOVE)
    const removeGps = sanitizerElements.toggleGps ? sanitizerElements.toggleGps.checked : false;
    const removeDevice = sanitizerElements.toggleDevice ? sanitizerElements.toggleDevice.checked : false;
    const removeCamera = sanitizerElements.toggleCamera ? sanitizerElements.toggleCamera.checked : false;
    const removeDate = sanitizerElements.toggleDate ? sanitizerElements.toggleDate.checked : false;
    
    for (const [category, props] of Object.entries(categorized)) {
        const catKey = Utils.getCategoryKey(category);
        const isImportant = ['Device Hardware', 'Exposure Settings', 'Optics & Lens', 'Image Quality', 'Timeline & Date'].includes(category);
        const isSecondary = ['Standards & Info', 'Miscellaneous'].includes(category);
        
        // Only render tabs that contain properties in this file
        if (Object.keys(props).length === 0) continue;
        
        // Check if this entire category is flagged for removal
        let isCategoryRemoved = false;
        if (category === 'Geospatial' && removeGps) isCategoryRemoved = true;
        if (category === 'Device Hardware' && removeDevice) isCategoryRemoved = true;
        if (['Exposure Settings', 'Optics & Lens', 'Image Quality'].includes(category) && removeCamera) isCategoryRemoved = true;
        if (category === 'Timeline & Date' && removeDate) isCategoryRemoved = true;
        
        items.push({
            category,
            props,
            key: catKey,
            isImportant,
            isSecondary,
            isRemoved: isCategoryRemoved,
            icon: Utils.getCategoryIcon(category)
        });
    }
    
    if (items.length === 0) {
        sanitizerElements.previewContainer.innerHTML = `
            <div class="text-muted" style="padding: 24px; text-align: center; opacity: 0.7;">
                ${t('no_metadata_tags') || 'No metadata tags found'}
            </div>
        `;
        return;
    }
    
    const tabsWrapper = document.createElement('div');
    tabsWrapper.className = 'tabs-wrapper';
    
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'expert-tabs-container metadata-tabs';
    tabsContainer.style.borderBottom = '1px solid var(--border-color)';
    tabsContainer.style.padding = '0.5rem 1rem 0';
    
    const contentContainer = document.createElement('div');
    contentContainer.className = 'expert-panes-wrapper';
    
    // Ensure activeTabKey is valid, otherwise set to first available
    const hasActiveTab = items.some(item => item.key === activeTabKey);
    if (!hasActiveTab && items.length > 0) {
        activeTabKey = items[0].key;
    }

    items.forEach((item, index) => {
        const translatedCategory = t(item.key) || item.category;
        const isActive = item.key === activeTabKey;
        
        // Tab Button
        const btn = document.createElement('button');
        btn.className = `expert-tab-btn ${isActive ? 'active' : ''}`;
        btn.dataset.id = `meta-${item.key}`;
        btn.style.position = 'relative';
        
        let tabLabelHtml = `
            <i data-lucide="${item.icon}"></i>
            <span>${translatedCategory}</span>
        `;
        
        if (item.isRemoved) {
            tabLabelHtml += `
                <span style="position: absolute; top: 4px; right: 4px; width: 6px; height: 6px; background-color: #ef4444; border-radius: 50%;"></span>
            `;
        }
        
        btn.innerHTML = tabLabelHtml;
        tabsContainer.appendChild(btn);
        
        // Tab Pane
        const pane = document.createElement('div');
        pane.className = `expert-tab-pane ${isActive ? 'active' : ''}`;
        
        const keys = Object.keys(item.props);
        
        const dataGridHtml = keys.sort().map(key => {
            const formattedLabel = Utils.formatLabel(key);
            const formattedValue = Utils.formatValue(key, item.props[key]);
            
            if (item.isRemoved) {
                return `
                    <div class="data-item">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                            <div class="data-label" style="margin-bottom: 0; text-decoration: line-through; opacity: 0.5;">${Utils.escapeHTML(formattedLabel)}</div>
                            <span style="font-size: 0.65rem; font-weight: 600; text-transform: uppercase; color: #ef4444; display: inline-flex; align-items: center; gap: 0.3rem;">
                                <span style="display: inline-block; width: 5px; height: 5px; background-color: #ef4444; border-radius: 50%;"></span>
                                ${t('status_removed') || 'Removed'}
                            </span>
                        </div>
                        <div class="data-value" style="text-decoration: line-through; opacity: 0.5;">${Utils.escapeHTML(formattedValue)}</div>
                    </div>
                `;
            } else {
                return `
                    <div class="data-item">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                            <div class="data-label" style="margin-bottom: 0;">${Utils.escapeHTML(formattedLabel)}</div>
                            <span style="font-size: 0.65rem; font-weight: 600; text-transform: uppercase; color: #10b981; display: inline-flex; align-items: center; gap: 0.3rem;">
                                <span style="display: inline-block; width: 5px; height: 5px; background-color: #10b981; border-radius: 50%;"></span>
                                ${t('status_kept') || 'Kept'}
                            </span>
                        </div>
                        <div class="data-value">${Utils.escapeHTML(formattedValue)}</div>
                    </div>
                `;
            }
        }).join('');
        
        pane.innerHTML = `
            <div class="card-body" style="padding: 1.25rem;">
                <div class="data-grid">
                    ${dataGridHtml}
                </div>
            </div>
        `;
        
        contentContainer.appendChild(pane);
        
        btn.addEventListener('click', () => {
            Utils.animateTabTransition(contentContainer, pane, () => {
                activeTabKey = item.key;
                tabsContainer.querySelectorAll('.expert-tab-btn').forEach(b => b.classList.remove('active'));
                contentContainer.querySelectorAll('.expert-tab-pane').forEach(p => p.classList.remove('active'));
                
                btn.classList.add('active');
                pane.classList.add('active');
            });
        });
    });
    
    tabsWrapper.appendChild(tabsContainer);
    tabsWrapper.appendChild(contentContainer);
    sanitizerElements.previewContainer.appendChild(tabsWrapper);
    
    // Trigger Lucide icons rendering
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// ===== BATCH SANITIZER =====

export function startBatchSanitizerStudio(entries) {
    batchEntries = entries;
    batchActiveIndex = 0;
    batchGlobalOptions = { gps: false, device: false, camera: false, date: false };
    batchOverrides = {};

    const entry = entries[0];
    activeFile = entry.file;
    activeExif = entry.exifData || {};
    activeTabKey = null;

    if (sanitizerElements.previewImage) {
        sanitizerElements.previewImage.src = URL.createObjectURL(entry.file);
    }
    if (sanitizerElements.fileInfo) {
        const sizeMB = (entry.file.size / (1024 * 1024)).toFixed(2);
        sanitizerElements.fileInfo.innerHTML = `
            <div class="info-item">
                <span class="info-label" data-i18n="info_filename">Filename</span>
                <span class="info-value font-mono text-sm">${Utils.escapeHTML(entry.fileName)}</span>
            </div>
            <div class="info-item">
                <span class="info-label" data-i18n="info_filesize">File Size</span>
                <span class="info-value">${sizeMB} MB</span>
            </div>
            <div class="info-item">
                <span class="info-label" data-i18n="info_format">Format</span>
                <span class="info-value font-mono">${entry.file.type.split('/')[1]?.toUpperCase() || 'JPEG'}</span>
            </div>
        `;
    }

    populateDetailsLabels();
    initSanitizerMap();
    // In batch mode, toggles show global defaults (all unchecked = KEEP)
    if (sanitizerElements.toggleGps) { sanitizerElements.toggleGps.checked = false; sanitizerElements.toggleGps.disabled = false; }
    if (sanitizerElements.toggleDevice) { sanitizerElements.toggleDevice.checked = false; sanitizerElements.toggleDevice.disabled = false; }
    if (sanitizerElements.toggleCamera) { sanitizerElements.toggleCamera.checked = false; sanitizerElements.toggleCamera.disabled = false; }
    if (sanitizerElements.toggleDate) { sanitizerElements.toggleDate.checked = false; sanitizerElements.toggleDate.disabled = false; }
    updateVisuals();

    renderBatchSelector();

    const batchIndicator = document.getElementById('sanitize-batch-indicator');
    if (batchIndicator) {
        batchIndicator.classList.remove('hidden');
        batchIndicator.innerHTML = `<i data-lucide="layers"></i> ${t('batch') || 'Batch'}: ${batchActiveIndex + 1} / ${batchEntries.length}`;
    }

    if (sanitizerElements.downloadBtn) {
        sanitizerElements.downloadBtn.innerHTML = '<i data-lucide="download"></i> <span>' + (t('download_all_sanitized') || 'Download All Sanitized') + '</span>';
    }

    Router.navigate('#/sanitize');
}

function renderBatchSelector() {
    const container = document.getElementById('sanitize-asset-selector');
    if (!container) return;
    container.innerHTML = '';
    container.classList.remove('hidden');

    batchEntries.forEach((entry, index) => {
        const thumb = document.createElement('div');
        thumb.className = `sanitize-selector-thumb${index === batchActiveIndex ? ' active' : ''}`;

        const img = document.createElement('img');
        img.src = URL.createObjectURL(entry.file);
        img.alt = entry.fileName;

        const label = document.createElement('span');
        label.className = 'sanitize-selector-label';
        label.textContent = entry.fileName.length > 18 ? entry.fileName.substring(0, 15) + '...' : entry.fileName;

        const customizeBtn = document.createElement('button');
        customizeBtn.className = 'sanitize-selector-customize';
        customizeBtn.innerHTML = '<i data-lucide="sliders"></i>';
        customizeBtn.title = t('customize_options') || 'Customize options';
        customizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openPerFileModal(index);
        });

        thumb.appendChild(img);
        thumb.appendChild(label);
        thumb.appendChild(customizeBtn);
        thumb.addEventListener('click', () => switchBatchAsset(index));

        if (batchOverrides[index]) thumb.classList.add('has-customize');

        container.appendChild(thumb);
    });

    if (window.lucide) window.lucide.createIcons();
}

export function switchBatchAsset(index) {
    if (index < 0 || index >= batchEntries.length) return;
    batchActiveIndex = index;
    const entry = batchEntries[index];
    activeFile = entry.file;
    activeExif = entry.exifData || {};
    activeTabKey = null;

    if (sanitizerElements.previewImage) {
        URL.revokeObjectURL(sanitizerElements.previewImage.src);
        sanitizerElements.previewImage.src = URL.createObjectURL(entry.file);
    }
    if (sanitizerElements.fileInfo) {
        const sizeMB = (entry.file.size / (1024 * 1024)).toFixed(2);
        sanitizerElements.fileInfo.innerHTML = `
            <div class="info-item">
                <span class="info-label" data-i18n="info_filename">Filename</span>
                <span class="info-value font-mono text-sm">${Utils.escapeHTML(entry.fileName)}</span>
            </div>
            <div class="info-item">
                <span class="info-label" data-i18n="info_filesize">File Size</span>
                <span class="info-value">${sizeMB} MB</span>
            </div>
            <div class="info-item">
                <span class="info-label" data-i18n="info_format">Format</span>
                <span class="info-value font-mono">${entry.file.type.split('/')[1]?.toUpperCase() || 'JPEG'}</span>
            </div>
        `;
    }

    populateDetailsLabels();
    initSanitizerMap();
    updateVisuals();

    const container = document.getElementById('sanitize-asset-selector');
    if (container) {
        container.querySelectorAll('.sanitize-selector-thumb').forEach((t, i) => {
            t.classList.toggle('active', i === index);
        });
    }

    const batchIndicator = document.getElementById('sanitize-batch-indicator');
    if (batchIndicator) {
        batchIndicator.innerHTML = `<i data-lucide="layers"></i> ${t('batch') || 'Batch'}: ${index + 1} / ${batchEntries.length}`;
    }

    if (window.lucide) window.lucide.createIcons();
}

export function openPerFileModal(index) {
    const entry = batchEntries[index];
    const overlay = document.getElementById('sanitize-perfile-overlay');
    if (!overlay) return;

    const contentEl = overlay.querySelector('.modal-content');
    if (!contentEl) return;

    const override = batchOverrides[index];
    const gpsChecked = override ? override.gps : batchGlobalOptions.gps;
    const deviceChecked = override ? override.device : batchGlobalOptions.device;
    const cameraChecked = override ? override.camera : batchGlobalOptions.camera;
    const dateChecked = override ? override.date : batchGlobalOptions.date;

    const exif = entry.exifData || {};
    const hasGPS = exif.latitude !== undefined && exif.longitude !== undefined;
    const hasDevice = exif.Make || exif.Model;
    const hasCamera = exif.ApertureValue !== undefined || exif.ISO !== undefined || exif.ExposureTime !== undefined || exif.FocalLength !== undefined;
    const hasDate = exif.DateTimeOriginal || exif.DateTimeDigitized || exif.DateTime;

    contentEl.innerHTML = `
        <div class="modal-header">
            <h3>${t('customize_file_options') || 'Customize Options'}</h3>
            <span class="modal-filename">${Utils.escapeHTML(entry.fileName)}</span>
        </div>
        <div class="modal-body">
            <div class="sanitize-toggle-row">
                <div class="toggle-info"><i data-lucide="map-pin"></i><span>${t('cat_gps_removal') || 'GPS Location'}</span></div>
                <label class="switch-control">
                    <input type="checkbox" class="perfile-toggle" data-key="gps" ${gpsChecked ? 'checked' : ''} ${!hasGPS ? 'disabled' : ''}>
                    <span class="switch-slider"></span>
                </label>
            </div>
            <div class="sanitize-toggle-row">
                <div class="toggle-info"><i data-lucide="smartphone"></i><span>${t('cat_device_removal') || 'Device Info'}</span></div>
                <label class="switch-control">
                    <input type="checkbox" class="perfile-toggle" data-key="device" ${deviceChecked ? 'checked' : ''} ${!hasDevice ? 'disabled' : ''}>
                    <span class="switch-slider"></span>
                </label>
            </div>
            <div class="sanitize-toggle-row">
                <div class="toggle-info"><i data-lucide="camera"></i><span>${t('cat_camera_removal') || 'Camera Settings'}</span></div>
                <label class="switch-control">
                    <input type="checkbox" class="perfile-toggle" data-key="camera" ${cameraChecked ? 'checked' : ''} ${!hasCamera ? 'disabled' : ''}>
                    <span class="switch-slider"></span>
                </label>
            </div>
            <div class="sanitize-toggle-row">
                <div class="toggle-info"><i data-lucide="calendar"></i><span>${t('sanitize_toggle_date') || 'Date/Time'}</span></div>
                <label class="switch-control">
                    <input type="checkbox" class="perfile-toggle" data-key="date" ${dateChecked ? 'checked' : ''} ${!hasDate ? 'disabled' : ''}>
                    <span class="switch-slider"></span>
                </label>
            </div>
        </div>
    `;

    overlay.classList.remove('hidden');

    // Cancel
    const cancelBtn = document.getElementById('sanitize-perfile-cancel');
    const applyBtn = document.getElementById('sanitize-perfile-apply');
    const resetBtn = document.getElementById('sanitize-perfile-reset');

    const closeModal = () => overlay.classList.add('hidden');
    const cleanup = () => {
        cancelBtn.removeEventListener('click', closeModal);
        applyBtn.removeEventListener('click', applyHandler);
        resetBtn.removeEventListener('click', resetHandler);
        overlay.removeEventListener('click', outsideClick);
    };
    const outsideClick = (e) => { if (e.target === overlay) { closeModal(); cleanup(); } };

    const applyHandler = () => {
        const toggles = contentEl.querySelectorAll('.perfile-toggle');
        const options = {};
        toggles.forEach(t => { options[t.dataset.key] = t.checked; });
        batchOverrides[index] = options;
        closeModal();
        cleanup();
        if (batchActiveIndex === index) switchBatchAsset(index);
        updateSelectorCustomizeIndicator(index);
        if (window.lucide) window.lucide.createIcons();
    };

    const resetHandler = () => {
        delete batchOverrides[index];
        closeModal();
        cleanup();
        if (batchActiveIndex === index) switchBatchAsset(index);
        updateSelectorCustomizeIndicator(index);
    };

    cancelBtn.addEventListener('click', () => { closeModal(); cleanup(); });
    applyBtn.addEventListener('click', applyHandler);
    resetBtn.addEventListener('click', resetHandler);
    overlay.addEventListener('click', outsideClick);

    if (window.lucide) window.lucide.createIcons();
}

function updateSelectorCustomizeIndicator(index) {
    const container = document.getElementById('sanitize-asset-selector');
    if (!container) return;
    const thumbs = container.querySelectorAll('.sanitize-selector-thumb');
    if (thumbs[index]) {
        thumbs[index].classList.toggle('has-customize', !!batchOverrides[index]);
    }
}

async function executeBatchSanitization() {
    if (batchEntries.length === 0) return;

    if (sanitizerElements.downloadBtn) {
        sanitizerElements.downloadBtn.disabled = true;
        sanitizerElements.downloadBtn.innerHTML = '<i data-lucide="loader"></i> <span>' + (t('processing') || 'Processing...') + '</span>';
    }

    if (switchStateFn) switchStateFn('loading');

    const sanitizedAssets = [];
    try {
        for (let i = 0; i < batchEntries.length; i++) {
            const entry = batchEntries[i];
            const options = batchOverrides[i] || { ...batchGlobalOptions };

            const stripAll = options.gps && options.device && options.camera && options.date;
            let cleanedBlob;
            if (stripAll) {
                cleanedBlob = await Utils.stripAllMetadata(entry.file);
            } else {
                cleanedBlob = await Utils.stripSpecificMetadata(entry.file, options);
            }

            Utils.downloadBlob(cleanedBlob, entry.fileName);
            await new Promise(resolve => setTimeout(resolve, 500));

            const cleanedFile = new File([cleanedBlob], entry.fileName, { type: entry.file.type || 'image/jpeg' });
            const parseOptions = { tiff: true, xmp: true, icc: true, iptc: true, jfif: true, ihdr: true, gps: true };
            const remainingExif = await exifr.parse(cleanedFile, parseOptions);
            const thumbUrl = await History.createThumbnail(cleanedFile);
            const sha256 = await Utils.calculateFileHash(cleanedFile, 'SHA-256');
            const sha1 = await Utils.calculateFileHash(cleanedFile, 'SHA-1');

            const batchAsset = {
                id: Date.now() + Math.random() + i,
                fileName: entry.fileName,
                fileObject: cleanedFile,
                fileSize: cleanedFile.size,
                fileType: cleanedFile.type,
                fileDate: Date.now(),
                exifData: remainingExif || {},
                thumbUrl,
                locationData: null,
                sha256,
                sha1,
                isSanitized: true,
                sanitizeOptions: options,
                integrityAlerts: []
            };
            batchAsset.integrityAlerts = Utils.analyzeFileIntegrity(batchAsset);
            sanitizedAssets.push(batchAsset);
        }

        cleanupBatchSanitizer();

        if (onBatchSanitizedFn) {
            onBatchSanitizedFn(sanitizedAssets, { ...batchGlobalOptions, perFileOverrides: { ...batchOverrides } });
        }
    } catch (err) {
        console.error("Batch sanitization failed:", err);
        if (switchStateFn) switchStateFn('sanitize');
        alert(t('err_sanitize_failed') || 'Failed to clean metadata. Please try again.');
        if (sanitizerElements.downloadBtn) {
            sanitizerElements.downloadBtn.disabled = false;
            sanitizerElements.downloadBtn.innerHTML = '<i data-lucide="download"></i> <span>' + (t('download_all_sanitized') || 'Download All Sanitized') + '</span>';
        }
    }
}

export function cleanupBatchSanitizer() {
    batchEntries = [];
    batchActiveIndex = 0;
    batchGlobalOptions = { gps: false, device: false, camera: false, date: false };
    batchOverrides = {};

    const container = document.getElementById('sanitize-asset-selector');
    if (container) {
        container.classList.add('hidden');
        container.innerHTML = '';
    }
    const indicator = document.getElementById('sanitize-batch-indicator');
    if (indicator) indicator.classList.add('hidden');

    if (sanitizerElements.downloadBtn) {
        sanitizerElements.downloadBtn.disabled = false;
        sanitizerElements.downloadBtn.innerHTML = '<i data-lucide="download"></i> <span>' + (t('download_cleaned') || 'Download Cleaned Photo') + '</span>';
    }
}

export function setOnBatchSanitizedFn(fn) {
    onBatchSanitizedFn = fn;
}
