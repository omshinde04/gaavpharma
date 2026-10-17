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
  hide_drawer_from_cashier: false
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
  { id: 1, name: 'Mahaveer Pharma Distributors', phone: '9822012345', gstin: '27AABCM1234P1Z2', pending_balance: 0.00 },
  { id: 2, name: 'Sunlife Healthcare Agency', phone: '9423098765', gstin: '27AABCS9876Q1Z8', pending_balance: 0.00 },
  { id: 3, name: 'Balaji FMCG & Surgicals', phone: '9860011223', gstin: '27AABCB4321R1Z5', pending_balance: 0.00 }
];

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
    total_stock: 15,
    batches: [
      { id: 8, product_id: 5, batch_no: 'AZ3041', expiry_date: '12/26', purchase_rate: 78.00, mrp: 119.50, stock_qty: 15 }
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

// In-memory fallback mock with localStorage persistence for web dev preview
const fallbackStorage = {
  license: loadFallbackLicense(),
  storeProfile: loadFallbackStoreProfile(),
  users: loadFallbackUsers(),
  featureToggles: loadFallbackFeatureToggles(),
  products: loadFallbackProducts(),
  customers: loadFallbackCustomers(),
  invoices: loadFallbackInvoices(),
  distributors: INITIAL_DISTRIBUTORS
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
    const newInv = {
      id: Date.now(),
      invoice_no: invoiceNo,
      ...invoiceData,
      created_at: new Date().toISOString(),
      item_count: items.length,
      items
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

  // Distributors
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
      pending_balance: parseFloat(data.pending_balance) || 0
    };
    fallbackStorage.distributors.push(newDist);
    return newDist;
  },

  // Clear All Records / Reset Ledger
  clearAllRecords: async () => {
    if (isElectron) return window.electronAPI.clearAllRecords();
    fallbackStorage.invoices = [];
    fallbackStorage.customers = [];
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('gaavpharma_invoices', JSON.stringify([]));
        localStorage.setItem('gaavpharma_customers', JSON.stringify([]));
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
