import * as Utils from './utils.js';
import * as Narratives from './narratives.js';

function stripHtml(html) {
    if (!html) return '';
    // Replace <br/> with newline, then strip other tags
    return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>?/gm, '');
}

export function exportToTxt(assets, sessionTitle) {
    let content = `EXIFSENSE FORENSIC ANALYSIS REPORT\n`;
    content += `===================================\n`;
    content += `Session: ${sessionTitle}\n`;
    content += `Generated: ${Utils.formatFullDate(new Date())}\n`;
    content += `Asset Count: ${assets.length}\n\n`;

    if (assets.length > 1) {
        content += `COMBINED FORENSIC INTELLIGENCE\n`;
        content += `-----------------------------\n`;
        const combined = Narratives.generateCombinedAnalysis(assets);
        combined.forEach(f => {
            content += `${f.title.toUpperCase()}\n`;
            content += `${stripHtml(f.narrative)}\n\n`;
        });
        content += `\n`;
    }

    assets.forEach((asset, idx) => {
        content += `ASSET ${idx + 1}: ${asset.fileName}\n`;
        content += `===================================\n\n`;

        content += `[Technical Source Details]\n`;
        content += `File Name: ${asset.fileName}\n`;
        content += `File Type: ${asset.fileType || 'Unknown'}\n`;
        content += `File Size: ${(asset.fileSize / (1024 * 1024)).toFixed(2)} MB\n`;
        content += `File System (Last Modified): ${Utils.formatFullDate(asset.fileDate)}\n\n`;

        content += `[Forensic Analysis Narrative]\n`;
        const data = asset.exifData;
        const categorized = Utils.categorizeExif(data);
        
        if (data.latitude != null) {
            content += `Geospatial: ${stripHtml(Narratives.generateGeospatialNarrative(data.latitude, data.longitude, asset.locationData))}\n`;
        }
        if (categorized['Device Hardware']) content += `Hardware: ${stripHtml(Narratives.generateHardwareNarrative(categorized['Device Hardware']))}\n`;
        if (categorized['Exposure Settings']) content += `Exposure: ${stripHtml(Narratives.generateExposureNarrative(categorized['Exposure Settings']))}\n`;
        if (categorized['Optics & Lens']) content += `Optics: ${stripHtml(Narratives.generateOpticsNarrative(categorized['Optics & Lens']))}\n`;
        if (categorized['Image Quality']) content += `Quality: ${stripHtml(Narratives.generateQualityNarrative(categorized['Image Quality']))}\n`;
        if (categorized['Timeline & Date']) content += `Timeline: ${stripHtml(Narratives.generateTimelineNarrative(categorized['Timeline & Date']))}\n`;
        content += `\n`;

        content += `[Raw Metadata Properties]\n`;
        for (const [cat, props] of Object.entries(categorized)) {
            content += `--- ${cat} ---\n`;
            for (const [key, val] of Object.entries(props)) {
                content += `${Utils.formatLabel(key)}: ${Utils.formatValue(key, val)}\n`;
            }
            content += `\n`;
        }
        content += `\n\n`;
    });

    downloadFile(content, `ExifSense_Report_${Date.now()}.txt`, 'text/plain');
}

export function exportToCsv(assets) {
    let rows = [['Asset', 'Category', 'Property', 'Value']];
    
    assets.forEach((asset) => {
        // Add technical details to CSV
        rows.push([asset.fileName, 'Source Details', 'File Name', asset.fileName]);
        rows.push([asset.fileName, 'Source Details', 'File Type', asset.fileType || 'Unknown']);
        rows.push([asset.fileName, 'Source Details', 'File Size (MB)', (asset.fileSize / (1024 * 1024)).toFixed(2)]);
        rows.push([asset.fileName, 'Source Details', 'File System (Last Modified)', Utils.formatFullDate(asset.fileDate)]);

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

export function exportToMd(assets, sessionTitle) {
    let content = `# ExifSense Forensic Analysis Report\n\n`;
    content += `**Session:** ${sessionTitle}  \n`;
    content += `**Generated:** ${Utils.formatFullDate(new Date())}  \n`;
    content += `**Asset Count:** ${assets.length}  \n\n`;

    if (assets.length > 1) {
        content += `## Combined Forensic Intelligence\n\n`;
        const combined = Narratives.generateCombinedAnalysis(assets);
        combined.forEach(f => {
            content += `### ${f.title}\n`;
            content += `> ${stripHtml(f.narrative)}\n\n`;
        });
    }

    assets.forEach((asset, idx) => {
        content += `## Asset ${idx + 1}: ${asset.fileName}\n\n`;

        content += `### Technical Source Details\n\n`;
        content += `| Property | Value |\n`;
        content += `|----------|-------|\n`;
        content += `| File Name | ${asset.fileName} |\n`;
        content += `| File Type | ${asset.fileType || 'Unknown'} |\n`;
        content += `| File Size | ${(asset.fileSize / (1024 * 1024)).toFixed(2)} MB |\n`;
        content += `| File System (Last Modified) | ${Utils.formatFullDate(asset.fileDate)} |\n\n`;

        content += `### Forensic Analysis Narrative\n\n`;
        const data = asset.exifData;
        const categorized = Utils.categorizeExif(data);
        
        if (data.latitude != null) {
            content += `**Geospatial Analysis:**  \n${stripHtml(Narratives.generateGeospatialNarrative(data.latitude, data.longitude, asset.locationData))}  \n\n`;
        }
        if (categorized['Device Hardware']) content += `**Hardware Analysis:**  \n${stripHtml(Narratives.generateHardwareNarrative(categorized['Device Hardware']))}  \n\n`;
        if (categorized['Exposure Settings']) content += `**Exposure Analysis:**  \n${stripHtml(Narratives.generateExposureNarrative(categorized['Exposure Settings']))}  \n\n`;
        if (categorized['Optics & Lens']) content += `**Optics Analysis:**  \n${stripHtml(Narratives.generateOpticsNarrative(categorized['Optics & Lens']))}  \n\n`;
        if (categorized['Image Quality']) content += `**Quality Analysis:**  \n${stripHtml(Narratives.generateQualityNarrative(categorized['Image Quality']))}  \n\n`;
        if (categorized['Timeline & Date']) content += `**Timeline Analysis:**  \n${stripHtml(Narratives.generateTimelineNarrative(categorized['Timeline & Date']))}  \n\n`;

        content += `### Metadata Properties\n\n`;
        for (const [cat, props] of Object.entries(categorized)) {
            content += `#### ${cat}\n`;
            content += `| Property | Value |\n`;
            content += `|----------|-------|\n`;
            for (const [key, val] of Object.entries(props)) {
                content += `| ${Utils.formatLabel(key)} | ${Utils.formatValue(key, val)} |\n`;
            }
            content += `\n`;
        }
    });

    downloadFile(content, `ExifSense_Report_${Date.now()}.md`, 'text/markdown');
}

export function exportToPdf(assets, sessionTitle) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235);
    doc.text('EXIFSENSE FORENSIC REPORT', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Session: ${sessionTitle}`, 14, 30);
    doc.text(`Generated: ${Utils.formatFullDate(new Date())}`, 14, 35);
    doc.text(`Total Assets: ${assets.length}`, 14, 40);

    let currentY = 50;

    // Combined Intelligence Page
    if (assets.length > 1) {
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text('Combined Forensic Intelligence', 14, currentY);
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
    }

    assets.forEach((asset, idx) => {
        if (idx > 0 && assets.length === 1) doc.addPage(); // Handle single asset page break if needed
        else if (idx > 0) doc.addPage();

        doc.setFontSize(16);
        doc.setTextColor(37, 99, 235);
        doc.text(`Asset ${idx + 1}: ${asset.fileName}`, 14, 20);
        
        // Tech Details Table
        doc.autoTable({
            startY: 25,
            head: [['Source Property', 'Detail']],
            body: [
                ['File Name', asset.fileName],
                ['File Type', asset.fileType || 'Unknown'],
                ['File Size', `${(asset.fileSize / (1024 * 1024)).toFixed(2)} MB`],
                ['File System (Last Modified)', Utils.formatFullDate(asset.fileDate)]
            ],
            theme: 'grid',
            headStyles: { fillColor: [71, 85, 105] },
            margin: { bottom: 10 }
        });

        // Analysis Narratives
        let narrativeY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(13);
        doc.setTextColor(0);
        doc.text('Forensic Narrative Analysis', 14, narrativeY);
        narrativeY += 8;

        const data = asset.exifData;
        const categorized = Utils.categorizeExif(data);
        const narrativeItems = [];

        if (data.latitude != null) narrativeItems.push({ t: 'Geospatial', n: Narratives.generateGeospatialNarrative(data.latitude, data.longitude, asset.locationData) });
        if (categorized['Device Hardware']) narrativeItems.push({ t: 'Hardware', n: Narratives.generateHardwareNarrative(categorized['Device Hardware']) });
        if (categorized['Exposure Settings']) narrativeItems.push({ t: 'Exposure', n: Narratives.generateExposureNarrative(categorized['Exposure Settings']) });
        if (categorized['Optics & Lens']) narrativeItems.push({ t: 'Optics', n: Narratives.generateOpticsNarrative(categorized['Optics & Lens']) });
        if (categorized['Image Quality']) narrativeItems.push({ t: 'Quality', n: Narratives.generateQualityNarrative(categorized['Image Quality']) });
        if (categorized['Timeline & Date']) narrativeItems.push({ t: 'Timeline', n: Narratives.generateTimelineNarrative(categorized['Timeline & Date']) });

        doc.setFontSize(9);
        narrativeItems.forEach(item => {
            if (narrativeY > 270) { doc.addPage(); narrativeY = 20; }
            doc.setFont(undefined, 'bold');
            doc.text(`${item.t} Analysis:`, 14, narrativeY);
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
            head: [['Category', 'Property', 'Value']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235] },
            styles: { fontSize: 8 },
            margin: { top: 25 }
        });
    });

    doc.save(`ExifSense_Report_${Date.now()}.pdf`);
}

export function exportToJson(assets, sessionTitle) {
    const reportData = {
        reportInfo: {
            title: "EXIFSENSE FORENSIC ANALYSIS REPORT",
            session: sessionTitle,
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
