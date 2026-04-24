export function formatValue(key, value) {
    let result = value;
    if (value instanceof Date) result = value.toLocaleString();
    else if (key === 'ExposureTime' && typeof value === 'number' && value < 1) {
        result = `1/${Math.round(1/value)}`;
    }
    else if (key === 'FNumber') result = `f/${value}`;
    else if (key.includes('FocalLength')) result = `${value}mm`;
    else if (key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) {
        try {
            const d = new Date(value);
            if (!isNaN(d.getTime())) result = d.toLocaleString();
        } catch(e) { /* use raw value */ }
    }
    
    return String(result);
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
