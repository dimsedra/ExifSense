import { formatValue, escapeHTML, calculateDistance } from './utils.js';
import { t } from './i18n.js';

export function generateHardwareNarrative(props) {
    const make = escapeHTML(props.Make || 'an unknown manufacturer');
    const model = escapeHTML(props.Model || 'an unspecified device');
    const lens = props.LensModel ? ` ${t('with_lens', { lens: escapeHTML(props.LensModel) }, 'narratives')}` : '';
    const software = props.Software ? ` (Running: ${escapeHTML(props.Software)})` : '';
    
    return t('hardware', { make, model, lens, software }, 'narratives');
}

export function generateExposureNarrative(props) {
    const aperture = props.FNumber ? `f/${escapeHTML(props.FNumber)}` : t('unknown_aperture', {}, 'narratives');
    const shutter = escapeHTML(formatValue('ExposureTime', props.ExposureTime) || t('unknown_shutter', {}, 'narratives'));
    const iso = props.ISO ? `ISO ${escapeHTML(props.ISO)}` : t('unspecified_iso', {}, 'narratives');
    const program = props.ExposureProgram ? ` ${t('using_program', { program: escapeHTML(props.ExposureProgram) }, 'narratives')}` : '';
    
    return t('exposure', { aperture, shutter, iso, program }, 'narratives');
}

export function generateOpticsNarrative(props) {
    const focal = props.FocalLength ? `${escapeHTML(props.FocalLength)}mm` : t('unknown_focal', {}, 'narratives');
    const focal35 = props.FocalLengthIn35mmFormat ? ` ${t('equivalent_35mm', { mm: escapeHTML(props.FocalLengthIn35mmFormat) }, 'narratives')}` : '';
    const zoom = props.DigitalZoomRatio && props.DigitalZoomRatio > 1 ? `. ${t('digital_zoom', { zoom: escapeHTML(props.DigitalZoomRatio) }, 'narratives')}` : '';
    
    return t('optics', { focal, focal35, zoom }, 'narratives');
}

export function generateQualityNarrative(props) {
    const width = escapeHTML(props.ImageWidth || props.PixelXDimension || 'unknown');
    const height = escapeHTML(props.ImageHeight || props.PixelYDimension || 'unknown');
    const contrast = escapeHTML(props.Contrast || 'Standard');
    const sharpness = escapeHTML(props.Sharpness || 'Standard');
    const colorSpace = escapeHTML(props.ColorSpace || 'sRGB');
    
    return t('quality', { width, height, contrast, sharpness, colorSpace }, 'narratives');
}

export function generateTimelineNarrative(props) {
    const captureDate = props.DateTimeOriginal || props.CreateDate || props.DateTime;
    const modifyDate = props.ModifyDate;
    if (!captureDate) return t('no_chrono', {}, 'narratives');
    
    const dateObj = new Date(captureDate);
    const dateStr = escapeHTML(dateObj.toLocaleString('en-GB', { hour12: false }));
    const gmtStr = escapeHTML(dateObj.toUTCString());
    const rawStr = escapeHTML(String(captureDate)); // Original string from EXIF
    
    let narrative = t('timeline_capture', { dateStr }, 'narratives');
    narrative += `<div style="font-size: 0.8rem; margin-top: 4px; opacity: 0.8;">`;
    narrative += `<div>${t('timeline_format', { rawStr }, 'narratives')}</div>`;
    narrative += `<div>${t('timeline_gmt', { gmtStr }, 'narratives')}</div>`;
    narrative += `</div>`;
    
    if (modifyDate && captureDate && new Date(modifyDate).getTime() !== new Date(captureDate).getTime()) {
        const modStr = escapeHTML(new Date(modifyDate).toLocaleString('en-GB', { hour12: false }));
        narrative += `<div style="color: #ea580c; margin-top: 8px;"><strong>${t('timeline_mod_note', { modStr }, 'narratives')}</strong></div>`;
    } else {
        narrative += `<div style="margin-top: 8px; opacity: 0.9;">${t('timeline_integrity', {}, 'narratives')}</div>`;
    }
    return narrative;
}

export function generateGeospatialNarrative(lat, lng, locationData = null) {
    if (lat == null || lng == null) {
        return `<span class="text-muted">${t('no_geo', {}, 'narratives')}</span>`;
    }
    let locationName = escapeHTML(locationData?.display_name || t('remote_location', {}, 'narratives'));
    return t('geospatial', { locationName, lat: lat.toFixed(6), lng: lng.toFixed(6) }, 'narratives');
}

export function generateCombinedAnalysis(assets) {
    const findings = [];
    
    // 1. Hardware Consistency
    const devices = [...new Set(assets.map(a => `${a.exifData?.Make || 'Unknown'} ${a.exifData?.Model || ''}`.trim()))];
    if (devices.length === 1 && devices[0] !== 'Unknown') {
        findings.push({
            icon: 'shield-check',
            title: t('metadata_hardware'),
            narrative: t('combined_hw_consistent', { device: devices[0] }, 'narratives')
        });
    } else if (devices.length > 1) {
        const deviceList = escapeHTML(devices.join(', '));
        findings.push({
            icon: 'alert-triangle',
            title: t('metadata_hardware'),
            narrative: t('combined_hw_discrepancy', { deviceList }, 'narratives')
        });
    }

    // 2. Chronological Sequence
    const captureTimes = assets
        .map(a => ({ id: a.id, time: new Date(a.exifData?.DateTimeOriginal || a.exifData?.CreateDate || a.exifData?.DateTime).getTime() }))
        .filter(a => !isNaN(a.time))
        .sort((a, b) => a.time - b.time);

    if (captureTimes.length > 1) {
        const start = new Date(captureTimes[0].time).toLocaleTimeString();
        const end = new Date(captureTimes[captureTimes.length - 1].time).toLocaleTimeString();
        const diffHours = ((captureTimes[captureTimes.length - 1].time - captureTimes[0].time) / (1000 * 60 * 60)).toFixed(2);
        
        findings.push({
            icon: 'clock',
            title: t('metadata_chronology'),
            narrative: t('combined_timeline', { diffHours, start, end }, 'narratives')
        });
    }

    // 3. Geospatial Proximity
    const locations = assets
        .map(a => ({ lat: a.exifData?.latitude, lng: a.exifData?.longitude }))
        .filter(a => a.lat != null && a.lng != null);

    if (locations.length > 1) {
        let maxDist = 0;
        for (let i = 0; i < locations.length; i++) {
            for (let j = i + 1; j < locations.length; j++) {
                const d = calculateDistance(locations[i].lat, locations[i].lng, locations[j].lat, locations[j].lng);
                if (d > maxDist) maxDist = d;
            }
        }

        const points = assets
            .map(a => ({
                lat: a.exifData?.latitude,
                lng: a.exifData?.longitude,
                time: new Date(a.exifData?.DateTimeOriginal || a.exifData?.CreateDate || a.exifData?.DateTime).getTime()
            }))
            .filter(p => p.lat != null && p.lng != null && !isNaN(p.time))
            .sort((a, b) => a.time - b.time);

        let velocityWarning = '';
        if (points.length > 1) {
            for (let i = 0; i < points.length - 1; i++) {
                const dist = calculateDistance(points[i].lat, points[i].lng, points[i+1].lat, points[i+1].lng);
                const timeDiff = (points[i+1].time - points[i].time) / (1000 * 60 * 60);
                if (timeDiff > 0) {
                    const speed = dist / timeDiff;
                    if (speed > 1200) {
                        velocityWarning = ` <span style="color: #ef4444"><strong>${t('velocity_warning', { speed: speed.toFixed(0) }, 'narratives')}</strong></span>`;
                        break;
                    }
                }
            }
        }

        let spatialNarrative = '';
        if (maxDist < 0.05) {
            spatialNarrative = t('combined_geo_concentrated', {}, 'narratives');
        } else if (maxDist < 1) {
            spatialNarrative = t('combined_geo_localized', { dist: (maxDist * 1000).toFixed(0) }, 'narratives');
        } else {
            spatialNarrative = t('combined_geo_trail', { dist: maxDist.toFixed(2) }, 'narratives');
        }

        findings.push({
            icon: 'map',
            title: t('metadata_gps'),
            narrative: `${spatialNarrative}${velocityWarning}`
        });
    }

    return findings;
}
