const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
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
  // Licensing & Subscription (SaaS)
  ipcMain.handle('auth:getHardwareId', () => db.getHardwareId());
  ipcMain.handle('auth:getLicenseStatus', () => db.getLicenseStatus());
  ipcMain.handle('auth:generateLicenseKey', (_, data) => db.generateLicenseKey(data));
  ipcMain.handle('auth:activateLicense', (_, key) => db.activateLicense(key));
  ipcMain.handle('auth:provisionStore', (_, data) => db.provisionStore(data));
  ipcMain.handle('auth:generateRenewalCode', (_, data) => db.generateRenewalCode(data));
  ipcMain.handle('auth:applyRenewalCode', (_, code) => db.applyRenewalCode(code));

  // Authentication & Staff (RBAC)
  ipcMain.handle('auth:loginWithPin', (_, pin) => db.loginWithPin(pin));
  ipcMain.handle('auth:loginWithCredentials', (_, u, p) => db.loginWithCredentials(u, p));
  ipcMain.handle('auth:getUsers', () => db.getUsers());
  ipcMain.handle('auth:addUser', (_, data) => db.addUser(data));
  ipcMain.handle('auth:updateUser', (_, id, data) => db.updateUser(id, data));
  ipcMain.handle('auth:deleteUser', (_, id) => db.deleteUser(id));
  ipcMain.handle('auth:resetUsersToSuperAdminOnly', () => db.resetUsersToSuperAdminOnly());

  // Store Profile & Feature Toggles
  ipcMain.handle('cfg:getStoreProfile', () => db.getStoreProfile());
  ipcMain.handle('cfg:updateStoreProfile', (_, data) => db.updateStoreProfile(data));
  ipcMain.handle('cfg:getFeatureToggles', () => db.getFeatureToggles());
  ipcMain.handle('cfg:updateFeatureToggle', (_, key, val) => db.updateFeatureToggle(key, val));

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
  ipcMain.handle('db:clearAllRecords', () => db.clearAllRecords());

  // Khata & Customers
  ipcMain.handle('db:getKhataCustomers', () => db.getKhataCustomers());
  ipcMain.handle('db:getKhataCustomerLedger', (_, customerId) => db.getKhataCustomerLedger(customerId));
  ipcMain.handle('db:addKhataPayment', (_, customerId, amount, note) => db.addKhataPayment(customerId, amount, note));
  ipcMain.handle('db:addKhataCustomer', (_, name, mobile) => db.addKhataCustomer(name, mobile));

  // Distributors & Purchases (Wholesale)
  ipcMain.handle('db:getDistributors', () => db.getDistributors());
  ipcMain.handle('db:addDistributor', (_, data) => db.addDistributor(data));
  ipcMain.handle('db:updateDistributor', (_, id, data) => db.updateDistributor(id, data));
  ipcMain.handle('db:deleteDistributor', (_, id) => db.deleteDistributor(id));
  ipcMain.handle('db:getPurchases', (_, limit) => db.getPurchases(limit));
  ipcMain.handle('db:getPurchaseDetails', (_, purchaseId) => db.getPurchaseDetails(purchaseId));
  ipcMain.handle('db:createPurchase', (_, purchaseData, items) => db.createPurchase(purchaseData, items));
  ipcMain.handle('db:getDistributorLedger', (_, distributorId) => db.getDistributorLedger(distributorId));
  ipcMain.handle('db:addDistributorPayment', (_, distributorId, amount, paymentMode, referenceNo, note) => db.addDistributorPayment(distributorId, amount, paymentMode, referenceNo, note));
  ipcMain.handle('db:getPurchaseSummary', () => db.getPurchaseSummary());
  ipcMain.handle('db:getDebitNotes', (_, limit) => db.getDebitNotes(limit));
  ipcMain.handle('db:getDebitNoteDetails', (_, noteId) => db.getDebitNoteDetails(noteId));
  ipcMain.handle('db:createDebitNote', (_, noteData, items) => db.createDebitNote(noteData, items));

  // Compliance & Statutory Registers (FDA & GST)
  ipcMain.handle('db:getScheduleH1Register', (_, filters) => db.getScheduleH1Register(filters));
  ipcMain.handle('db:getGstTaxSummary', (_, period) => db.getGstTaxSummary(period));

  // Shortage Diary & WhatsApp Purchase Orders ("तोटा नोंदवही")
  ipcMain.handle('db:syncAutoShortages', () => db.syncAutoShortages());
  ipcMain.handle('db:getShortageDiary', (_, filters) => db.getShortageDiary(filters));
  ipcMain.handle('db:addShortageItem', (_, data) => db.addShortageItem(data));
  ipcMain.handle('db:updateShortageItem', (_, id, data) => db.updateShortageItem(id, data));
  ipcMain.handle('db:markShortageAsOrdered', (_, ids, distributorId) => db.markShortageAsOrdered(ids, distributorId));
  ipcMain.handle('db:deleteShortageItem', (_, id) => db.deleteShortageItem(id));

  // Accounting Vouchers & Cash/Bank Book (MediVision Parity)
  ipcMain.handle('db:getAccountingVouchers', (_, filters) => db.getAccountingVouchers(filters));
  ipcMain.handle('db:createAccountingVoucher', (_, data) => db.createAccountingVoucher(data));
  ipcMain.handle('db:deleteAccountingVoucher', (_, id) => db.deleteAccountingVoucher(id));

  // Phase 2: Stock Ledger, Fast Product Creation & Sales Returns
  ipcMain.handle('db:fastCreateProductWithBatch', (_, data) => db.fastCreateProductWithBatch(data));
  ipcMain.handle('db:getProductTransactions', (_, productId, batchId) => db.getProductTransactions(productId, batchId));
  ipcMain.handle('db:createSalesReturn', (_, data) => db.createSalesReturn(data));
  ipcMain.handle('db:getSalesReturns', () => db.getSalesReturns());
  ipcMain.handle('db:getSalesReturnDetails', (_, returnId) => db.getSalesReturnDetails(returnId));

  // Phase 3: Day-End Cashier Drawer & Universal Report Criterion
  ipcMain.handle('db:getDayEndDrawerSummary', (_, dateStr, cashierName) => db.getDayEndDrawerSummary(dateStr, cashierName));
  ipcMain.handle('db:saveDayEndDrawer', (_, data) => db.saveDayEndDrawer(data));
  ipcMain.handle('db:getCashDrawers', (_, filters) => db.getCashDrawers(filters));
  ipcMain.handle('db:getUniversalReportCriterion', (_, criterion) => db.getUniversalReportCriterion(criterion));


  // Backup & Disaster Recovery Engine
  ipcMain.handle('db:getAvailableBackupDrives', () => db.getAvailableBackupDrives());
  ipcMain.handle('db:createDatabaseBackup', (_, options) => db.createDatabaseBackup(options));
  ipcMain.handle('db:getBackupHistory', (_, limit) => db.getBackupHistory(limit));
  ipcMain.handle('db:restoreDatabaseFromBackup', (_, filePath) => db.restoreDatabaseFromBackup(filePath));
  ipcMain.handle('db:getLastBackupTimestamp', () => db.getLastBackupTimestamp());

  // System Utilities & Dialogs
  ipcMain.handle('sys:selectBackupFile', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'बॅकअप फाईल निवडा (Select Backup File to Restore)',
      filters: [
        { name: 'GaavPharma Database Backup (*.db)', extensions: ['db'] },
        { name: 'All Files (*.*)', extensions: ['*'] }
      ],
      properties: ['openFile']
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('sys:selectFolder', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'बॅकअप फोल्डर निवडा (Select Backup Destination Folder)',
      properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

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
