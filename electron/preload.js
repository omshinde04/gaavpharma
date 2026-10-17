const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Licensing & Subscription (SaaS)
  getHardwareId: () => ipcRenderer.invoke('auth:getHardwareId'),
  getLicenseStatus: () => ipcRenderer.invoke('auth:getLicenseStatus'),
  generateLicenseKey: (data) => ipcRenderer.invoke('auth:generateLicenseKey', data),
  activateLicense: (key) => ipcRenderer.invoke('auth:activateLicense', key),
  provisionStore: (data) => ipcRenderer.invoke('auth:provisionStore', data),
  generateRenewalCode: (data) => ipcRenderer.invoke('auth:generateRenewalCode', data),
  applyRenewalCode: (code) => ipcRenderer.invoke('auth:applyRenewalCode', code),

  // Authentication & Staff (RBAC)
  loginWithPin: (pin) => ipcRenderer.invoke('auth:loginWithPin', pin),
  loginWithCredentials: (username, password) => ipcRenderer.invoke('auth:loginWithCredentials', username, password),
  getUsers: () => ipcRenderer.invoke('auth:getUsers'),
  addUser: (userData) => ipcRenderer.invoke('auth:addUser', userData),
  updateUser: (id, userData) => ipcRenderer.invoke('auth:updateUser', id, userData),
  deleteUser: (id) => ipcRenderer.invoke('auth:deleteUser', id),
  resetUsersToSuperAdminOnly: () => ipcRenderer.invoke('auth:resetUsersToSuperAdminOnly'),

  // Store Profile & Feature Toggles
  getStoreProfile: () => ipcRenderer.invoke('cfg:getStoreProfile'),
  updateStoreProfile: (data) => ipcRenderer.invoke('cfg:updateStoreProfile', data),
  getFeatureToggles: () => ipcRenderer.invoke('cfg:getFeatureToggles'),
  updateFeatureToggle: (key, value) => ipcRenderer.invoke('cfg:updateFeatureToggle', key, value),

  // Products & Batches
  searchProducts: (query) => ipcRenderer.invoke('db:searchProducts', query),
  getProductByBarcode: (barcode) => ipcRenderer.invoke('db:getProductByBarcode', barcode),
  findSaltSubstitutes: (genericSalt, excludeProductId) => ipcRenderer.invoke('db:findSaltSubstitutes', genericSalt, excludeProductId),
  getAllProducts: (category) => ipcRenderer.invoke('db:getAllProducts', category),
  addProduct: (data) => ipcRenderer.invoke('db:addProduct', data),
  addBatch: (data) => ipcRenderer.invoke('db:addBatch', data),
  updateBatchStock: (batchId, newQty) => ipcRenderer.invoke('db:updateBatchStock', batchId, newQty),

  // Expiry Radar
  getExpiryRadarData: () => ipcRenderer.invoke('db:getExpiryRadarData'),

  // Invoices & Billing
  createInvoice: (invoiceData, items) => ipcRenderer.invoke('db:createInvoice', invoiceData, items),
  getInvoices: (limit) => ipcRenderer.invoke('db:getInvoices', limit),
  getInvoiceDetails: (invoiceId) => ipcRenderer.invoke('db:getInvoiceDetails', invoiceId),
  getDailyRegisterSummary: () => ipcRenderer.invoke('db:getDailyRegisterSummary'),

  // Khata & Customers
  getKhataCustomers: () => ipcRenderer.invoke('db:getKhataCustomers'),
  getKhataCustomerLedger: (customerId) => ipcRenderer.invoke('db:getKhataCustomerLedger', customerId),
  addKhataPayment: (customerId, amount, note) => ipcRenderer.invoke('db:addKhataPayment', customerId, amount, note),
  addKhataCustomer: (name, mobile) => ipcRenderer.invoke('db:addKhataCustomer', name, mobile),

  // Distributors
  getDistributors: () => ipcRenderer.invoke('db:getDistributors'),
  addDistributor: (data) => ipcRenderer.invoke('db:addDistributor', data),

  // System Utilities
  openExternalUrl: (url) => ipcRenderer.invoke('sys:openExternalUrl', url),
  printReceipt: () => ipcRenderer.invoke('sys:printReceipt')
});
