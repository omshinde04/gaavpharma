const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const db = require('./database');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'gaavpharma — Offline POS for Pharmacy & General Stores',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    mainWindow.loadURL(devUrl);
    // Open DevTools in dev mode if needed
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize Database on startup
app.whenReady().then(() => {
  try {
    db.initDatabase();
    console.log('[GaavPharma] SQLite database initialized successfully.');
  } catch (err) {
    console.error('[GaavPharma] Failed to initialize SQLite database:', err);
  }

  // Setup IPC Handlers
  setupIpcHandlers();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function setupIpcHandlers() {
  // Products & Batches
  ipcMain.handle('db:searchProducts', (_, query) => db.searchProducts(query));
  ipcMain.handle('db:getProductByBarcode', (_, barcode) => db.getProductByBarcode(barcode));
  ipcMain.handle('db:findSaltSubstitutes', (_, salt, excludeId) => db.findSaltSubstitutes(salt, excludeId));
  ipcMain.handle('db:getAllProducts', (_, category) => db.getAllProducts(category));
  ipcMain.handle('db:addProduct', (_, data) => db.addProduct(data));
  ipcMain.handle('db:addBatch', (_, data) => db.addBatch(data));
  ipcMain.handle('db:updateBatchStock', (_, batchId, newQty) => db.updateBatchStock(batchId, newQty));

  // Expiry Radar
  ipcMain.handle('db:getExpiryRadarData', () => db.getExpiryRadarData());

  // Invoices & Billing
  ipcMain.handle('db:createInvoice', (_, invoiceData, items) => db.createInvoice(invoiceData, items));
  ipcMain.handle('db:getInvoices', (_, limit) => db.getInvoices(limit));
  ipcMain.handle('db:getInvoiceDetails', (_, invoiceId) => db.getInvoiceDetails(invoiceId));
  ipcMain.handle('db:getDailyRegisterSummary', () => db.getDailyRegisterSummary());

  // Khata & Customers
  ipcMain.handle('db:getKhataCustomers', () => db.getKhataCustomers());
  ipcMain.handle('db:getKhataCustomerLedger', (_, customerId) => db.getKhataCustomerLedger(customerId));
  ipcMain.handle('db:addKhataPayment', (_, customerId, amount, note) => db.addKhataPayment(customerId, amount, note));
  ipcMain.handle('db:addKhataCustomer', (_, name, mobile) => db.addKhataCustomer(name, mobile));

  // Distributors
  ipcMain.handle('db:getDistributors', () => db.getDistributors());
  ipcMain.handle('db:addDistributor', (_, data) => db.addDistributor(data));

  // System Utilities
  ipcMain.handle('sys:openExternalUrl', async (_, url) => {
    if (url && (url.startsWith('https://') || url.startsWith('http://') || url.startsWith('mailto:'))) {
      await shell.openExternal(url);
      return true;
    }
    return false;
  });

  ipcMain.handle('sys:printReceipt', async () => {
    if (mainWindow) {
      mainWindow.webContents.print({ silent: false, printBackground: true });
      return true;
    }
    return false;
  });
}
