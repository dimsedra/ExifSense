import * as Utils from './utils.js';
import { t } from './i18n.js';

let state = null;
let elements = null;
let switchStateFn = null;

let activeFile = null;
let activeExif = null;
let sanitizeMap = null;
let sanitizeMarker = null;
let activeTabKey = null;

// DOM Elements local to Sanitizer Studio
const sanitizerElements = {
    previewImage: document.getElementById('sanitize-preview-image'),
    fileInfo: document.getElementById('sanitize-file-info'),
    mapCard: document.getElementById('sanitize-map-card'),
    mapDiv: document.getElementById('sanitize-map'),
    privacyOverlay: document.getElementById('sanitize-privacy-overlay'),
    previewContainer: document.getElementById('sanitize-metadata-preview-container'),
    
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

export function initSanitizer(appState, appElements, switchState) {
    state = appState;
    elements = appElements;
    switchStateFn = switchState;
    
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
    [
        sanitizerElements.toggleGps,
        sanitizerElements.toggleDevice,
        sanitizerElements.toggleCamera,
        sanitizerElements.toggleDate
    ].forEach(toggle => {
        if (toggle) {
            toggle.addEventListener('change', updateVisuals);
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
    
    // 7. Transition view
    if (switchStateFn) {
        switchStateFn('sanitize');
    }
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
    
    // Redraw reactive metadata preview
    renderReactiveMetadata();
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
    // Switch state back
    if (switchStateFn) {
        switchStateFn(state.assets.length > 0 ? 'dashboard' : 'intro');
    }
}

async function executeSanitization() {
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
        
        // Show success confirm
        Utils.showConfirm({
            title: t('sanitization_complete_title') || 'Metadata Cleaned!',
            message: t('sanitization_complete_msg') || 'The cleaned photo has been downloaded successfully to your computer.',
            confirmText: t('done') || 'Done',
            type: 'info',
            onConfirm: () => {
                if (switchStateFn) {
                    switchStateFn(state.assets.length > 0 ? 'dashboard' : 'intro');
                }
            }
        });
    } catch (err) {
        console.error("Sanitization failed:", err);
        alert(t('err_sanitize_failed') || 'Failed to clean metadata. Please try again.');
        if (switchStateFn) {
            switchStateFn('sanitize');
        }
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
    contentContainer.className = 'panes-container';
    
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
            activeTabKey = item.key;
            tabsContainer.querySelectorAll('.expert-tab-btn').forEach(b => b.classList.remove('active'));
            contentContainer.querySelectorAll('.expert-tab-pane').forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            pane.classList.add('active');
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
