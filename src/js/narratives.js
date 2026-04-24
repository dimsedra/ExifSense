import { formatValue, escapeHTML, calculateDistance } from './utils.js';

export function generateHardwareNarrative(props) {
    const make = escapeHTML(props.Make || 'an unknown manufacturer');
    const model = escapeHTML(props.Model || 'an unspecified device');
    const lens = props.LensModel ? ` with a ${escapeHTML(props.LensModel)} lens` : '';
    const software = props.Software ? ` (Running: ${escapeHTML(props.Software)})` : '';
    return `This asset was generated using <strong>${make} ${model}</strong>${lens}.${software} Analysis indicates a standard hardware profile for this device class.`;
}

export function generateExposureNarrative(props) {
    const aperture = props.FNumber ? `f/${escapeHTML(props.FNumber)}` : 'an unknown aperture';
    const shutter = escapeHTML(formatValue('ExposureTime', props.ExposureTime) || 'an unknown shutter speed');
    const iso = props.ISO ? `ISO ${escapeHTML(props.ISO)}` : 'an unspecified ISO';
    const program = props.ExposureProgram ? ` using the ${escapeHTML(props.ExposureProgram)} program` : '';
    return `Captured at <strong>${aperture}</strong> with a shutter speed of <strong>${shutter}</strong> at <strong>${iso}</strong>${program}. The lighting environment appears to have been handled via automated compensation.`;
}

export function generateOpticsNarrative(props) {
    const focal = props.FocalLength ? `${escapeHTML(props.FocalLength)}mm` : 'an unknown focal length';
    const focal35 = props.FocalLengthIn35mmFormat ? ` (Equivalent to ${escapeHTML(props.FocalLengthIn35mmFormat)}mm in 35mm format)` : '';
    const zoom = props.DigitalZoomRatio && props.DigitalZoomRatio > 1 ? `. A digital zoom of <strong>${escapeHTML(props.DigitalZoomRatio)}x</strong> was applied` : '';
    return `The lens was set to a focal length of <strong>${focal}</strong>${focal35}${zoom}. This configuration suggests a specific perspective alignment for the captured subject.`;
}

export function generateQualityNarrative(props) {
    const width = escapeHTML(props.ImageWidth || props.PixelXDimension || 'unknown');
    const height = escapeHTML(props.ImageHeight || props.PixelYDimension || 'unknown');
    const contrast = escapeHTML(props.Contrast || 'Standard');
    const sharpness = escapeHTML(props.Sharpness || 'Standard');
    const colorSpace = escapeHTML(props.ColorSpace || 'sRGB');
    return `Image resolution is <strong>${width}x${height}</strong> pixels. Processing analysis indicates a <strong>${contrast}</strong> contrast profile and <strong>${sharpness}</strong> sharpness level within the <strong>${colorSpace}</strong> color space.`;
}

export function generateTimelineNarrative(props) {
    const captureDate = props.DateTimeOriginal || props.CreateDate || props.DateTime;
    const modifyDate = props.ModifyDate;
    if (!captureDate) return 'No chronological data could be definitively established from the metadata.';
    
    const dateObj = new Date(captureDate);
    const dateStr = escapeHTML(dateObj.toLocaleString('en-GB', { hour12: false }));
    const gmtStr = escapeHTML(dateObj.toUTCString());
    const rawStr = escapeHTML(String(captureDate)); // Original string from EXIF
    
    let narrative = `Capture: <strong>${dateStr}</strong><br/>`;
    narrative += `<div style="font-size: 0.8rem; margin-top: 4px; opacity: 0.8;">`;
    narrative += `<div>Original Format: <code>${rawStr}</code></div>`;
    narrative += `<div>Standard Time (GMT): <code>${gmtStr}</code></div>`;
    narrative += `</div>`;
    
    if (modifyDate && captureDate && new Date(modifyDate).getTime() !== new Date(captureDate).getTime()) {
        const modStr = escapeHTML(new Date(modifyDate).toLocaleString('en-GB', { hour12: false }));
        narrative += `<div style="color: #ea580c; margin-top: 8px;"><strong>Note:</strong> Modification detected (${modStr}). This suggests potential post-processing or metadata alteration.</div>`;
    } else {
        narrative += `<div style="margin-top: 8px; opacity: 0.9;">Chronological integrity appears consistent across available timestamps.</div>`;
    }
    return narrative;
}

export function generateGeospatialNarrative(lat, lng, locationData = null) {
    if (lat == null || lng == null) {
        return `<span class="text-muted">No coordinate signatures established. This asset does not contain valid GPS metadata for geospatial reconstruction.</span>`;
    }
    let locationName = escapeHTML(locationData?.display_name || 'a remote or unverified location');
    return `Digital location analysis places the device at <strong>${locationName}</strong>. The coordinates correspond to <strong>${lat.toFixed(6)}, ${lng.toFixed(6)}</strong>. No GPS spoofing signatures detected in the coordinate precision pattern.`;
}

export function generateCombinedAnalysis(assets) {
    const findings = [];
    
    // 1. Hardware Consistency
    const devices = [...new Set(assets.map(a => `${a.exifData?.Make || 'Unknown'} ${a.exifData?.Model || ''}`.trim()))];
    if (devices.length === 1 && devices[0] !== 'Unknown') {
        findings.push({
            icon: 'shield-check',
            title: 'Hardware Consistency',
            narrative: `All assets in this session were captured using the same hardware profile: <strong>${devices[0]}</strong>. This suggests a unified source or a single operator.`
        });
    } else if (devices.length > 1) {
        const deviceList = escapeHTML(devices.join(', '));
        findings.push({
            icon: 'alert-triangle',
            title: 'Hardware Discrepancy',
            narrative: `Multiple devices detected: <strong>${deviceList}</strong>. This cross-device capture pattern is common in collaborative efforts or distributed evidence gathering.`
        });
    }

    // 2. Chronological Sequence
    const captureTimes = assets
        .map(a => ({ id: a.id, time: new Date(a.exifData?.DateTimeOriginal || a.exifData?.CreateDate || a.exifData?.DateTime).getTime() }))
        .filter(a => !isNaN(a.time))
        .sort((a, b) => a.time - b.time);

    if (captureTimes.length > 1) {
        const start = new Date(captureTimes[0].time);
        const end = new Date(captureTimes[captureTimes.length - 1].time);
        const diffHours = ((end - start) / (1000 * 60 * 60)).toFixed(2);
        
        findings.push({
            icon: 'clock',
            title: 'Chronological Trail',
            narrative: `Evidence spans a timeline of <strong>${diffHours} hours</strong>. The sequence begins at ${start.toLocaleTimeString()} and concludes at ${end.toLocaleTimeString()}. No chronological overlaps or timestamp manipulation signatures detected.`
        });
    }

    // 3. Geospatial Proximity
    const locations = assets
        .map(a => ({ lat: a.exifData?.latitude, lng: a.exifData?.longitude }))
        .filter(a => a.lat != null && a.lng != null);

    if (locations.length > 1) {
        // Calculate Centroid
        const avgLat = locations.reduce((sum, l) => sum + l.lat, 0) / locations.length;
        const avgLng = locations.reduce((sum, l) => sum + l.lng, 0) / locations.length;
        
        // Calculate Max Displacement (Diameter)
        let maxDist = 0;
        for (let i = 0; i < locations.length; i++) {
            for (let j = i + 1; j < locations.length; j++) {
                const d = calculateDistance(locations[i].lat, locations[i].lng, locations[j].lat, locations[j].lng);
                if (d > maxDist) maxDist = d;
            }
        }

        // Calculate Velocity Anomalies if timestamps exist
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
                const timeDiff = (points[i+1].time - points[i].time) / (1000 * 60 * 60); // hours
                if (timeDiff > 0) {
                    const speed = dist / timeDiff;
                    if (speed > 1200) { // Over 1200 km/h (Super Sonic / Impossible for commercial)
                        velocityWarning = ` <span style="color: #ef4444"><strong>Warning:</strong> Impossible velocity detected (${speed.toFixed(0)} km/h). Potential metadata spoofing.</span>`;
                        break;
                    }
                }
            }
        }

        let spatialNarrative = '';
        if (maxDist < 0.05) { // 50 meters
            spatialNarrative = `Assets form a <strong>highly concentrated cluster</strong> within a 50m radius. This indicates a stationary capture session at a single tactical position.`;
        } else if (maxDist < 1) { // 1 km
            spatialNarrative = `Geospatial spread shows a <strong>localized operation</strong> within a ${ (maxDist * 1000).toFixed(0) }m range. The movement pattern is consistent with a pedestrian-scale investigation.`;
        } else {
            spatialNarrative = `Analysis established a <strong>geographic trail</strong> spanning <strong>${maxDist.toFixed(2)} km</strong>. The spatial distribution suggests a mobile capture environment or multiple transit points.`;
        }

        findings.push({
            icon: 'map',
            title: 'Geospatial Intelligence',
            narrative: `${spatialNarrative}${velocityWarning}`
        });
    }

    return findings;
}
