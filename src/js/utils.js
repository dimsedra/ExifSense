import { t, getCurrentLanguage, translatePage } from './i18n.js';

export function generateForensicId(timestamp = Date.now()) {
    const base = timestamp.toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `ES-${base}-${random}`;
}

export function formatValue(key, value) {
    let result = value;
    if (value instanceof Date) {
        const lang = getCurrentLanguage();
        const localeStr = lang === 'id' ? 'id-ID' : (lang === 'ar' ? 'ar-SA' : 'en-GB');
        result = value.toLocaleString(localeStr);
    }
    else if (key === 'ExposureTime' && typeof value === 'number' && value < 1) {
        result = `1/${Math.round(1/value)}`;
    }
    else if (key === 'FNumber') result = `f/${value}`;
    else if (key.includes('FocalLength')) result = `${value}mm`;
    else if (key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) {
        result = formatFullDate(value);
    }
    
    return String(result);
}

export function parseDate(dateStr) {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    
    let cleaned = String(dateStr).trim();
    if (/^\d{4}:\d{2}:\d{2}/.test(cleaned)) {
        cleaned = cleaned.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
    }
    
    if (/^\d+$/.test(cleaned)) {
        const d = new Date(Number(cleaned));
        if (!isNaN(d.getTime())) return d;
    }
    
    const dDefault = new Date(cleaned);
    if (!isNaN(dDefault.getTime())) return dDefault;
    
    const tSeparated = cleaned.replace(' ', 'T');
    const d2 = new Date(tSeparated);
    if (!isNaN(d2.getTime())) return d2;
    
    return dDefault;
}

export function formatFullDate(date) {
    if (!date) return t('unknown', {}, 'reports');
    const d = parseDate(date);
    if (!d || isNaN(d.getTime())) return String(date);
    
    const pad = (n) => String(n).padStart(2, '0');
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());
    
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}

export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export function formatLabel(key) {
    return key.replace(/([A-Z])/g, ' $1').trim();
}

export function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function getCategoryIcon(category) {
    const icons = {
        'Device Hardware': 'camera',
        'Exposure Settings': 'aperture',
        'Optics & Lens': 'focus',
        'Image Quality': 'file-image',
        'Timeline & Date': 'clock',
        'Geospatial': 'map-pin',
        'Standards & Info': 'info',
        'Miscellaneous': 'database'
    };
    return icons[category] || 'info';
}

export function getCategoryKey(category) {
    const keys = {
        'Device Hardware': 'cat_hardware',
        'Exposure Settings': 'cat_exposure',
        'Optics & Lens': 'cat_optics',
        'Image Quality': 'cat_quality',
        'Timeline & Date': 'cat_timeline',
        'Geospatial': 'cat_geospatial',
        'Standards & Info': 'cat_standards',
        'Miscellaneous': 'cat_misc'
    };
    return keys[category] || 'cat_misc';
}

export function truncate(str, n) {
    if (!str) return '';
    const s = String(str);
    return (s.length > n) ? s.substr(0, n-1) + '...' : s;
}

export function categorizeExif(data) {
    const categories = {
        'Device Hardware': {},
        'Exposure Settings': {},
        'Optics & Lens': {},
        'Image Quality': {},
        'Timeline & Date': {},
        'Geospatial': {},
        'Standards & Info': {},
        'Miscellaneous': {}
    };

    const propMap = {
        Make: 'Device Hardware', Model: 'Device Hardware', Software: 'Device Hardware',
        LensModel: 'Device Hardware', LensMake: 'Device Hardware',
        BodySerialNumber: 'Device Hardware', LensSerialNumber: 'Device Hardware',
        ExposureTime: 'Exposure Settings', FNumber: 'Exposure Settings', ISO: 'Exposure Settings',
        ExposureProgram: 'Exposure Settings', ExposureBiasValue: 'Exposure Settings',
        MeteringMode: 'Exposure Settings', Flash: 'Exposure Settings', WhiteBalance: 'Exposure Settings',
        ShutterSpeedValue: 'Exposure Settings', ApertureValue: 'Exposure Settings',
        FocalLength: 'Optics & Lens', FocalLengthIn35mmFormat: 'Optics & Lens',
        MaxApertureValue: 'Optics & Lens', DigitalZoomRatio: 'Optics & Lens', SubjectDistance: 'Optics & Lens',
        PixelXDimension: 'Image Quality', PixelYDimension: 'Image Quality',
        ImageWidth: 'Image Quality', ImageHeight: 'Image Quality', ColorSpace: 'Image Quality',
        Orientation: 'Image Quality', Contrast: 'Image Quality', Saturation: 'Image Quality',
        Sharpness: 'Image Quality', SceneCaptureType: 'Image Quality', GainControl: 'Image Quality',
        DateTimeOriginal: 'Timeline & Date', CreateDate: 'Timeline & Date',
        ModifyDate: 'Timeline & Date', DateTime: 'Timeline & Date',
        SubSecTimeOriginal: 'Timeline & Date', SubSecTimeDigitized: 'Timeline & Date',
        OffsetTime: 'Timeline & Date', OffsetTimeOriginal: 'Timeline & Date',
        OffsetTimeDigitized: 'Timeline & Date', GPSDateStamp: 'Timeline & Date', GPSTimeStamp: 'Timeline & Date',
        ExifVersion: 'Standards & Info', FlashpixVersion: 'Standards & Info',
        ComponentsConfiguration: 'Standards & Info', UserComment: 'Standards & Info',
        latitude: 'Geospatial', longitude: 'Geospatial',
        GPSLatitude: 'Geospatial', GPSLongitude: 'Geospatial',
        GPSAltitude: 'Geospatial', GPSImgDirection: 'Geospatial',
        GPSDestBearing: 'Geospatial', GPSSpeed: 'Geospatial'
    };

    for (const [key, value] of Object.entries(data)) {
        if (value == null) continue;
        if (typeof value === 'object' && !(value instanceof Date)) continue;
        
        let category = propMap[key];
        if (!category) {
            const lowerKey = key.toLowerCase();
            if (lowerKey.includes('gps') || lowerKey.includes('latitude') || lowerKey.includes('longitude')) category = 'Geospatial';
            else if (lowerKey.includes('date') || lowerKey.includes('time')) category = 'Timeline & Date';
            else category = 'Miscellaneous';
        }
        categories[category][key] = value;
    }
    return categories;
}

export function showConfirm(options) {
    const { 
        title = t('confirm_title'), 
        message = t('confirm_message'), 
        confirmText = t('confirm'), 
        cancelText = t('cancel'), 
        type = 'info', // 'info' or 'danger'
        onConfirm,
        onCancel 
    } = options;

    const overlay = document.getElementById('modal-overlay');
    const titleEl = document.getElementById('modal-title');
    const messageEl = document.getElementById('modal-message');
    const confirmBtn = document.getElementById('modal-confirm');
    const cancelBtn = document.getElementById('modal-cancel');
    const iconContainer = document.getElementById('modal-icon-container');

    if (!overlay) return;

    titleEl.textContent = title;
    messageEl.textContent = message;
    confirmBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;

    // Reset classes
    confirmBtn.className = 'btn btn-primary';
    iconContainer.className = 'modal-icon';
    
    if (type === 'danger') {
        confirmBtn.classList.add('danger');
        iconContainer.classList.add('danger');
        iconContainer.innerHTML = '<i data-lucide="alert-triangle"></i>';
    } else {
        iconContainer.innerHTML = '<i data-lucide="help-circle"></i>';
    }

    if (window.lucide) lucide.createIcons();

    const handleConfirm = () => {
        close();
        if (onConfirm) onConfirm();
    };

    const handleCancel = () => {
        close();
        if (onCancel) onCancel();
    };

    const close = () => {
        overlay.classList.add('hidden');
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
        overlay.removeEventListener('click', handleOverlayClick);
    };

    const handleOverlayClick = (e) => {
        if (e.target === overlay) handleCancel();
    };

    confirmBtn.addEventListener('click', handleConfirm, { once: true });
    cancelBtn.addEventListener('click', handleCancel, { once: true });
    overlay.addEventListener('click', handleOverlayClick);

    overlay.classList.remove('hidden');
}

export function showPassphrasePrompt(options) {
    const {
        titleKey = 'passphrase_title_backup',
        messageKey = 'passphrase_desc_backup',
        confirmText = t('confirm'),
        cancelText = t('cancel'),
        onSubmit,
        onCancel
    } = options;

    const overlay = document.getElementById('passphrase-modal-overlay');
    const titleEl = document.getElementById('passphrase-modal-title');
    const messageEl = document.getElementById('passphrase-modal-message');
    const inputEl = document.getElementById('passphrase-input');
    const errorEl = document.getElementById('passphrase-error');
    const confirmBtn = document.getElementById('passphrase-confirm');
    const cancelBtn = document.getElementById('passphrase-cancel');

    if (!overlay) return;

    // Update attributes for localization
    titleEl.setAttribute('data-i18n', titleKey);
    messageEl.setAttribute('data-i18n', messageKey);
    confirmBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;

    // Translate page to apply localization keys
    try {
        translatePage();
    } catch (e) {
        console.warn("Failed to translate page:", e);
    }

    // Reset state
    inputEl.value = '';
    errorEl.classList.add('hidden');

    const handleSubmit = () => {
        const value = inputEl.value.trim();
        if (!value) {
            errorEl.textContent = t('passphrase_error_empty') || 'Passphrase cannot be empty.';
            errorEl.classList.remove('hidden');
            return;
        }

        if (onSubmit) {
            Promise.resolve(onSubmit(value))
                .then((success) => {
                    if (success !== false) {
                        close();
                    } else {
                        errorEl.textContent = t('passphrase_error_invalid') || 'Incorrect passphrase. Please try again.';
                        errorEl.classList.remove('hidden');
                        inputEl.value = '';
                        inputEl.focus();
                    }
                })
                .catch((err) => {
                    console.error("Passphrase submission error:", err);
                    errorEl.textContent = t('passphrase_error_invalid') || 'Incorrect passphrase. Please try again.';
                    errorEl.classList.remove('hidden');
                    inputEl.value = '';
                    inputEl.focus();
                });
        } else {
            close();
        }
    };

    const handleCancel = () => {
        close();
        if (onCancel) onCancel();
    };

    const close = () => {
        overlay.classList.add('hidden');
        confirmBtn.removeEventListener('click', handleSubmit);
        cancelBtn.removeEventListener('click', handleCancel);
        overlay.removeEventListener('click', handleOverlayClick);
        inputEl.removeEventListener('keydown', handleKeyDown);
    };

    const handleOverlayClick = (e) => {
        if (e.target === overlay) handleCancel();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSubmit();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    confirmBtn.addEventListener('click', handleSubmit);
    cancelBtn.addEventListener('click', handleCancel);
    overlay.addEventListener('click', handleOverlayClick);
    inputEl.addEventListener('keydown', handleKeyDown);

    overlay.classList.remove('hidden');
    inputEl.focus();
}


export async function stripAllMetadata(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
                resolve(blob);
            }, file.type);
            URL.revokeObjectURL(img.src);
        };
        img.onerror = (err) => {
            URL.revokeObjectURL(img.src);
            reject(err);
        };
        img.src = URL.createObjectURL(file);
    });
}

export async function stripSpecificMetadata(file, removalOptions) {
    // If not JPEG, we fallback to Strip All via Canvas as piexif primarily handles JPEG
    if (file.type !== 'image/jpeg' && file.type !== 'image/jpg') {
        console.warn("Surgical removal only supported for JPEG. Falling back to total sanitization.");
        return stripAllMetadata(file);
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const dataUrl = e.target.result;
                let exifObj = piexif.load(dataUrl);

                if (removalOptions.gps) exifObj["GPS"] = {};
                if (removalOptions.device) {
                    if (exifObj["0th"]) {
                        delete exifObj["0th"][piexif.ImageIFD.Make];
                        delete exifObj["0th"][piexif.ImageIFD.Model];
                        delete exifObj["0th"][piexif.ImageIFD.Software];
                    }
                }
                if (removalOptions.camera) {
                    exifObj["Exif"] = {}; // Strip most camera settings
                }
                if (removalOptions.date) {
                    if (exifObj["0th"]) {
                        delete exifObj["0th"][piexif.ImageIFD.DateTime];
                    }
                    if (exifObj["Exif"]) {
                        delete exifObj["Exif"][piexif.ExifIFD.DateTimeOriginal];
                        delete exifObj["Exif"][piexif.ExifIFD.DateTimeDigitized];
                    }
                }

                const exifBytes = piexif.dump(exifObj);
                const newDataUrl = piexif.insert(exifBytes, dataUrl);
                
                // Manual conversion to blob to avoid connect-src CSP issues with fetch(dataUrl)
                const parts = newDataUrl.split(',');
                const mime = parts[0].match(/:(.*?);/)[1];
                const bstr = atob(parts[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while (n--) {
                    u8arr[n] = bstr.charCodeAt(n);
                }
                const blob = new Blob([u8arr], { type: mime });
                resolve(blob);
            } catch (err) {
                console.error("Piexif error:", err);
                // Fallback to canvas stripping if piexif fails
                stripAllMetadata(file).then(resolve).catch(reject);
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cleaned_${fileName}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
}

export function showRemovalModal(options) {
    const { onConfirm, onCancel } = options;
    const overlay = document.getElementById('removal-modal-overlay');
    const confirmBtn = document.getElementById('removal-confirm');
    const cancelBtn = document.getElementById('removal-cancel');
    const typeRadios = document.querySelectorAll('input[name="removal-type"]');
    const specificOptions = document.getElementById('specific-options');

    if (!overlay) return;

    const handleTypeChange = () => {
        const isSpecific = document.querySelector('input[name="removal-type"]:checked').value === 'specific';
        specificOptions.classList.toggle('hidden', !isSpecific);
    };

    typeRadios.forEach(r => r.addEventListener('change', handleTypeChange));
    handleTypeChange(); // Initialize visibility based on default checked radio

    const handleConfirm = () => {
        const removalType = document.querySelector('input[name="removal-type"]:checked').value;
        const options = {
            all: removalType === 'all',
            gps: document.getElementById('rem-gps').checked,
            device: document.getElementById('rem-device').checked,
            camera: document.getElementById('rem-camera').checked
        };
        close();
        if (onConfirm) onConfirm(options);
    };

    const handleCancel = () => {
        close();
        if (onCancel) onCancel();
    };

    const close = () => {
        overlay.classList.add('hidden');
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
        typeRadios.forEach(r => r.removeEventListener('change', handleTypeChange));
    };

    confirmBtn.addEventListener('click', handleConfirm, { once: true });
    cancelBtn.addEventListener('click', handleCancel, { once: true });
    overlay.classList.remove('hidden');
}

export function showToast(message) {
    let toast = document.getElementById('toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.className = 'toast-notification';
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * Detect file type using magic bytes (file signature verification).
 * Reads the first 16 bytes of the file and matches them against known signatures.
 * @param {File} file 
 * @returns {Promise<{isValid: boolean, mimeType: string|null, extension: string|null, detectedFormat: string|null}>}
 */
export async function detectFileType(file) {
    const headerBytes = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            resolve(new Uint8Array(e.target.result));
        };
        reader.onerror = () => resolve(null);
        // Slice the first 16 bytes for checking headers
        reader.readAsArrayBuffer(file.slice(0, 16));
    });

    if (!headerBytes || headerBytes.length < 4) {
        return { isValid: false, mimeType: null, extension: null, detectedFormat: null };
    }

    // Convert to hex string helper
    const getHex = (arr) => Array.from(arr).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    
    // Convert to ASCII string helper (for sub-signatures)
    const getAscii = (arr) => String.fromCharCode(...arr);

    const hex = getHex(headerBytes);
    const ascii = getAscii(headerBytes);

    // 1. JPEG: FF D8 FF
    if (hex.startsWith('FF D8 FF')) {
        return { isValid: true, mimeType: 'image/jpeg', extension: 'jpg', detectedFormat: 'JPEG' };
    }

    // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
    if (hex.startsWith('89 50 4E 47 0D 0A 1A 0A')) {
        return { isValid: true, mimeType: 'image/png', extension: 'png', detectedFormat: 'PNG' };
    }

    // 3. GIF: GIF8 (47 49 46 38)
    if (hex.startsWith('47 49 46 38')) {
        return { isValid: true, mimeType: 'image/gif', extension: 'gif', detectedFormat: 'GIF' };
    }

    // 4. WEBP: starts with "RIFF" (52 49 46 46) and "WEBP" at offset 8 (57 45 42 50)
    if (hex.startsWith('52 49 46 46') && hex.substring(24, 35) === '57 45 42 50') {
        return { isValid: true, mimeType: 'image/webp', extension: 'webp', detectedFormat: 'WEBP' };
    }

    // 5. TIFF (Little Endian): 49 49 2A 00 (This covers many raw formats like NEF, ARW, DNG, CR2)
    if (hex.startsWith('49 49 2A 00')) {
        // Canon RAW (.cr2) specifically has "CR" (43 52 02 00) at offset 8
        if (hex.substring(24, 35) === '43 52 02 00') {
            return { isValid: true, mimeType: 'image/x-canon-cr2', extension: 'cr2', detectedFormat: 'Canon RAW (CR2)' };
        }
        // General TIFF / NEF / ARW / DNG
        const ext = file.name.split('.').pop().toLowerCase();
        const tiffExts = ['tiff', 'tif', 'dng', 'nef', 'arw', 'orf', 'srw', 'raw'];
        const resolvedExt = tiffExts.includes(ext) ? ext : 'tiff';
        return { 
            isValid: true, 
            mimeType: resolvedExt === 'tiff' || resolvedExt === 'tif' ? 'image/tiff' : `image/x-${resolvedExt}`, 
            extension: resolvedExt, 
            detectedFormat: resolvedExt.toUpperCase() 
        };
    }

    // 6. TIFF (Big Endian): 4D 4D 00 2A
    if (hex.startsWith('4D 4D 00 2A')) {
        const ext = file.name.split('.').pop().toLowerCase();
        const tiffExts = ['tiff', 'tif', 'dng', 'nef', 'arw', 'orf', 'srw', 'raw'];
        const resolvedExt = tiffExts.includes(ext) ? ext : 'tiff';
        return { 
            isValid: true, 
            mimeType: resolvedExt === 'tiff' || resolvedExt === 'tif' ? 'image/tiff' : `image/x-${resolvedExt}`, 
            extension: resolvedExt, 
            detectedFormat: resolvedExt.toUpperCase() 
        };
    }

    // 7. HEIC / HEIF: Check for 'ftyp' starting at byte 4 (offset 4, hex `66 74 79 70`)
    // and compatible brand containing 'heic', 'heix', 'hevc', 'mif1', 'msf1' starting at byte 8 (offset 8)
    if (hex.substring(12, 23) === '66 74 79 70') {
        const brand = ascii.substring(8, 12);
        if (['heic', 'heix', 'hevc', 'mif1', 'msf1'].includes(brand.toLowerCase()) || 
            ['heic', 'heix', 'hevc', 'mif1', 'msf1'].some(b => ascii.toLowerCase().includes(b))) {
            return { isValid: true, mimeType: 'image/heic', extension: 'heic', detectedFormat: 'HEIC/HEIF' };
        }
    }

    return { isValid: false, mimeType: null, extension: null, detectedFormat: null };
}

/**
 * Calculates a cryptographic hash of a file using the Web Crypto API.
 * @param {File} file The file to hash.
 * @param {string} algorithm The algorithm to use ('SHA-256' or 'SHA-1').
 * @returns {Promise<string>} Hex representation of the hash.
 */
export async function calculateFileHash(file, algorithm = 'SHA-256') {
    try {
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest(algorithm, buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
        return hashHex;
    } catch (e) {
        console.error(`Error calculating ${algorithm} hash:`, e);
        return '';
    }
}

/**
 * Analyzes the file's metadata for cryptographic and chronological integrity issues.
 * @param {object} asset The asset containing EXIF and file details.
 * @returns {Array<object>} List of warning/info alerts.
 */
export function analyzeFileIntegrity(asset) {
    const alerts = [];
    const exif = asset.exifData || {};
    
    // 1. Check for editing software
    const software = exif.Software || '';
    if (software) {
        const softLower = software.toLowerCase();
        if (softLower.includes('photoshop') || softLower.includes('gimp') || softLower.includes('lightroom') || softLower.includes('paint.net') || softLower.includes('canva') || softLower.includes('illustrator')) {
            alerts.push({
                type: 'editing_software',
                severity: 'info',
                messageParam: { software },
                message: `Editing software signature found: "${software}". This image was likely saved or processed using an image editor.`
            });
        }
    }
    
    // Get timestamps
    const originalDate = parseDate(exif.DateTimeOriginal || exif.CreateDate || exif.DateTime);
    const modifyDate = parseDate(exif.ModifyDate);
    const fileDate = asset.fileDate ? new Date(asset.fileDate) : null;
    const now = new Date();
    
    // 2. Check if Capture Date is in the future relative to current time
    if (originalDate && !isNaN(originalDate.getTime())) {
        // Allow 5 minutes of clock drift
        if (originalDate.getTime() > now.getTime() + 5 * 60 * 1000) {
            alerts.push({
                type: 'future_capture_date',
                severity: 'warning',
                messageParam: { date: formatFullDate(originalDate) },
                message: `Chronological Anomaly: Capture date (${formatFullDate(originalDate)}) is in the future. This indicates possible timestamp manipulation.`
            });
        }
        
        // 3. Check if Capture Date is newer than File System Modification Date
        if (fileDate && !isNaN(fileDate.getTime())) {
            // Allow a small buffer of 5 seconds
            if (originalDate.getTime() > fileDate.getTime() + 5000) {
                alerts.push({
                    type: 'capture_after_file_modification',
                    severity: 'warning',
                    messageParam: { date: formatFullDate(originalDate), fileDate: formatFullDate(fileDate) },
                    message: `Chronological Mismatch: Capture date (${formatFullDate(originalDate)}) is newer than the file modification date (${formatFullDate(fileDate)}). This is chronologically impossible.`
                });
            }
        }
    }
    
    // 4. Check if metadata was likely stripped but edited
    if (!originalDate && (modifyDate || software)) {
        alerts.push({
            type: 'missing_original_metadata',
            severity: 'warning',
            messageParam: { indicator: software || (modifyDate ? 'ModifyDate' : '') },
            message: `Stripped Capture Metadata: Original capture timestamp is missing, but post-processing indicators are present.`
        });
    }

    return alerts;
}

/**
 * Helper to smoothly switch active tab pane with height transition
 * @param {HTMLElement} wrapper - The wrapper element of the panes (.expert-panes-wrapper)
 * @param {HTMLElement} targetPane - The pane to activate
 * @param {Function} switchCallback - Callback to perform the actual DOM/class updates
 */
export function animateTabTransition(wrapper, targetPane, switchCallback) {
    if (!wrapper || !targetPane) {
        switchCallback();
        return;
    }
    
    // 1. Catat tinggi awal sebelum perpindahan tab
    const startHeight = wrapper.offsetHeight;
    
    // Setel tinggi awal dalam piksel eksplisit SEBELUM mengganti kelas tab
    // Ini mengunci tinggi wadah agar tidak kolaps saat pergantian kelas DOM dilakukan
    wrapper.style.height = `${startHeight}px`;
    
    // Paksa reflow agar browser mencatat setelan tinggi piksel eksplisit ini
    wrapper.offsetHeight;
    
    // 2. Lakukan pergantian kelas tab aktif
    switchCallback();
    
    // 3. Catat tinggi akhir tab tujuan setelah memiliki kelas active
    const endHeight = targetPane.offsetHeight;
    
    // Jika tingginya sama persis, kembalikan ke auto dan selesai
    if (startHeight === endHeight) {
        wrapper.style.height = 'auto';
        return;
    }
    
    // Setel tinggi akhir dalam piksel eksplisit untuk memicu transisi tinggi
    wrapper.style.height = `${endHeight}px`;
    
    // 4. Kembalikan tinggi wadah ke 'auto' setelah transisi selesai
    const onTransitionEnd = (e) => {
        if (e.propertyName === 'height') {
            wrapper.style.height = 'auto';
            wrapper.removeEventListener('transitionend', onTransitionEnd);
        }
    };
    wrapper.addEventListener('transitionend', onTransitionEnd);
}



