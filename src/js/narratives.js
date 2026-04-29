import { formatValue, escapeHTML, calculateDistance, parseDate, categorizeExif } from './utils.js';
import { t, getCurrentLanguage } from './i18n.js';

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

    let integrityNarrative = '';
    if (fullyStripped.length > 0 || partiallyStripped.length > 0) {
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
    } else if (cleanAssets.length === assets.length) {
        integrityNarrative = t('combined_integrity_clean', { total: assets.length }, 'narratives');
    }

    if (integrityNarrative) {
        // Build Verification Table
        const categories = [
            { name: 'Device Hardware', key: 'cat_hardware' },
            { name: 'Timeline & Date', key: 'cat_timeline' },
            { name: 'Geospatial', key: 'cat_geospatial' },
            { name: 'Exposure Settings', key: 'cat_exposure' },
            { name: 'Optics & Lens', key: 'cat_optics' },
            { name: 'Image Quality', key: 'cat_quality' }
        ];

        const rows = assets.map(a => {
            const categorized = categorizeExif(a.exifData || {});
            const catPresent = {};
            
            categories.forEach(c => {
                const props = categorized[c.name];
                catPresent[c.name] = !!(props && Object.keys(props).length > 0);
            });
            
            return {
                name: a.fileName,
                presence: catPresent
            };
        });

        const matrixHtml = `
            <details class="integrity-verification-matrix" style="margin-top: 12px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                <summary style="cursor: pointer; color: var(--primary); font-weight: 500; font-size: 13px; display: flex; align-items: center; gap: 4px; outline: none;">
                    <span style="border-bottom: 1px dashed var(--primary); padding-bottom: 2px;">${t('integrity_reconstruct_btn', {}, 'narratives')}</span>
                </summary>
                <div onwheel="if (this.scrollWidth > this.clientWidth) { const isAtLeft = this.scrollLeft === 0; const isAtRight = this.scrollLeft + this.clientWidth >= this.scrollWidth; if ((event.deltaY > 0 && !isAtRight) || (event.deltaY < 0 && !isAtLeft)) { this.scrollLeft += event.deltaY; event.preventDefault(); } }" style="padding: 12px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px; margin-top: 8px; overflow-x: auto; scroll-behavior: smooth;">
                    <table style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px;">
                        <thead>
                            <tr style="background: rgba(var(--primary-rgb), 0.05); color: var(--text-main);">
                                <th style="padding: 10px; text-align: left; font-weight: 600; border-bottom: 2px solid var(--border-color); white-space: nowrap;">${t('file_name', {}, 'ui')}</th>
                                ${categories.map(c => `<th style="padding: 10px; text-align: center; font-weight: 600; border-bottom: 2px solid var(--border-color); white-space: nowrap;">${t(c.key, {}, 'ui')}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${rows.map(r => `
                                <tr style="border-bottom: 1px solid var(--border-color);">
                                    <td style="padding: 10px; font-weight: 500; color: var(--text-main); border-bottom: 1px solid var(--border-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;" title="${escapeHTML(r.name)}">${escapeHTML(r.name)}</td>
                                    ${categories.map(c => {
                                        const isPresent = r.presence[c.name];
                                        const bg = isPresent ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)';
                                        const icon = isPresent ? 'check-circle' : 'x-circle';
                                        const color = isPresent ? '#22c55e' : '#ef4444';
                                        return `
                                            <td style="padding: 10px; text-align: center; border-bottom: 1px solid var(--border-color); background: ${bg};">
                                                <i data-lucide="${icon}" style="color: ${color}; width: 16px; height: 16px; display: inline-block; vertical-align: middle;"></i>
                                            </td>
                                        `;
                                    }).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </details>
        `;

        findings.push({
            icon: 'shield-alert',
            title: t('analysis_integrity', {}, 'ui'),
            narrative: integrityNarrative + matrixHtml
        });
    }
    
    // EVALUASI 1: Konsistensi Profil Perangkat Kamera
    const assetsWithHardware = assets.filter(a => a.exifData?.Make || a.exifData?.Model);
    const devices = [...new Set(assetsWithHardware.map(a => escapeHTML(`${a.exifData?.Make || 'Unknown'} ${a.exifData?.Model || ''}`.trim())))];
    
    // EVALUASI 1.5: Validasi kecocokan Serial Number fisik kamera (Identitas Unik)
    const serials = assets
        .map(a => a.exifData?.SerialNumber || a.exifData?.InternalSerialNumber || a.exifData?.BodySerialNumber)
        .filter(s => s && String(s).trim() !== '');

    const uniqueSerials = [...new Set(serials)];

    let hardwareNarrative = '';
    if (assetsWithHardware.length === 1 && assets.length > 1) {
        hardwareNarrative = t('combined_hw_sparse_single', { count: 1, total: assets.length, device: devices[0] }, 'narratives');
    } else if (assetsWithHardware.length > 1) {
        if (devices.length === 1) {
            if (assetsWithHardware.length === assets.length) {
                hardwareNarrative = t('combined_hw_consistent', { device: devices[0] }, 'narratives');
            } else {
                hardwareNarrative = t('combined_hw_sparse_consistent', { count: assetsWithHardware.length, total: assets.length, device: devices[0] }, 'narratives');
            }
        } else if (devices.length > 1) {
            const deviceList = escapeHTML(devices.join(', '));
            if (assetsWithHardware.length === assets.length) {
                hardwareNarrative = t('combined_hw_discrepancy', { deviceList }, 'narratives');
            } else {
                hardwareNarrative = t('combined_hw_sparse_discrepancy', { deviceList, missing: assets.length - assetsWithHardware.length }, 'narratives');
            }
        }
    }

    if (uniqueSerials.length === 1 && assets.length > 1) {
        const serialText = t('combined_serial_match', { serial: escapeHTML(uniqueSerials[0]) }, 'narratives');
        hardwareNarrative = hardwareNarrative ? `${hardwareNarrative}<br/><br/>${serialText}` : serialText;
    }

    if (!hardwareNarrative) {
        hardwareNarrative = `<span class="text-muted">${t('empty_hardware', {}, 'narratives')}</span>`;
    }

    // Build Hardware Verification Table
    const hwProps = [
        { name: 'Make', label: 'Make' },
        { name: 'Model', label: 'Model' },
        { name: 'Software', label: 'Software' },
        { name: 'LensModel', label: 'Lens Model' },
        { name: 'LensMake', label: 'Lens Make' },
        { name: 'BodySerialNumber', label: 'Body Serial' },
        { name: 'LensSerialNumber', label: 'Lens Serial' }
    ];

    const hwRows = assets.map(a => {
        const rowData = {};
        hwProps.forEach(p => {
            let val = a.exifData?.[p.name];
            if (!val && p.name === 'BodySerialNumber') {
                val = a.exifData?.SerialNumber || a.exifData?.InternalSerialNumber;
            }
            rowData[p.name] = (val != null && String(val).trim() !== '') ? String(val).trim() : '-';
        });
        return {
            name: a.fileName,
            data: rowData
        };
    });

    const hwMatrixHtml = `
        <details class="hardware-verification-matrix" style="margin-top: 12px; border-top: 1px solid var(--border-color); padding-top: 10px;">
            <summary style="cursor: pointer; color: var(--primary); font-weight: 500; font-size: 13px; display: flex; align-items: center; gap: 4px; outline: none;">
                <span style="border-bottom: 1px dashed var(--primary); padding-bottom: 2px;">${t('hw_reconstruct_btn', {}, 'narratives') || 'Click for Detailed Hardware Verification'}</span>
            </summary>
            <div onwheel="if (this.scrollWidth > this.clientWidth) { const isAtLeft = this.scrollLeft === 0; const isAtRight = this.scrollLeft + this.clientWidth >= this.scrollWidth; if ((event.deltaY > 0 && !isAtRight) || (event.deltaY < 0 && !isAtLeft)) { this.scrollLeft += event.deltaY; event.preventDefault(); } }" style="padding: 12px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px; margin-top: 8px; overflow-x: auto; scroll-behavior: smooth;">
                <table style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px;">
                    <thead>
                        <tr style="background: rgba(var(--primary-rgb), 0.05); color: var(--text-main);">
                            <th style="padding: 10px; text-align: left; font-weight: 600; border-bottom: 2px solid var(--border-color); white-space: nowrap;">${t('file_name', {}, 'ui')}</th>
                            ${hwProps.map(p => `<th style="padding: 10px; text-align: center; font-weight: 600; border-bottom: 2px solid var(--border-color); white-space: nowrap;">${p.label}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${hwRows.map(r => `
                            <tr style="border-bottom: 1px solid var(--border-color);">
                                <td style="padding: 10px; font-weight: 500; color: var(--text-main); border-bottom: 1px solid var(--border-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;" title="${escapeHTML(r.name)}">${escapeHTML(r.name)}</td>
                                ${hwProps.map(p => {
                                    const value = r.data[p.name];
                                    const isPresent = value !== '-';
                                    const bg = isPresent ? 'rgba(var(--primary-rgb), 0.02)' : 'transparent';
                                    const color = isPresent ? 'var(--text-main)' : 'var(--text-muted)';
                                    const style = isPresent ? 'font-weight: 500;' : 'font-style: italic; opacity: 0.6;';
                                    return `
                                        <td style="padding: 10px; text-align: center; border-bottom: 1px solid var(--border-color); background: ${bg}; color: ${color}; ${style} white-space: nowrap; max-width: 120px; overflow: hidden; text-overflow: ellipsis;" title="${escapeHTML(value)}">
                                            ${escapeHTML(value)}
                                        </td>
                                    `;
                                }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </details>
    `;

    findings.push({
        icon: 'smartphone',
        title: t('analysis_hardware', {}, 'ui'),
        narrative: hardwareNarrative + hwMatrixHtml
    });


    // EVALUASI 2: Kronologi Urutan Waktu & Estimasi Kecepatan Anomali
    // EVALUASI 2: Kronologi Urutan Waktu & Estimasi Kecepatan Anomali
    const assetsWithTime = assets.map(a => {
        const d = parseDate(a.exifData?.DateTimeOriginal || a.exifData?.CreateDate || a.exifData?.DateTime);
        return { 
            asset: a, 
            time: d ? d.getTime() : NaN,
            dateObj: d
        };
    });
    
    const captureTimes = assetsWithTime
        .filter(item => !isNaN(item.time))
        .sort((a, b) => a.time - b.time);
        
    const missingAssets = assetsWithTime
        .filter(item => isNaN(item.time))
        .map(item => item.asset.fileName);

    if (captureTimes.length === 1 && assets.length > 1) {
        findings.push({
            icon: 'clock',
            title: t('analysis_timeline'),
            narrative: t('combined_timeline_sparse', { total: assets.length }, 'narratives')
        });
    } else if (captureTimes.length > 1) {
        const lang = getCurrentLanguage();
        const localeStr = lang === 'id' ? 'id-ID' : (lang === 'ar' ? 'ar-SA' : 'en-GB');
        const start = new Date(captureTimes[0].time).toLocaleTimeString(localeStr);
        const end = new Date(captureTimes[captureTimes.length - 1].time).toLocaleTimeString(localeStr);
        const diffHours = ((captureTimes[captureTimes.length - 1].time - captureTimes[0].time) / (1000 * 60 * 60)).toFixed(2);
        
        let narrativeText = t('combined_timeline', { diffHours, start, end }, 'narratives');
        if (captureTimes.length < assets.length) {
            narrativeText += t('combined_timeline_sparse_note', { count: captureTimes.length }, 'narratives');
        }

        // Build reconstruction timeline HTML
        const startTimeStr = captureTimes[0].dateObj.toLocaleString(localeStr);
        const endTimeStr = captureTimes[captureTimes.length - 1].dateObj.toLocaleString(localeStr);
        
        const totalMs = captureTimes[captureTimes.length - 1].time - captureTimes[0].time;
        const totalSec = Math.floor(totalMs / 1000) % 60;
        const totalMin = Math.floor(totalMs / (1000 * 60)) % 60;
        const totalHrs = Math.floor(totalMs / (1000 * 60 * 60));
        
        let totalDurationStr = '';
        if (totalHrs > 0) totalDurationStr += `${totalHrs} ${t('time_hour', {}, 'narratives')} `;
        if (totalMin > 0 || totalHrs > 0) totalDurationStr += `${totalMin} ${t('time_minute', {}, 'narratives')} `;
        totalDurationStr += `${totalSec} ${t('time_second', {}, 'narratives')}`;
        
        let jumpsHtml = '';
        for (let i = 0; i < captureTimes.length - 1; i++) {
            const curr = captureTimes[i];
            const next = captureTimes[i+1];
            const diffMs = next.time - curr.time;
            
            const dSec = Math.floor(diffMs / 1000) % 60;
            const dMin = Math.floor(diffMs / (1000 * 60)) % 60;
            const dHrs = Math.floor(diffMs / (1000 * 60 * 60));
            const dDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            
            let jumpStr = '';
            if (dDays > 0) jumpStr += `${dDays} ${t('time_day', {}, 'narratives')} `;
            if (dHrs % 24 > 0) jumpStr += `${dHrs % 24} ${t('time_hour', {}, 'narratives')} `;
            if (dMin > 0) jumpStr += `${dMin} ${t('time_minute', {}, 'narratives')} `;
            jumpStr += `${dSec} ${t('time_second', {}, 'narratives')}`;
            
            jumpsHtml += `
                <div style="padding: 8px 0; border-bottom: 1px dashed var(--border-color); display: flex; justify-content: space-between; gap: 8px; font-size: 13px;">
                    <span style="color: var(--text-muted); max-width: 40%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHTML(curr.asset.fileName)}</span>
                    <span style="color: var(--primary); font-weight: 500; text-align: center; white-space: nowrap;">➔ (+${jumpStr})</span>
                    <span style="color: var(--text-muted); max-width: 40%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: right;">${escapeHTML(next.asset.fileName)}</span>
                </div>
            `;
        }
        
        let missingHtml = '';
        if (missingAssets.length > 0) {
            missingHtml = `
                <div style="margin-top: 12px; color: #ef4444; font-size: 13px;">
                    <strong style="color: #ef4444;">${t('reconstruct_missing', { count: missingAssets.length }, 'narratives')}</strong>
                    <ul style="margin: 4px 0; padding-left: 16px;">
                        ${missingAssets.map(name => `<li style="margin-bottom: 2px;">${escapeHTML(name)}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        const reconstructionHtml = `
            <details class="timeline-reconstruction" style="margin-top: 12px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                <summary style="cursor: pointer; color: var(--primary); font-weight: 500; font-size: 13px; display: flex; align-items: center; gap: 4px; outline: none;">
                    <span style="border-bottom: 1px dashed var(--primary); padding-bottom: 2px;">${t('reconstruct_btn', {}, 'narratives')}</span>
                </summary>
                <div onwheel="if (this.scrollWidth > this.clientWidth) { const isAtLeft = this.scrollLeft === 0; const isAtRight = this.scrollLeft + this.clientWidth >= this.scrollWidth; if ((event.deltaY > 0 && !isAtRight) || (event.deltaY < 0 && !isAtLeft)) { this.scrollLeft += event.deltaY; event.preventDefault(); } }" style="padding: 12px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px; margin-top: 8px; overflow-x: auto; scroll-behavior: smooth;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
                        <div><strong style="color: var(--text-main);">${t('reconstruct_start', {}, 'narratives')}</strong><br><span style="color: var(--text-muted);">${startTimeStr}</span></div>
                        <div><strong style="color: var(--text-main);">${t('reconstruct_end', {}, 'narratives')}</strong><br><span style="color: var(--text-muted);">${endTimeStr}</span></div>
                        <div style="grid-column: 1 / -1;"><strong style="color: var(--text-main);">${t('reconstruct_total', {}, 'narratives')}</strong><br><span style="color: #22c55e; font-weight: 600;">${totalDurationStr}</span></div>
                    </div>
                    
                    ${jumpsHtml ? `
                        <div style="font-size: 13px; font-weight: 500; color: var(--text-main); margin-bottom: 6px;">${t('reconstruct_jumps', {}, 'narratives')}</div>
                        <div class="timeline-jumps-list" style="max-height: 200px; overflow-y: auto; padding-right: 4px;">
                            ${jumpsHtml}
                        </div>
                    ` : ''}
                    
                    ${missingHtml}
                </div>
            </details>
        `;

        findings.push({
            icon: 'clock',
            title: t('analysis_timeline'),
            narrative: narrativeText + reconstructionHtml
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
                time: new Date(a.exifData?.DateTimeOriginal || a.exifData?.CreateDate || a.exifData?.DateTime).getTime(),
                asset: a
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

        let geoReconstructionHtml = '';
        if (points.length > 1) {
            let totalPathDist = 0;
            let jumpsGeoHtml = '';
            for (let i = 0; i < points.length - 1; i++) {
                const distKm = calculateDistance(points[i].lat, points[i].lng, points[i+1].lat, points[i+1].lng);
                const distM = distKm * 1000;
                totalPathDist += distM;
                
                let distStr = distM >= 1000 ? `${(distM / 1000).toFixed(2)} km` : `${distM.toFixed(0)} m`;
                
                jumpsGeoHtml += `
                    <div style="padding: 8px 0; border-bottom: 1px dashed var(--border-color); display: flex; justify-content: space-between; gap: 8px; font-size: 13px;">
                        <span style="color: var(--text-muted); max-width: 40%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHTML(points[i].asset.fileName)}</span>
                        <span style="color: var(--primary); font-weight: 500; text-align: center; white-space: nowrap;">➔ (+${distStr})</span>
                        <span style="color: var(--text-muted); max-width: 40%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: right;">${escapeHTML(points[i+1].asset.fileName)}</span>
                    </div>
                `;
            }

            const totalDistStr = totalPathDist >= 1000 ? `${(totalPathDist / 1000).toFixed(2)} km` : `${totalPathDist.toFixed(0)} m`;
            
            const maxDistStr = maxDist >= 1 ? `${maxDist.toFixed(2)} km` : `${(maxDist * 1000).toFixed(0)} m`;
            
            geoReconstructionHtml = `
                <details class="geo-reconstruction" style="margin-top: 12px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                    <summary style="cursor: pointer; color: var(--primary); font-weight: 500; font-size: 13px; display: flex; align-items: center; gap: 4px; outline: none;">
                        <span style="border-bottom: 1px dashed var(--primary); padding-bottom: 2px;">${t('geo_reconstruct_btn', {}, 'narratives')}</span>
                    </summary>
                    <div onwheel="if (this.scrollWidth > this.clientWidth) { const isAtLeft = this.scrollLeft === 0; const isAtRight = this.scrollLeft + this.clientWidth >= this.scrollWidth; if ((event.deltaY > 0 && !isAtRight) || (event.deltaY < 0 && !isAtLeft)) { this.scrollLeft += event.deltaY; event.preventDefault(); } }" style="padding: 12px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px; margin-top: 8px; overflow-x: auto; scroll-behavior: smooth;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
                            <div>
                                <strong style="color: var(--text-main);">${t('geo_max_spread', {}, 'narratives')}</strong><br>
                                <span style="color: var(--text-main); font-weight: 600;">${maxDistStr}</span>
                            </div>
                            <div>
                                <strong style="color: var(--text-main);">${t('geo_reconstruct_range', {}, 'narratives')}</strong><br>
                                <span style="color: #22c55e; font-weight: 600;">${totalDistStr}</span>
                            </div>
                            <div style="grid-column: 1 / -1; color: var(--text-muted); font-size: 11px; margin-top: 2px;">
                                ${t('geo_reconstruct_note', {}, 'narratives')}
                            </div>
                        </div>
                        
                        ${jumpsGeoHtml ? `
                            <div style="font-size: 13px; font-weight: 500; color: var(--text-main); margin-bottom: 6px;">${t('geo_reconstruct_jumps', {}, 'narratives')}</div>
                            <div class="timeline-jumps-list" style="max-height: 200px; overflow-y: auto; padding-right: 4px;">
                                ${jumpsGeoHtml}
                            </div>
                        ` : ''}
                    </div>
                </details>
            `;
        }

        findings.push({
            icon: 'map',
            title: t('analysis_geospatial'),
            narrative: narrative + geoReconstructionHtml
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
