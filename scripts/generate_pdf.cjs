const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  try {
    const win = new BrowserWindow({
      show: false,
      width: 1200,
      height: 1600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    const htmlPath = path.join(__dirname, '..', 'docs', 'GaavPharma_Medical_Owner_Guide.html');
    await win.loadFile(htmlPath);

    // Wait a brief moment for images and fonts to render
    await new Promise(r => setTimeout(r, 1500));

    const pdfBuffer = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      preferCSSPageSize: true,
      margins: {
        top: 0.4,
        bottom: 0.4,
        left: 0.4,
        right: 0.4
      }
    });

    const outputPdfPath = path.join(__dirname, '..', 'docs', 'GaavPharma_Medical_Owner_Guide.pdf');
    fs.writeFileSync(outputPdfPath, pdfBuffer);
    console.log(`[PDF Generator] Successfully generated PDF at: ${outputPdfPath} (${pdfBuffer.length} bytes)`);

    app.quit();
  } catch (err) {
    console.error('[PDF Generator] Error:', err);
    app.exit(1);
  }
});
