import * as Utils from './utils.js';

export function exportToTxt(assets, sessionTitle) {
    let content = `FORENSIC ANALYSIS REPORT\n`;
    content += `=========================\n`;
    content += `Session: ${sessionTitle}\n`;
    content += `Generated: ${new Date().toLocaleString()}\n\n`;

    assets.forEach((asset, idx) => {
        content += `ASSET ${idx + 1}: ${asset.fileName}\n`;
        content += `-----------------------------------\n`;
        const categorized = Utils.categorizeExif(asset.exifData);
        for (const [cat, props] of Object.entries(categorized)) {
            content += `[${cat}]\n`;
            for (const [key, val] of Object.entries(props)) {
                content += `${Utils.formatLabel(key)}: ${Utils.formatValue(key, val)}\n`;
            }
            content += `\n`;
        }
        content += `\n`;
    });

    downloadFile(content, `Forensic_Report_${Date.now()}.txt`, 'text/plain');
}

export function exportToCsv(assets) {
    let rows = [['Asset', 'Category', 'Property', 'Value']];
    
    assets.forEach((asset) => {
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
    downloadFile(csvContent, `Forensic_Data_${Date.now()}.csv`, 'text/csv');
}

export function exportToMd(assets, sessionTitle) {
    let content = `# Forensic Analysis Report\n\n`;
    content += `**Session:** ${sessionTitle}  \n`;
    content += `**Generated:** ${new Date().toLocaleString()}  \n\n`;

    assets.forEach((asset, idx) => {
        content += `## Asset ${idx + 1}: ${asset.fileName}\n\n`;
        const categorized = Utils.categorizeExif(asset.exifData);
        for (const [cat, props] of Object.entries(categorized)) {
            content += `### ${cat}\n`;
            content += `| Property | Value |\n`;
            content += `|----------|-------|\n`;
            for (const [key, val] of Object.entries(props)) {
                content += `| ${Utils.formatLabel(key)} | ${Utils.formatValue(key, val)} |\n`;
            }
            content += `\n`;
        }
    });

    downloadFile(content, `Forensic_Report_${Date.now()}.md`, 'text/markdown');
}

export function exportToPdf(assets, sessionTitle) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235);
    doc.text('FORENSIC ANALYSIS REPORT', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Session: ${sessionTitle}`, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 35);

    let currentY = 45;

    assets.forEach((asset, idx) => {
        if (idx > 0) doc.addPage();
        
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text(`Asset ${idx + 1}: ${asset.fileName}`, 14, 20);
        
        const tableData = [];
        const categorized = Utils.categorizeExif(asset.exifData);
        
        for (const [cat, props] of Object.entries(categorized)) {
            for (const [key, val] of Object.entries(props)) {
                tableData.push([cat, Utils.formatLabel(key), Utils.formatValue(key, val)]);
            }
        }

        doc.autoTable({
            startY: 25,
            head: [['Category', 'Property', 'Value']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235] },
            margin: { top: 25 }
        });
    });

    doc.save(`Forensic_Report_${Date.now()}.pdf`);
}

function downloadFile(content, fileName, contentType) {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
}
