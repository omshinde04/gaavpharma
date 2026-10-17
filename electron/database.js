const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const Database = require('better-sqlite3');

let db = null;
const MASTER_SECRET = 'gaavpharma-super-secret-master-key-2026';

function parseExpiryDate(mmYyStr) {
  if (!mmYyStr) return null;
  const parts = mmYyStr.trim().split('/');
  if (parts.length !== 2) return null;
  const month = parseInt(parts[0], 10);
  let year = parseInt(parts[1], 10);
  if (isNaN(month) || isNaN(year)) return null;
  if (year < 100) year += 2000;
  return new Date(year, month, 0, 23, 59, 59);
}

function getHardwareId() {
  try {
    const raw = [os.hostname(), os.platform(), os.arch(), os.cpus()[0]?.model || 'CPU'].join('|');
    const hash = crypto.createHash('sha256').update(raw).digest('hex').toUpperCase();
    return `GP-${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}`;
  } catch {
    return 'GP-OFFLINE-NODE-001';
  }
}

function signPayload(payloadStr) {
  return crypto.createHmac('sha256', MASTER_SECRET).update(payloadStr).digest('hex').slice(0, 16);
}

function verifyPayloadSignature(payloadStr, signature) {
  const expected = signPayload(payloadStr);
  return expected === signature;
}

function initDatabase(customPath) {
  let dbFilePath = customPath;
  if (!dbFilePath) {
    let userDataDir;
    try {
      const { app } = require('electron');
      if (app && typeof app.isReady === 'function' && app.isReady()) {
        userDataDir = app.getPath('userData');
      } else {
        userDataDir = path.join(__dirname, '..', 'data');
      }
    } catch {
      userDataDir = path.join(__dirname, '..', 'data');
    }
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
    dbFilePath = path.join(userDataDir, 'gaavpharma.db');
  }

  db = new Database(dbFilePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createTables();
  seedInitialData();

  return db;
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT UNIQUE,
      name TEXT NOT NULL,
      generic_salt TEXT,
      category TEXT CHECK(category IN ('medicine', 'general', 'baby_care', 'cosmetic')) DEFAULT 'medicine',
      rack_location TEXT,
      strip_size INTEGER DEFAULT 10,
      is_schedule_h1 BOOLEAN DEFAULT 0,
      min_stock_alert INTEGER DEFAULT 5
    );

    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      batch_no TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      purchase_rate REAL DEFAULT 0,
      mrp REAL NOT NULL,
      stock_qty INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT UNIQUE NOT NULL,
      customer_name TEXT DEFAULT 'Cash Customer',
      customer_mobile TEXT,
      doctor_name TEXT,
      payment_mode TEXT CHECK(payment_mode IN ('cash', 'upi', 'khata', 'card')) DEFAULT 'cash',
      total_amount REAL NOT NULL,
      discount REAL DEFAULT 0,
      final_amount REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      batch_id INTEGER REFERENCES batches(id),
      is_loose_tablet BOOLEAN DEFAULT 0,
      qty INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS distributors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      gstin TEXT,
      pending_balance REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS customers_khata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      mobile TEXT NOT NULL UNIQUE,
      balance REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS khata_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers_khata(id) ON DELETE CASCADE,
      invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
      type TEXT CHECK(type IN ('DEBIT', 'CREDIT')) NOT NULL,
      amount REAL NOT NULL,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 3-Tier SaaS System Tables
    CREATE TABLE IF NOT EXISTS license (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      license_key TEXT NOT NULL,
      store_name TEXT NOT NULL,
      owner_phone TEXT,
      plan_type TEXT DEFAULT 'annual',
      hardware_id TEXT NOT NULL,
      activated_at DATETIME NOT NULL,
      expires_at DATETIME NOT NULL,
      last_checked_at DATETIME NOT NULL,
      features_json TEXT NOT NULL,
      signature TEXT NOT NULL,
      status TEXT DEFAULT 'ACTIVE'
    );

    CREATE TABLE IF NOT EXISTS store_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      store_name TEXT NOT NULL DEFAULT 'Anand Medical & General Stores',
      dl_number TEXT DEFAULT '20B/21B-MH-SOL-194829',
      gstin TEXT DEFAULT '27AABCA1234F1Z9',
      address TEXT DEFAULT 'Near Bus Stand, Main Road',
      phone TEXT DEFAULT '+91 98220 12345',
      upi_id TEXT DEFAULT 'anandmedical@oksbi',
      printer_type TEXT DEFAULT '80mm',
      auto_print BOOLEAN DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      pin_code TEXT NOT NULL,
      password_hash TEXT,
      role TEXT CHECK(role IN ('super_admin', 'store_admin', 'cashier')) NOT NULL DEFAULT 'cashier',
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS feature_toggles (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE INDEX IF NOT EXISTS idx_products_salt ON products(generic_salt);
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_batches_product_id ON batches(product_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at);
  `);
}

function seedInitialData() {
  // 1. Seed Store Profile
  const storeProfileCount = db.prepare('SELECT COUNT(*) as count FROM store_profile').get().count;
  if (storeProfileCount === 0) {
    db.prepare(`
      INSERT INTO store_profile (id, store_name, dl_number, gstin, address, phone, upi_id, printer_type, auto_print)
      VALUES (1, 'Anand Medical & General Stores', '20B/21B-MH-SOL-194829', '27AABCA1234F1Z9', 'Near Bus Stand, Main Road', '+91 98220 12345', 'anandmedical@oksbi', '80mm', 0)
    `).run();
  }

  // 2. Seed Default License (Valid 1-Year Pro Plan for Anand Medical)
  const licenseCount = db.prepare('SELECT COUNT(*) as count FROM license').get().count;
  if (licenseCount === 0) {
    const hwid = getHardwareId();
    const expiresAt = new Date(Date.now() + 365 * 86400000).toISOString();
    const payload = {
      storeName: 'Anand Medical & General Stores',
      ownerPhone: '9822012345',
      plan: 'annual',
      hardwareId: hwid,
      features: {
        loose_tablets: true,
        expiry_radar: true,
        family_khata: true,
        whatsapp_bills: true,
        custom_discounts: true
      },
      issuedAt: new Date().toISOString(),
      expiresAt
    };
    const jsonStr = JSON.stringify(payload);
    const b64 = Buffer.from(jsonStr).toString('base64url');
    const sig = signPayload(jsonStr);
    const key = `GP-ACT-${b64}.${sig}`;

    db.prepare(`
      INSERT INTO license (license_key, store_name, owner_phone, plan_type, hardware_id, activated_at, expires_at, last_checked_at, features_json, signature, status)
      VALUES (?, ?, ?, 'annual', ?, datetime('now'), ?, datetime('now'), ?, ?, 'ACTIVE')
    `).run(
      key,
      payload.storeName,
      payload.ownerPhone,
      hwid,
      expiresAt,
      JSON.stringify(payload.features),
      sig
    );
  }

  // 3. Seed Users (Super Admin, Store Owner, Cashier)
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (username, display_name, pin_code, password_hash, role, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Super Admin (You - Software Provider)
    insertUser.run('superadmin', 'Om Shinde (Founder)', '9999', 'admin123', 'super_admin', 1);
  }

  // 4. Seed Feature Toggles
  const toggleCount = db.prepare('SELECT COUNT(*) as count FROM feature_toggles').get().count;
  if (toggleCount === 0) {
    const insertToggle = db.prepare(`INSERT INTO feature_toggles (key, value) VALUES (?, ?)`);
    insertToggle.run('allow_khata', 'true');
    insertToggle.run('allow_loose_tablets', 'true');
    insertToggle.run('allow_whatsapp', 'true');
    insertToggle.run('enforce_h1_doctor', 'false');
    insertToggle.run('max_cashier_discount', '10');
    insertToggle.run('hide_drawer_from_cashier', 'false');
  }

  // 5. Seed Sample Inventory & Invoices
  const count = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (count > 0) return;

  const insertProduct = db.prepare(`
    INSERT INTO products (barcode, name, generic_salt, category, rack_location, strip_size, is_schedule_h1, min_stock_alert)
    VALUES (@barcode, @name, @generic_salt, @category, @rack_location, @strip_size, @is_schedule_h1, @min_stock_alert)
  `);

  const insertBatch = db.prepare(`
    INSERT INTO batches (product_id, batch_no, expiry_date, purchase_rate, mrp, stock_qty)
    VALUES (@product_id, @batch_no, @expiry_date, @purchase_rate, @mrp, @stock_qty)
  `);

  const sampleProducts = [
    {
      barcode: null,
      name: 'Dolo 650 Tablet',
      generic_salt: 'Paracetamol 650mg',
      category: 'medicine',
      rack_location: 'Rack A-1',
      strip_size: 15,
      is_schedule_h1: 0,
      min_stock_alert: 20,
      batches: [
        { batch_no: 'DL3811', expiry_date: '10/26', purchase_rate: 22.00, mrp: 34.00, stock_qty: 6 },
        { batch_no: 'DL4920', expiry_date: '04/27', purchase_rate: 24.50, mrp: 34.00, stock_qty: 45 }
      ]
    },
    {
      barcode: null,
      name: 'Augmentin 625 Duo',
      generic_salt: 'Amoxicillin 500mg + Clavulanic Acid 125mg',
      category: 'medicine',
      rack_location: 'Rack B-4',
      strip_size: 10,
      is_schedule_h1: 1,
      min_stock_alert: 10,
      batches: [
        { batch_no: 'AG9921', expiry_date: '12/26', purchase_rate: 145.00, mrp: 204.50, stock_qty: 25 },
        { batch_no: 'AG8812', expiry_date: '11/26', purchase_rate: 140.00, mrp: 198.00, stock_qty: 12 }
      ]
    },
    {
      barcode: null,
      name: 'Telma 40 Tablet',
      generic_salt: 'Telmisartan 40mg',
      category: 'medicine',
      rack_location: 'Rack C-2',
      strip_size: 15,
      is_schedule_h1: 0,
      min_stock_alert: 15,
      batches: [
        { batch_no: 'TL4002', expiry_date: '11/26', purchase_rate: 150.00, mrp: 215.00, stock_qty: 4 },
        { batch_no: 'TL5112', expiry_date: '03/27', purchase_rate: 160.00, mrp: 225.00, stock_qty: 30 }
      ]
    },
    {
      barcode: null,
      name: 'Pan 40 Tablet',
      generic_salt: 'Pantoprazole 40mg',
      category: 'medicine',
      rack_location: 'Rack A-3',
      strip_size: 15,
      is_schedule_h1: 0,
      min_stock_alert: 20,
      batches: [
        { batch_no: 'PN8840', expiry_date: '01/27', purchase_rate: 98.00, mrp: 148.00, stock_qty: 40 }
      ]
    },
    {
      barcode: null,
      name: 'Azithral 500 Tablet',
      generic_salt: 'Azithromycin 500mg',
      category: 'medicine',
      rack_location: 'Rack B-1',
      strip_size: 5,
      is_schedule_h1: 1,
      min_stock_alert: 10,
      batches: [
        { batch_no: 'AZ3041', expiry_date: '12/26', purchase_rate: 78.00, mrp: 119.50, stock_qty: 15 }
      ]
    },
    {
      barcode: null,
      name: 'Cetzine 10mg Tablet',
      generic_salt: 'Cetirizine Hydrochloride 10mg',
      category: 'medicine',
      rack_location: 'Rack A-2',
      strip_size: 10,
      is_schedule_h1: 0,
      min_stock_alert: 25,
      batches: [
        { batch_no: 'CT1099', expiry_date: '08/27', purchase_rate: 14.00, mrp: 22.00, stock_qty: 60 }
      ]
    },
    {
      barcode: null,
      name: 'Calpol 650 Tablet',
      generic_salt: 'Paracetamol 650mg',
      category: 'medicine',
      rack_location: 'Rack A-1',
      strip_size: 15,
      is_schedule_h1: 0,
      min_stock_alert: 15,
      batches: [
        { batch_no: 'CP6610', expiry_date: '02/27', purchase_rate: 23.00, mrp: 33.50, stock_qty: 35 }
      ]
    },
    {
      barcode: '8901138833443',
      name: 'Himalaya Baby Wipes 72s',
      generic_salt: 'Aloe Vera & Indian Lotus Wet Wipes',
      category: 'baby_care',
      rack_location: 'Aisle 2 - Baby Shelf',
      strip_size: 1,
      is_schedule_h1: 0,
      min_stock_alert: 5,
      batches: [
        { batch_no: 'HW771', expiry_date: '05/27', purchase_rate: 135.00, mrp: 195.00, stock_qty: 18 }
      ]
    },
    {
      barcode: '8901396112102',
      name: 'Dettol Original Soap 125g',
      generic_salt: 'Chloroxylenol Antiseptic Soap',
      category: 'general',
      rack_location: 'Counter Display 1',
      strip_size: 1,
      is_schedule_h1: 0,
      min_stock_alert: 10,
      batches: [
        { batch_no: 'DT2290', expiry_date: '06/28', purchase_rate: 42.00, mrp: 58.00, stock_qty: 36 }
      ]
    },
    {
      barcode: '8901234567890',
      name: 'Volini Pain Relief Gel 30g',
      generic_salt: 'Diclofenac Diethylamine + Methyl Salicylate',
      category: 'general',
      rack_location: 'Rack D-1',
      strip_size: 1,
      is_schedule_h1: 0,
      min_stock_alert: 8,
      batches: [
        { batch_no: 'VL5521', expiry_date: '11/26', purchase_rate: 85.00, mrp: 130.00, stock_qty: 14 }
      ]
    },
    {
      barcode: '8901030612345',
      name: 'Whisper Ultra Clean XL 15 Pads',
      generic_salt: 'Sanitary Napkins with Wings',
      category: 'cosmetic',
      rack_location: 'Aisle 3 - Care',
      strip_size: 1,
      is_schedule_h1: 0,
      min_stock_alert: 10,
      batches: [
        { batch_no: 'WH9901', expiry_date: '11/27', purchase_rate: 110.00, mrp: 160.00, stock_qty: 22 }
      ]
    }
  ];

  const seedTx = db.transaction(() => {
    for (const p of sampleProducts) {
      const res = insertProduct.run({
        barcode: p.barcode,
        name: p.name,
        generic_salt: p.generic_salt,
        category: p.category,
        rack_location: p.rack_location,
        strip_size: p.strip_size,
        is_schedule_h1: p.is_schedule_h1,
        min_stock_alert: p.min_stock_alert
      });
      const productId = res.lastInsertRowid;
      for (const b of p.batches) {
        insertBatch.run({
          product_id: productId,
          batch_no: b.batch_no,
          expiry_date: b.expiry_date,
          purchase_rate: b.purchase_rate,
          mrp: b.mrp,
          stock_qty: b.stock_qty
        });
      }
    }

    const insertDistributor = db.prepare(`
      INSERT INTO distributors (name, phone, gstin, pending_balance)
      VALUES (?, ?, ?, ?)
    `);
    insertDistributor.run('Mahaveer Pharma Distributors', '9822012345', '27AABCM1234P1Z2', 14250.00);
    insertDistributor.run('Sunlife Healthcare Agency', '9423098765', '27AABCS9876Q1Z8', 8600.00);
    insertDistributor.run('Balaji FMCG & Surgicals', '9860011223', '27AABCB4321R1Z5', 3100.00);

    const insertKhata = db.prepare(`
      INSERT INTO customers_khata (name, mobile, balance)
      VALUES (?, ?, ?)
    `);
    const c1 = insertKhata.run('Ramesh Patil (Grampanchayat)', '9822114477', 1450.00).lastInsertRowid;
    const c2 = insertKhata.run('Sanjay Deshmukh (Teacher)', '9422336699', 680.00).lastInsertRowid;
    insertKhata.run('Sunita Kadam (Asha Worker)', '9158442200', 250.00);
    insertKhata.run('Vitthal Shinde (Krushi Seva)', '9890123456', 0.00);

    const insertKhataTx = db.prepare(`
      INSERT INTO khata_transactions (customer_id, invoice_id, type, amount, note, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', '-2 days'))
    `);
    insertKhataTx.run(c1, null, 'DEBIT', 1450.00, 'Monthly regular medicines');
    insertKhataTx.run(c2, null, 'DEBIT', 680.00, 'BP medicines and inhaler');

    const insertInvoice = db.prepare(`
      INSERT INTO invoices (invoice_no, customer_name, customer_mobile, doctor_name, payment_mode, total_amount, discount, final_amount, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
    `);
    const insertInvoiceItem = db.prepare(`
      INSERT INTO invoice_items (invoice_id, product_id, batch_id, is_loose_tablet, qty, unit_price, total_price)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const inv1 = insertInvoice.run('INV-20261016-001', 'Ganesh Kulkarni', '9822345678', 'Dr. Joshi', 'upi', 238.50, 0, 238.50, '-4 hours').lastInsertRowid;
    insertInvoiceItem.run(inv1, 1, 1, 0, 1, 34.00, 34.00);
    insertInvoiceItem.run(inv1, 2, 3, 0, 1, 204.50, 204.50);

    const inv2 = insertInvoice.run('INV-20261016-002', 'Anita Pawar', '9421556677', null, 'cash', 253.00, 5.00, 248.00, '-2 hours').lastInsertRowid;
    insertInvoiceItem.run(inv2, 8, 8, 0, 1, 195.00, 195.00);
    insertInvoiceItem.run(inv2, 9, 9, 0, 1, 58.00, 58.00);

    const inv3 = insertInvoice.run('INV-20261016-003', 'Ramesh Patil (Grampanchayat)', '9822114477', 'Dr. Patil', 'khata', 450.00, 0, 450.00, '-30 minutes').lastInsertRowid;
    insertInvoiceItem.run(inv3, 3, 5, 0, 2, 225.00, 450.00);
  });

  seedTx();
}

// ----------------- Licensing & Subscription -----------------

function getLicenseStatus() {
  if (!db) initDatabase();
  const lic = db.prepare(`SELECT * FROM license ORDER BY id DESC LIMIT 1`).get();
  const hwid = getHardwareId();

  if (!lic) {
    return {
      isValid: false,
      isTrial: false,
      daysRemaining: 0,
      status: 'NOT_ACTIVATED',
      storeName: 'Unregistered Store',
      hardwareId: hwid,
      expiresAt: null,
      plan: 'none',
      features: {}
    };
  }

  const now = new Date();
  const exp = new Date(lic.expires_at);
  const diffMs = exp.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const isExpired = diffMs <= 0;

  let features = {};
  try {
    features = JSON.parse(lic.features_json || '{}');
  } catch {
    features = {};
  }

  return {
    isValid: !isExpired && lic.status === 'ACTIVE',
    isTrial: lic.plan_type === 'trial',
    daysRemaining,
    status: isExpired ? 'EXPIRED' : lic.status,
    storeName: lic.store_name,
    hardwareId: hwid,
    ownerPhone: lic.owner_phone,
    expiresAt: lic.expires_at,
    plan: lic.plan_type,
    features
  };
}

function generateLicenseKey(data) {
  const days = data.days || (data.plan === 'trial' ? 14 : 365);
  const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
  const payload = {
    storeName: data.storeName || 'Medical Store',
    ownerPhone: data.ownerPhone || '',
    plan: data.plan || 'annual',
    hardwareId: data.hardwareId || 'ALL',
    features: data.features || {
      loose_tablets: true,
      expiry_radar: true,
      family_khata: true,
      whatsapp_bills: true,
      custom_discounts: true
    },
    issuedAt: new Date().toISOString(),
    expiresAt
  };
  const jsonStr = JSON.stringify(payload);
  const b64 = Buffer.from(jsonStr).toString('base64url');
  const sig = signPayload(jsonStr);
  return `GP-ACT-${b64}.${sig}`;
}

function activateLicense(licenseKey) {
  if (!db) initDatabase();
  if (!licenseKey || !licenseKey.startsWith('GP-ACT-')) {
    throw new Error('Invalid license key format. Keys start with GP-ACT-');
  }
  const parts = licenseKey.replace('GP-ACT-', '').split('.');
  if (parts.length !== 2) throw new Error('Malformed license key.');
  const [b64, sig] = parts;
  const jsonStr = Buffer.from(b64, 'base64url').toString('utf8');

  if (!verifyPayloadSignature(jsonStr, sig)) {
    throw new Error('Cryptographic signature verification failed.');
  }

  const payload = JSON.parse(jsonStr);
  const currentHwid = getHardwareId();
  if (payload.hardwareId && payload.hardwareId !== 'ALL' && payload.hardwareId !== currentHwid) {
    throw new Error(`License is locked to Hardware ID ${payload.hardwareId}. Current machine is ${currentHwid}`);
  }

  db.prepare(`DELETE FROM license`).run();
  db.prepare(`
    INSERT INTO license (license_key, store_name, owner_phone, plan_type, hardware_id, activated_at, expires_at, last_checked_at, features_json, signature, status)
    VALUES (?, ?, ?, ?, ?, datetime('now'), ?, datetime('now'), ?, ?, 'ACTIVE')
  `).run(
    licenseKey,
    payload.storeName,
    payload.ownerPhone || null,
    payload.plan,
    currentHwid,
    payload.expiresAt,
    JSON.stringify(payload.features),
    sig
  );

  db.prepare(`UPDATE store_profile SET store_name = ? WHERE id = 1`).run(payload.storeName);
  return getLicenseStatus();
}

function provisionStore(data) {
  if (!db) initDatabase();
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

  if (!storeName || !ownerName || !ownerPin) {
    throw new Error('Store name, owner name, and 4-digit PIN are required.');
  }

  // 1. Update store_profile
  db.prepare(`
    UPDATE store_profile
    SET store_name = ?,
        dl_number = ?,
        gstin = ?,
        address = ?,
        phone = ?,
        upi_id = ?
    WHERE id = 1
  `).run(
    storeName.trim(),
    (dlNumber || '20B/21B-MH-SOL-194829').trim(),
    (gstin || '27AABCA1234F1Z9').trim(),
    (address || 'Main Road').trim(),
    (ownerPhone || '').trim(),
    (upiId || '').trim()
  );

  // 2. Generate and activate valid license
  const hwid = getHardwareId();
  const expiresAt = new Date(Date.now() + (days || 365) * 86400000).toISOString();
  const licPayload = {
    storeName: storeName.trim(),
    ownerPhone: (ownerPhone || '').trim(),
    plan: plan || 'annual',
    hardwareId: hwid,
    features: {
      loose_tablets: true,
      expiry_radar: true,
      family_khata: true,
      whatsapp_bills: true,
      custom_discounts: true
    },
    issuedAt: new Date().toISOString(),
    expiresAt
  };
  const jsonStr = JSON.stringify(licPayload);
  const b64 = Buffer.from(jsonStr).toString('base64url');
  const sig = signPayload(jsonStr);
  const licenseKey = `GP-ACT-${b64}.${sig}`;

  db.prepare(`DELETE FROM license`).run();
  db.prepare(`
    INSERT INTO license (license_key, store_name, owner_phone, plan_type, hardware_id, activated_at, expires_at, last_checked_at, features_json, signature, status)
    VALUES (?, ?, ?, ?, ?, datetime('now'), ?, datetime('now'), ?, ?, 'ACTIVE')
  `).run(
    licenseKey,
    licPayload.storeName,
    licPayload.ownerPhone || null,
    licPayload.plan,
    hwid,
    expiresAt,
    JSON.stringify(licPayload.features),
    sig
  );

  // 3. Create or update store_admin user
  const existingOwner = db.prepare(`SELECT * FROM users WHERE role = 'store_admin'`).get();
  let ownerUser;
  if (existingOwner) {
    db.prepare(`
      UPDATE users
      SET display_name = ?,
          username = ?,
          pin_code = ?,
          is_active = 1
      WHERE id = ?
    `).run(ownerName.trim(), (ownerUsername || 'store_admin').trim(), ownerPin.trim(), existingOwner.id);
    ownerUser = db.prepare(`SELECT id, username, display_name, pin_code, role, is_active FROM users WHERE id = ?`).get(existingOwner.id);
  } else {
    const res = db.prepare(`
      INSERT INTO users (username, display_name, pin_code, password_hash, role, is_active)
      VALUES (?, ?, ?, 'owner123', 'store_admin', 1)
    `).run((ownerUsername || 'store_admin').trim(), ownerName.trim(), ownerPin.trim());
    ownerUser = db.prepare(`SELECT id, username, display_name, pin_code, role, is_active FROM users WHERE id = ?`).get(res.lastInsertRowid);
  }

  const updatedProfile = db.prepare(`SELECT * FROM store_profile WHERE id = 1`).get();
  const updatedLicense = getLicenseStatus();

  return {
    success: true,
    storeProfile: updatedProfile,
    licenseStatus: updatedLicense,
    storeOwner: ownerUser,
    licenseKey
  };
}

function generateRenewalCode(data) {
  const days = data.days || 365;
  const payload = {
    storeName: data.storeName || 'Medical Store',
    daysAdded: days,
    issuedAt: new Date().toISOString()
  };
  const jsonStr = JSON.stringify(payload);
  const b64 = Buffer.from(jsonStr).toString('base64url');
  const sig = signPayload(jsonStr);
  return `GP-REN-${b64}.${sig}`;
}

function applyRenewalCode(renewalCode) {
  if (!db) initDatabase();
  if (!renewalCode || !renewalCode.startsWith('GP-REN-')) {
    throw new Error('Invalid renewal code format. Codes start with GP-REN-');
  }
  const parts = renewalCode.replace('GP-REN-', '').split('.');
  if (parts.length !== 2) throw new Error('Malformed renewal code.');
  const [b64, sig] = parts;
  const jsonStr = Buffer.from(b64, 'base64url').toString('utf8');

  if (!verifyPayloadSignature(jsonStr, sig)) {
    throw new Error('Cryptographic signature verification failed.');
  }

  const payload = JSON.parse(jsonStr);
  const currentLic = db.prepare(`SELECT * FROM license ORDER BY id DESC LIMIT 1`).get();
  if (!currentLic) throw new Error('No active license found to renew.');

  const currentExpiry = new Date(currentLic.expires_at).getTime();
  const baseTime = currentExpiry > Date.now() ? currentExpiry : Date.now();
  const newExpiry = new Date(baseTime + payload.daysAdded * 86400000).toISOString();

  db.prepare(`
    UPDATE license 
    SET expires_at = ?, status = 'ACTIVE', last_checked_at = datetime('now')
    WHERE id = ?
  `).run(newExpiry, currentLic.id);

  return getLicenseStatus();
}

// ----------------- Multi-User Authentication -----------------

function loginWithPin(pin) {
  if (!db) initDatabase();
  const user = db.prepare(`
    SELECT id, username, display_name, role, is_active FROM users 
    WHERE pin_code = ? AND is_active = 1 LIMIT 1
  `).get(pin.trim());

  if (!user) return null;
  return user;
}

function loginWithCredentials(username, password) {
  if (!db) initDatabase();
  const user = db.prepare(`
    SELECT id, username, display_name, role, is_active, password_hash FROM users 
    WHERE LOWER(username) = ? AND is_active = 1 LIMIT 1
  `).get(username.trim().toLowerCase());

  if (!user) return null;
  if (user.password_hash && user.password_hash !== password) {
    return null;
  }
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

function getUsers() {
  if (!db) initDatabase();
  return db.prepare(`
    SELECT id, username, display_name, pin_code, role, is_active, created_at 
    FROM users 
    ORDER BY role ASC, display_name ASC
  `).all();
}

function addUser(userData) {
  if (!db) initDatabase();
  const stmt = db.prepare(`
    INSERT INTO users (username, display_name, pin_code, password_hash, role, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const res = stmt.run(
    userData.username.trim().toLowerCase(),
    userData.display_name.trim(),
    userData.pin_code.trim(),
    userData.password || null,
    userData.role || 'cashier',
    userData.is_active !== undefined ? (userData.is_active ? 1 : 0) : 1
  );
  return { id: res.lastInsertRowid, ...userData };
}

function updateUser(id, userData) {
  if (!db) initDatabase();
  db.prepare(`
    UPDATE users 
    SET display_name = COALESCE(?, display_name),
        pin_code = COALESCE(?, pin_code),
        role = COALESCE(?, role),
        is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(
    userData.display_name || null,
    userData.pin_code || null,
    userData.role || null,
    userData.is_active !== undefined ? (userData.is_active ? 1 : 0) : null,
    id
  );
  return db.prepare(`SELECT id, username, display_name, pin_code, role, is_active FROM users WHERE id = ?`).get(id);
}

function deleteUser(id) {
  if (!db) initDatabase();
  db.prepare(`DELETE FROM users WHERE id = ? AND role != 'super_admin'`).run(id);
  return { success: true };
}

function resetUsersToSuperAdminOnly() {
  if (!db) initDatabase();
  db.prepare(`DELETE FROM users WHERE role != 'super_admin'`).run();
  return db.prepare(`SELECT id, username, display_name, pin_code, role, is_active FROM users`).all();
}

// ----------------- Store Profile & Feature Toggles -----------------

function getStoreProfile() {
  if (!db) initDatabase();
  return db.prepare(`SELECT * FROM store_profile WHERE id = 1`).get();
}

function updateStoreProfile(data) {
  if (!db) initDatabase();
  db.prepare(`
    UPDATE store_profile 
    SET store_name = COALESCE(?, store_name),
        dl_number = COALESCE(?, dl_number),
        gstin = COALESCE(?, gstin),
        address = COALESCE(?, address),
        phone = COALESCE(?, phone),
        upi_id = COALESCE(?, upi_id),
        printer_type = COALESCE(?, printer_type),
        auto_print = COALESCE(?, auto_print)
    WHERE id = 1
  `).run(
    data.store_name || null,
    data.dl_number || null,
    data.gstin || null,
    data.address || null,
    data.phone || null,
    data.upi_id || null,
    data.printer_type || null,
    data.auto_print !== undefined ? (data.auto_print ? 1 : 0) : null
  );
  return getStoreProfile();
}

function getFeatureToggles() {
  if (!db) initDatabase();
  const rows = db.prepare(`SELECT key, value FROM feature_toggles`).all();
  const toggles = {};
  rows.forEach(r => {
    toggles[r.key] = r.value === 'true' ? true : (r.value === 'false' ? false : r.value);
  });
  return toggles;
}

function updateFeatureToggle(key, value) {
  if (!db) initDatabase();
  const strVal = String(value);
  db.prepare(`
    INSERT INTO feature_toggles (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, strVal);
  return getFeatureToggles();
}

// ----------------- Existing POS Methods -----------------

function searchProducts(searchQuery) {
  if (!db) initDatabase();
  const q = `%${(searchQuery || '').trim().toLowerCase()}%`;
  const products = db.prepare(`
    SELECT * FROM products
    WHERE LOWER(name) LIKE ? OR LOWER(generic_salt) LIKE ? OR barcode LIKE ?
    ORDER BY name ASC
    LIMIT 30
  `).all(q, q, q);

  const getBatches = db.prepare(`
    SELECT * FROM batches
    WHERE product_id = ? AND stock_qty > 0
    ORDER BY id ASC
  `);

  return products.map(p => {
    let batches = getBatches.all(p.id);
    batches.sort((a, b) => {
      const d1 = parseExpiryDate(a.expiry_date) || new Date(2099, 1, 1);
      const d2 = parseExpiryDate(b.expiry_date) || new Date(2099, 1, 1);
      return d1 - d2;
    });

    const totalStock = batches.reduce((sum, b) => sum + b.stock_qty, 0);
    return {
      ...p,
      batches,
      total_stock: totalStock,
      active_batch: batches[0] || null
    };
  });
}

function getProductByBarcode(barcode) {
  if (!db) initDatabase();
  const product = db.prepare(`
    SELECT * FROM products WHERE barcode = ? LIMIT 1
  `).get(barcode.trim());

  if (!product) return null;

  const batches = db.prepare(`
    SELECT * FROM batches WHERE product_id = ? AND stock_qty > 0
  `).all(product.id);

  batches.sort((a, b) => {
    const d1 = parseExpiryDate(a.expiry_date) || new Date(2099, 1, 1);
    const d2 = parseExpiryDate(b.expiry_date) || new Date(2099, 1, 1);
    return d1 - d2;
  });

  return {
    ...product,
    batches,
    total_stock: batches.reduce((sum, b) => sum + b.stock_qty, 0),
    active_batch: batches[0] || null
  };
}

function findSaltSubstitutes(genericSalt, excludeProductId) {
  if (!db) initDatabase();
  if (!genericSalt) return [];
  const salt = `%${genericSalt.trim().toLowerCase()}%`;
  const substitutes = db.prepare(`
    SELECT p.*, (SELECT COALESCE(SUM(b.stock_qty), 0) FROM batches b WHERE b.product_id = p.id) as total_stock
    FROM products p
    WHERE LOWER(p.generic_salt) LIKE ? AND p.id != ?
    ORDER BY total_stock DESC
    LIMIT 6
  `).all(salt, excludeProductId || 0);

  return substitutes;
}

function getAllProducts(category) {
  if (!db) initDatabase();
  let query = `
    SELECT p.*, 
      (SELECT COALESCE(SUM(b.stock_qty), 0) FROM batches b WHERE b.product_id = p.id) as total_stock,
      (SELECT COUNT(b.id) FROM batches b WHERE b.product_id = p.id) as batch_count
    FROM products p
  `;
  const params = [];
  if (category && category !== 'all') {
    query += ` WHERE p.category = ?`;
    params.push(category);
  }
  query += ` ORDER BY p.name ASC`;

  const products = db.prepare(query).all(...params);
  const getBatches = db.prepare(`SELECT * FROM batches WHERE product_id = ? ORDER BY id DESC`);

  return products.map(p => ({
    ...p,
    batches: getBatches.all(p.id)
  }));
}

function addProduct(data) {
  if (!db) initDatabase();
  const stmt = db.prepare(`
    INSERT INTO products (barcode, name, generic_salt, category, rack_location, strip_size, is_schedule_h1, min_stock_alert)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const res = stmt.run(
    data.barcode || null,
    data.name,
    data.generic_salt || null,
    data.category || 'medicine',
    data.rack_location || 'Rack General',
    data.strip_size || 10,
    data.is_schedule_h1 ? 1 : 0,
    data.min_stock_alert || 5
  );

  const productId = res.lastInsertRowid;
  if (data.batch_no && data.expiry_date && data.mrp) {
    addBatch({
      product_id: productId,
      batch_no: data.batch_no,
      expiry_date: data.expiry_date,
      purchase_rate: data.purchase_rate || 0,
      mrp: data.mrp,
      stock_qty: data.stock_qty || 0
    });
  }

  return { id: productId, ...data };
}

function addBatch(data) {
  if (!db) initDatabase();
  const stmt = db.prepare(`
    INSERT INTO batches (product_id, batch_no, expiry_date, purchase_rate, mrp, stock_qty)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const res = stmt.run(
    data.product_id,
    data.batch_no,
    data.expiry_date,
    data.purchase_rate || 0,
    data.mrp,
    data.stock_qty || 0
  );
  return { id: res.lastInsertRowid, ...data };
}

function updateBatchStock(batchId, newQty) {
  if (!db) initDatabase();
  db.prepare(`UPDATE batches SET stock_qty = ? WHERE id = ?`).run(newQty, batchId);
  return { id: batchId, stock_qty: newQty };
}

function getExpiryRadarData() {
  if (!db) initDatabase();
  const batches = db.prepare(`
    SELECT b.*, p.name as product_name, p.generic_salt, p.category, p.rack_location
    FROM batches b
    JOIN products p ON b.product_id = p.id
    WHERE b.stock_qty > 0
    ORDER BY b.id ASC
  `).all();

  const now = new Date();
  const enriched = batches.map(b => {
    const expDate = parseExpiryDate(b.expiry_date);
    let daysRemaining = 9999;
    let status = 'safe';

    if (expDate) {
      const diffMs = expDate.getTime() - now.getTime();
      daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    if (daysRemaining <= 30) {
      status = 'critical';
    } else if (daysRemaining <= 90) {
      status = 'warning';
    } else {
      status = 'safe';
    }

    const potentialLoss = (b.purchase_rate || (b.mrp * 0.7)) * b.stock_qty;

    return {
      ...b,
      daysRemaining,
      status,
      potentialLoss: Number(potentialLoss.toFixed(2))
    };
  });

  enriched.sort((a, b) => a.daysRemaining - b.daysRemaining);

  const critical = enriched.filter(b => b.status === 'critical');
  const warning = enriched.filter(b => b.status === 'warning');
  const safe = enriched.filter(b => b.status === 'safe');

  const totalCriticalLoss = critical.reduce((acc, b) => acc + b.potentialLoss, 0);
  const totalWarningLoss = warning.reduce((acc, b) => acc + b.potentialLoss, 0);

  return {
    batches: enriched,
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
}

function createInvoice(invoiceData, items) {
  if (!db) initDatabase();

  const generateInvoiceNo = () => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countToday = db.prepare(`
      SELECT COUNT(*) as count FROM invoices WHERE invoice_no LIKE ?
    `).get(`INV-${today}-%`).count;
    return `INV-${today}-${String(countToday + 1).padStart(3, '0')}`;
  };

  const invoiceNo = invoiceData.invoice_no || generateInvoiceNo();

  const tx = db.transaction(() => {
    const insertInv = db.prepare(`
      INSERT INTO invoices (invoice_no, customer_name, customer_mobile, doctor_name, payment_mode, total_amount, discount, final_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const invRes = insertInv.run(
      invoiceNo,
      invoiceData.customer_name || 'Cash Customer',
      invoiceData.customer_mobile || null,
      invoiceData.doctor_name || null,
      invoiceData.payment_mode || 'cash',
      invoiceData.total_amount,
      invoiceData.discount || 0,
      invoiceData.final_amount
    );

    const invoiceId = invRes.lastInsertRowid;

    const insertItem = db.prepare(`
      INSERT INTO invoice_items (invoice_id, product_id, batch_id, is_loose_tablet, qty, unit_price, total_price)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const decrementStock = db.prepare(`
      UPDATE batches SET stock_qty = MAX(0, stock_qty - ?) WHERE id = ?
    `);

    for (const item of items) {
      insertItem.run(
        invoiceId,
        item.product_id,
        item.batch_id || null,
        item.is_loose_tablet ? 1 : 0,
        item.qty,
        item.unit_price,
        item.total_price
      );

      if (item.batch_id) {
        const deductQty = item.is_loose_tablet ? Math.ceil(item.qty / (item.strip_size || 10)) : item.qty;
        decrementStock.run(deductQty, item.batch_id);
      }
    }

    if (invoiceData.payment_mode === 'khata' && invoiceData.customer_mobile) {
      let customer = db.prepare(`SELECT * FROM customers_khata WHERE mobile = ?`).get(invoiceData.customer_mobile);
      let customerId;
      if (!customer) {
        const resCust = db.prepare(`
          INSERT INTO customers_khata (name, mobile, balance) VALUES (?, ?, ?)
        `).run(invoiceData.customer_name || 'Khata Customer', invoiceData.customer_mobile, invoiceData.final_amount);
        customerId = resCust.lastInsertRowid;
      } else {
        customerId = customer.id;
        db.prepare(`
          UPDATE customers_khata SET balance = balance + ? WHERE id = ?
        `).run(invoiceData.final_amount, customerId);
      }

      db.prepare(`
        INSERT INTO khata_transactions (customer_id, invoice_id, type, amount, note)
        VALUES (?, ?, 'DEBIT', ?, ?)
      `).run(customerId, invoiceId, invoiceData.final_amount, `Invoice #${invoiceNo}`);
    }

    return {
      id: invoiceId,
      invoice_no: invoiceNo,
      ...invoiceData,
      items
    };
  });

  return tx();
}

function getInvoices(limit = 50) {
  if (!db) initDatabase();
  const invoices = db.prepare(`
    SELECT i.*, 
      (SELECT COUNT(*) FROM invoice_items ii WHERE ii.invoice_id = i.id) as item_count
    FROM invoices i
    ORDER BY i.created_at DESC
    LIMIT ?
  `).all(limit);

  return invoices;
}

function getInvoiceDetails(invoiceId) {
  if (!db) initDatabase();
  const invoice = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(invoiceId);
  if (!invoice) return null;

  const items = db.prepare(`
    SELECT ii.*, p.name as product_name, p.generic_salt, p.strip_size, b.batch_no, b.expiry_date
    FROM invoice_items ii
    JOIN products p ON ii.product_id = p.id
    LEFT JOIN batches b ON ii.batch_id = b.id
    WHERE ii.invoice_id = ?
  `).all(invoiceId);

  return { ...invoice, items };
}

function getDailyRegisterSummary() {
  if (!db) initDatabase();
  const today = db.prepare(`
    SELECT 
      COALESCE(SUM(final_amount), 0) as total_sales,
      COALESCE(SUM(CASE WHEN payment_mode = 'cash' THEN final_amount ELSE 0 END), 0) as cash_total,
      COALESCE(SUM(CASE WHEN payment_mode = 'upi' THEN final_amount ELSE 0 END), 0) as upi_total,
      COALESCE(SUM(CASE WHEN payment_mode = 'khata' THEN final_amount ELSE 0 END), 0) as khata_total,
      COALESCE(SUM(CASE WHEN payment_mode = 'card' THEN final_amount ELSE 0 END), 0) as card_total,
      COUNT(id) as total_invoices
    FROM invoices
    WHERE date(created_at) = date('now')
  `).get();

  const allTime = db.prepare(`
    SELECT 
      COALESCE(SUM(final_amount), 0) as total_sales,
      COUNT(id) as total_invoices
    FROM invoices
  `).get();

  const khataPending = db.prepare(`
    SELECT COALESCE(SUM(balance), 0) as total_khata_pending, COUNT(id) as active_khata_customers
    FROM customers_khata
    WHERE balance > 0
  `).get();

  return {
    today,
    allTime,
    khataPending
  };
}

function getKhataCustomers() {
  if (!db) initDatabase();
  const customers = db.prepare(`
    SELECT c.*,
      (SELECT MAX(created_at) FROM khata_transactions kt WHERE kt.customer_id = c.id) as last_activity
    FROM customers_khata c
    ORDER BY c.balance DESC, c.name ASC
  `).all();

  return customers;
}

function getKhataCustomerLedger(customerId) {
  if (!db) initDatabase();
  const customer = db.prepare(`SELECT * FROM customers_khata WHERE id = ?`).get(customerId);
  if (!customer) return null;

  const transactions = db.prepare(`
    SELECT kt.*, i.invoice_no
    FROM khata_transactions kt
    LEFT JOIN invoices i ON kt.invoice_id = i.id
    WHERE kt.customer_id = ?
    ORDER BY kt.created_at DESC
  `).all(customerId);

  return { customer, transactions };
}

function addKhataPayment(customerId, amount, note) {
  if (!db) initDatabase();
  const numAmount = parseFloat(amount);
  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE customers_khata SET balance = MAX(0, balance - ?) WHERE id = ?
    `).run(numAmount, customerId);

    db.prepare(`
      INSERT INTO khata_transactions (customer_id, type, amount, note)
      VALUES (?, 'CREDIT', ?, ?)
    `).run(customerId, numAmount, note || 'Payment Received via Cash/UPI');

    return db.prepare(`SELECT * FROM customers_khata WHERE id = ?`).get(customerId);
  });
  return tx();
}

function addKhataCustomer(name, mobile) {
  if (!db) initDatabase();
  const stmt = db.prepare(`
    INSERT INTO customers_khata (name, mobile, balance)
    VALUES (?, ?, 0)
  `);
  const res = stmt.run(name, mobile);
  return { id: res.lastInsertRowid, name, mobile, balance: 0 };
}

function getDistributors() {
  if (!db) initDatabase();
  return db.prepare(`SELECT * FROM distributors ORDER BY name ASC`).all();
}

function addDistributor(data) {
  if (!db) initDatabase();
  const stmt = db.prepare(`
    INSERT INTO distributors (name, phone, gstin, pending_balance)
    VALUES (?, ?, ?, ?)
  `);
  const res = stmt.run(data.name, data.phone || null, data.gstin || null, data.pending_balance || 0);
  return { id: res.lastInsertRowid, ...data };
}

module.exports = {
  initDatabase,
  getHardwareId,
  getLicenseStatus,
  generateLicenseKey,
  activateLicense,
  provisionStore,
  generateRenewalCode,
  applyRenewalCode,
  loginWithPin,
  loginWithCredentials,
  getUsers,
  addUser,
  updateUser,
  deleteUser,
  resetUsersToSuperAdminOnly,
  getStoreProfile,
  updateStoreProfile,
  getFeatureToggles,
  updateFeatureToggle,
  searchProducts,
  getProductByBarcode,
  findSaltSubstitutes,
  getAllProducts,
  addProduct,
  addBatch,
  updateBatchStock,
  getExpiryRadarData,
  createInvoice,
  getInvoices,
  getInvoiceDetails,
  getDailyRegisterSummary,
  getKhataCustomers,
  getKhataCustomerLedger,
  addKhataPayment,
  addKhataCustomer,
  getDistributors,
  addDistributor
};
