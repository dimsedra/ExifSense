import * as Utils from './utils.js';
import { t } from './i18n.js';

let state = null;
let elements = null;
let switchStateFn = null;

let activeFile = null;
let activeExif = null;
let sanitizeMap = null;
let sanitizeMarker = null;

// DOM Elements local to Sanitizer Studio
const sanitizerElements = {
    previewImage: document.getElementById('sanitize-preview-image'),
    fileInfo: document.getElementById('sanitize-file-info'),
    mapCard: document.getElementById('sanitize-map-card'),
    mapDiv: document.getElementById('sanitize-map'),
    privacyOverlay: document.getElementById('sanitize-privacy-overlay'),
    
    // Presets
    presetMaxPrivacy: document.getElementById('preset-max-privacy'),
    presetPhotoShare: document.getElementById('preset-photo-share'),
    presetLocationOnly: document.getElementById('preset-location-only'),
    
    // Toggles
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
    
    // 5. Default Toggle States (start checked = KEEP)
    resetToggles();
    
    // 6. Update Peta & Overlay
    updateVisuals();
    
    // 7. Transition view
    if (switchStateFn) {
        switchStateFn('sanitize');
    }
}

function resetToggles() {
    // If no GPS, disable and uncheck GPS toggle
    const hasGPS = activeExif.latitude !== undefined && activeExif.longitude !== undefined;
    if (sanitizerElements.toggleGps) {
        sanitizerElements.toggleGps.checked = hasGPS;
        sanitizerElements.toggleGps.disabled = !hasGPS;
    }
    
    // Device toggle
    const hasDevice = activeExif.Make || activeExif.Model;
    if (sanitizerElements.toggleDevice) {
        sanitizerElements.toggleDevice.checked = hasDevice;
        sanitizerElements.toggleDevice.disabled = !hasDevice;
    }
    
    // Camera toggle
    const hasCamera = activeExif.ApertureValue !== undefined || activeExif.ISO !== undefined || activeExif.ExposureTime !== undefined || activeExif.FocalLength !== undefined;
    if (sanitizerElements.toggleCamera) {
        sanitizerElements.toggleCamera.checked = hasCamera;
        sanitizerElements.toggleCamera.disabled = !hasCamera;
    }
    
    // Date toggle
    const hasDate = activeExif.DateTimeOriginal || activeExif.DateTimeDigitized || activeExif.DateTime;
    if (sanitizerElements.toggleDate) {
        sanitizerElements.toggleDate.checked = hasDate;
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
    const isGpsChecked = sanitizerElements.toggleGps ? sanitizerElements.toggleGps.checked : false;
    
    if (sanitizerElements.mapDiv) {
        if (isGpsChecked) {
            sanitizerElements.mapDiv.classList.remove('map-blurred');
            if (sanitizerElements.privacyOverlay) sanitizerElements.privacyOverlay.classList.add('hidden');
            if (sanitizeMap) {
                setTimeout(() => sanitizeMap.invalidateSize(), 50);
            }
        } else {
            sanitizerElements.mapDiv.classList.add('map-blurred');
            if (sanitizerElements.privacyOverlay) sanitizerElements.privacyOverlay.classList.remove('hidden');
        }
    }
}

function applyPreset(presetName) {
    if (presetName === 'max-privacy') {
        if (sanitizerElements.toggleGps && !sanitizerElements.toggleGps.disabled) sanitizerElements.toggleGps.checked = false;
        if (sanitizerElements.toggleDevice && !sanitizerElements.toggleDevice.disabled) sanitizerElements.toggleDevice.checked = false;
        if (sanitizerElements.toggleCamera && !sanitizerElements.toggleCamera.disabled) sanitizerElements.toggleCamera.checked = false;
        if (sanitizerElements.toggleDate && !sanitizerElements.toggleDate.disabled) sanitizerElements.toggleDate.checked = false;
    } else if (presetName === 'photo-share') {
        if (sanitizerElements.toggleGps && !sanitizerElements.toggleGps.disabled) sanitizerElements.toggleGps.checked = false;
        if (sanitizerElements.toggleDevice && !sanitizerElements.toggleDevice.disabled) sanitizerElements.toggleDevice.checked = true;
        if (sanitizerElements.toggleCamera && !sanitizerElements.toggleCamera.disabled) sanitizerElements.toggleCamera.checked = true;
        if (sanitizerElements.toggleDate && !sanitizerElements.toggleDate.disabled) sanitizerElements.toggleDate.checked = false;
    } else if (presetName === 'location-only') {
        if (sanitizerElements.toggleGps && !sanitizerElements.toggleGps.disabled) sanitizerElements.toggleGps.checked = true;
        if (sanitizerElements.toggleDevice && !sanitizerElements.toggleDevice.disabled) sanitizerElements.toggleDevice.checked = false;
        if (sanitizerElements.toggleCamera && !sanitizerElements.toggleCamera.disabled) sanitizerElements.toggleCamera.checked = false;
        if (sanitizerElements.toggleDate && !sanitizerElements.toggleDate.disabled) sanitizerElements.toggleDate.checked = false;
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
    
    // Toggle checked means KEEP. Toggle UNCHECKED means STRIP.
    // removalOptions requires true if we want to REMOVE/STRIP.
    const options = {
        gps: sanitizerElements.toggleGps ? !sanitizerElements.toggleGps.checked : false,
        device: sanitizerElements.toggleDevice ? !sanitizerElements.toggleDevice.checked : false,
        camera: sanitizerElements.toggleCamera ? !sanitizerElements.toggleCamera.checked : false,
        date: sanitizerElements.toggleDate ? !sanitizerElements.toggleDate.checked : false
    };
    
    if (switchStateFn) {
        switchStateFn('loading');
    }
    
    try {
        let cleanedBlob;
        // If all are checked to be removed, run stripAllMetadata directly
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
