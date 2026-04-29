import { formatValue, escapeHTML, calculateDistance, parseDate } from './utils.js';
import { t } from './i18n.js';

// LOGIKA: Membangun narasi perangkat keras & mendeteksi manipulasi software pihak ketiga
export function generateHardwareNarrative(props) {
    const make = escapeHTML(props.Make || 'an unknown manufacturer');
    const model = escapeHTML(props.Model || 'an unspecified device');
    const lens = props.LensModel ? ` ${t('with_lens', { lens: escapeHTML(props.LensModel) }, 'narratives')}` : '';
    const softwareName = props.Software ? escapeHTML(props.Software) : '';
    
    // Validasi Integritas: Tandai jika gambar diproses ulang lewat editor manipulasi
    const editSoftware = ['adobe', 'photoshop', 'lightroom', 'gimp', 'canva', 'snapseed', 'pixlr', 'corel', 'affinity', 'picsart'];
    const isModified = softwareName && editSoftware.some(s => softwareName.toLowerCase().includes(s));

    if (isModified) {
        return t('hardware_mod', { make, model, lens, software: softwareName }, 'narratives');
    }
    
    let narrative = t('hardware', { make, model, lens }, 'narratives');
    if (softwareName) {
        narrative += ` ${t('hardware_software', { software: softwareName }, 'narratives')}`;
    }
    narrative += ` ${t('hardware_analysis', {}, 'narratives')}`;
    
    return narrative;
}

// LOGIKA: Merangkum konfigurasi pencahayaan optik (Aperture, Shutter, ISO)
export function generateExposureNarrative(props) {
    const aperture = props.FNumber ? `f/${escapeHTML(props.FNumber)}` : t('unknown_aperture', {}, 'narratives');
    const shutter = escapeHTML(formatValue('ExposureTime', props.ExposureTime) || t('unknown_shutter', {}, 'narratives'));
    const iso = props.ISO ? `ISO ${escapeHTML(props.ISO)}` : t('unspecified_iso', {}, 'narratives');
    const program = props.ExposureProgram ? ` ${t('using_program', { program: escapeHTML(props.ExposureProgram) }, 'narratives')}` : '';
    
    // Klasifikasi Pencahayaan Pintar (Algoritma Penentu Kondisi Capture)
    let lightingKey = 'exp_standard';
    const isoVal = parseInt(props.ISO);
    const shutterVal = parseFloat(props.ExposureTime);
    const fVal = parseFloat(props.FNumber);

    if (fVal < 2.8) {
        lightingKey = 'exp_shallow_depth';
    } else if (isoVal >= 800) {
        lightingKey = 'exp_low_light';
    } else if (isoVal <= 200 && shutterVal <= 0.002) {
        lightingKey = 'exp_bright';
    }

    return `${t('exposure', { aperture, shutter, iso, program }, 'narratives')} ${t(lightingKey, {}, 'narratives')}`;
}

// LOGIKA: Menyusun struktur konfigurasi focal length dan zoom digital
export function generateOpticsNarrative(props) {
    const focal = props.FocalLength ? `${escapeHTML(props.FocalLength)}mm` : t('unknown_focal', {}, 'narratives');
    const focal35 = props.FocalLengthIn35mmFormat ? ` ${t('equivalent_35mm', { mm: escapeHTML(props.FocalLengthIn35mmFormat) }, 'narratives')}` : '';
    const zoom = props.DigitalZoomRatio && props.DigitalZoomRatio > 1 ? `. ${t('digital_zoom', { zoom: escapeHTML(props.DigitalZoomRatio) }, 'narratives')}` : '';
    
    return t('optics', { focal, focal35, zoom }, 'narratives');
}

// LOGIKA: Merangkum konfigurasi dimensi piksel, ketajaman, dan ruang warna (Color Space)
export function generateQualityNarrative(props) {
    const width = escapeHTML(props.ImageWidth || props.PixelXDimension || 'unknown');
    const height = escapeHTML(props.ImageHeight || props.PixelYDimension || 'unknown');
    const contrast = escapeHTML(props.Contrast || 'Standard');
    const sharpness = escapeHTML(props.Sharpness || 'Standard');
    const colorSpace = escapeHTML(props.ColorSpace || 'sRGB');
    
    let narrative = t('quality', { width, height, contrast, sharpness, colorSpace }, 'narratives');

    const hasHardware = props.Make || props.Model || props.LensModel;
    const hasOptics = props.FocalLength || props.FocalLengthIn35mmFormat;
    
    return narrative;
}

// LOGIKA: Membangun rentang waktu pengambilan gambar & komparasi stempel metadata
export function generateTimelineNarrative(props) {
    const captureDate = props.DateTimeOriginal || props.CreateDate || props.DateTime;
    const modifyDate = props.ModifyDate;
    if (!captureDate) return t('no_chrono', {}, 'narratives');
    
    const dateObj = parseDate(captureDate);
    const dateStr = (dateObj && !isNaN(dateObj.getTime())) ? escapeHTML(dateObj.toLocaleString('en-GB', { hour12: false })) : escapeHTML(String(captureDate));
    const gmtStr = (dateObj && !isNaN(dateObj.getTime())) ? escapeHTML(dateObj.toUTCString()) : escapeHTML(String(captureDate));
    const rawStr = escapeHTML(String(captureDate)); // Original string from EXIF
    
    let narrative = t('timeline_capture', { dateStr }, 'narratives');
    narrative += `<div style="font-size: 0.8rem; margin-top: 4px; opacity: 0.8;">`;
    narrative += `<div>${t('timeline_format', { rawStr }, 'narratives')}</div>`;
    narrative += `<div>${t('timeline_gmt', { gmtStr }, 'narratives')}</div>`;
    narrative += `</div>`;
    
    const parsedMod = parseDate(modifyDate);
    const parsedCap = parseDate(captureDate);
    if (parsedMod && parsedCap && !isNaN(parsedMod.getTime()) && !isNaN(parsedCap.getTime()) && parsedMod.getTime() !== parsedCap.getTime()) {
        const modStr = escapeHTML(parsedMod.toLocaleString('en-GB', { hour12: false }));
        narrative += `<div style="color: #ea580c; margin-top: 8px;"><strong>${t('timeline_mod_note', { modStr }, 'narratives')}</strong></div>`;
    } else {
        narrative += `<div style="margin-top: 8px; opacity: 0.9;">${t('timeline_integrity', {}, 'narratives')}</div>`;
    }
    return narrative;
}

// LOGIKA: Menghitung koordinat latitude/longitude beserta deteksi anomali spoofing
export function generateGeospatialNarrative(lat, lng, locationData = null) {
    if (lat == null || lng == null) {
        return `<span class="text-muted">${t('no_geo', {}, 'narratives')}</span>`;
    }
    let locationName = escapeHTML(locationData?.display_name || t('remote_location', {}, 'narratives'));
    let narrative = t('geospatial', { locationName, lat: lat.toFixed(6), lng: lng.toFixed(6) }, 'narratives');

    const isNullIsland = Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001;
    const isIntegerPrecision = Number.isInteger(lat) && Number.isInteger(lng);

    if (isNullIsland) {
        narrative += `<div style="color: #ef4444; margin-top: 8px;"><strong>${t('null_island_warn', {}, 'narratives')}</strong></div>`;
    } else if (isIntegerPrecision) {
        narrative += `<div style="color: #ef4444; margin-top: 8px;"><strong>${t('precision_warn', {}, 'narratives')}</strong></div>`;
    }

    return narrative;
}

// LOGIKA: Menghitung kluster intelijen forensik antar banyak file secara kolektif
export function generateCombinedAnalysis(assets) {
    const findings = [];
    
    // EVALUASI 0: Analisis Kebersihan Integritas Metadata Batch
    const fullyStripped = assets.filter(a => 
        !(a.exifData?.Make || a.exifData?.Model) && 
        !(a.exifData?.DateTimeOriginal || a.exifData?.CreateDate || a.exifData?.DateTime) && 
        !(a.exifData?.latitude != null && a.exifData?.longitude != null)
    );

    const partiallyStripped = assets.filter(a => {
        const hasHW = a.exifData?.Make || a.exifData?.Model;
        const hasTime = a.exifData?.DateTimeOriginal || a.exifData?.CreateDate || a.exifData?.DateTime;
        const hasGeo = a.exifData?.latitude != null && a.exifData?.longitude != null;
        return (hasHW || hasTime || hasGeo) && !(hasHW && hasTime && hasGeo);
    });

    const cleanAssets = assets.filter(a => {
        const hasHW = a.exifData?.Make || a.exifData?.Model;
        const hasTime = a.exifData?.DateTimeOriginal || a.exifData?.CreateDate || a.exifData?.DateTime;
        const hasGeo = a.exifData?.latitude != null && a.exifData?.longitude != null;
        return hasHW && hasTime && hasGeo;
    });

    if (fullyStripped.length > 0 || partiallyStripped.length > 0) {
        let integrityNarrative = '';
        if (fullyStripped.length > 0 && partiallyStripped.length > 0) {
            integrityNarrative = t('combined_integrity_mix', { 
                fully: fullyStripped.length, 
                partially: partiallyStripped.length, 
                clean: cleanAssets.length,
                total: assets.length 
            }, 'narratives');
        } else if (fullyStripped.length > 0) {
            integrityNarrative = t('combined_integrity_stripped_all', { 
                count: fullyStripped.length, 
                total: assets.length 
            }, 'narratives');
        } else {
            integrityNarrative = t('combined_integrity_stripped_part', { 
                count: partiallyStripped.length, 
                total: assets.length 
            }, 'narratives');
        }

        findings.push({
            icon: 'shield-alert',
            title: t('analysis_integrity', {}, 'ui'),
            narrative: integrityNarrative
        });
    }
    
    // EVALUASI 1: Konsistensi Profil Perangkat Kamera
    const assetsWithHardware = assets.filter(a => a.exifData?.Make || a.exifData?.Model);
    const devices = [...new Set(assetsWithHardware.map(a => escapeHTML(`${a.exifData?.Make || 'Unknown'} ${a.exifData?.Model || ''}`.trim())))];
    
    if (assetsWithHardware.length === 1 && assets.length > 1) {
        findings.push({
            icon: 'shield-check',
            title: t('analysis_hardware'),
            narrative: t('combined_hw_sparse_single', { count: 1, total: assets.length, device: devices[0] }, 'narratives')
        });
    } else if (assetsWithHardware.length > 1) {
        if (devices.length === 1) {
            if (assetsWithHardware.length === assets.length) {
                findings.push({
                    icon: 'shield-check',
                    title: t('analysis_hardware'),
                    narrative: t('combined_hw_consistent', { device: devices[0] }, 'narratives')
                });
            } else {
                findings.push({
                    icon: 'shield-check',
                    title: t('analysis_hardware'),
                    narrative: t('combined_hw_sparse_consistent', { count: assetsWithHardware.length, total: assets.length, device: devices[0] }, 'narratives')
                });
            }
        } else if (devices.length > 1) {
            const deviceList = escapeHTML(devices.join(', '));
            if (assetsWithHardware.length === assets.length) {
                findings.push({
                    icon: 'alert-triangle',
                    title: t('analysis_hardware'),
                    narrative: t('combined_hw_discrepancy', { deviceList }, 'narratives')
                });
            } else {
                findings.push({
                    icon: 'alert-triangle',
                    title: t('analysis_hardware'),
                    narrative: t('combined_hw_sparse_discrepancy', { deviceList, missing: assets.length - assetsWithHardware.length }, 'narratives')
                });
            }
        }
    }

    // EVALUASI 1.5: Validasi kecocokan Serial Number fisik kamera (Identitas Unik)
    // 1.5 Physical Serial Alignment
    const serials = assets
        .map(a => a.exifData?.SerialNumber || a.exifData?.InternalSerialNumber || a.exifData?.BodySerialNumber)
        .filter(s => s && String(s).trim() !== '');

    const uniqueSerials = [...new Set(serials)];

    if (uniqueSerials.length === 1 && assets.length > 1) {
        findings.push({
            icon: 'shield',
            title: t('analysis_hardware'),
            narrative: t('combined_serial_match', { serial: escapeHTML(uniqueSerials[0]) }, 'narratives')
        });
    }

    // EVALUASI 2: Kronologi Urutan Waktu & Estimasi Kecepatan Anomali
    const captureTimes = assets
        .map(a => {
            const d = parseDate(a.exifData?.DateTimeOriginal || a.exifData?.CreateDate || a.exifData?.DateTime);
            return { id: a.id, time: d ? d.getTime() : NaN };
        })
        .filter(a => !isNaN(a.time))
        .sort((a, b) => a.time - b.time);

    if (captureTimes.length === 1 && assets.length > 1) {
        findings.push({
            icon: 'clock',
            title: t('analysis_timeline'),
            narrative: t('combined_timeline_sparse', { total: assets.length }, 'narratives')
        });
    } else if (captureTimes.length > 1) {
        const start = new Date(captureTimes[0].time).toLocaleTimeString();
        const end = new Date(captureTimes[captureTimes.length - 1].time).toLocaleTimeString();
        const diffHours = ((captureTimes[captureTimes.length - 1].time - captureTimes[0].time) / (1000 * 60 * 60)).toFixed(2);
        
        let narrative = t('combined_timeline', { diffHours, start, end }, 'narratives');
        if (captureTimes.length < assets.length) {
            narrative += t('combined_timeline_sparse_note', { count: captureTimes.length }, 'narratives');
        }

        findings.push({
            icon: 'clock',
            title: t('analysis_timeline'),
            narrative: narrative
        });
    }

    // EVALUASI 3: Proksimasi kluster lokasi geografis & estimasi batas pergerakan
    // 3. Geospatial Proximity
    const locations = assets
        .map(a => ({ lat: a.exifData?.latitude, lng: a.exifData?.longitude }))
        .filter(a => a.lat != null && a.lng != null);

    if (locations.length === 1 && assets.length > 1) {
        findings.push({
            icon: 'map',
            title: t('analysis_geospatial'),
            narrative: t('combined_geo_sparse', { total: assets.length }, 'narratives')
        });
    } else if (locations.length > 1) {
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

        let narrative = `${spatialNarrative}${velocityWarning}`;
        if (locations.length < assets.length) {
            narrative += t('combined_geo_sparse_note', { count: locations.length }, 'narratives');
        }

        findings.push({
            icon: 'map',
            title: t('analysis_geospatial'),
            narrative: narrative
        });
    }

    // Guarantee 4 default expert categories are shown
    const categories = [
        { title: t('analysis_integrity', {}, 'ui'), icon: 'shield-alert', fallback: t('empty_all', {}, 'narratives') },
        { title: t('analysis_hardware', {}, 'ui'), icon: 'smartphone', fallback: t('empty_hardware', {}, 'narratives') },
        { title: t('analysis_timeline', {}, 'ui'), icon: 'clock', fallback: t('empty_timeline', {}, 'narratives') },
        { title: t('analysis_geospatial', {}, 'ui'), icon: 'map', fallback: t('empty_geospatial', {}, 'narratives') }
    ];

    categories.forEach(cat => {
        const exists = findings.some(f => f.title === cat.title);
        if (!exists) {
            findings.push({
                icon: cat.icon,
                title: cat.title,
                narrative: `<span class="text-muted">${cat.fallback}</span>`
            });
        }
    });

    return findings;
}
