// API Client wrapper for Electron IPC with web fallback

const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;

const DEFAULT_STORE_PROFILE = {
  store_name: 'Divya Medical Stores',
  dl_number: '20B/21B-MH-SOL-194829',
  gstin: '27AABCA1234F1Z9',
  address: 'Main Market, Solapur Road',
  phone: '9373545169',
  upi_id: 'divyakale@upi',
  printer_type: '80mm',
  auto_print: 0
};

const DEFAULT_LICENSE = {
  isValid: true,
  status: 'ACTIVE',
  storeName: 'Divya Medical Stores',
  ownerPhone: '9373545169',
  plan: 'annual',
  hardwareId: 'GP-OFFLINE-001',
  daysRemaining: 365,
  expiresAt: new Date(Date.now() + 365 * 86400000).toISOString()
};

const DEFAULT_USERS = [
  { id: 1, username: 'superadmin', display_name: 'Om Shinde (Founder)', pin_code: '9999', role: 'super_admin', is_active: 1 },
  { id: 2, username: 'Divya_kale', display_name: 'Divya kale', pin_code: '1111', role: 'store_admin', is_active: 1 }
];

const loadFallbackStoreProfile = () => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('gaavpharma_store_profile') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.store_name && parsed.store_name.trim().length > 0) {
        return parsed;
      }
    }
  } catch (e) {}
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('gaavpharma_store_profile', JSON.stringify(DEFAULT_STORE_PROFILE));
    } catch (e) {}
  }
  return { ...DEFAULT_STORE_PROFILE };
};

const loadFallbackLicense = () => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('gaavpharma_license') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.isValid !== undefined) return parsed;
    }
  } catch (e) {}
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('gaavpharma_license', JSON.stringify(DEFAULT_LICENSE));
    } catch (e) {}
  }
  return { ...DEFAULT_LICENSE };
};

const loadFallbackUsers = () => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('gaavpharma_users') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const hasSuper = parsed.some((u) => u.role === 'super_admin');
        const hasOwner = parsed.some((u) => u.role === 'store_admin');
        const list = [...parsed];
        if (!hasSuper) {
          list.unshift({ id: 1, username: 'superadmin', display_name: 'Om Shinde (Founder)', pin_code: '9999', role: 'super_admin', is_active: 1 });
        }
        if (!hasOwner) {
          list.push({ id: 2, username: 'Divya_kale', display_name: 'Divya kale', pin_code: '1111', role: 'store_admin', is_active: 1 });
        }
        return list;
      }
    }
  } catch (e) {}
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('gaavpharma_users', JSON.stringify(DEFAULT_USERS));
    } catch (e) {}
  }
  return [...DEFAULT_USERS];
};

// Seed provisioned clients directory if empty
if (typeof window !== 'undefined') {
  try {
    const rawClients = localStorage.getItem('gaavpharma_provisioned_clients');
    if (!rawClients || JSON.parse(rawClients).length === 0) {
      localStorage.setItem(
        'gaavpharma_provisioned_clients',
        JSON.stringify([
          {
            id: 1,
            name: 'Divya Medical Stores',
            owner: 'Divya kale',
            phone: '9373545169',
            plan: '1-Year Pro',
            expires: new Date(Date.now() + 365 * 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            status: 'ACTIVE'
          }
        ])
      );
    }
  } catch (e) {}
}

const DEFAULT_FEATURE_TOGGLES = {
  allow_khata: true,
  allow_loose_tablets: true,
  allow_whatsapp: true,
  enforce_h1_doctor: false,
  max_cashier_discount: 10,
  hide_drawer_from_cashier: false,
  allow_cashier_purchase_inward: false
};

const loadFallbackFeatureToggles = () => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('gaavpharma_feature_toggles') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...DEFAULT_FEATURE_TOGGLES, ...parsed };
      }
    }
  } catch (e) {}
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('gaavpharma_feature_toggles', JSON.stringify(DEFAULT_FEATURE_TOGGLES));
    } catch (e) {}
  }
  return { ...DEFAULT_FEATURE_TOGGLES };
};

// Clean up legacy mock invoices and khata records so database starts fresh
if (typeof window !== 'undefined') {
  try {
    const isWiped = localStorage.getItem('gaavpharma_clean_slate_2026');
    if (!isWiped) {
      localStorage.removeItem('gaavpharma_invoices');
      localStorage.removeItem('gaavpharma_customers');
      localStorage.setItem('gaavpharma_clean_slate_2026', 'true');
    }
  } catch (e) {}
}

const INITIAL_INVOICES = [];

const loadFallbackInvoices = () => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('gaavpharma_invoices') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
};

const loadFallbackCustomers = () => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('gaavpharma_customers') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
};

const INITIAL_DISTRIBUTORS = [
  { id: 1, name: 'Mahaveer Pharma Distributors', phone: '9822012345', gstin: '27AABCM1234P1Z2', dl_number: '20B/21B-MH-NAS-10029', address: 'Old Agra Road, Nashik', payment_terms_days: 21, pending_balance: 0.00 },
  { id: 2, name: 'Sunlife Healthcare Agency', phone: '9423098765', gstin: '27AABCS9876Q1Z8', dl_number: '20B/21B-MH-NAS-10492', address: 'Main Road, Ghoti-Igatpuri', payment_terms_days: 15, pending_balance: 0.00 },
  { id: 3, name: 'Balaji FMCG & Surgicals', phone: '9860011223', gstin: '27AABCB4321R1Z5', dl_number: '20B/21B-MH-NAS-19382', address: 'Market Yard, Nashik', payment_terms_days: 30, pending_balance: 0.00 }
];

const loadFallbackDistributors = () => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('gaavpharma_distributors') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return JSON.parse(JSON.stringify(INITIAL_DISTRIBUTORS));
};

const loadFallbackPurchases = () => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('gaavpharma_purchases') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
};

const loadFallbackDistributorLedger = () => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('gaavpharma_distributor_ledger') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
};

const loadFallbackDebitNotes = () => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('gaavpharma_debit_notes') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
};

const INITIAL_PRODUCTS = [
  {
    id: 1,
    barcode: null,
    name: 'Dolo 650 Tablet',
    generic_salt: 'Paracetamol 650mg',
    category: 'medicine',
    rack_location: 'Rack A-1',
    strip_size: 15,
    is_schedule_h1: 0,
    min_stock_alert: 20,
    total_stock: 51,
    batches: [
      { id: 1, product_id: 1, batch_no: 'DL3811', expiry_date: '10/26', purchase_rate: 22.00, mrp: 34.00, stock_qty: 6 },
      { id: 2, product_id: 1, batch_no: 'DL4920', expiry_date: '04/27', purchase_rate: 24.50, mrp: 34.00, stock_qty: 45 }
    ]
  },
  {
    id: 2,
    barcode: null,
    name: 'Augmentin 625 Duo',
    generic_salt: 'Amoxicillin 500mg + Clavulanic Acid 125mg',
    category: 'medicine',
    rack_location: 'Rack B-4',
    strip_size: 10,
    is_schedule_h1: 1,
    min_stock_alert: 10,
    total_stock: 37,
    batches: [
      { id: 3, product_id: 2, batch_no: 'AG9921', expiry_date: '12/26', purchase_rate: 145.00, mrp: 204.50, stock_qty: 25 },
      { id: 4, product_id: 2, batch_no: 'AG8812', expiry_date: '11/26', purchase_rate: 140.00, mrp: 198.00, stock_qty: 12 }
    ]
  },
  {
    id: 3,
    barcode: null,
    name: 'Telma 40 Tablet',
    generic_salt: 'Telmisartan 40mg',
    category: 'medicine',
    rack_location: 'Rack C-2',
    strip_size: 15,
    is_schedule_h1: 0,
    min_stock_alert: 15,
    total_stock: 34,
    batches: [
      { id: 5, product_id: 3, batch_no: 'TL4002', expiry_date: '11/26', purchase_rate: 150.00, mrp: 215.00, stock_qty: 4 },
      { id: 6, product_id: 3, batch_no: 'TL5112', expiry_date: '03/27', purchase_rate: 160.00, mrp: 225.00, stock_qty: 30 }
    ]
  },
  {
    id: 4,
    barcode: null,
    name: 'Pan 40 Tablet',
    generic_salt: 'Pantoprazole 40mg',
    category: 'medicine',
    rack_location: 'Rack A-3',
    strip_size: 15,
    is_schedule_h1: 0,
    min_stock_alert: 20,
    total_stock: 40,
    batches: [
      { id: 7, product_id: 4, batch_no: 'PN8840', expiry_date: '01/27', purchase_rate: 98.00, mrp: 148.00, stock_qty: 40 }
    ]
  },
  {
    id: 5,
    barcode: null,
    name: 'Azithral 500 Tablet',
    generic_salt: 'Azithromycin 500mg',
    category: 'medicine',
    rack_location: 'Rack B-1',
    strip_size: 5,
    is_schedule_h1: 1,
    min_stock_alert: 10,
    total_stock: 4,
    batches: [
      { id: 8, product_id: 5, batch_no: 'AZ3041', expiry_date: '12/26', purchase_rate: 78.00, mrp: 119.50, stock_qty: 4 }
    ]
  },
  {
    id: 6,
    barcode: null,
    name: 'Cetzine 10mg Tablet',
    generic_salt: 'Cetirizine Hydrochloride 10mg',
    category: 'medicine',
    rack_location: 'Rack A-2',
    strip_size: 10,
    is_schedule_h1: 0,
    min_stock_alert: 25,
    total_stock: 60,
    batches: [
      { id: 9, product_id: 6, batch_no: 'CT1099', expiry_date: '08/27', purchase_rate: 14.00, mrp: 22.00, stock_qty: 60 }
    ]
  },
  {
    id: 7,
    barcode: null,
    name: 'Calpol 650 Tablet',
    generic_salt: 'Paracetamol 650mg',
    category: 'medicine',
    rack_location: 'Rack A-1',
    strip_size: 15,
    is_schedule_h1: 0,
    min_stock_alert: 15,
    total_stock: 35,
    batches: [
      { id: 10, product_id: 7, batch_no: 'CP6610', expiry_date: '02/27', purchase_rate: 23.00, mrp: 33.50, stock_qty: 35 }
    ]
  },
  {
    id: 8,
    barcode: '8901138833443',
    name: 'Himalaya Baby Wipes 72s',
    generic_salt: 'Aloe Vera & Indian Lotus Wet Wipes',
    category: 'baby_care',
    rack_location: 'Aisle 2 - Baby Shelf',
    strip_size: 1,
    is_schedule_h1: 0,
    min_stock_alert: 5,
    total_stock: 18,
    batches: [
      { id: 11, product_id: 8, batch_no: 'HW771', expiry_date: '05/27', purchase_rate: 135.00, mrp: 195.00, stock_qty: 18 }
    ]
  },
  {
    id: 9,
    barcode: '8901396112102',
    name: 'Dettol Original Soap 125g',
    generic_salt: 'Chloroxylenol Antiseptic Soap',
    category: 'general',
    rack_location: 'Counter Display 1',
    strip_size: 1,
    is_schedule_h1: 0,
    min_stock_alert: 10,
    total_stock: 36,
    batches: [
      { id: 12, product_id: 9, batch_no: 'DT2290', expiry_date: '06/28', purchase_rate: 42.00, mrp: 58.00, stock_qty: 36 }
    ]
  },
  {
    id: 10,
    barcode: '8901234567890',
    name: 'Volini Pain Relief Gel 30g',
    generic_salt: 'Diclofenac Diethylamine + Methyl Salicylate',
    category: 'general',
    rack_location: 'Rack D-1',
    strip_size: 1,
    is_schedule_h1: 0,
    min_stock_alert: 8,
    total_stock: 14,
    batches: [
      { id: 13, product_id: 10, batch_no: 'VL5521', expiry_date: '11/26', purchase_rate: 85.00, mrp: 130.00, stock_qty: 14 }
    ]
  },
  {
    id: 11,
    barcode: '8901030612345',
    name: 'Whisper Ultra Clean XL 15 Pads',
    generic_salt: 'Sanitary Napkins with Wings',
    category: 'cosmetic',
    rack_location: 'Aisle 3 - Care',
    strip_size: 1,
    is_schedule_h1: 0,
    min_stock_alert: 10,
    total_stock: 22,
    batches: [
      { id: 14, product_id: 11, batch_no: 'WH9901', expiry_date: '11/27', purchase_rate: 110.00, mrp: 160.00, stock_qty: 22 }
    ]
  }
];

const loadFallbackProducts = () => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('gaavpharma_products') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return JSON.parse(JSON.stringify(INITIAL_PRODUCTS));
};

const INITIAL_SHORTAGE_DIARY = [
  {
    id: 1,
    product_id: 5,
    medicine_name: 'Azithral 500 Tablet',
    generic_salt: 'Azithromycin 500mg',
    current_stock: 2,
    min_stock_alert: 10,
    suggested_qty: 15,
    distributor_id: 1,
    distributor_name: 'Mahaveer Pharma Ghoti',
    status: 'PENDING',
    source: 'AUTO_STOCK_ALERT',
    notes: 'Low stock critical (2 left)',
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 2,
    product_id: 3,
    medicine_name: 'Telma 40 Tablet',
    generic_salt: 'Telmisartan 40mg',
    current_stock: 4,
    min_stock_alert: 15,
    suggested_qty: 20,
    distributor_id: 2,
    distributor_name: 'Arihant Agencies Nashik',
    status: 'PENDING',
    source: 'AUTO_STOCK_ALERT',
    notes: 'Fast-moving BP tablet',
    created_at: new Date(Date.now() - 7200000).toISOString()
  }
];

const loadFallbackShortageDiary = () => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('gaavpharma_shortage_diary') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return JSON.parse(JSON.stringify(INITIAL_SHORTAGE_DIARY));
};

// In-memory fallback mock with localStorage persistence for web dev preview
const fallbackStorage = {
  license: loadFallbackLicense(),
  storeProfile: loadFallbackStoreProfile(),
  users: loadFallbackUsers(),
  featureToggles: loadFallbackFeatureToggles(),
  products: loadFallbackProducts(),
  customers: loadFallbackCustomers(),
  invoices: loadFallbackInvoices(),
  distributors: loadFallbackDistributors(),
  purchases: loadFallbackPurchases(),
  distributorLedger: loadFallbackDistributorLedger(),
  debitNotes: loadFallbackDebitNotes(),
  shortageDiary: loadFallbackShortageDiary()
};

export const api = {
  isElectron,

  // Licensing & Subscription (SaaS)
  getHardwareId: async () => {
    if (isElectron) return window.electronAPI.getHardwareId();
    return fallbackStorage.license?.hardwareId || 'GP-OFFLINE-001';
  },

  getLicenseStatus: async () => {
    if (isElectron) return window.electronAPI.getLicenseStatus();
    return (
      fallbackStorage.license || {
        isValid: true,
        status: 'ACTIVE',
        storeName: fallbackStorage.storeProfile?.store_name || 'Divya Medical Stores',
        plan: 'annual',
        hardwareId: 'GP-OFFLINE-001',
        daysRemaining: 365,
        expiresAt: new Date(Date.now() + 365 * 86400000).toISOString()
      }
    );
  },

  generateLicenseKey: async (data) => {
    if (isElectron) return window.electronAPI.generateLicenseKey(data);
    const jsonStr = JSON.stringify({
      storeName: data.storeName || 'Medical Store',
      plan: data.plan || 'annual',
      days: data.days || 365,
      features: data.features || {}
    });
    const b64 = btoa(jsonStr).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `GP-ACT-${b64}.webmock77821`;
  },

  activateLicense: async (key) => {
    if (isElectron) return window.electronAPI.activateLicense(key);
    try {
      const cleanKey = key.trim();
      const parts = cleanKey.replace(/^GP-ACT-/, '').split('.');
      if (parts.length >= 1 && parts[0]) {
        let b64 = parts[0].replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        const jsonStr = decodeURIComponent(escape(atob(b64)));
        const payload = JSON.parse(jsonStr);
        if (payload.storeName) {
          fallbackStorage.storeProfile.store_name = payload.storeName;
          fallbackStorage.license.storeName = payload.storeName;
        }
        if (payload.plan) fallbackStorage.license.plan = payload.plan;
        if (payload.days) fallbackStorage.license.daysRemaining = payload.days;
      }
    } catch (e) {
      console.warn('Fallback key parse error:', e);
    }
    fallbackStorage.license.isValid = true;
    fallbackStorage.license.status = 'ACTIVE';
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('gaavpharma_license', JSON.stringify(fallbackStorage.license));
        localStorage.setItem('gaavpharma_store_profile', JSON.stringify(fallbackStorage.storeProfile));
      } catch (e) {}
    }
    return fallbackStorage.license;
  },

  generateRenewalCode: async (data) => {
    if (isElectron) return window.electronAPI.generateRenewalCode(data);
    const jsonStr = JSON.stringify({ storeName: data.storeName, daysAdded: data.days || 365 });
    const b64 = btoa(jsonStr).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `GP-REN-${b64}.webmock77821`;
  },

  applyRenewalCode: async (code) => {
    if (isElectron) return window.electronAPI.applyRenewalCode(code);
    try {
      const parts = code.trim().replace(/^GP-REN-/, '').split('.');
      if (parts.length >= 1 && parts[0]) {
        let b64 = parts[0].replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        const payload = JSON.parse(decodeURIComponent(escape(atob(b64))));
        fallbackStorage.license.daysRemaining += (payload.daysAdded || 365);
      } else {
        fallbackStorage.license.daysRemaining += 365;
      }
    } catch (e) {
      fallbackStorage.license.daysRemaining += 365;
    }
    fallbackStorage.license.isValid = true;
    fallbackStorage.license.status = 'ACTIVE';
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('gaavpharma_license', JSON.stringify(fallbackStorage.license));
      } catch (e) {}
    }
    return fallbackStorage.license;
  },

  provisionStore: async (data) => {
    if (isElectron) return window.electronAPI.provisionStore(data);
    const {
      storeName,
      dlNumber,
      gstin,
      address,
      ownerPhone,
      upiId,
      ownerName,
      ownerUsername,
      ownerPin,
      plan = 'annual',
      days = 365
    } = data;

    // 1. Update storeProfile
    fallbackStorage.storeProfile = {
      ...fallbackStorage.storeProfile,
      store_name: storeName.trim(),
      dl_number: dlNumber || '20B/21B-MH-SOL-194829',
      gstin: gstin || '27AABCA1234F1Z9',
      address: address || 'Main Market, Solapur Road',
      phone: ownerPhone || '9373545169',
      upi_id: upiId || ''
    };

    // 2. Update license
    fallbackStorage.license = {
      ...(fallbackStorage.license || {}),
      isValid: true,
      status: 'ACTIVE',
      storeName: storeName.trim(),
      ownerPhone: ownerPhone || '',
      plan: plan || 'annual',
      hardwareId: fallbackStorage.license?.hardwareId || 'GP-OFFLINE-001',
      daysRemaining: days || 365,
      expiresAt: new Date(Date.now() + (days || 365) * 86400000).toISOString()
    };

    // 3. Upsert store_admin user
    let owner = fallbackStorage.users.find((u) => u.role === 'store_admin');
    if (owner) {
      owner.display_name = ownerName.trim();
      owner.username = (ownerUsername || 'Divya_kale').trim();
      owner.pin_code = ownerPin.trim();
      owner.is_active = 1;
    } else {
      owner = {
        id: Date.now(),
        username: (ownerUsername || 'Divya_kale').trim(),
        display_name: ownerName.trim(),
        pin_code: ownerPin.trim(),
        role: 'store_admin',
        is_active: 1
      };
      fallbackStorage.users.push(owner);
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('gaavpharma_store_profile', JSON.stringify(fallbackStorage.storeProfile));
        localStorage.setItem('gaavpharma_license', JSON.stringify(fallbackStorage.license));
        localStorage.setItem('gaavpharma_users', JSON.stringify(fallbackStorage.users));

        // Also add to registered directory in localStorage
        const rawClients = localStorage.getItem('gaavpharma_provisioned_clients');
        let clientList = rawClients ? JSON.parse(rawClients) : [];
        const planName = plan === 'trial' ? '14-Day Trial' : (plan === 'lifetime' ? 'Lifetime' : '1-Year Pro');
        const newClient = {
          id: Date.now(),
          name: storeName.trim(),
          owner: ownerName.trim(),
          phone: ownerPhone || '',
          plan: planName,
          expires: new Date(Date.now() + (days || 365) * 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          status: 'ACTIVE'
        };
        clientList = [newClient, ...clientList.filter(c => c.name !== storeName.trim())];
        localStorage.setItem('gaavpharma_provisioned_clients', JSON.stringify(clientList));
      } catch (e) {}
    }

    return {
      success: true,
      storeProfile: fallbackStorage.storeProfile,
      licenseStatus: fallbackStorage.license,
      storeOwner: owner,
      licenseKey: 'GP-ACT-PROVISIONED-OK'
    };
  },

  // Authentication & Users (RBAC)
  loginWithPin: async (pin) => {
    if (isElectron) return window.electronAPI.loginWithPin(pin);
    const user = fallbackStorage.users.find(u => u.pin_code === pin.trim() && u.is_active);
    return user || null;
  },

  loginWithCredentials: async (username, password) => {
    if (isElectron) return window.electronAPI.loginWithCredentials(username, password);
    const u = username.toLowerCase().trim();
    const user = fallbackStorage.users.find(user => user.username.toLowerCase() === u && user.is_active);
    if (!user) return null;
    if (u === 'superadmin' && password === 'admin123') return user;
    if (user.role === 'store_admin' && (password === 'owner123' || password === 'admin123' || password === user.pin_code)) return user;
    if (user.role === 'cashier' && (password === user.pin_code || password === 'cashier123')) return user;
    return null;
  },

  getUsers: async () => {
    if (isElectron) return window.electronAPI.getUsers();
    return [...fallbackStorage.users];
  },

  addUser: async (userData) => {
    if (isElectron) return window.electronAPI.addUser(userData);
    const newUser = {
      id: Date.now(),
      ...userData,
      is_active: 1
    };
    fallbackStorage.users.push(newUser);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('gaavpharma_users', JSON.stringify(fallbackStorage.users));
      } catch (e) {}
    }
    return newUser;
  },

  updateUser: async (id, userData) => {
    if (isElectron) return window.electronAPI.updateUser(id, userData);
    const u = fallbackStorage.users.find(user => user.id === id);
    if (u) {
      Object.assign(u, userData);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('gaavpharma_users', JSON.stringify(fallbackStorage.users));
        } catch (e) {}
      }
    }
    return u;
  },

  deleteUser: async (id) => {
    if (isElectron) return window.electronAPI.deleteUser(id);
    fallbackStorage.users = fallbackStorage.users.filter(user => user.role === 'super_admin' || user.id !== id);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('gaavpharma_users', JSON.stringify(fallbackStorage.users));
      } catch (e) {}
    }
    return { success: true };
  },

  resetUsersToSuperAdminOnly: async () => {
    if (isElectron) return window.electronAPI.resetUsersToSuperAdminOnly();
    fallbackStorage.users = [
      { id: 1, username: 'superadmin', display_name: 'Om Shinde (Founder)', pin_code: '9999', role: 'super_admin', is_active: 1 }
    ];
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('gaavpharma_users', JSON.stringify(fallbackStorage.users));
      } catch (e) {}
    }
    return [...fallbackStorage.users];
  },

  // Store Profile & Feature Toggles
  getStoreProfile: async () => {
    if (isElectron) return window.electronAPI.getStoreProfile();
    return fallbackStorage.storeProfile;
  },

  updateStoreProfile: async (data) => {
    if (isElectron) return window.electronAPI.updateStoreProfile(data);
    Object.assign(fallbackStorage.storeProfile, data);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('gaavpharma_store_profile', JSON.stringify(fallbackStorage.storeProfile));
      } catch (e) {}
    }
    return fallbackStorage.storeProfile;
  },

  getFeatureToggles: async () => {
    if (isElectron) return window.electronAPI.getFeatureToggles();
    return { ...fallbackStorage.featureToggles };
  },

  updateFeatureToggle: async (key, value) => {
    if (isElectron) return window.electronAPI.updateFeatureToggle(key, value);
    fallbackStorage.featureToggles[key] = value;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('gaavpharma_feature_toggles', JSON.stringify(fallbackStorage.featureToggles));
      } catch (e) {}
    }
    return { ...fallbackStorage.featureToggles };
  },

  // Products
  searchProducts: async (query) => {
    if (isElectron) return window.electronAPI.searchProducts(query);
    const q = (query || '').toLowerCase().trim();
    if (!q) return [];
    return fallbackStorage.products
      .filter(p => p.name.toLowerCase().includes(q) || (p.generic_salt && p.generic_salt.toLowerCase().includes(q)) || (p.barcode && p.barcode.includes(q)))
      .map(p => {
        const inStockBatch = p.batches.find(b => b.stock_qty > 0) || p.batches[0] || null;
        const totalStock = p.batches.reduce((sum, b) => sum + (b.stock_qty || 0), 0);
        return {
          ...p,
          total_stock: totalStock,
          active_batch: inStockBatch
        };
      });
  },

  getProductByBarcode: async (barcode) => {
    if (isElectron) return window.electronAPI.getProductByBarcode(barcode);
    const item = fallbackStorage.products.find(p => p.barcode === barcode.trim());
    if (!item) return null;
    const inStockBatch = item.batches.find(b => b.stock_qty > 0) || item.batches[0] || null;
    const totalStock = item.batches.reduce((sum, b) => sum + (b.stock_qty || 0), 0);
    return { ...item, total_stock: totalStock, active_batch: inStockBatch };
  },

  findSaltSubstitutes: async (salt, excludeId) => {
    if (isElectron) return window.electronAPI.findSaltSubstitutes(salt, excludeId);
    if (!salt) return [];
    const q = salt.toLowerCase();
    return fallbackStorage.products.filter(p => p.id !== excludeId && p.generic_salt && p.generic_salt.toLowerCase().includes(q));
  },

  getAllProducts: async (category) => {
    if (isElectron) return window.electronAPI.getAllProducts(category);
    if (!category || category === 'all') return fallbackStorage.products;
    return fallbackStorage.products.filter(p => p.category === category);
  },

  addProduct: async (data) => {
    if (isElectron) return window.electronAPI.addProduct(data);
    const id = Date.now();
    const newProd = {
      id,
      ...data,
      total_stock: data.stock_qty || 0,
      batches: data.batch_no ? [{
        id: Date.now() + 1,
        product_id: id,
        batch_no: data.batch_no,
        expiry_date: data.expiry_date,
        purchase_rate: data.purchase_rate || 0,
        mrp: data.mrp,
        stock_qty: data.stock_qty || 0
      }] : []
    };
    fallbackStorage.products.push(newProd);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('gaavpharma_products', JSON.stringify(fallbackStorage.products));
      } catch (e) {}
    }
    return newProd;
  },

  addBatch: async (data) => {
    if (isElectron) return window.electronAPI.addBatch(data);
    const p = fallbackStorage.products.find(prod => prod.id === data.product_id);
    if (p) {
      const b = { id: Date.now(), ...data };
      p.batches.push(b);
      p.total_stock = (p.total_stock || 0) + (data.stock_qty || 0);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('gaavpharma_products', JSON.stringify(fallbackStorage.products));
        } catch (e) {}
      }
      return b;
    }
    return null;
  },

  updateBatchStock: async (batchId, newQty) => {
    if (isElectron) return window.electronAPI.updateBatchStock(batchId, newQty);
    const bId = Number(batchId);
    let updatedBatch = null;
    fallbackStorage.products.forEach(p => {
      const b = p.batches.find(batch => batch.id === bId);
      if (b) {
        b.stock_qty = parseInt(newQty, 10) || 0;
        updatedBatch = b;
      }
      p.total_stock = p.batches.reduce((sum, item) => sum + (item.stock_qty || 0), 0);
    });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('gaavpharma_products', JSON.stringify(fallbackStorage.products));
      } catch (e) {}
    }
    return updatedBatch;
  },

  // Expiry Radar
  getExpiryRadarData: async () => {
    if (isElectron) return window.electronAPI.getExpiryRadarData();
    const batches = [];
    fallbackStorage.products.forEach(p => {
      p.batches.forEach(b => {
        let status = 'safe';
        let days = 120;
        if (b.expiry_date === '10/26') {
          status = 'critical';
          days = 15;
        } else if (b.expiry_date === '11/26' || b.expiry_date === '12/26') {
          status = 'warning';
          days = 45;
        }
        batches.push({
          ...b,
          product_name: p.name,
          generic_salt: p.generic_salt,
          category: p.category,
          rack_location: p.rack_location,
          status,
          daysRemaining: days,
          potentialLoss: (b.purchase_rate || b.mrp * 0.7) * b.stock_qty
        });
      });
    });

    const critical = batches.filter(b => b.status === 'critical');
    const warning = batches.filter(b => b.status === 'warning');
    const safe = batches.filter(b => b.status === 'safe');

    const totalCriticalLoss = critical.reduce((acc, b) => acc + b.potentialLoss, 0);
    const totalWarningLoss = warning.reduce((acc, b) => acc + b.potentialLoss, 0);

    return {
      batches,
      critical,
      warning,
      safe,
      metrics: {
        criticalCount: critical.length,
        warningCount: warning.length,
        safeCount: safe.length,
        totalCriticalLoss: Number(totalCriticalLoss.toFixed(2)),
        totalWarningLoss: Number(totalWarningLoss.toFixed(2)),
        totalAtRiskLoss: Number((totalCriticalLoss + totalWarningLoss).toFixed(2))
      }
    };
  },

  // Invoices & Billing
  createInvoice: async (invoiceData, items) => {
    if (isElectron) return window.electronAPI.createInvoice(invoiceData, items);
    const invoiceNo = `INV-20261016-${String(fallbackStorage.invoices.length + 1).padStart(3, '0')}`;
    const enrichedItems = items.map(it => {
      const prod = fallbackStorage.products.find(p => p.id === it.product_id || p.id === it.id || p.name === it.product_name || p.name === it.name);
      return {
        ...it,
        is_schedule_h1: it.is_schedule_h1 !== undefined ? it.is_schedule_h1 : (prod?.is_schedule_h1 ? 1 : 0),
        gst_rate: it.gst_rate !== undefined ? it.gst_rate : (prod?.gst_rate || 12)
      };
    });
    const newInv = {
      id: Date.now(),
      invoice_no: invoiceNo,
      ...invoiceData,
      created_at: new Date().toISOString(),
      item_count: enrichedItems.length,
      items: enrichedItems
    };
    fallbackStorage.invoices.unshift(newInv);

    // Deduct stock from products & batches
    items.forEach(cartItem => {
      const p = fallbackStorage.products.find(prod => prod.id === cartItem.id || prod.name === cartItem.name);
      if (p) {
        const b = p.batches.find(batch => batch.id === cartItem.batch_id || batch.batch_no === cartItem.batch_no) || p.batches[0];
        if (b) {
          const qtyToDeduct = cartItem.is_loose_tablet ? Math.ceil(cartItem.qty / (p.strip_size || 10)) : cartItem.qty;
          b.stock_qty = Math.max(0, b.stock_qty - qtyToDeduct);
        }
        p.total_stock = p.batches.reduce((sum, item) => sum + (item.stock_qty || 0), 0);
      }
    });

    // Handle Khata debit
    if (invoiceData.payment_mode === 'khata' && invoiceData.customer_mobile) {
      const cust = fallbackStorage.customers.find(c => c.mobile === invoiceData.customer_mobile);
      if (cust) {
        cust.balance += invoiceData.final_amount;
        cust.last_activity = new Date().toISOString();
      } else {
        fallbackStorage.customers.push({
          id: Date.now(),
          name: invoiceData.customer_name || 'Khata Customer',
          mobile: invoiceData.customer_mobile,
          balance: invoiceData.final_amount,
          last_activity: new Date().toISOString()
        });
      }
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('gaavpharma_invoices', JSON.stringify(fallbackStorage.invoices));
        localStorage.setItem('gaavpharma_products', JSON.stringify(fallbackStorage.products));
        localStorage.setItem('gaavpharma_customers', JSON.stringify(fallbackStorage.customers));
      } catch (e) {}
    }

    return newInv;
  },

  getInvoices: async (limit) => {
    if (isElectron) return window.electronAPI.getInvoices(limit);
    return fallbackStorage.invoices;
  },

  getInvoiceDetails: async (invoiceId) => {
    if (isElectron) return window.electronAPI.getInvoiceDetails(invoiceId);
    const id = Number(invoiceId);
    const invoice = fallbackStorage.invoices.find(
      (i) => i.id === invoiceId || i.id === id || i.invoice_no === invoiceId
    );
    if (!invoice) return null;
    if (!invoice.items || !Array.isArray(invoice.items) || invoice.items.length === 0) {
      invoice.items = [
        {
          id: 1,
          product_name: 'Medicine Item',
          batch_no: 'DL3811',
          expiry_date: '10/26',
          qty: invoice.item_count || 1,
          unit_price: Number(invoice.final_amount) || 34.00,
          total_price: Number(invoice.final_amount) || 34.00,
          is_loose_tablet: 0
        }
      ];
    }
    return { ...invoice };
  },

  getDailyRegisterSummary: async () => {
    if (isElectron) return window.electronAPI.getDailyRegisterSummary();
    let totalSales = 0, cash = 0, upi = 0, khata = 0, card = 0;
    fallbackStorage.invoices.forEach(i => {
      totalSales += i.final_amount;
      if (i.payment_mode === 'cash') cash += i.final_amount;
      if (i.payment_mode === 'upi') upi += i.final_amount;
      if (i.payment_mode === 'khata') khata += i.final_amount;
      if (i.payment_mode === 'card') card += i.final_amount;
    });

    const totalKhata = fallbackStorage.customers.reduce((acc, c) => acc + c.balance, 0);

    return {
      today: {
        total_sales: totalSales,
        cash_total: cash,
        upi_total: upi,
        khata_total: khata,
        card_total: card,
        total_invoices: fallbackStorage.invoices.length
      },
      allTime: {
        total_sales: totalSales,
        total_invoices: fallbackStorage.invoices.length
      },
      khataPending: {
        total_khata_pending: totalKhata,
        active_khata_customers: fallbackStorage.customers.filter(c => c.balance > 0).length
      }
    };
  },

  // Khata
  getKhataCustomers: async () => {
    if (isElectron) return window.electronAPI.getKhataCustomers();
    return fallbackStorage.customers;
  },

  getKhataCustomerLedger: async (customerId) => {
    if (isElectron) return window.electronAPI.getKhataCustomerLedger(customerId);
    const id = Number(customerId);
    const customer = fallbackStorage.customers.find(c => c.id === id);
    if (!customer) return null;
    const transactions = fallbackStorage.invoices
      .filter(inv => inv.payment_mode === 'khata' && inv.customer_mobile === customer.mobile)
      .map(inv => ({
        id: inv.id,
        customer_id: customer.id,
        invoice_id: inv.id,
        invoice_no: inv.invoice_no,
        type: 'DEBIT',
        amount: inv.final_amount,
        note: 'Medicine Bill Purchase',
        created_at: inv.created_at
      }));
    return { customer, transactions };
  },

  addKhataPayment: async (customerId, amount, note) => {
    if (isElectron) return window.electronAPI.addKhataPayment(customerId, amount, note);
    const cust = fallbackStorage.customers.find(c => c.id === customerId);
    if (cust) {
      cust.balance = Math.max(0, cust.balance - parseFloat(amount));
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('gaavpharma_customers', JSON.stringify(fallbackStorage.customers));
        } catch (e) {}
      }
    }
    return cust;
  },

  addKhataCustomer: async (name, mobile) => {
    if (isElectron) return window.electronAPI.addKhataCustomer(name, mobile);
    const newCust = {
      id: Date.now(),
      name,
      mobile,
      balance: 0,
      last_activity: new Date().toISOString()
    };
    fallbackStorage.customers.push(newCust);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('gaavpharma_customers', JSON.stringify(fallbackStorage.customers));
      } catch (e) {}
    }
    return newCust;
  },

  // Distributors & Purchases (Wholesale)
  getDistributors: async () => {
    if (isElectron) return window.electronAPI.getDistributors();
    return fallbackStorage.distributors;
  },

  addDistributor: async (data) => {
    if (isElectron) return window.electronAPI.addDistributor(data);
    const newDist = {
      id: Date.now(),
      name: data.name,
      phone: data.phone || null,
      gstin: data.gstin || null,
      dl_number: data.dl_number || null,
      address: data.address || null,
      payment_terms_days: parseInt(data.payment_terms_days, 10) || 21,
      pending_balance: parseFloat(data.pending_balance) || 0
    };
    fallbackStorage.distributors.push(newDist);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('gaavpharma_distributors', JSON.stringify(fallbackStorage.distributors));
      } catch (e) {}
    }
    return newDist;
  },

  updateDistributor: async (id, data) => {
    if (isElectron) return window.electronAPI.updateDistributor(id, data);
    const dist = fallbackStorage.distributors.find(d => d.id === Number(id));
    if (dist) {
      Object.assign(dist, data);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('gaavpharma_distributors', JSON.stringify(fallbackStorage.distributors));
        } catch (e) {}
      }
    }
    return dist;
  },

  deleteDistributor: async (id) => {
    if (isElectron) return window.electronAPI.deleteDistributor(id);
    fallbackStorage.distributors = fallbackStorage.distributors.filter(d => d.id !== Number(id));
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('gaavpharma_distributors', JSON.stringify(fallbackStorage.distributors));
      } catch (e) {}
    }
    return { success: true };
  },

  getPurchases: async (limit = 50) => {
    if (isElectron) return window.electronAPI.getPurchases(limit);
    return fallbackStorage.purchases.slice(0, limit).map(p => ({ ...p, bill_no: p.purchase_invoice_no }));
  },

  getPurchaseDetails: async (purchaseId) => {
    if (isElectron) return window.electronAPI.getPurchaseDetails(purchaseId);
    const id = Number(purchaseId);
    const p = fallbackStorage.purchases.find(item => item.id === id);
    if (!p) return null;
    return { ...p, bill_no: p.purchase_invoice_no };
  },

  createPurchase: async (purchaseData, items) => {
    if (isElectron) return window.electronAPI.createPurchase(purchaseData, items);
    const purchaseId = Date.now();
    const dist = fallbackStorage.distributors.find(d => d.id === Number(purchaseData.distributor_id));

    const invoiceNo = purchaseData.purchase_invoice_no || purchaseData.bill_no || (`BILL-${Date.now()}`);
    const invoiceDate = purchaseData.invoice_date || purchaseData.bill_date || new Date().toISOString().slice(0, 10);
    const subtotal = parseFloat(purchaseData.subtotal) || 0;
    const taxAmount = purchaseData.tax_amount != null ? parseFloat(purchaseData.tax_amount) : (parseFloat(purchaseData.total_gst) || 0);
    const discount = purchaseData.discount != null ? parseFloat(purchaseData.discount) : (parseFloat(purchaseData.total_discount) || 0);
    const netAmount = purchaseData.net_amount != null ? parseFloat(purchaseData.net_amount) : (subtotal + taxAmount - discount);
    const paidAmount = parseFloat(purchaseData.paid_amount) || 0;

    // Process items and inward to inventory
    const processedItems = items.map((item, idx) => {
      const totalUnits = (parseInt(item.qty, 10) || 0) + (parseInt(item.free_qty, 10) || 0);
      const totalAmount = item.total_amount != null ? parseFloat(item.total_amount) : 0;
      const landingCost = totalUnits > 0 ? totalAmount / totalUnits : (parseFloat(item.purchase_rate) || 0);
      const gstRate = item.gst_rate != null ? parseFloat(item.gst_rate) : (parseFloat(item.gst_pct) || 12);
      const discountPercent = item.discount_percent != null ? parseFloat(item.discount_percent) : (parseFloat(item.discount_pct) || 0);

      // Inward to products & batches
      const prod = fallbackStorage.products.find(p => p.id === Number(item.product_id));
      if (prod) {
        const existingBatch = prod.batches.find(b => b.batch_no === item.batch_no);
        if (existingBatch) {
          existingBatch.stock_qty = (existingBatch.stock_qty || 0) + totalUnits;
          existingBatch.purchase_rate = parseFloat(item.purchase_rate);
          existingBatch.mrp = parseFloat(item.mrp);
          existingBatch.expiry_date = item.expiry_date;
        } else {
          prod.batches.push({
            id: Date.now() + idx + 1,
            product_id: prod.id,
            batch_no: item.batch_no,
            expiry_date: item.expiry_date,
            purchase_rate: parseFloat(item.purchase_rate),
            mrp: parseFloat(item.mrp),
            stock_qty: totalUnits
          });
        }
        prod.total_stock = prod.batches.reduce((sum, b) => sum + (b.stock_qty || 0), 0);
      }

      return {
        id: Date.now() + idx + 10,
        purchase_id: purchaseId,
        product_id: item.product_id,
        product_name: item.product_name,
        generic_salt: item.generic_salt,
        batch_no: item.batch_no,
        expiry_date: item.expiry_date,
        qty: parseInt(item.qty, 10) || 0,
        free_qty: parseInt(item.free_qty, 10) || 0,
        purchase_rate: parseFloat(item.purchase_rate) || 0,
        mrp: parseFloat(item.mrp) || 0,
        gst_rate: gstRate,
        discount_percent: discountPercent,
        landing_cost_per_unit: Number(landingCost.toFixed(2)),
        total_amount: totalAmount
      };
    });

    const newPurchase = {
      id: purchaseId,
      purchase_invoice_no: invoiceNo,
      bill_no: invoiceNo,
      distributor_id: Number(purchaseData.distributor_id),
      distributor_name: dist ? dist.name : 'Distributor',
      distributor_phone: dist ? dist.phone : '',
      distributor_gstin: dist ? dist.gstin : '',
      invoice_date: invoiceDate,
      payment_status: purchaseData.payment_status || 'UNPAID',
      payment_mode: purchaseData.payment_mode || 'credit',
      subtotal: subtotal,
      tax_amount: taxAmount,
      discount: discount,
      net_amount: netAmount,
      paid_amount: paidAmount,
      due_date: purchaseData.due_date || null,
      notes: purchaseData.notes || '',
      item_count: items.length,
      items: processedItems,
      created_at: new Date().toISOString()
    };

    fallbackStorage.purchases.unshift(newPurchase);

    // Ledger Entry for Purchase Bill
    const ledgerEntry = {
      id: Date.now() + 100,
      distributor_id: Number(purchaseData.distributor_id),
      type: 'PURCHASE_BILL',
      amount: newPurchase.net_amount,
      reference_no: invoiceNo,
      payment_mode: newPurchase.payment_mode,
      notes: `Inward Purchase Bill #${invoiceNo}`,
      created_at: new Date().toISOString()
    };
    fallbackStorage.distributorLedger.unshift(ledgerEntry);

    // Update distributor pending debt
    if (dist) {
      const unpaidAmount = Math.max(0, newPurchase.net_amount - newPurchase.paid_amount);
      dist.pending_balance = (dist.pending_balance || 0) + unpaidAmount;
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('gaavpharma_purchases', JSON.stringify(fallbackStorage.purchases));
        localStorage.setItem('gaavpharma_products', JSON.stringify(fallbackStorage.products));
        localStorage.setItem('gaavpharma_distributors', JSON.stringify(fallbackStorage.distributors));
        localStorage.setItem('gaavpharma_distributor_ledger', JSON.stringify(fallbackStorage.distributorLedger));
      } catch (e) {}
    }

    return newPurchase;
  },

  getDistributorLedger: async (distributorId) => {
    if (isElectron) return window.electronAPI.getDistributorLedger(distributorId);
    const id = Number(distributorId);
    const distributor = fallbackStorage.distributors.find(d => d.id === id);
    if (!distributor) return null;

    const entries = fallbackStorage.distributorLedger.filter(e => e.distributor_id === id);
    const purchases = fallbackStorage.purchases.filter(p => p.distributor_id === id);

    return { distributor, entries, purchases, transactions: entries };
  },

  addDistributorPayment: async (distributorId, amount, paymentMode = 'NEFT_UPI', referenceNo = '', note = '') => {
    if (isElectron) return window.electronAPI.addDistributorPayment(distributorId, amount, paymentMode, referenceNo, note);
    const id = Number(distributorId);
    const dist = fallbackStorage.distributors.find(d => d.id === id);
    const numAmount = parseFloat(amount) || 0;

    if (dist) {
      dist.pending_balance = Math.max(0, (dist.pending_balance || 0) - numAmount);
    }

    const ledgerEntry = {
      id: Date.now(),
      distributor_id: id,
      type: 'PAYMENT',
      amount: numAmount,
      reference_no: referenceNo,
      payment_mode: paymentMode,
      notes: note || 'Payment Settled',
      created_at: new Date().toISOString()
    };
    fallbackStorage.distributorLedger.unshift(ledgerEntry);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('gaavpharma_distributors', JSON.stringify(fallbackStorage.distributors));
        localStorage.setItem('gaavpharma_distributor_ledger', JSON.stringify(fallbackStorage.distributorLedger));
      } catch (e) {}
    }

    return { success: true, distributor: dist };
  },

  getPurchaseSummary: async () => {
    if (isElectron) return window.electronAPI.getPurchaseSummary();
    const totalSpent = fallbackStorage.purchases.reduce((acc, p) => acc + (p.net_amount || 0), 0);
    const totalPayable = fallbackStorage.distributors.reduce((acc, d) => acc + (d.pending_balance || 0), 0);

    return {
      total_bills: fallbackStorage.purchases.length,
      total_spent: totalSpent,
      total_purchases_month: totalSpent,
      total_payable: totalPayable,
      total_payable_balance: totalPayable,
      distributor_count: fallbackStorage.distributors.length
    };
  },

  getDebitNotes: async (limit = 50) => {
    if (isElectron) return window.electronAPI.getDebitNotes(limit);
    return fallbackStorage.debitNotes.slice(0, limit);
  },

  getDebitNoteDetails: async (noteId) => {
    if (isElectron) return window.electronAPI.getDebitNoteDetails(noteId);
    const id = Number(noteId);
    const note = fallbackStorage.debitNotes.find(n => n.id === id);
    if (!note) return null;
    return { ...note };
  },

  createDebitNote: async (noteData, items) => {
    if (isElectron) return window.electronAPI.createDebitNote(noteData, items);
    const noteId = Date.now();
    const dist = fallbackStorage.distributors.find(d => d.id === Number(noteData.distributor_id));
    const noteNo = noteData.note_no || (`DN-${new Date().toISOString().slice(0, 7).replace('-', '')}-${String(Date.now()).slice(-4)}`);
    const noteDate = noteData.note_date || new Date().toISOString().slice(0, 10);
    const subtotal = parseFloat(noteData.subtotal) || 0;
    const taxAmount = noteData.tax_amount != null ? parseFloat(noteData.tax_amount) : (parseFloat(noteData.total_tax) || 0);
    const totalClaimAmount = noteData.total_claim_amount != null ? parseFloat(noteData.total_claim_amount) : (subtotal + taxAmount);

    const processedItems = items.map((item, idx) => {
      const qty = parseInt(item.qty, 10) || 0;
      const rate = parseFloat(item.purchase_rate) || 0;
      const gstRate = item.gst_rate != null ? parseFloat(item.gst_rate) : (parseFloat(item.gst_pct) || 12);
      const taxable = item.taxable_amount != null ? parseFloat(item.taxable_amount) : (qty * rate);
      const cgst = item.cgst_amount != null ? parseFloat(item.cgst_amount) : ((taxable * (gstRate / 2)) / 100);
      const sgst = item.sgst_amount != null ? parseFloat(item.sgst_amount) : ((taxable * (gstRate / 2)) / 100);
      const totalAmount = item.total_amount != null ? parseFloat(item.total_amount) : (taxable + cgst + sgst);

      // Deduct stock from batches
      const prod = fallbackStorage.products.find(p => p.id === Number(item.product_id));
      if (prod) {
        const batch = prod.batches.find(b => b.batch_no === item.batch_no);
        if (batch) {
          batch.stock_qty = Math.max(0, (batch.stock_qty || 0) - qty);
        }
        prod.total_stock = prod.batches.reduce((sum, b) => sum + (b.stock_qty || 0), 0);
      }

      return {
        id: Date.now() + idx + 10,
        debit_note_id: noteId,
        product_id: item.product_id,
        product_name: item.product_name,
        generic_salt: item.generic_salt,
        batch_no: item.batch_no,
        expiry_date: item.expiry_date,
        qty: qty,
        purchase_rate: rate,
        gst_rate: gstRate,
        taxable_amount: taxable,
        cgst_amount: cgst,
        sgst_amount: sgst,
        total_amount: totalAmount
      };
    });

    const newNote = {
      id: noteId,
      note_no: noteNo,
      distributor_id: Number(noteData.distributor_id),
      distributor_name: dist ? dist.name : 'Distributor',
      distributor_phone: dist ? dist.phone : '',
      distributor_gstin: dist ? dist.gstin : '',
      distributor_dl: dist ? dist.dl_number : '',
      distributor_address: dist ? dist.address : '',
      note_date: noteDate,
      subtotal: subtotal,
      tax_amount: taxAmount,
      total_claim_amount: totalClaimAmount,
      status: noteData.status || 'ISSUED',
      reason: noteData.reason || 'EXPIRY_RETURN',
      notes: noteData.notes || '',
      item_count: items.length,
      items: processedItems,
      created_at: new Date().toISOString()
    };

    fallbackStorage.debitNotes.unshift(newNote);

    // Ledger Entry for Debit Note
    const ledgerEntry = {
      id: Date.now() + 100,
      distributor_id: Number(noteData.distributor_id),
      type: 'DEBIT_NOTE_RETURN',
      amount: totalClaimAmount,
      reference_no: noteNo,
      payment_mode: 'ADJUSTMENT',
      notes: `GST Expiry Return Claim #${noteNo} (${items.length} items)`,
      created_at: new Date().toISOString()
    };
    fallbackStorage.distributorLedger.unshift(ledgerEntry);

    // Deduct from distributor pending balance (आपले देणे कमी करा)
    if (dist) {
      dist.pending_balance = Math.max(0, (dist.pending_balance || 0) - totalClaimAmount);
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('gaavpharma_debit_notes', JSON.stringify(fallbackStorage.debitNotes));
        localStorage.setItem('gaavpharma_products', JSON.stringify(fallbackStorage.products));
        localStorage.setItem('gaavpharma_distributors', JSON.stringify(fallbackStorage.distributors));
        localStorage.setItem('gaavpharma_distributor_ledger', JSON.stringify(fallbackStorage.distributorLedger));
      } catch (e) {}
    }

    return newNote;
  },

  // Compliance & Statutory Registers (FDA & GST)
  getScheduleH1Register: async (filters = {}) => {
    if (isElectron) return window.electronAPI.getScheduleH1Register(filters);

    let rows = [];
    fallbackStorage.invoices.forEach(inv => {
      const invDate = (inv.created_at || '').slice(0, 10);
      if (filters.startDate && invDate < filters.startDate) return;
      if (filters.endDate && invDate > filters.endDate) return;

      (inv.items || []).forEach(it => {
        const prod = fallbackStorage.products.find(p => p.id === it.product_id || p.id === it.id || p.name === it.product_name || p.name === it.name);
        const isH1 = it.is_schedule_h1 === 1 || it.is_schedule_h1 === true || (prod && (prod.is_schedule_h1 === 1 || prod.is_schedule_h1 === true));
        if (!isH1) return;

        const row = {
          item_id: it.id || Math.random(),
          invoice_id: inv.id,
          invoice_no: inv.invoice_no,
          dispensed_at: inv.created_at,
          patient_name: inv.customer_name || 'Cash Customer',
          patient_mobile: inv.customer_mobile || '-',
          patient_address: inv.customer_address || 'Ghoti',
          doctor_name: inv.doctor_name || 'Prescribing Physician',
          doctor_reg_no: inv.doctor_reg_no || 'MMC-REG-PENDING',
          product_id: it.product_id || it.id,
          medicine_name: it.product_name || it.name || (prod ? prod.name : 'Medicine'),
          generic_salt: it.generic_salt || (prod ? prod.generic_salt : '-'),
          strip_size: it.strip_size || (prod ? prod.strip_size : 10),
          batch_no: it.batch_no || 'NA',
          expiry_date: it.expiry_date || 'NA',
          is_loose_tablet: it.is_loose_tablet ? 1 : 0,
          qty: it.qty,
          unit_price: it.unit_price,
          total_price: it.total_price
        };

        if (filters.search && filters.search.trim()) {
          const s = filters.search.trim().toLowerCase();
          const match = (row.medicine_name || '').toLowerCase().includes(s) ||
                        (row.generic_salt || '').toLowerCase().includes(s) ||
                        (row.doctor_name || '').toLowerCase().includes(s) ||
                        (row.doctor_reg_no || '').toLowerCase().includes(s) ||
                        (row.patient_name || '').toLowerCase().includes(s) ||
                        (row.patient_address || '').toLowerCase().includes(s) ||
                        (row.batch_no || '').toLowerCase().includes(s) ||
                        (row.invoice_no || '').toLowerCase().includes(s);
          if (!match) return;
        }

        rows.push(row);
      });
    });

    rows.sort((a, b) => new Date(b.dispensed_at) - new Date(a.dispensed_at));
    return rows;
  },

  getGstTaxSummary: async (period = {}) => {
    if (isElectron) return window.electronAPI.getGstTaxSummary(period);

    const now = new Date();
    const year = period.year ? parseInt(period.year) : now.getFullYear();
    const month = period.month ? parseInt(period.month) : (now.getMonth() + 1);

    let startDate = period.startDate;
    let endDate = period.endDate;
    if (!startDate || !endDate) {
      const padMonth = String(month).padStart(2, '0');
      startDate = `${year}-${padMonth}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      endDate = `${year}-${padMonth}-${String(lastDay).padStart(2, '0')}`;
    }

    // 1. Outward Supplies (Sales)
    const outwardSlabs = {
      0: { slab: 0, taxable: 0, cgst: 0, sgst: 0, total_tax: 0, gross: 0 },
      5: { slab: 5, taxable: 0, cgst: 0, sgst: 0, total_tax: 0, gross: 0 },
      12: { slab: 12, taxable: 0, cgst: 0, sgst: 0, total_tax: 0, gross: 0 },
      18: { slab: 18, taxable: 0, cgst: 0, sgst: 0, total_tax: 0, gross: 0 }
    };

    let totalOutwardGross = 0;
    let totalOutwardTaxable = 0;
    let totalOutputCgst = 0;
    let totalOutputSgst = 0;
    let filteredInvoicesCount = 0;

    fallbackStorage.invoices.forEach(inv => {
      const invDate = (inv.created_at || '').slice(0, 10);
      if (invDate < startDate || invDate > endDate) return;
      filteredInvoicesCount++;

      (inv.items || []).forEach(it => {
        const rate = Number(it.gst_rate) || 12;
        if (!outwardSlabs[rate]) {
          outwardSlabs[rate] = { slab: rate, taxable: 0, cgst: 0, sgst: 0, total_tax: 0, gross: 0 };
        }
        const gross = Number(it.total_price) || 0;
        const taxable = rate === 0 ? gross : gross / (1 + (rate / 100));
        const tax = gross - taxable;
        const halfTax = tax / 2;

        outwardSlabs[rate].gross += gross;
        outwardSlabs[rate].taxable += taxable;
        outwardSlabs[rate].cgst += halfTax;
        outwardSlabs[rate].sgst += halfTax;
        outwardSlabs[rate].total_tax += tax;

        totalOutwardGross += gross;
        totalOutwardTaxable += taxable;
        totalOutputCgst += halfTax;
        totalOutputSgst += halfTax;
      });
    });

    // 2. Inward Supplies (Purchases / ITC)
    const inwardSlabs = {
      0: { slab: 0, taxable: 0, cgst: 0, sgst: 0, total_tax: 0, gross: 0 },
      5: { slab: 5, taxable: 0, cgst: 0, sgst: 0, total_tax: 0, gross: 0 },
      12: { slab: 12, taxable: 0, cgst: 0, sgst: 0, total_tax: 0, gross: 0 },
      18: { slab: 18, taxable: 0, cgst: 0, sgst: 0, total_tax: 0, gross: 0 }
    };

    let totalInwardGross = 0;
    let totalInwardTaxable = 0;
    let totalInwardCgstItc = 0;
    let totalInwardSgstItc = 0;
    let inwardItemsCount = 0;

    fallbackStorage.purchases.forEach(p => {
      const pDate = (p.invoice_date || '').slice(0, 10);
      if (pDate < startDate || pDate > endDate) return;

      (p.items || []).forEach(it => {
        inwardItemsCount++;
        const rate = Number(it.gst_rate) || 12;
        if (!inwardSlabs[rate]) {
          inwardSlabs[rate] = { slab: rate, taxable: 0, cgst: 0, sgst: 0, total_tax: 0, gross: 0 };
        }
        const disc = Number(it.discount_percent) || 0;
        const base = (Number(it.purchase_rate) || 0) * (Number(it.qty) || 0);
        const taxable = base * (1 - disc / 100);
        const tax = taxable * (rate / 100);
        const halfTax = tax / 2;
        const gross = taxable + tax;

        inwardSlabs[rate].gross += gross;
        inwardSlabs[rate].taxable += taxable;
        inwardSlabs[rate].cgst += halfTax;
        inwardSlabs[rate].sgst += halfTax;
        inwardSlabs[rate].total_tax += tax;

        totalInwardGross += gross;
        totalInwardTaxable += taxable;
        totalInwardCgstItc += halfTax;
        totalInwardSgstItc += halfTax;
      });
    });

    // 3. ITC Reversals (Debit Notes)
    const reversalSlabs = {
      0: { slab: 0, taxable: 0, cgst: 0, sgst: 0, total_tax: 0, gross: 0 },
      5: { slab: 5, taxable: 0, cgst: 0, sgst: 0, total_tax: 0, gross: 0 },
      12: { slab: 12, taxable: 0, cgst: 0, sgst: 0, total_tax: 0, gross: 0 },
      18: { slab: 18, taxable: 0, cgst: 0, sgst: 0, total_tax: 0, gross: 0 }
    };

    let totalReversedTaxable = 0;
    let totalReversedCgst = 0;
    let totalReversedSgst = 0;
    let totalReversedGross = 0;
    let debitItemsCount = 0;

    fallbackStorage.debitNotes.forEach(dn => {
      const dnDate = (dn.note_date || '').slice(0, 10);
      if (dnDate < startDate || dnDate > endDate) return;

      (dn.items || []).forEach(it => {
        debitItemsCount++;
        const rate = Number(it.gst_rate) || 12;
        if (!reversalSlabs[rate]) {
          reversalSlabs[rate] = { slab: rate, taxable: 0, cgst: 0, sgst: 0, total_tax: 0, gross: 0 };
        }
        const taxable = Number(it.taxable_value) || 0;
        const cgst = Number(it.cgst_amount) || 0;
        const sgst = Number(it.sgst_amount) || 0;
        const totalTax = cgst + sgst;
        const gross = Number(it.total_claim) || (taxable + totalTax);

        reversalSlabs[rate].gross += gross;
        reversalSlabs[rate].taxable += taxable;
        reversalSlabs[rate].cgst += cgst;
        reversalSlabs[rate].sgst += sgst;
        reversalSlabs[rate].total_tax += totalTax;

        totalReversedGross += gross;
        totalReversedTaxable += taxable;
        totalReversedCgst += cgst;
        totalReversedSgst += sgst;
      });
    });

    // 4. Net Reconciliation
    const totalEligibleItc = totalInwardCgstItc + totalInwardSgstItc;
    const totalReversedItc = totalReversedCgst + totalReversedSgst;
    const netCgstItc = Math.max(0, totalInwardCgstItc - totalReversedCgst);
    const netSgstItc = Math.max(0, totalInwardSgstItc - totalReversedSgst);
    const netEligibleItc = netCgstItc + netSgstItc;

    const totalOutputTax = totalOutputCgst + totalOutputSgst;
    const netCgstPayable = Math.max(0, totalOutputCgst - netCgstItc);
    const netSgstPayable = Math.max(0, totalOutputSgst - netSgstItc);
    const netGstPayable = netCgstPayable + netSgstPayable;

    const itcCreditCarriedForward = Math.max(0, netEligibleItc - totalOutputTax);

    // 5. "40 GST" - Aggregate Turnover Threshold Tracker (Sec 22 CGST Act)
    const curDate = new Date(startDate);
    const curMonth = curDate.getMonth();
    const curYear = curDate.getFullYear();
    const fyStartYear = curMonth >= 3 ? curYear : curYear - 1;
    const fyEndYear = fyStartYear + 1;
    const fyStartDate = `${fyStartYear}-04-01`;
    const fyEndDate = `${fyEndYear}-03-31`;

    let fyTotalTurnover = 0;
    let fyInvoiceCount = 0;
    fallbackStorage.invoices.forEach(inv => {
      const invDate = (inv.created_at || '').slice(0, 10);
      if (invDate >= fyStartDate && invDate <= fyEndDate) {
        fyTotalTurnover += (Number(inv.final_amount) || 0);
        fyInvoiceCount++;
      }
    });

    const turnoverLimit = 4000000; // ₹40 Lakhs
    const turnoverPercentage = Math.min(100, (fyTotalTurnover / turnoverLimit) * 100);
    const remainingAllowance = Math.max(0, turnoverLimit - fyTotalTurnover);

    let turnoverStatus = 'SAFE';
    if (fyTotalTurnover >= turnoverLimit) {
      turnoverStatus = 'EXCEEDED';
    } else if (fyTotalTurnover >= 3000000) {
      turnoverStatus = 'WARNING';
    }

    const roundedOutwardCgst = Number(totalOutputCgst.toFixed(2));
    const roundedOutwardSgst = Number(totalOutputSgst.toFixed(2));
    const roundedOutwardTotalTax = Number((roundedOutwardCgst + roundedOutwardSgst).toFixed(2));

    const roundedInwardCgst = Number(totalInwardCgstItc.toFixed(2));
    const roundedInwardSgst = Number(totalInwardSgstItc.toFixed(2));
    const roundedInwardTotalItc = Number((roundedInwardCgst + roundedInwardSgst).toFixed(2));

    const roundedRevCgst = Number(totalReversedCgst.toFixed(2));
    const roundedRevSgst = Number(totalReversedSgst.toFixed(2));
    const roundedRevTotal = Number((roundedRevCgst + roundedRevSgst).toFixed(2));

    const roundedNetCgstItc = Math.max(0, Number((roundedInwardCgst - roundedRevCgst).toFixed(2)));
    const roundedNetSgstItc = Math.max(0, Number((roundedInwardSgst - roundedRevSgst).toFixed(2)));
    const roundedNetEligibleItc = Number((roundedNetCgstItc + roundedNetSgstItc).toFixed(2));

    const roundedNetCgstPayable = Math.max(0, Number((roundedOutwardCgst - roundedNetCgstItc).toFixed(2)));
    const roundedNetSgstPayable = Math.max(0, Number((roundedOutwardSgst - roundedNetSgstItc).toFixed(2)));
    const roundedNetGstPayable = Number((roundedNetCgstPayable + roundedNetSgstPayable).toFixed(2));

    const roundedItcCreditCarriedForward = Math.max(0, Number((roundedNetEligibleItc - roundedOutwardTotalTax).toFixed(2)));

    return {
      period: {
        startDate,
        endDate,
        year,
        month,
        fyLabel: `FY ${fyStartYear}-${String(fyEndYear).slice(2)}`
      },
      outward: {
        grossSales: Number(totalOutwardGross.toFixed(2)),
        taxableValue: Number(totalOutwardTaxable.toFixed(2)),
        cgst: roundedOutwardCgst,
        sgst: roundedOutwardSgst,
        totalTax: roundedOutwardTotalTax,
        slabs: outwardSlabs,
        invoiceCount: filteredInvoicesCount
      },
      inward: {
        grossPurchases: Number(totalInwardGross.toFixed(2)),
        taxableValue: Number(totalInwardTaxable.toFixed(2)),
        cgstItc: roundedInwardCgst,
        sgstItc: roundedInwardSgst,
        totalItc: roundedInwardTotalItc,
        slabs: inwardSlabs,
        itemCount: inwardItemsCount
      },
      itcReversals: {
        grossClaim: Number(totalReversedGross.toFixed(2)),
        taxableValue: Number(totalReversedTaxable.toFixed(2)),
        reversedCgst: roundedRevCgst,
        reversedSgst: roundedRevSgst,
        totalReversedItc: roundedRevTotal,
        slabs: reversalSlabs,
        itemCount: debitItemsCount
      },
      netPosition: {
        totalOutputTax: roundedOutwardTotalTax,
        totalEligibleItc: roundedInwardTotalItc,
        totalReversedItc: roundedRevTotal,
        netEligibleItc: roundedNetEligibleItc,
        netCgstPayable: roundedNetCgstPayable,
        netSgstPayable: roundedNetSgstPayable,
        netGstPayable: roundedNetGstPayable,
        itcCreditCarriedForward: roundedItcCreditCarriedForward
      },
      turnoverTracker: {
        limit: turnoverLimit,
        annualTurnover: Number(fyTotalTurnover.toFixed(2)),
        remainingAllowance: Number(remainingAllowance.toFixed(2)),
        turnoverPercentage: Number(turnoverPercentage.toFixed(2)),
        status: turnoverStatus,
        fyLabel: `FY ${fyStartYear}-${String(fyEndYear).slice(2)}`,
        fyStartDate,
        fyEndDate,
        invoiceCount: fyInvoiceCount
      }
    };
  },

  // Shortage Diary & WhatsApp Purchase Orders ("तोटा नोंदवही")
  syncAutoShortages: async () => {
    if (isElectron) return window.electronAPI.syncAutoShortages();
    let syncedCount = 0;
    fallbackStorage.products.forEach(prod => {
      const minStock = prod.min_stock_alert !== undefined ? prod.min_stock_alert : 10;
      const totalStock = prod.total_stock !== undefined ? prod.total_stock : (
        prod.batches ? prod.batches.reduce((sum, b) => sum + (b.stock_qty || 0), 0) : 0
      );

      if (totalStock <= minStock) {
        const existing = fallbackStorage.shortageDiary.find(
          s => s.product_id === prod.id && (s.status === 'PENDING' || s.status === 'ORDERED')
        );

        if (existing) {
          existing.current_stock = totalStock;
          existing.min_stock_alert = minStock;
        } else {
          // Find last distributor from purchases
          let lastDist = null;
          for (const p of fallbackStorage.purchases) {
            if (p.items && p.items.some(it => it.product_id === prod.id)) {
              const d = fallbackStorage.distributors.find(dist => dist.id === p.distributor_id);
              if (d) {
                lastDist = d;
                break;
              }
            }
          }
          const suggested = Math.max(10, minStock * 2);
          const newItem = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            product_id: prod.id,
            medicine_name: prod.name,
            generic_salt: prod.generic_salt || '',
            current_stock: totalStock,
            min_stock_alert: minStock,
            suggested_qty: suggested,
            distributor_id: lastDist ? lastDist.id : null,
            distributor_name: lastDist ? lastDist.name : null,
            status: 'PENDING',
            source: 'AUTO_STOCK_ALERT',
            notes: `Auto-detected low stock (${totalStock} <= ${minStock})`,
            created_at: new Date().toISOString()
          };
          fallbackStorage.shortageDiary.unshift(newItem);
          syncedCount++;
        }
      }
    });

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('gaavpharma_shortage_diary', JSON.stringify(fallbackStorage.shortageDiary));
      } catch (e) {}
    }
    return { success: true, syncedCount };
  },

  getShortageDiary: async (filters = {}) => {
    if (isElectron) return window.electronAPI.getShortageDiary(filters);
    const { status, distributor_id, search } = filters;
    let list = [...fallbackStorage.shortageDiary];

    if (status && status !== 'ALL') {
      list = list.filter(item => item.status === status);
    }
    if (distributor_id && distributor_id !== 'all') {
      if (distributor_id === 'unassigned') {
        list = list.filter(item => !item.distributor_id);
      } else {
        list = list.filter(item => Number(item.distributor_id) === Number(distributor_id));
      }
    }
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(item =>
        item.medicine_name?.toLowerCase().includes(q) ||
        item.generic_salt?.toLowerCase().includes(q) ||
        item.notes?.toLowerCase().includes(q) ||
        item.distributor_name?.toLowerCase().includes(q)
      );
    }

    const populated = list.map(item => {
      const d = fallbackStorage.distributors.find(dist => dist.id === Number(item.distributor_id));
      return {
        ...item,
        dist_name: item.distributor_name || (d ? d.name : null),
        distributor_phone: d ? d.phone : '',
        distributor_dl: d ? d.dl_number : ''
      };
    });

    populated.sort((a, b) => {
      const orderA = a.status === 'PENDING' ? 1 : a.status === 'ORDERED' ? 2 : 3;
      const orderB = b.status === 'PENDING' ? 1 : b.status === 'ORDERED' ? 2 : 3;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    return populated;
  },

  addShortageItem: async (itemData) => {
    if (isElectron) return window.electronAPI.addShortageItem(itemData);
    if (!itemData.medicine_name || !itemData.medicine_name.trim()) {
      throw new Error('Medicine name is required for shortage entry');
    }
    const distId = itemData.distributor_id ? Number(itemData.distributor_id) : null;
    let distName = itemData.distributor_name || null;
    let distPhone = '';
    let distDl = '';
    if (distId) {
      const d = fallbackStorage.distributors.find(dist => dist.id === distId);
      if (d) {
        distName = d.name;
        distPhone = d.phone;
        distDl = d.dl_number;
      }
    }

    const newItem = {
      id: Date.now(),
      product_id: itemData.product_id ? Number(itemData.product_id) : null,
      medicine_name: itemData.medicine_name.trim(),
      generic_salt: itemData.generic_salt || '',
      current_stock: parseInt(itemData.current_stock, 10) || 0,
      min_stock_alert: parseInt(itemData.min_stock_alert, 10) || 10,
      suggested_qty: parseInt(itemData.suggested_qty, 10) || 10,
      distributor_id: distId,
      distributor_name: distName,
      status: 'PENDING',
      source: itemData.source || 'COUNTER_MANUAL',
      notes: itemData.notes || '',
      created_at: new Date().toISOString(),
      dist_name: distName,
      distributor_phone: distPhone,
      distributor_dl: distDl
    };

    fallbackStorage.shortageDiary.unshift(newItem);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('gaavpharma_shortage_diary', JSON.stringify(fallbackStorage.shortageDiary));
      } catch (e) {}
    }
    return newItem;
  },

  updateShortageItem: async (id, updateData) => {
    if (isElectron) return window.electronAPI.updateShortageItem(id, updateData);
    const item = fallbackStorage.shortageDiary.find(s => s.id === Number(id));
    if (!item) throw new Error(`Shortage item #${id} not found`);

    if (updateData.suggested_qty !== undefined) {
      item.suggested_qty = parseInt(updateData.suggested_qty, 10) || 10;
    }
    if (updateData.distributor_id !== undefined) {
      const distId = updateData.distributor_id ? Number(updateData.distributor_id) : null;
      item.distributor_id = distId;
      if (distId) {
        const d = fallbackStorage.distributors.find(dist => dist.id === distId);
        item.distributor_name = d ? d.name : (updateData.distributor_name || null);
      } else {
        item.distributor_name = null;
      }
    }
    if (updateData.notes !== undefined) {
      item.notes = updateData.notes;
    }
    if (updateData.status !== undefined) {
      item.status = updateData.status;
      if (updateData.status === 'ORDERED' && !item.ordered_at) {
        item.ordered_at = new Date().toISOString();
      }
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('gaavpharma_shortage_diary', JSON.stringify(fallbackStorage.shortageDiary));
      } catch (e) {}
    }
    return item;
  },

  markShortageAsOrdered: async (ids, distributorId) => {
    if (isElectron) return window.electronAPI.markShortageAsOrdered(ids, distributorId);
    if (!Array.isArray(ids)) ids = [ids];
    let dist = null;
    if (distributorId) {
      dist = fallbackStorage.distributors.find(d => d.id === Number(distributorId));
    }
    const numIds = ids.map(Number);
    let count = 0;
    fallbackStorage.shortageDiary.forEach(item => {
      if (numIds.includes(item.id)) {
        item.status = 'ORDERED';
        item.ordered_at = new Date().toISOString();
        if (distributorId) {
          item.distributor_id = Number(distributorId);
          item.distributor_name = dist ? dist.name : item.distributor_name;
        }
        count++;
      }
    });

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('gaavpharma_shortage_diary', JSON.stringify(fallbackStorage.shortageDiary));
      } catch (e) {}
    }
    return { success: true, count };
  },

  deleteShortageItem: async (id) => {
    if (isElectron) return window.electronAPI.deleteShortageItem(id);
    fallbackStorage.shortageDiary = fallbackStorage.shortageDiary.filter(s => s.id !== Number(id));
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('gaavpharma_shortage_diary', JSON.stringify(fallbackStorage.shortageDiary));
      } catch (e) {}
    }
    return { success: true };
  },

  generateWhatsAppPOText: ({ storeProfile, distributor, items }) => {
    return generateWhatsAppPOText({ storeProfile, distributor, items });
  },

  // Clear All Records / Reset Ledger
  clearAllRecords: async () => {
    if (isElectron) return window.electronAPI.clearAllRecords();
    fallbackStorage.invoices = [];
    fallbackStorage.customers = [];
    fallbackStorage.purchases = [];
    fallbackStorage.debitNotes = [];
    fallbackStorage.distributorLedger = [];
    fallbackStorage.shortageDiary = [];
    fallbackStorage.distributors.forEach(d => { d.pending_balance = 0; });

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('gaavpharma_invoices', JSON.stringify([]));
        localStorage.setItem('gaavpharma_customers', JSON.stringify([]));
        localStorage.setItem('gaavpharma_purchases', JSON.stringify([]));
        localStorage.setItem('gaavpharma_debit_notes', JSON.stringify([]));
        localStorage.setItem('gaavpharma_distributor_ledger', JSON.stringify([]));
        localStorage.setItem('gaavpharma_shortage_diary', JSON.stringify([]));
        localStorage.setItem('gaavpharma_distributors', JSON.stringify(fallbackStorage.distributors));
      } catch (e) {}
    }
    return { success: true };
  },

  // System
  openExternalUrl: (url) => {
    if (isElectron) return window.electronAPI.openExternalUrl(url);
    window.open(url, '_blank');
    return Promise.resolve(true);
  },

  printReceipt: () => {
    if (isElectron) return window.electronAPI.printReceipt();
    window.print();
    return Promise.resolve(true);
  }
};

export function generateWhatsAppPOText({ storeProfile, distributor, items }) {
  const storeName = storeProfile?.store_name || 'Divya Medical Stores';
  const phone = storeProfile?.phone || '9373545169';
  const dl = storeProfile?.dl_number || '20B/21B-MH-SOL-194829';
  const address = storeProfile?.address || 'Main Market, Ghoti';
  const distName = distributor?.name || 'Stockist / Wholesaler';

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  let text = `📦 *नवीन खरेदी ऑर्डर (PURCHASE ORDER)*\n`;
  text += `प्रति, *${distName}*\n\n`;
  text += `🏪 *${storeName}*\n`;
  text += `📍 ${address}\n`;
  text += `📞 मो. ${phone} | DL: ${dl}\n`;
  text += `📅 तारीख: ${dateStr} ${timeStr}\n`;
  text += `------------------------------------\n`;
  text += `सप्रेम नमस्कार,\nकृपया खालील औषधांची ऑर्डर त्वरित पाठवून द्यावी:\n\n`;

  (items || []).forEach((item, index) => {
    const qty = item.suggested_qty || 10;
    const stock = item.current_stock ?? 0;
    const salt = item.generic_salt ? ` (${item.generic_salt})` : '';
    const note = item.notes ? ` [टीप: ${item.notes}]` : '';
    text += `${index + 1}. *${item.medicine_name}*${salt} - *${qty} strips/packs* (शिल्लक: ${stock})${note}\n`;
  });

  text += `------------------------------------\n`;
  text += `एकूण आयटम्स: ${(items || []).length}\n`;
  text += `कृपया बिल व डिलिव्हरी पाठवावी. धन्यवाद! 🙏`;

  return text;
}
