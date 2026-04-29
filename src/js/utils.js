import { t, getCurrentLanguage } from './i18n.js';

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

