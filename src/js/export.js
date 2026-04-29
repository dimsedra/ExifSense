import * as Narratives from './narratives.js';
import { t } from './i18n.js';
import * as Utils from './utils.js';

function stripHtml(html) {
    if (!html) return '';
    let text = html;
    
    // Convert HTML tables to Markdown tables for cleaner export representations
    text = text.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, function(match, tableContent) {
        let mdTable = '\n\n';
        const rows = [];
        const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let rowMatch;
        while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
            const cells = [];
            const cellRegex = /<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi;
            let cellMatch;
            while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
                let cellText = cellMatch[2].trim();
                if (cellText.includes('data-lucide="check-circle"') || cellText.includes('data-lucide="check"')) {
                    cellText = '✓';
                } else if (cellText.includes('data-lucide="x-circle"') || cellText.includes('data-lucide="x"')) {
                    cellText = '✗';
                } else {
                    cellText = cellText.replace(/<[^>]*>?/gm, '').trim();
                }
                cells.push(cellText);
            }
            if (cells.length > 0) rows.push(cells);
        }
        if (rows.length === 0) return '';
        
        const header = rows[0];
        mdTable += '| ' + header.join(' | ') + ' |\n';
        mdTable += '| ' + header.map(() => '---').join(' | ') + ' |\n';
        
        for (let i = 1; i < rows.length; i++) {
            mdTable += '| ' + rows[i].join(' | ') + ' |\n';
        }
        return mdTable + '\n';
    });

    // Replace block-level tags with newlines
    text = text.replace(/<\/p>/gi, '\n\n');
    text = text.replace(/<\/div>/gi, '\n');
    text = text.replace(/<\/li>/gi, '\n');
    text = text.replace(/<\/summary>/gi, '\n');
    
    // Clean up summary button text in exports
    text = text.replace(/<summary[^>]*>[\s\S]*?<\/summary>/gi, '\n');

    // Replace <br/> with newline
    text = text.replace(/<br\s*\/?>/gi, '\n');
    
    // Add spaces for inline elements to avoid mashing text
    text = text.replace(/<\/span>/gi, ' ');
    
    // Strip all remaining tags
    text = text.replace(/<[^>]*>?/gm, '');
    
    // Collapse multiple empty lines
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    return text.trim();
}

export async function copyToClipboard(assets, sessionTitle, forensicId) {
    let content = `${t('title', {}, 'reports')}\n`;
    content += `===================================\n`;
    content += `${t('session', {}, 'reports')}: ${sessionTitle}\n`;
    content += `${t('forensic_id', {}, 'reports')}: ${forensicId || Utils.generateForensicId()}\n`;
    content += `${t('generated', {}, 'reports')}: ${Utils.formatFullDate(new Date())}\n`;
    content += `${t('asset_count', {}, 'reports')}: ${assets.length}\n\n`;
    content += `-----------------------------------\n\n`;

    if (assets.length > 1) {
        content += `${t('combined_intel', {}, 'reports')}\n`;
        content += `-----------------------------\n`;
        const combined = Narratives.generateCombinedAnalysis(assets);
        combined.forEach(f => {
            content += `${f.title.toUpperCase()}\n`;
            content += `${stripHtml(f.narrative)}\n\n`;
        });
        content += `\n`;
    }

    assets.forEach((asset, idx) => {
        content += `${t('asset_header', {n: idx + 1}, 'reports')}: ${asset.fileName}\n`;
        content += `===================================\n\n`;

        content += `[${t('tech_details', {}, 'reports')}]\n`;
        content += `${t('file_name', {}, 'ui')}: ${asset.fileName}\n`;
        content += `${t('file_type', {}, 'ui')}: ${asset.fileType || t('unknown', {}, 'reports')}\n`;
        content += `${t('file_size', {}, 'ui')}: ${(asset.fileSize / (1024 * 1024)).toFixed(2)} MB\n`;
        content += `${t('file_date', {}, 'ui')}: ${Utils.formatFullDate(asset.fileDate)}\n\n`;

        content += `[${t('forensic_analysis', {}, 'reports')}]\n`;
        const data = asset.exifData;
        const categorized = Utils.categorizeExif(data);
        
        if (data.latitude != null) {
            content += `${t('cat_geospatial', {}, 'ui')}: ${stripHtml(Narratives.generateGeospatialNarrative(data.latitude, data.longitude, asset.locationData))}\n`;
        }
        if (categorized['Device Hardware']) content += `${t('cat_hardware', {}, 'ui')}: ${stripHtml(Narratives.generateHardwareNarrative(categorized['Device Hardware']))}\n`;
        if (categorized['Exposure Settings']) content += `${t('cat_exposure', {}, 'ui')}: ${stripHtml(Narratives.generateExposureNarrative(categorized['Exposure Settings']))}\n`;
        if (categorized['Optics & Lens']) content += `${t('cat_optics', {}, 'ui')}: ${stripHtml(Narratives.generateOpticsNarrative(categorized['Optics & Lens']))}\n`;
        if (categorized['Image Quality']) content += `${t('cat_quality', {}, 'ui')}: ${stripHtml(Narratives.generateQualityNarrative(categorized['Image Quality']))}\n`;
        if (categorized['Timeline & Date']) content += `${t('cat_timeline', {}, 'ui')}: ${stripHtml(Narratives.generateTimelineNarrative(categorized['Timeline & Date']))}\n`;
        content += `\n`;

        content += `[${t('raw_metadata', {}, 'reports')}]\n`;
        for (const [cat, props] of Object.entries(categorized)) {
            content += `--- ${cat} ---\n`;
            for (const [key, val] of Object.entries(props)) {
                content += `${Utils.formatLabel(key)}: ${Utils.formatValue(key, val)}\n`;
            }
            content += `\n`;
        }
        content += `\n`;
    });

    try {
        await navigator.clipboard.writeText(content);
        // Dispatch event for UI feedback
        document.dispatchEvent(new CustomEvent('toast', { detail: { message: t('copied_to_clipboard', {}, 'ui') } }));
    } catch (err) {
        console.error('Failed to copy: ', err);
    }
}

export function exportToCsv(assets, sessionTitle, forensicId) {
    let rows = [
        [t('title', {}, 'reports'), "", "", ""],
        [t('session', {}, 'reports'), sessionTitle, "", ""],
        [t('forensic_id', {}, 'reports'), forensicId || Utils.generateForensicId(), "", ""],
        [t('generated', {}, 'reports'), Utils.formatFullDate(new Date()), "", ""],
        ["", "", "", ""],
        [t('asset_header', {n: ''}, 'reports').trim(), t('category', {}, 'reports'), t('property', {}, 'reports'), t('value', {}, 'reports')]
    ];
    
    assets.forEach((asset) => {
        // Add technical details to CSV
        rows.push([asset.fileName, t('tech_details', {}, 'reports'), t('file_name', {}, 'ui'), asset.fileName]);
        rows.push([asset.fileName, t('tech_details', {}, 'reports'), t('file_type', {}, 'ui'), asset.fileType || t('unknown', {}, 'reports')]);
        rows.push([asset.fileName, t('tech_details', {}, 'reports'), t('file_size', {}, 'ui'), (asset.fileSize / (1024 * 1024)).toFixed(2)]);
        rows.push([asset.fileName, t('tech_details', {}, 'reports'), t('file_date', {}, 'ui'), Utils.formatFullDate(asset.fileDate)]);

        const categorized = Utils.categorizeExif(asset.exifData);
        for (const [cat, props] of Object.entries(categorized)) {
            for (const [key, val] of Object.entries(props)) {
                rows.push([
                    asset.fileName,
                    cat,
                    Utils.formatLabel(key),
                    String(Utils.formatValue(key, val)).replace(/,/g, ';')
                ]);
            }
        }
    });

    const csvContent = rows.map(r => r.join(',')).join('\n');
    downloadFile(csvContent, `ExifSense_Data_${Date.now()}.csv`, 'text/csv');
}

export function exportToMd(assets, sessionTitle, forensicId) {
    let content = `# ${t('title', {}, 'reports')}\n\n`;
    content += `**${t('session', {}, 'reports')}:** ${sessionTitle}  \n`;
    content += `**${t('forensic_id', {}, 'reports')}:** ${forensicId || Utils.generateForensicId()}  \n`;
    content += `**${t('generated', {}, 'reports')}:** ${Utils.formatFullDate(new Date())}  \n`;
    content += `**${t('asset_count', {}, 'reports')}:** ${assets.length}  \n\n`;
    content += `---\n\n`;

    if (assets.length > 1) {
        content += `## ${t('combined_intel', {}, 'reports')}\n\n`;
        const combined = Narratives.generateCombinedAnalysis(assets);
        combined.forEach(f => {
            content += `### ${f.title}\n`;
            content += `> ${stripHtml(f.narrative)}\n\n`;
        });
    }

    assets.forEach((asset, idx) => {
        content += `## ${t('asset_header', {n: idx + 1}, 'reports')}: ${asset.fileName}\n\n`;

        content += `### ${t('tech_details', {}, 'reports')}\n\n`;
        content += `| ${t('property', {}, 'reports')} | ${t('value', {}, 'reports')} |\n`;
        content += `|----------|-------|\n`;
        content += `| ${t('file_name', {}, 'ui')} | ${asset.fileName} |\n`;
        content += `| ${t('file_type', {}, 'ui')} | ${asset.fileType || t('unknown', {}, 'reports')} |\n`;
        content += `| ${t('file_size', {}, 'ui')} | ${(asset.fileSize / (1024 * 1024)).toFixed(2)} MB |\n`;
        content += `| ${t('file_date', {}, 'ui')} | ${Utils.formatFullDate(asset.fileDate)} |\n\n`;

        content += `### ${t('forensic_analysis', {}, 'reports')}\n\n`;
        const data = asset.exifData;
        const categorized = Utils.categorizeExif(data);
        
        if (data.latitude != null) {
            content += `**${t('analysis_geospatial', {}, 'ui')}:**  \n${stripHtml(Narratives.generateGeospatialNarrative(data.latitude, data.longitude, asset.locationData))}  \n\n`;
        }
        if (categorized['Device Hardware']) content += `**${t('analysis_hardware', {}, 'ui')}:**  \n${stripHtml(Narratives.generateHardwareNarrative(categorized['Device Hardware']))}  \n\n`;
        if (categorized['Exposure Settings']) content += `**${t('analysis_exposure', {}, 'ui')}:**  \n${stripHtml(Narratives.generateExposureNarrative(categorized['Exposure Settings']))}  \n\n`;
        if (categorized['Optics & Lens']) content += `**${t('analysis_optics', {}, 'ui')}:**  \n${stripHtml(Narratives.generateOpticsNarrative(categorized['Optics & Lens']))}  \n\n`;
        if (categorized['Image Quality']) content += `**${t('analysis_quality', {}, 'ui')}:**  \n${stripHtml(Narratives.generateQualityNarrative(categorized['Image Quality']))}  \n\n`;
        if (categorized['Timeline & Date']) content += `**${t('analysis_timeline', {}, 'ui')}:**  \n${stripHtml(Narratives.generateTimelineNarrative(categorized['Timeline & Date']))}  \n\n`;

        content += `### ${t('raw_metadata', {}, 'reports')}\n\n`;
        for (const [cat, props] of Object.entries(categorized)) {
            content += `#### ${cat}\n`;
            content += `| ${t('property', {}, 'reports')} | ${t('value', {}, 'reports')} |\n`;
            content += `|----------|-------|\n`;
            for (const [key, val] of Object.entries(props)) {
                content += `| ${Utils.formatLabel(key)} | ${Utils.formatValue(key, val)} |\n`;
            }
            content += `\n`;
        }
    });

    downloadFile(content, `ExifSense_Report_${Date.now()}.md`, 'text/markdown');
}

export function exportToPdf(assets, sessionTitle, forensicId) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235);
    doc.text(t('title', {}, 'reports'), 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`${t('session', {}, 'reports')}: ${sessionTitle}`, 14, 30);
    
    doc.setFont(undefined, 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text(`${t('forensic_id', {}, 'reports')}: ${forensicId || Utils.generateForensicId()}`, 14, 35);
    
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100);
    doc.text(`${t('generated', {}, 'reports')}: ${Utils.formatFullDate(new Date())}`, 14, 40);
    doc.text(`${t('asset_count', {}, 'reports')}: ${assets.length}`, 14, 45);
    
    // Separator line
    doc.setDrawColor(229, 231, 235);
    doc.line(14, 50, 196, 50);

    let currentY = 60;

    // Combined Intelligence Page
    if (assets.length > 1) {
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text(t('combined_intel', {}, 'reports'), 14, currentY);
        currentY += 10;

        const combined = Narratives.generateCombinedAnalysis(assets);
        combined.forEach(f => {
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.text(f.title, 14, currentY);
            currentY += 6;
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            const splitText = doc.splitTextToSize(stripHtml(f.narrative), 180);
            doc.text(splitText, 14, currentY);
            currentY += (splitText.length * 5) + 5;
        });
        doc.addPage();
    } else {
        // If single asset, we still want a bit of a gap or a new page
        // Let's force a new page for assets to keep the header area clean as a "Cover"
        doc.addPage();
    }

    assets.forEach((asset, idx) => {
        if (idx > 0) doc.addPage();

        doc.setFontSize(16);
        doc.setTextColor(37, 99, 235);
        doc.text(`${t('asset_header', {n: idx + 1}, 'reports')}: ${asset.fileName}`, 14, 20);
        
        // Tech Details Table
        doc.autoTable({
            startY: 25,
            head: [[t('property', {}, 'reports'), t('value', {}, 'reports')]],
            body: [
                [t('file_name', {}, 'ui'), asset.fileName],
                [t('file_type', {}, 'ui'), asset.fileType || t('unknown', {}, 'reports')],
                [t('file_size', {}, 'ui'), `${(asset.fileSize / (1024 * 1024)).toFixed(2)} MB`],
                [t('file_date', {}, 'ui'), Utils.formatFullDate(asset.fileDate)]
            ],
            theme: 'grid',
            headStyles: { fillColor: [71, 85, 105] },
            margin: { bottom: 10 }
        });

        // Analysis Narratives
        let narrativeY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(13);
        doc.setTextColor(0);
        doc.text(t('forensic_analysis', {}, 'reports'), 14, narrativeY);
        narrativeY += 8;

        const data = asset.exifData;
        const categorized = Utils.categorizeExif(data);
        const narrativeItems = [];

        if (data.latitude != null) narrativeItems.push({ t: t('analysis_geospatial', {}, 'ui'), n: Narratives.generateGeospatialNarrative(data.latitude, data.longitude, asset.locationData) });
        if (categorized['Device Hardware']) narrativeItems.push({ t: t('analysis_hardware', {}, 'ui'), n: Narratives.generateHardwareNarrative(categorized['Device Hardware']) });
        if (categorized['Exposure Settings']) narrativeItems.push({ t: t('analysis_exposure', {}, 'ui'), n: Narratives.generateExposureNarrative(categorized['Exposure Settings']) });
        if (categorized['Optics & Lens']) narrativeItems.push({ t: t('analysis_optics', {}, 'ui'), n: Narratives.generateOpticsNarrative(categorized['Optics & Lens']) });
        if (categorized['Image Quality']) narrativeItems.push({ t: t('analysis_quality', {}, 'ui'), n: Narratives.generateQualityNarrative(categorized['Image Quality']) });
        if (categorized['Timeline & Date']) narrativeItems.push({ t: t('analysis_timeline', {}, 'ui'), n: Narratives.generateTimelineNarrative(categorized['Timeline & Date']) });

        doc.setFontSize(9);
        narrativeItems.forEach(item => {
            if (narrativeY > 270) { doc.addPage(); narrativeY = 20; }
            doc.setFont(undefined, 'bold');
            doc.text(`${item.t}:`, 14, narrativeY);
            doc.setFont(undefined, 'normal');
            const splitNarrative = doc.splitTextToSize(stripHtml(item.n), 170);
            doc.text(splitNarrative, 25, narrativeY + 4);
            narrativeY += (splitNarrative.length * 4) + 8;
        });

        // Raw Metadata Table
        if (narrativeY > 250) { doc.addPage(); narrativeY = 20; }
        
        const tableData = [];
        for (const [cat, props] of Object.entries(categorized)) {
            for (const [key, val] of Object.entries(props)) {
                tableData.push([cat, Utils.formatLabel(key), Utils.formatValue(key, val)]);
            }
        }

        doc.autoTable({
            startY: narrativeY + 5,
            head: [[t('category', {}, 'reports'), t('property', {}, 'reports'), t('value', {}, 'reports')]],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235] },
            styles: { fontSize: 8 },
            margin: { top: 25 }
        });
    });

    doc.save(`ExifSense_Report_${Date.now()}.pdf`);
}

export function exportToJson(assets, sessionTitle, forensicId) {
    const reportData = {
        reportInfo: {
            title: t('title', {}, 'reports'),
            session: sessionTitle,
            forensicId: forensicId || Utils.generateForensicId(),
            generated: Utils.formatFullDate(new Date()),
            assetCount: assets.length
        },
        forensicAnalysis: {
            combined: assets.length > 1 ? Narratives.generateCombinedAnalysis(assets).map(f => ({
                title: f.title,
                narrative: stripHtml(f.narrative)
            })) : null,
            assets: assets.map((asset, idx) => {
                const data = asset.exifData;
                const categorized = Utils.categorizeExif(data);
                
                const narratives = {};
                if (data.latitude != null) narratives.geospatial = stripHtml(Narratives.generateGeospatialNarrative(data.latitude, data.longitude, asset.locationData));
                if (categorized['Device Hardware']) narratives.hardware = stripHtml(Narratives.generateHardwareNarrative(categorized['Device Hardware']));
                if (categorized['Exposure Settings']) narratives.exposure = stripHtml(Narratives.generateExposureNarrative(categorized['Exposure Settings']));
                if (categorized['Optics & Lens']) narratives.optics = stripHtml(Narratives.generateOpticsNarrative(categorized['Optics & Lens']));
                if (categorized['Image Quality']) narratives.quality = stripHtml(Narratives.generateQualityNarrative(categorized['Image Quality']));
                if (categorized['Timeline & Date']) narratives.timeline = stripHtml(Narratives.generateTimelineNarrative(categorized['Timeline & Date']));

                return {
                    assetId: idx + 1,
                    fileName: asset.fileName,
                    sourceDetails: {
                        fileType: asset.fileType || 'Unknown',
                        fileSizeMB: (asset.fileSize / (1024 * 1024)).toFixed(2),
                        fileSystemDate: Utils.formatFullDate(asset.fileDate)
                    },
                    forensicNarratives: narratives,
                    metadata: categorized
                };
            })
        }
    };

    const jsonContent = JSON.stringify(reportData, null, 4);
    downloadFile(jsonContent, `ExifSense_Report_${Date.now()}.json`, 'application/json');
}


function downloadFile(content, fileName, contentType) {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
}
