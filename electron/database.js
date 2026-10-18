const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
let Database = null;
try {
  Database = require('better-sqlite3');
} catch (err) {
  // better-sqlite3 native binary compiled for Electron ABI
}

let db = null;
let currentDbFilePath = null;
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

  currentDbFilePath = dbFilePath;
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
      customer_address TEXT,
      doctor_name TEXT,
      doctor_reg_no TEXT,
      payment_mode TEXT CHECK(payment_mode IN ('cash', 'upi', 'khata', 'card')) DEFAULT 'cash',
      total_amount REAL NOT NULL,
      discount REAL DEFAULT 0,
      final_amount REAL NOT NULL,
      invoice_type TEXT DEFAULT 'RETAIL',
      notes TEXT,
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
      total_price REAL NOT NULL,
      gst_rate REAL DEFAULT 12
    );

    CREATE TABLE IF NOT EXISTS distributors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      gstin TEXT,
      dl_number TEXT,
      address TEXT,
      payment_terms_days INTEGER DEFAULT 21,
      pending_balance REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_invoice_no TEXT NOT NULL,
      distributor_id INTEGER NOT NULL REFERENCES distributors(id),
      invoice_date TEXT NOT NULL,
      payment_status TEXT CHECK(payment_status IN ('UNPAID', 'PARTIAL', 'PAID')) DEFAULT 'UNPAID',
      payment_mode TEXT CHECK(payment_mode IN ('credit', 'cash', 'upi', 'cheque', 'bank_transfer')) DEFAULT 'credit',
      subtotal REAL NOT NULL,
      tax_amount REAL NOT NULL DEFAULT 0,
      discount REAL DEFAULT 0,
      net_amount REAL NOT NULL,
      paid_amount REAL DEFAULT 0,
      due_date TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      batch_no TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      qty INTEGER NOT NULL,
      free_qty INTEGER DEFAULT 0,
      purchase_rate REAL NOT NULL,
      mrp REAL NOT NULL,
      gst_rate REAL DEFAULT 12,
      discount_percent REAL DEFAULT 0,
      landing_cost_per_unit REAL NOT NULL,
      total_amount REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS distributor_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      distributor_id INTEGER NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
      type TEXT CHECK(type IN ('PURCHASE_BILL', 'PAYMENT', 'DEBIT_NOTE_RETURN')) NOT NULL,
      amount REAL NOT NULL,
      reference_no TEXT,
      payment_mode TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS debit_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      note_no TEXT UNIQUE NOT NULL,
      distributor_id INTEGER NOT NULL REFERENCES distributors(id),
      note_date TEXT NOT NULL,
      subtotal REAL NOT NULL,
      tax_amount REAL NOT NULL DEFAULT 0,
      total_claim_amount REAL NOT NULL,
      status TEXT CHECK(status IN ('ISSUED', 'ACCEPTED', 'SETTLED', 'REJECTED')) DEFAULT 'ISSUED',
      reason TEXT DEFAULT 'EXPIRY_RETURN',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS debit_note_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      debit_note_id INTEGER NOT NULL REFERENCES debit_notes(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      batch_no TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      qty INTEGER NOT NULL,
      purchase_rate REAL NOT NULL,
      gst_rate REAL DEFAULT 12,
      taxable_amount REAL NOT NULL,
      cgst_amount REAL NOT NULL,
      sgst_amount REAL NOT NULL,
      total_amount REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_no TEXT UNIQUE NOT NULL,
      original_invoice_no TEXT,
      customer_name TEXT DEFAULT 'Cash Customer',
      customer_mobile TEXT,
      return_date TEXT NOT NULL,
      refund_mode TEXT CHECK(refund_mode IN ('CASH', 'KHATA_CREDIT', 'UPI')) DEFAULT 'CASH',
      total_refund_amount REAL NOT NULL,
      reason TEXT DEFAULT 'PATIENT_UNUSED',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sales_return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sales_return_id INTEGER NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      batch_id INTEGER REFERENCES batches(id),
      batch_no TEXT NOT NULL,
      qty INTEGER NOT NULL,
      refund_rate REAL NOT NULL,
      total_amount REAL NOT NULL
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
      store_name TEXT NOT NULL DEFAULT 'Divya Medical Stores',
      dl_number TEXT DEFAULT '20B/21B-MH-SOL-194829',
      gstin TEXT DEFAULT '27AABCA1234F1Z9',
      address TEXT DEFAULT 'Main Market, Solapur Road',
      phone TEXT DEFAULT '9373545169',
      upi_id TEXT DEFAULT 'divyakale@upi',
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

    CREATE TABLE IF NOT EXISTS shortage_diary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      medicine_name TEXT NOT NULL,
      generic_salt TEXT,
      current_stock INTEGER DEFAULT 0,
      min_stock_alert INTEGER DEFAULT 10,
      suggested_qty INTEGER DEFAULT 10,
      distributor_id INTEGER REFERENCES distributors(id) ON DELETE SET NULL,
      distributor_name TEXT,
      status TEXT CHECK(status IN ('PENDING', 'ORDERED', 'INWARDED')) DEFAULT 'PENDING',
      source TEXT CHECK(source IN ('AUTO_STOCK_ALERT', 'COUNTER_MANUAL', 'CUSTOMER_DEMAND')) DEFAULT 'AUTO_STOCK_ALERT',
      notes TEXT,
      ordered_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS backup_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      backup_path TEXT NOT NULL,
      backup_type TEXT DEFAULT 'local',
      file_size_bytes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'success',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS accounting_vouchers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_no TEXT NOT NULL UNIQUE,
      voucher_type TEXT CHECK(voucher_type IN ('PAYMENT', 'RECEIPT', 'CONTRA', 'JOURNAL')) NOT NULL,
      date TEXT NOT NULL,
      party_type TEXT CHECK(party_type IN ('DISTRIBUTOR', 'CUSTOMER', 'EXPENSE', 'BANK', 'OTHER')) NOT NULL,
      party_id INTEGER,
      party_name TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_mode TEXT CHECK(payment_mode IN ('CASH', 'BANK', 'UPI', 'CHEQUE')) DEFAULT 'CASH',
      reference_no TEXT,
      narration TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_backup_logs_created ON backup_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_vouchers_date ON accounting_vouchers(date);
    CREATE INDEX IF NOT EXISTS idx_vouchers_type ON accounting_vouchers(voucher_type);

    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE INDEX IF NOT EXISTS idx_products_salt ON products(generic_salt);
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_batches_product_id ON batches(product_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at);
    CREATE INDEX IF NOT EXISTS idx_shortage_status ON shortage_diary(status);
    CREATE INDEX IF NOT EXISTS idx_shortage_distributor ON shortage_diary(distributor_id);
  `);

  // Auto-migrate any legacy store names
  try {
    db.prepare(`UPDATE store_profile SET store_name = 'Divya Medical Stores', phone = '9373545169' WHERE store_name = 'Anand Medical & General Stores'`).run();
    db.prepare(`UPDATE license SET store_name = 'Divya Medical Stores', owner_phone = '9373545169' WHERE store_name = 'Anand Medical & General Stores'`).run();
    const divya = db.prepare(`SELECT * FROM users WHERE username = 'Divya_kale'`).get();
    if (!divya) {
      db.prepare(`INSERT INTO users (username, display_name, pin_code, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, ?)`).run(
        'Divya_kale', 'Divya kale', '1111', 'owner123', 'store_admin', 1
      );
    }
  } catch (e) {}

  // Auto-migrate schema updates for FDA H1 & GST columns
  try {
    const invCols = db.prepare("PRAGMA table_info(invoices)").all();
    if (!invCols.some(c => c.name === 'customer_address')) {
      db.exec("ALTER TABLE invoices ADD COLUMN customer_address TEXT;");
    }
    if (!invCols.some(c => c.name === 'doctor_reg_no')) {
      db.exec("ALTER TABLE invoices ADD COLUMN doctor_reg_no TEXT;");
    }
    if (!invCols.some(c => c.name === 'invoice_type')) {
      db.exec("ALTER TABLE invoices ADD COLUMN invoice_type TEXT DEFAULT 'RETAIL';");
    }
    if (!invCols.some(c => c.name === 'notes')) {
      db.exec("ALTER TABLE invoices ADD COLUMN notes TEXT;");
    }
  } catch (e) {}

  try {
    const prodCols = db.prepare("PRAGMA table_info(products)").all();
    if (!prodCols.some(c => c.name === 'gst_rate')) {
      db.exec("ALTER TABLE products ADD COLUMN gst_rate REAL DEFAULT 12;");
    }
    if (!prodCols.some(c => c.name === 'hsn_code')) {
      db.exec("ALTER TABLE products ADD COLUMN hsn_code TEXT DEFAULT '3004';");
    }
  } catch (e) {}

  try {
    const itemCols = db.prepare("PRAGMA table_info(invoice_items)").all();
    if (!itemCols.some(c => c.name === 'gst_rate')) {
      db.exec("ALTER TABLE invoice_items ADD COLUMN gst_rate REAL DEFAULT 12;");
    }
  } catch (e) {}

  try {
    const distCols = db.prepare("PRAGMA table_info(distributors)").all();
    if (!distCols.some(c => c.name === 'dl_number')) {
      db.exec("ALTER TABLE distributors ADD COLUMN dl_number TEXT;");
    }
    if (!distCols.some(c => c.name === 'address')) {
      db.exec("ALTER TABLE distributors ADD COLUMN address TEXT;");
    }
    if (!distCols.some(c => c.name === 'payment_terms_days')) {
      db.exec("ALTER TABLE distributors ADD COLUMN payment_terms_days INTEGER DEFAULT 21;");
    }
  } catch (e) {}

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS shortage_diary (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        medicine_name TEXT NOT NULL,
        generic_salt TEXT,
        current_stock INTEGER DEFAULT 0,
        min_stock_alert INTEGER DEFAULT 10,
        suggested_qty INTEGER DEFAULT 10,
        distributor_id INTEGER REFERENCES distributors(id) ON DELETE SET NULL,
        distributor_name TEXT,
        status TEXT CHECK(status IN ('PENDING', 'ORDERED', 'INWARDED')) DEFAULT 'PENDING',
        source TEXT CHECK(source IN ('AUTO_STOCK_ALERT', 'COUNTER_MANUAL', 'CUSTOMER_DEMAND')) DEFAULT 'AUTO_STOCK_ALERT',
        notes TEXT,
        ordered_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_shortage_status ON shortage_diary(status);
      CREATE INDEX IF NOT EXISTS idx_shortage_distributor ON shortage_diary(distributor_id);

      CREATE TABLE IF NOT EXISTS cash_drawers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shift_date TEXT NOT NULL,
        cashier_name TEXT DEFAULT 'Main Cashier',
        opening_float REAL DEFAULT 0,
        cash_sales_amount REAL DEFAULT 0,
        khata_receipts_amount REAL DEFAULT 0,
        cash_expenses_amount REAL DEFAULT 0,
        expected_cash REAL DEFAULT 0,
        actual_cash REAL DEFAULT 0,
        discrepancy_amount REAL DEFAULT 0,
        denominations TEXT DEFAULT '{}',
        notes TEXT,
        status TEXT CHECK(status IN ('OPEN', 'CLOSED')) DEFAULT 'OPEN',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME
      );
      CREATE INDEX IF NOT EXISTS idx_drawers_date ON cash_drawers(shift_date);
      CREATE INDEX IF NOT EXISTS idx_drawers_status ON cash_drawers(status);
    `);
  } catch (e) {}
}

function seedInitialData() {
  // 1. Seed Store Profile
  const storeProfileCount = db.prepare('SELECT COUNT(*) as count FROM store_profile').get().count;
  if (storeProfileCount === 0) {
    db.prepare(`
      INSERT INTO store_profile (id, store_name, dl_number, gstin, address, phone, upi_id, printer_type, auto_print)
      VALUES (1, 'Divya Medical Stores', '20B/21B-MH-SOL-194829', '27AABCA1234F1Z9', 'Main Market, Solapur Road', '9373545169', 'divyakale@upi', '80mm', 0)
    `).run();
  }

  // 2. Seed Default License (Valid 1-Year Pro Plan for Divya Medical)
  const licenseCount = db.prepare('SELECT COUNT(*) as count FROM license').get().count;
  if (licenseCount === 0) {
    const hwid = getHardwareId();
    const expiresAt = new Date(Date.now() + 365 * 86400000).toISOString();
    const payload = {
      storeName: 'Divya Medical Stores',
      ownerPhone: '9373545169',
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

    // Store Owner (Divya kale)
    insertUser.run('Divya_kale', 'Divya kale', '1111', 'owner123', 'store_admin', 1);
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
    insertDistributor.run('Mahaveer Pharma Distributors', '9822012345', '27AABCM1234P1Z2', 0.00);
    insertDistributor.run('Sunlife Healthcare Agency', '9423098765', '27AABCS9876Q1Z8', 0.00);
    insertDistributor.run('Balaji FMCG & Surgicals', '9860011223', '27AABCB4321R1Z5', 0.00);
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
      INSERT INTO invoices (
        invoice_no, customer_name, customer_mobile, customer_address, 
        doctor_name, doctor_reg_no, payment_mode, total_amount, discount, 
        final_amount, invoice_type, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const invRes = insertInv.run(
      invoiceNo,
      invoiceData.customer_name || 'Cash Customer',
      invoiceData.customer_mobile || null,
      invoiceData.customer_address || null,
      invoiceData.doctor_name || null,
      invoiceData.doctor_reg_no || null,
      invoiceData.payment_mode || 'cash',
      invoiceData.total_amount,
      invoiceData.discount || 0,
      invoiceData.final_amount,
      invoiceData.invoice_type || 'RETAIL',
      invoiceData.notes || null
    );

    const invoiceId = invRes.lastInsertRowid;

    const insertItem = db.prepare(`
      INSERT INTO invoice_items (invoice_id, product_id, batch_id, is_loose_tablet, qty, unit_price, total_price, gst_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const decrementStock = db.prepare(`
      UPDATE batches SET stock_qty = MAX(0, stock_qty - ?) WHERE id = ?
    `);

    for (const item of items) {
      insertItem.run(
        invoiceId,
        item.product_id || item.id,
        item.batch_id || null,
        item.is_loose_tablet ? 1 : 0,
        item.qty,
        item.unit_price,
        item.total_price,
        item.gst_rate !== undefined ? item.gst_rate : 12
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
    SELECT ii.*, p.name as product_name, p.generic_salt, p.strip_size, p.is_schedule_h1, b.batch_no, b.expiry_date
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
    INSERT INTO distributors (name, phone, gstin, dl_number, address, payment_terms_days, pending_balance)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const res = stmt.run(
    data.name,
    data.phone || null,
    data.gstin || null,
    data.dl_number || null,
    data.address || null,
    data.payment_terms_days || 21,
    data.pending_balance || 0
  );
  return { id: res.lastInsertRowid, ...data };
}

function updateDistributor(id, data) {
  if (!db) initDatabase();
  db.prepare(`
    UPDATE distributors
    SET name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        gstin = COALESCE(?, gstin),
        dl_number = COALESCE(?, dl_number),
        address = COALESCE(?, address),
        payment_terms_days = COALESCE(?, payment_terms_days)
    WHERE id = ?
  `).run(data.name, data.phone, data.gstin, data.dl_number, data.address, data.payment_terms_days, id);
  return db.prepare(`SELECT * FROM distributors WHERE id = ?`).get(id);
}

function deleteDistributor(id) {
  if (!db) initDatabase();
  db.prepare(`DELETE FROM distributors WHERE id = ?`).run(id);
  return { success: true };
}

function getPurchases(limit = 50) {
  if (!db) initDatabase();
  const rows = db.prepare(`
    SELECT p.*, d.name as distributor_name, d.phone as distributor_phone,
           (SELECT COUNT(*) FROM purchase_items WHERE purchase_id = p.id) as item_count
    FROM purchases p
    LEFT JOIN distributors d ON p.distributor_id = d.id
    ORDER BY p.id DESC
    LIMIT ?
  `).all(limit);
  return rows.map(r => ({ ...r, bill_no: r.purchase_invoice_no }));
}

function getPurchaseDetails(purchaseId) {
  if (!db) initDatabase();
  const purchase = db.prepare(`
    SELECT p.*, d.name as distributor_name, d.phone as distributor_phone, d.gstin as distributor_gstin, d.dl_number as distributor_dl
    FROM purchases p
    LEFT JOIN distributors d ON p.distributor_id = d.id
    WHERE p.id = ?
  `).get(purchaseId);
  if (!purchase) return null;

  const items = db.prepare(`
    SELECT pi.*, pr.name as product_name, pr.generic_salt, pr.category, pr.rack_location
    FROM purchase_items pi
    LEFT JOIN products pr ON pi.product_id = pr.id
    WHERE pi.purchase_id = ?
  `).all(purchaseId);

  return { ...purchase, bill_no: purchase.purchase_invoice_no, items };
}

function createPurchase(purchaseData, items) {
  if (!db) initDatabase();
  const tx = db.transaction(() => {
    const invoiceNo = purchaseData.purchase_invoice_no || purchaseData.bill_no || (`BILL-${Date.now()}`);
    const invoiceDate = purchaseData.invoice_date || purchaseData.bill_date || new Date().toISOString().slice(0, 10);
    const subtotal = parseFloat(purchaseData.subtotal) || 0;
    const taxAmount = purchaseData.tax_amount != null ? parseFloat(purchaseData.tax_amount) : (parseFloat(purchaseData.total_gst) || 0);
    const discount = purchaseData.discount != null ? parseFloat(purchaseData.discount) : (parseFloat(purchaseData.total_discount) || 0);
    const netAmount = purchaseData.net_amount != null ? parseFloat(purchaseData.net_amount) : (subtotal + taxAmount - discount);
    const paidAmount = parseFloat(purchaseData.paid_amount) || 0;

    const stmtPurchase = db.prepare(`
      INSERT INTO purchases (
        purchase_invoice_no, distributor_id, invoice_date, payment_status, payment_mode,
        subtotal, tax_amount, discount, net_amount, paid_amount, due_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const resPurchase = stmtPurchase.run(
      invoiceNo,
      purchaseData.distributor_id,
      invoiceDate,
      purchaseData.payment_status || 'UNPAID',
      purchaseData.payment_mode || 'credit',
      subtotal,
      taxAmount,
      discount,
      netAmount,
      paidAmount,
      purchaseData.due_date || null,
      purchaseData.notes || null
    );

    const purchaseId = resPurchase.lastInsertRowid;

    const stmtItem = db.prepare(`
      INSERT INTO purchase_items (
        purchase_id, product_id, batch_no, expiry_date, qty, free_qty,
        purchase_rate, mrp, gst_rate, discount_percent, landing_cost_per_unit, total_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const findBatch = db.prepare(`
      SELECT * FROM batches WHERE product_id = ? AND batch_no = ?
    `);

    const updateBatch = db.prepare(`
      UPDATE batches
      SET stock_qty = stock_qty + ?, purchase_rate = ?, mrp = ?, expiry_date = ?
      WHERE id = ?
    `);

    const insertBatch = db.prepare(`
      INSERT INTO batches (product_id, batch_no, expiry_date, purchase_rate, mrp, stock_qty)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      const totalUnits = (parseInt(item.qty, 10) || 0) + (parseInt(item.free_qty, 10) || 0);
      const totalAmount = item.total_amount != null ? parseFloat(item.total_amount) : 0;
      const landingCost = totalUnits > 0 ? totalAmount / totalUnits : (item.purchase_rate || 0);
      const gstRate = item.gst_rate != null ? parseFloat(item.gst_rate) : (parseFloat(item.gst_pct) || 12);
      const discountPercent = item.discount_percent != null ? parseFloat(item.discount_percent) : (parseFloat(item.discount_pct) || 0);

      stmtItem.run(
        purchaseId,
        item.product_id,
        item.batch_no,
        item.expiry_date,
        item.qty,
        item.free_qty || 0,
        item.purchase_rate,
        item.mrp,
        gstRate,
        discountPercent,
        Number(landingCost.toFixed(2)),
        totalAmount
      );

      // Inward into inventory batches
      const existing = findBatch.get(item.product_id, item.batch_no);
      if (existing) {
        updateBatch.run(totalUnits, item.purchase_rate, item.mrp, item.expiry_date, existing.id);
      } else {
        insertBatch.run(item.product_id, item.batch_no, item.expiry_date, item.purchase_rate, item.mrp, totalUnits);
      }
    }

    // Ledger Entry for Purchase Bill
    db.prepare(`
      INSERT INTO distributor_ledger (distributor_id, type, amount, reference_no, payment_mode, notes)
      VALUES (?, 'PURCHASE_BILL', ?, ?, ?, ?)
    `).run(
      purchaseData.distributor_id,
      netAmount,
      invoiceNo,
      purchaseData.payment_mode || 'credit',
      `Inward Bill #${invoiceNo}`
    );

    // Update distributor pending debt
    const unpaidAmount = Math.max(0, netAmount - paidAmount);
    db.prepare(`
      UPDATE distributors
      SET pending_balance = pending_balance + ?
      WHERE id = ?
    `).run(unpaidAmount, purchaseData.distributor_id);

    return getPurchaseDetails(purchaseId);
  });

  return tx();
}

function getDistributorLedger(distributorId) {
  if (!db) initDatabase();
  const distributor = db.prepare(`SELECT * FROM distributors WHERE id = ?`).get(distributorId);
  if (!distributor) return null;

  const entries = db.prepare(`
    SELECT * FROM distributor_ledger
    WHERE distributor_id = ?
    ORDER BY id DESC
  `).all(distributorId);

  const purchases = db.prepare(`
    SELECT * FROM purchases
    WHERE distributor_id = ?
    ORDER BY id DESC
  `).all(distributorId);

  return { distributor, entries, purchases, transactions: entries };
}

function addDistributorPayment(distributorId, amount, paymentMode = 'NEFT_UPI', referenceNo = '', note = '') {
  if (!db) initDatabase();
  const numAmount = parseFloat(amount);
  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE distributors
      SET pending_balance = MAX(0, pending_balance - ?)
      WHERE id = ?
    `).run(numAmount, distributorId);

    db.prepare(`
      INSERT INTO distributor_ledger (distributor_id, type, amount, reference_no, payment_mode, notes)
      VALUES (?, 'PAYMENT', ?, ?, ?, ?)
    `).run(distributorId, numAmount, referenceNo, paymentMode, note || 'Payment Settled');

    const updated = db.prepare(`SELECT * FROM distributors WHERE id = ?`).get(distributorId);
    return { success: true, distributor: updated };
  });
  return tx();
}

function getPurchaseSummary() {
  if (!db) initDatabase();
  const totalBills = db.prepare(`SELECT COUNT(*) as count, COALESCE(SUM(net_amount), 0) as total_spent FROM purchases`).get();
  const totalPayable = db.prepare(`SELECT COALESCE(SUM(pending_balance), 0) as total_payable FROM distributors`).get();
  const activeDistributors = db.prepare(`SELECT COUNT(*) as count FROM distributors`).get();

  return {
    total_bills: totalBills.count,
    total_spent: totalBills.total_spent,
    total_purchases_month: totalBills.total_spent,
    total_payable: totalPayable.total_payable,
    total_payable_balance: totalPayable.total_payable,
    distributor_count: activeDistributors.count
  };
}

function getDebitNotes(limit = 50) {
  if (!db) initDatabase();
  return db.prepare(`
    SELECT dn.*, d.name as distributor_name, d.phone as distributor_phone, d.gstin as distributor_gstin,
           (SELECT COUNT(*) FROM debit_note_items WHERE debit_note_id = dn.id) as item_count
    FROM debit_notes dn
    LEFT JOIN distributors d ON dn.distributor_id = d.id
    ORDER BY dn.id DESC
    LIMIT ?
  `).all(limit);
}

function getDebitNoteDetails(noteId) {
  if (!db) initDatabase();
  const note = db.prepare(`
    SELECT dn.*, 
      COALESCE(d.name, 'Distributor') as distributor_name, 
      COALESCE(d.phone, '') as distributor_phone, 
      COALESCE(d.gstin, '') as distributor_gstin, 
      COALESCE(d.dl_number, '') as distributor_dl, 
      COALESCE(d.address, '') as distributor_address
    FROM debit_notes dn
    LEFT JOIN distributors d ON dn.distributor_id = d.id
    WHERE dn.id = ?
  `).get(noteId);
  if (!note) return null;

  const items = db.prepare(`
    SELECT dni.*, pr.name as product_name, pr.generic_salt, pr.category
    FROM debit_note_items dni
    LEFT JOIN products pr ON dni.product_id = pr.id
    WHERE dni.debit_note_id = ?
  `).all(noteId);

  return { ...note, items };
}

function createDebitNote(noteData, items) {
  if (!db) initDatabase();
  const tx = db.transaction(() => {
    const noteNo = noteData.note_no || (`DN-${new Date().toISOString().slice(0, 7).replace('-', '')}-${String(Date.now()).slice(-4)}`);
    const noteDate = noteData.note_date || new Date().toISOString().slice(0, 10);
    const subtotal = parseFloat(noteData.subtotal) || 0;
    const taxAmount = noteData.tax_amount != null ? parseFloat(noteData.tax_amount) : (parseFloat(noteData.total_tax) || 0);
    const totalClaimAmount = noteData.total_claim_amount != null ? parseFloat(noteData.total_claim_amount) : (subtotal + taxAmount);

    const stmtNote = db.prepare(`
      INSERT INTO debit_notes (
        note_no, distributor_id, note_date, subtotal, tax_amount, total_claim_amount, status, reason, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const resNote = stmtNote.run(
      noteNo,
      noteData.distributor_id,
      noteDate,
      subtotal,
      taxAmount,
      totalClaimAmount,
      noteData.status || 'ISSUED',
      noteData.reason || 'EXPIRY_RETURN',
      noteData.notes || null
    );

    const debitNoteId = resNote.lastInsertRowid;

    const stmtItem = db.prepare(`
      INSERT INTO debit_note_items (
        debit_note_id, product_id, batch_no, expiry_date, qty, purchase_rate, gst_rate,
        taxable_amount, cgst_amount, sgst_amount, total_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const deductBatch = db.prepare(`
      UPDATE batches
      SET stock_qty = MAX(0, stock_qty - ?)
      WHERE product_id = ? AND batch_no = ?
    `);

    const updateProductTotal = db.prepare(`
      UPDATE products
      SET total_stock = (SELECT COALESCE(SUM(stock_qty), 0) FROM batches WHERE product_id = ?)
      WHERE id = ?
    `);

    for (const item of items) {
      const qty = parseInt(item.qty, 10) || 0;
      let productId = item.product_id;
      if (!productId && item.batch_no) {
        const found = db.prepare(`SELECT product_id FROM batches WHERE batch_no = ? LIMIT 1`).get(item.batch_no);
        if (found) productId = found.product_id;
      }
      const rate = parseFloat(item.purchase_rate) || 0;
      const gstRate = item.gst_rate != null ? parseFloat(item.gst_rate) : (parseFloat(item.gst_pct) || 12);
      const taxable = item.taxable_amount != null ? parseFloat(item.taxable_amount) : (qty * rate);
      const cgst = item.cgst_amount != null ? parseFloat(item.cgst_amount) : ((taxable * (gstRate / 2)) / 100);
      const sgst = item.sgst_amount != null ? parseFloat(item.sgst_amount) : ((taxable * (gstRate / 2)) / 100);
      const totalAmount = item.total_amount != null ? parseFloat(item.total_amount) : (taxable + cgst + sgst);

      stmtItem.run(
        debitNoteId,
        productId,
        item.batch_no,
        item.expiry_date,
        qty,
        rate,
        gstRate,
        taxable,
        cgst,
        sgst,
        totalAmount
      );

      // Deduct returned quantity from active stock
      deductBatch.run(qty, productId, item.batch_no);
      updateProductTotal.run(productId, productId);
    }

    // Ledger Entry for Debit Note Return
    db.prepare(`
      INSERT INTO distributor_ledger (distributor_id, type, amount, reference_no, payment_mode, notes)
      VALUES (?, 'DEBIT_NOTE_RETURN', ?, ?, 'ADJUSTMENT', ?)
    `).run(
      noteData.distributor_id,
      totalClaimAmount,
      noteNo,
      `GST Expiry Return Claim #${noteNo} (${items.length} items)`
    );

    // Auto-deduct from distributor pending debt (आपले देणे कमी करा)
    db.prepare(`
      UPDATE distributors
      SET pending_balance = MAX(0, pending_balance - ?)
      WHERE id = ?
    `).run(totalClaimAmount, noteData.distributor_id);

    return getDebitNoteDetails(debitNoteId);
  });

  return tx();
}

function getScheduleH1Register(filters = {}) {
  if (!db) initDatabase();
  let sql = `
    SELECT 
      ii.id as item_id,
      i.id as invoice_id,
      i.invoice_no,
      i.created_at as dispensed_at,
      i.customer_name as patient_name,
      i.customer_mobile as patient_mobile,
      COALESCE(i.customer_address, 'Ghoti') as patient_address,
      COALESCE(i.doctor_name, 'Prescribing Physician') as doctor_name,
      COALESCE(i.doctor_reg_no, 'MMC-REG-PENDING') as doctor_reg_no,
      p.id as product_id,
      p.name as medicine_name,
      p.generic_salt,
      p.strip_size,
      COALESCE(b.batch_no, 'NA') as batch_no,
      COALESCE(b.expiry_date, 'NA') as expiry_date,
      ii.is_loose_tablet,
      ii.qty,
      ii.unit_price,
      ii.total_price
    FROM invoice_items ii
    JOIN invoices i ON ii.invoice_id = i.id
    JOIN products p ON ii.product_id = p.id
    LEFT JOIN batches b ON ii.batch_id = b.id
    WHERE p.is_schedule_h1 = 1
  `;
  const params = [];

  if (filters.startDate) {
    sql += ` AND date(i.created_at) >= date(?)`;
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    sql += ` AND date(i.created_at) <= date(?)`;
    params.push(filters.endDate);
  }
  if (filters.search && filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    sql += ` AND (
      p.name LIKE ? OR 
      p.generic_salt LIKE ? OR 
      i.doctor_name LIKE ? OR 
      i.doctor_reg_no LIKE ? OR 
      i.customer_name LIKE ? OR 
      i.customer_address LIKE ? OR 
      b.batch_no LIKE ? OR 
      i.invoice_no LIKE ?
    )`;
    params.push(term, term, term, term, term, term, term, term);
  }

  sql += ` ORDER BY i.created_at DESC`;

  return db.prepare(sql).all(...params);
}

function getGstTaxSummary(period = {}) {
  if (!db) initDatabase();

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

  // 1. OUTWARD SUPPLIES (Sales / Output GST)
  const outwardItems = db.prepare(`
    SELECT 
      ii.id,
      ii.total_price,
      COALESCE(ii.gst_rate, 12) as gst_rate,
      i.created_at,
      i.invoice_no
    FROM invoice_items ii
    JOIN invoices i ON ii.invoice_id = i.id
    WHERE date(i.created_at) >= date(?) AND date(i.created_at) <= date(?)
  `).all(startDate, endDate);

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

  for (const it of outwardItems) {
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
  }

  // 2. INWARD SUPPLIES (Purchases / Input Tax Credit - ITC)
  const inwardItems = db.prepare(`
    SELECT 
      pi.id,
      pi.purchase_rate,
      pi.qty,
      pi.discount_percent,
      COALESCE(pi.gst_rate, 12) as gst_rate,
      pi.total_amount,
      p.invoice_date,
      p.purchase_invoice_no
    FROM purchase_items pi
    JOIN purchases p ON pi.purchase_id = p.id
    WHERE date(p.invoice_date) >= date(?) AND date(p.invoice_date) <= date(?)
  `).all(startDate, endDate);

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

  for (const it of inwardItems) {
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
  }

  // 3. ITC REVERSALS (Sec 34 Expiry Debit Notes)
  const debitItems = db.prepare(`
    SELECT 
      dni.id,
      dni.taxable_value,
      COALESCE(dni.gst_rate, 12) as gst_rate,
      dni.cgst_amount,
      dni.sgst_amount,
      dni.total_claim,
      dn.note_date,
      dn.debit_note_no
    FROM debit_note_items dni
    JOIN debit_notes dn ON dni.debit_note_id = dn.id
    WHERE date(dn.note_date) >= date(?) AND date(dn.note_date) <= date(?)
  `).all(startDate, endDate);

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

  for (const it of debitItems) {
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
  }

  // 4. NET GST RECONCILIATION
  const totalEligibleItc = (totalInwardCgstItc + totalInwardSgstItc);
  const totalReversedItc = (totalReversedCgst + totalReversedSgst);
  const netCgstItc = Math.max(0, totalInwardCgstItc - totalReversedCgst);
  const netSgstItc = Math.max(0, totalInwardSgstItc - totalReversedSgst);
  const netEligibleItc = netCgstItc + netSgstItc;

  const totalOutputTax = totalOutputCgst + totalOutputSgst;
  const netCgstPayable = Math.max(0, totalOutputCgst - netCgstItc);
  const netSgstPayable = Math.max(0, totalOutputSgst - netSgstItc);
  const netGstPayable = netCgstPayable + netSgstPayable;

  const itcCreditCarriedForward = Math.max(0, netEligibleItc - totalOutputTax);

  // 5. "40 GST" - AGGREGATE TURNOVER THRESHOLD TRACKER (Sec 22 CGST Act)
  const curDate = new Date(startDate);
  const curMonth = curDate.getMonth();
  const curYear = curDate.getFullYear();
  const fyStartYear = curMonth >= 3 ? curYear : curYear - 1;
  const fyEndYear = fyStartYear + 1;
  const fyStartDate = `${fyStartYear}-04-01`;
  const fyEndDate = `${fyEndYear}-03-31`;

  const fySalesRow = db.prepare(`
    SELECT COALESCE(SUM(final_amount), 0) as total_turnover, COUNT(id) as invoice_count
    FROM invoices
    WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
  `).get(fyStartDate, fyEndDate);

  const annualTurnover = fySalesRow ? fySalesRow.total_turnover : 0;
  const turnoverLimit = 4000000; // ₹40 Lakhs
  const turnoverPercentage = Math.min(100, (annualTurnover / turnoverLimit) * 100);
  const remainingAllowance = Math.max(0, turnoverLimit - annualTurnover);

  let turnoverStatus = 'SAFE';
  if (annualTurnover >= turnoverLimit) {
    turnoverStatus = 'EXCEEDED';
  } else if (annualTurnover >= 3000000) {
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
      invoiceCount: outwardItems.length
    },
    inward: {
      grossPurchases: Number(totalInwardGross.toFixed(2)),
      taxableValue: Number(totalInwardTaxable.toFixed(2)),
      cgstItc: roundedInwardCgst,
      sgstItc: roundedInwardSgst,
      totalItc: roundedInwardTotalItc,
      slabs: inwardSlabs,
      itemCount: inwardItems.length
    },
    itcReversals: {
      grossClaim: Number(totalReversedGross.toFixed(2)),
      taxableValue: Number(totalReversedTaxable.toFixed(2)),
      reversedCgst: roundedRevCgst,
      reversedSgst: roundedRevSgst,
      totalReversedItc: roundedRevTotal,
      slabs: reversalSlabs,
      itemCount: debitItems.length
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
      annualTurnover: Number(annualTurnover.toFixed(2)),
      remainingAllowance: Number(remainingAllowance.toFixed(2)),
      turnoverPercentage: Number(turnoverPercentage.toFixed(2)),
      status: turnoverStatus,
      fyLabel: `FY ${fyStartYear}-${String(fyEndYear).slice(2)}`,
      fyStartDate,
      fyEndDate,
      invoiceCount: fySalesRow ? fySalesRow.invoice_count : 0
    }
  };
}

function syncAutoShortages() {
  if (!db) initDatabase();
  const prods = db.prepare(`
    SELECT 
      p.id, 
      p.name, 
      p.generic_salt, 
      COALESCE(p.min_stock_alert, 10) as min_stock_alert,
      COALESCE((SELECT SUM(stock_qty) FROM batches WHERE product_id = p.id), 0) as total_stock
    FROM products p
  `).all();

  let syncedCount = 0;
  const stmtCheck = db.prepare(`
    SELECT id, status FROM shortage_diary 
    WHERE product_id = ? AND status IN ('PENDING', 'ORDERED')
    ORDER BY id DESC LIMIT 1
  `);
  const stmtUpdateStock = db.prepare(`
    UPDATE shortage_diary SET current_stock = ?, min_stock_alert = ? WHERE id = ?
  `);
  const stmtFindDist = db.prepare(`
    SELECT p.distributor_id, d.name as distributor_name
    FROM purchase_items pi
    JOIN purchases p ON pi.purchase_id = p.id
    JOIN distributors d ON p.distributor_id = d.id
    WHERE pi.product_id = ?
    ORDER BY p.id DESC
    LIMIT 1
  `);
  const stmtInsert = db.prepare(`
    INSERT INTO shortage_diary (
      product_id, medicine_name, generic_salt, current_stock, min_stock_alert,
      suggested_qty, distributor_id, distributor_name, status, source, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'AUTO_STOCK_ALERT', ?)
  `);

  for (const prod of prods) {
    if (prod.total_stock <= prod.min_stock_alert) {
      const existing = stmtCheck.get(prod.id);
      if (existing) {
        stmtUpdateStock.run(prod.total_stock, prod.min_stock_alert, existing.id);
      } else {
        const lastDist = stmtFindDist.get(prod.id);
        const suggested = Math.max(10, (prod.min_stock_alert || 5) * 2);
        stmtInsert.run(
          prod.id,
          prod.name,
          prod.generic_salt || '',
          prod.total_stock,
          prod.min_stock_alert,
          suggested,
          lastDist ? lastDist.distributor_id : null,
          lastDist ? lastDist.distributor_name : null,
          `Auto-detected low stock (${prod.total_stock} <= ${prod.min_stock_alert})`
        );
        syncedCount++;
      }
    }
  }
  return { success: true, syncedCount };
}

function getShortageDiary(filters = {}) {
  if (!db) initDatabase();
  const { status, distributor_id, search } = filters;
  let sql = `
    SELECT 
      s.*,
      COALESCE(s.distributor_name, d.name) as dist_name,
      d.phone as distributor_phone,
      d.dl_number as distributor_dl
    FROM shortage_diary s
    LEFT JOIN distributors d ON s.distributor_id = d.id
    WHERE 1=1
  `;
  const params = [];

  if (status && status !== 'ALL') {
    sql += ` AND s.status = ?`;
    params.push(status);
  }
  if (distributor_id && distributor_id !== 'all') {
    if (distributor_id === 'unassigned') {
      sql += ` AND s.distributor_id IS NULL`;
    } else {
      sql += ` AND s.distributor_id = ?`;
      params.push(Number(distributor_id));
    }
  }
  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    sql += ` AND (s.medicine_name LIKE ? OR s.generic_salt LIKE ? OR s.notes LIKE ? OR s.distributor_name LIKE ? OR d.name LIKE ?)`;
    params.push(q, q, q, q, q);
  }

  sql += ` ORDER BY 
    CASE s.status 
      WHEN 'PENDING' THEN 1 
      WHEN 'ORDERED' THEN 2 
      ELSE 3 
    END,
    s.created_at DESC`;

  return db.prepare(sql).all(...params);
}

function addShortageItem(itemData) {
  if (!db) initDatabase();
  if (!itemData.medicine_name || !itemData.medicine_name.trim()) {
    throw new Error('Medicine name is required for shortage entry');
  }
  const medicineName = itemData.medicine_name.trim();
  const genericSalt = itemData.generic_salt || '';
  const currentStock = parseInt(itemData.current_stock, 10) || 0;
  const minStock = parseInt(itemData.min_stock_alert, 10) || 10;
  const suggestedQty = parseInt(itemData.suggested_qty, 10) || 10;
  const distributorId = itemData.distributor_id ? Number(itemData.distributor_id) : null;
  let distributorName = itemData.distributor_name || null;
  if (distributorId && !distributorName) {
    const d = db.prepare(`SELECT name FROM distributors WHERE id = ?`).get(distributorId);
    if (d) distributorName = d.name;
  }
  const source = itemData.source || 'COUNTER_MANUAL';
  const notes = itemData.notes || '';
  const productId = itemData.product_id ? Number(itemData.product_id) : null;

  const res = db.prepare(`
    INSERT INTO shortage_diary (
      product_id, medicine_name, generic_salt, current_stock, min_stock_alert,
      suggested_qty, distributor_id, distributor_name, status, source, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
  `).run(
    productId,
    medicineName,
    genericSalt,
    currentStock,
    minStock,
    suggestedQty,
    distributorId,
    distributorName,
    source,
    notes
  );

  return db.prepare(`
    SELECT s.*, COALESCE(s.distributor_name, d.name) as dist_name, d.phone as distributor_phone, d.dl_number as distributor_dl
    FROM shortage_diary s
    LEFT JOIN distributors d ON s.distributor_id = d.id
    WHERE s.id = ?
  `).get(res.lastInsertRowid);
}

function updateShortageItem(id, updateData) {
  if (!db) initDatabase();
  const item = db.prepare(`SELECT * FROM shortage_diary WHERE id = ?`).get(id);
  if (!item) throw new Error(`Shortage item #${id} not found`);

  const fields = [];
  const params = [];

  if (updateData.suggested_qty !== undefined) {
    fields.push('suggested_qty = ?');
    params.push(parseInt(updateData.suggested_qty, 10) || 10);
  }
  if (updateData.distributor_id !== undefined) {
    fields.push('distributor_id = ?');
    const distId = updateData.distributor_id ? Number(updateData.distributor_id) : null;
    params.push(distId);
    if (distId) {
      const d = db.prepare(`SELECT name FROM distributors WHERE id = ?`).get(distId);
      fields.push('distributor_name = ?');
      params.push(d ? d.name : (updateData.distributor_name || null));
    } else {
      fields.push('distributor_name = ?');
      params.push(null);
    }
  }
  if (updateData.notes !== undefined) {
    fields.push('notes = ?');
    params.push(updateData.notes);
  }
  if (updateData.status !== undefined) {
    fields.push('status = ?');
    params.push(updateData.status);
    if (updateData.status === 'ORDERED' && !item.ordered_at) {
      fields.push('ordered_at = CURRENT_TIMESTAMP');
    }
  }

  if (fields.length > 0) {
    params.push(id);
    db.prepare(`UPDATE shortage_diary SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  }

  return db.prepare(`
    SELECT s.*, COALESCE(s.distributor_name, d.name) as dist_name, d.phone as distributor_phone, d.dl_number as distributor_dl
    FROM shortage_diary s
    LEFT JOIN distributors d ON s.distributor_id = d.id
    WHERE s.id = ?
  `).get(id);
}

function markShortageAsOrdered(ids, distributorId) {
  if (!db) initDatabase();
  if (!Array.isArray(ids)) ids = [ids];
  if (ids.length === 0) return { success: true, count: 0 };

  let distName = null;
  if (distributorId) {
    const d = db.prepare(`SELECT name FROM distributors WHERE id = ?`).get(distributorId);
    if (d) distName = d.name;
  }

  const placeholders = ids.map(() => '?').join(',');
  if (distributorId) {
    db.prepare(`
      UPDATE shortage_diary 
      SET status = 'ORDERED', ordered_at = CURRENT_TIMESTAMP, distributor_id = ?, distributor_name = ?
      WHERE id IN (${placeholders})
    `).run(distributorId, distName, ...ids);
  } else {
    db.prepare(`
      UPDATE shortage_diary 
      SET status = 'ORDERED', ordered_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders})
    `).run(...ids);
  }

  return { success: true, count: ids.length };
}

function deleteShortageItem(id) {
  if (!db) initDatabase();
  db.prepare(`DELETE FROM shortage_diary WHERE id = ?`).run(id);
  return { success: true };
}

function getAccountingVouchers(filters = {}) {
  if (!db) initDatabase();
  let sql = `SELECT * FROM accounting_vouchers WHERE 1=1`;
  const params = [];
  if (filters.voucher_type && filters.voucher_type !== 'ALL') {
    sql += ` AND voucher_type = ?`;
    params.push(filters.voucher_type);
  }
  if (filters.startDate) {
    sql += ` AND date(date) >= date(?)`;
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    sql += ` AND date(date) <= date(?)`;
    params.push(filters.endDate);
  }
  if (filters.party_type && filters.party_type !== 'ALL') {
    sql += ` AND party_type = ?`;
    params.push(filters.party_type);
  }
  if (filters.search && filters.search.trim()) {
    const q = `%${filters.search.trim()}%`;
    sql += ` AND (voucher_no LIKE ? OR party_name LIKE ? OR narration LIKE ? OR reference_no LIKE ?)`;
    params.push(q, q, q, q);
  }
  sql += ` ORDER BY id DESC`;
  if (filters.limit) {
    sql += ` LIMIT ?`;
    params.push(parseInt(filters.limit, 10));
  }
  return db.prepare(sql).all(...params);
}

function createAccountingVoucher(data) {
  if (!db) initDatabase();
  const tx = db.transaction(() => {
    const prefixMap = {
      PAYMENT: 'PAY',
      RECEIPT: 'REC',
      CONTRA: 'CON',
      JOURNAL: 'JRN'
    };
    const prefix = prefixMap[data.voucher_type] || 'VCH';
    
    let voucherNo = data.voucher_no;
    if (!voucherNo) {
      const countRow = db.prepare(`SELECT COUNT(id) as cnt FROM accounting_vouchers WHERE voucher_type = ?`).get(data.voucher_type);
      const nextNum = (countRow ? countRow.cnt : 0) + 1;
      voucherNo = `${prefix}-${String(nextNum).padStart(4, '0')}`;
    }

    const dateStr = data.date || new Date().toISOString().slice(0, 10);
    const amount = parseFloat(data.amount) || 0;
    const paymentMode = data.payment_mode || 'CASH';

    const stmt = db.prepare(`
      INSERT INTO accounting_vouchers (
        voucher_no, voucher_type, date, party_type, party_id, party_name, amount, payment_mode, reference_no, narration
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const res = stmt.run(
      voucherNo,
      data.voucher_type,
      dateStr,
      data.party_type || 'OTHER',
      data.party_id || null,
      data.party_name,
      amount,
      paymentMode,
      data.reference_no || '',
      data.narration || ''
    );
    const voucherId = res.lastInsertRowid;

    // Cross-posting:
    // A) Payment to Distributor -> update distributor pending balance & ledger
    if (data.voucher_type === 'PAYMENT' && data.party_type === 'DISTRIBUTOR' && data.party_id) {
      addDistributorPayment(
        data.party_id,
        amount,
        paymentMode === 'CASH' ? 'CASH' : paymentMode === 'UPI' ? 'UPI' : 'CHEQUE',
        voucherNo,
        data.narration || `Voucher ${voucherNo}`
      );
    }

    // B) Receipt from Khata Customer -> update khata balance & ledger
    if (data.voucher_type === 'RECEIPT' && data.party_type === 'CUSTOMER' && data.party_id) {
      addKhataPayment(
        data.party_id,
        amount,
        data.narration || `Voucher ${voucherNo} (${paymentMode})`
      );
    }

    return db.prepare(`SELECT * FROM accounting_vouchers WHERE id = ?`).get(voucherId);
  });

  return tx();
}

function deleteAccountingVoucher(id) {
  if (!db) initDatabase();
  const vch = db.prepare(`SELECT * FROM accounting_vouchers WHERE id = ?`).get(id);
  if (!vch) return { success: false };
  db.prepare(`DELETE FROM accounting_vouchers WHERE id = ?`).run(id);
  return { success: true };
}

// -------------------------------------------------------------
// PHASE 2: ADVANCED COUNTER, STOCK LEDGER & RETURNS ENGINE
// -------------------------------------------------------------

function fastCreateProductWithBatch(data) {
  if (!db) initDatabase();
  const tx = db.transaction(() => {
    const prodStmt = db.prepare(`
      INSERT INTO products (barcode, name, generic_salt, category, rack_location, strip_size, is_schedule_h1, min_stock_alert)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const prodRes = prodStmt.run(
      data.barcode || null,
      data.name.trim(),
      data.generic_salt?.trim() || null,
      data.category || 'medicine',
      data.rack_location?.trim() || 'Rack A-1',
      parseInt(data.strip_size, 10) || 10,
      data.is_schedule_h1 ? 1 : 0,
      parseInt(data.min_stock_alert, 10) || 5
    );
    const productId = prodRes.lastInsertRowid;

    const batchStmt = db.prepare(`
      INSERT INTO batches (product_id, batch_no, expiry_date, purchase_rate, mrp, stock_qty)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const batchRes = batchStmt.run(
      productId,
      data.batch_no?.trim() || 'BATCH-01',
      data.expiry_date?.trim() || '12/28',
      parseFloat(data.purchase_rate) || 0,
      parseFloat(data.mrp) || 0,
      parseInt(data.stock_qty, 10) || 0
    );
    const batchId = batchRes.lastInsertRowid;

    return {
      success: true,
      product: {
        id: productId,
        name: data.name.trim(),
        generic_salt: data.generic_salt?.trim() || null,
        category: data.category || 'medicine',
        rack_location: data.rack_location?.trim() || 'Rack A-1',
        strip_size: parseInt(data.strip_size, 10) || 10,
        is_schedule_h1: data.is_schedule_h1 ? 1 : 0,
        min_stock_alert: parseInt(data.min_stock_alert, 10) || 5,
        total_stock: parseInt(data.stock_qty, 10) || 0
      },
      batch: {
        id: batchId,
        product_id: productId,
        batch_no: data.batch_no?.trim() || 'BATCH-01',
        expiry_date: data.expiry_date?.trim() || '12/28',
        purchase_rate: parseFloat(data.purchase_rate) || 0,
        mrp: parseFloat(data.mrp) || 0,
        stock_qty: parseInt(data.stock_qty, 10) || 0
      }
    };
  });

  return tx();
}

function getProductTransactions(productId, batchId = null) {
  if (!db) initDatabase();
  const product = db.prepare(`
    SELECT p.*, COALESCE(SUM(b.stock_qty), 0) as total_stock
    FROM products p
    LEFT JOIN batches b ON b.product_id = p.id
    WHERE p.id = ?
    GROUP BY p.id
  `).get(productId);

  if (!product) return null;

  const batches = db.prepare(`
    SELECT * FROM batches WHERE product_id = ? ORDER BY id ASC
  `).all(productId);

  // 1. Inward Purchases
  let purchaseQuery = `
    SELECT 
      p.invoice_date as date,
      'PURCHASE' as type,
      p.purchase_invoice_no as doc_no,
      d.name as party_name,
      pi.batch_no,
      (pi.qty + pi.free_qty) as in_qty,
      0 as out_qty,
      pi.purchase_rate as rate,
      pi.mrp,
      pi.total_amount,
      p.created_at
    FROM purchase_items pi
    JOIN purchases p ON p.id = pi.purchase_id
    JOIN distributors d ON d.id = p.distributor_id
    WHERE pi.product_id = ?
  `;
  const purchaseParams = [productId];
  if (batchId) {
    const selectedBatch = batches.find(b => b.id === Number(batchId));
    if (selectedBatch) {
      purchaseQuery += ` AND pi.batch_no = ?`;
      purchaseParams.push(selectedBatch.batch_no);
    }
  }

  // 2. Counter Sales
  let saleQuery = `
    SELECT 
      substr(inv.created_at, 1, 10) as date,
      CASE 
        WHEN inv.invoice_type = 'DOCTOR_SAMPLE' THEN 'DR_SAMPLE'
        WHEN inv.invoice_type = 'BREAKAGE_OUTWARD' THEN 'BREAKAGE'
        WHEN inv.invoice_type = 'HOSPITAL_SUPPLY' THEN 'HOSP_SUPPLY'
        ELSE 'SALE'
      END as type,
      inv.invoice_no as doc_no,
      inv.customer_name as party_name,
      b.batch_no,
      0 as in_qty,
      ii.qty as out_qty,
      ii.unit_price as rate,
      b.mrp,
      ii.total_price as total_amount,
      inv.created_at
    FROM invoice_items ii
    JOIN invoices inv ON inv.id = ii.invoice_id
    LEFT JOIN batches b ON b.id = ii.batch_id
    WHERE ii.product_id = ?
  `;
  const saleParams = [productId];
  if (batchId) {
    saleQuery += ` AND ii.batch_id = ?`;
    saleParams.push(batchId);
  }

  // 3. Expiry Returns (Debit Notes)
  let debitQuery = `
    SELECT 
      dn.note_date as date,
      'DEBIT_NOTE_RETURN' as type,
      dn.note_no as doc_no,
      d.name as party_name,
      dni.batch_no,
      0 as in_qty,
      dni.qty as out_qty,
      dni.purchase_rate as rate,
      0 as mrp,
      dni.total_amount,
      dn.created_at
    FROM debit_note_items dni
    JOIN debit_notes dn ON dn.id = dni.debit_note_id
    JOIN distributors d ON d.id = dn.distributor_id
    WHERE dni.product_id = ?
  `;
  const debitParams = [productId];
  if (batchId) {
    const selectedBatch = batches.find(b => b.id === Number(batchId));
    if (selectedBatch) {
      debitQuery += ` AND dni.batch_no = ?`;
      debitParams.push(selectedBatch.batch_no);
    }
  }

  // 4. Sales Returns (Customer returns)
  let salesReturnQuery = `
    SELECT 
      sr.return_date as date,
      'SALES_RETURN' as type,
      sr.return_no as doc_no,
      sr.customer_name as party_name,
      sri.batch_no,
      sri.qty as in_qty,
      0 as out_qty,
      sri.refund_rate as rate,
      0 as mrp,
      sri.total_amount,
      sr.created_at
    FROM sales_return_items sri
    JOIN sales_returns sr ON sr.id = sri.sales_return_id
    WHERE sri.product_id = ?
  `;
  const returnParams = [productId];
  if (batchId) {
    salesReturnQuery += ` AND sri.batch_id = ?`;
    returnParams.push(batchId);
  }

  const purchasesList = db.prepare(purchaseQuery).all(...purchaseParams);
  const salesList = db.prepare(saleQuery).all(...saleParams);
  const debitsList = db.prepare(debitQuery).all(...debitParams);
  let returnsList = [];
  try {
    returnsList = db.prepare(salesReturnQuery).all(...returnParams);
  } catch {}

  const allTxns = [...purchasesList, ...salesList, ...debitsList, ...returnsList];
  allTxns.sort((a, b) => new Date(a.created_at || a.date).getTime() - new Date(b.created_at || b.date).getTime());

  // Compute running balance
  let runningBalance = 0;
  const transactionsWithBalance = allTxns.map((tx, idx) => {
    runningBalance += (tx.in_qty || 0) - (tx.out_qty || 0);
    return {
      id: idx + 1,
      ...tx,
      balance_qty: runningBalance
    };
  });

  return {
    product,
    batches,
    transactions: transactionsWithBalance,
    totalIn: allTxns.reduce((sum, tx) => sum + (tx.in_qty || 0), 0),
    totalOut: allTxns.reduce((sum, tx) => sum + (tx.out_qty || 0), 0),
    currentStock: product.total_stock
  };
}

function createSalesReturn(data) {
  if (!db) initDatabase();
  const tx = db.transaction(() => {
    const count = (db.prepare(`SELECT COUNT(*) as c FROM sales_returns`).get()?.c || 0) + 1;
    const returnNo = `RET-${new Date().toISOString().slice(0, 7).replace('-', '')}-${String(count).padStart(4, '0')}`;


    const returnDate = data.return_date || new Date().toISOString().slice(0, 10);
    const refundMode = data.refund_mode || 'CASH';
    const customerName = data.customer_name || 'Cash Customer';
    const customerMobile = data.customer_mobile || null;
    const totalRefund = parseFloat(data.total_refund_amount) || 0;

    const insertReturn = db.prepare(`
      INSERT INTO sales_returns (return_no, original_invoice_no, customer_name, customer_mobile, return_date, refund_mode, total_refund_amount, reason, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const returnRes = insertReturn.run(
      returnNo,
      data.original_invoice_no || null,
      customerName,
      customerMobile,
      returnDate,
      refundMode,
      totalRefund,
      data.reason || 'PATIENT_UNUSED',
      data.notes || null
    );

    const returnId = returnRes.lastInsertRowid;

    // Insert items and replenish batch stock
    const insertItem = db.prepare(`
      INSERT INTO sales_return_items (sales_return_id, product_id, batch_id, batch_no, qty, refund_rate, total_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const updateBatch = db.prepare(`
      UPDATE batches SET stock_qty = stock_qty + ? WHERE id = ?
    `);

    for (const it of (data.items || [])) {
      insertItem.run(
        returnId,
        it.product_id,
        it.batch_id || null,
        it.batch_no || 'BATCH-01',
        it.qty,
        it.refund_rate || it.unit_price || 0,
        it.total_amount || (it.qty * (it.refund_rate || it.unit_price || 0))
      );

      if (it.batch_id) {
        updateBatch.run(it.qty, it.batch_id);
      }
    }

    // If refund_mode is KHATA_CREDIT and customer_mobile is given:
    if (refundMode === 'KHATA_CREDIT' && customerMobile) {
      const cust = db.prepare(`SELECT * FROM customers_khata WHERE mobile = ?`).get(customerMobile);
      if (cust) {
        db.prepare(`UPDATE customers_khata SET balance = balance - ? WHERE id = ?`).run(totalRefund, cust.id);
        db.prepare(`
          INSERT INTO khata_transactions (customer_id, type, amount, note)
          VALUES (?, 'CREDIT', ?, ?)
        `).run(cust.id, totalRefund, `Sales Return #${returnNo}`);
      }
    }

    return {
      success: true,
      return_id: returnId,
      return_no: returnNo,
      total_refund: totalRefund,
      items_count: data.items?.length || 0
    };
  });

  return tx();
}

function getSalesReturns() {
  if (!db) initDatabase();
  return db.prepare(`
    SELECT sr.*, 
      (SELECT COUNT(*) FROM sales_return_items sri WHERE sri.sales_return_id = sr.id) as items_count
    FROM sales_returns sr
    ORDER BY sr.id DESC
  `).all();
}

function getSalesReturnDetails(returnId) {
  if (!db) initDatabase();
  const returnRecord = db.prepare(`SELECT * FROM sales_returns WHERE id = ?`).get(returnId);
  if (!returnRecord) return null;
  const items = db.prepare(`
    SELECT sri.*, p.name as product_name, p.generic_salt, p.rack_location
    FROM sales_return_items sri
    JOIN products p ON p.id = sri.product_id
    WHERE sri.sales_return_id = ?
  `).all(returnId);
  return { ...returnRecord, items };
}

// ==========================================
// PHASE 3: DAY-END CASHIER DRAWER RECONCILIATION ("गल्ला ताळमेळ")
// ==========================================
function getDayEndDrawerSummary(dateStr = null, cashierName = 'Main Cashier') {
  if (!db) initDatabase();
  const targetDate = dateStr || new Date().toISOString().slice(0, 10);

  // 1. Sales Breakdown by Payment Mode for targetDate
  const salesSummary = db.prepare(`
    SELECT 
      COALESCE(SUM(CASE WHEN payment_mode = 'cash' THEN final_amount ELSE 0 END), 0) as cash_sales,
      COALESCE(SUM(CASE WHEN payment_mode = 'upi' THEN final_amount ELSE 0 END), 0) as upi_sales,
      COALESCE(SUM(CASE WHEN payment_mode = 'khata' THEN final_amount ELSE 0 END), 0) as khata_sales,
      COALESCE(SUM(CASE WHEN payment_mode = 'card' THEN final_amount ELSE 0 END), 0) as card_sales,
      COALESCE(SUM(final_amount), 0) as total_sales,
      COUNT(id) as total_invoices_count
    FROM invoices 
    WHERE date(created_at) = date(?)
  `).get(targetDate);

  // 2. Cash Refunds from Customer Returns
  const returnSummary = db.prepare(`
    SELECT 
      COALESCE(SUM(total_refund_amount), 0) as cash_refunds,
      COUNT(id) as return_count
    FROM sales_returns
    WHERE date(created_at) = date(?) AND refund_mode = 'CASH'
  `).get(targetDate);

  // 3. Customer Khata Cash Receipts
  const receiptsSummary = db.prepare(`
    SELECT 
      COALESCE(SUM(amount), 0) as khata_cash_receipts,
      COUNT(id) as receipts_count
    FROM accounting_vouchers
    WHERE date(date) = date(?) AND voucher_type = 'RECEIPT' AND payment_mode = 'CASH'
  `).get(targetDate);

  // 4. Cash Expenses & Cash Payments to Distributors
  const expenseSummary = db.prepare(`
    SELECT 
      COALESCE(SUM(amount), 0) as cash_expenses,
      COUNT(id) as expense_count
    FROM accounting_vouchers
    WHERE date(date) = date(?) AND voucher_type = 'PAYMENT' AND payment_mode = 'CASH'
  `).get(targetDate);

  // 5. Existing drawer record for target date (if any)
  let existingDrawer = db.prepare(`
    SELECT * FROM cash_drawers WHERE date(shift_date) = date(?) ORDER BY id DESC LIMIT 1
  `).get(targetDate);

  // If no opening float saved yet, check previous closed drawer closing cash
  let openingFloat = 0;
  if (existingDrawer) {
    openingFloat = existingDrawer.opening_float || 0;
  } else {
    const prevDrawer = db.prepare(`
      SELECT actual_cash FROM cash_drawers WHERE date(shift_date) < date(?) AND status = 'CLOSED' ORDER BY shift_date DESC LIMIT 1
    `).get(targetDate);
    if (prevDrawer && prevDrawer.actual_cash > 0) {
      openingFloat = prevDrawer.actual_cash;
    }
  }

  const cashSales = salesSummary.cash_sales;
  const khataReceipts = receiptsSummary.khata_cash_receipts;
  const cashRefunds = returnSummary.cash_refunds;
  const cashExpenses = expenseSummary.cash_expenses;

  // Expected Cash = Opening Float + Cash Sales + Khata Receipts - Cash Refunds - Cash Expenses
  const expectedCash = Number((openingFloat + cashSales + khataReceipts - cashRefunds - cashExpenses).toFixed(2));

  let actualCash = existingDrawer ? existingDrawer.actual_cash : expectedCash;
  let discrepancy = Number((actualCash - expectedCash).toFixed(2));

  let denominations = {
    c500: 0,
    c200: 0,
    c100: 0,
    c50: 0,
    c20: 0,
    c10: 0,
    coins: 0
  };

  if (existingDrawer && existingDrawer.denominations) {
    try {
      denominations = JSON.parse(existingDrawer.denominations);
    } catch (e) {}
  }

  return {
    shift_date: targetDate,
    cashier_name: existingDrawer ? existingDrawer.cashier_name : cashierName,
    opening_float: openingFloat,
    cash_sales: cashSales,
    upi_sales: salesSummary.upi_sales,
    khata_sales: salesSummary.khata_sales,
    card_sales: salesSummary.card_sales,
    total_sales: salesSummary.total_sales,
    total_invoices_count: salesSummary.total_invoices_count,
    cash_refunds: cashRefunds,
    return_count: returnSummary.return_count,
    khata_cash_receipts: khataReceipts,
    receipts_count: receiptsSummary.receipts_count,
    cash_expenses: cashExpenses,
    expense_count: expenseSummary.expense_count,
    expected_cash: expectedCash,
    actual_cash: actualCash,
    discrepancy: discrepancy,
    denominations: denominations,
    notes: existingDrawer ? existingDrawer.notes || '' : '',
    status: existingDrawer ? existingDrawer.status : 'OPEN',
    drawer_id: existingDrawer ? existingDrawer.id : null,
    closed_at: existingDrawer ? existingDrawer.closed_at : null
  };
}

function saveDayEndDrawer(data) {
  if (!db) initDatabase();
  const shiftDate = data.shift_date || new Date().toISOString().slice(0, 10);
  const cashierName = data.cashier_name || 'Main Cashier';
  const openingFloat = parseFloat(data.opening_float) || 0;
  const cashSales = parseFloat(data.cash_sales_amount || data.cash_sales) || 0;
  const khataReceipts = parseFloat(data.khata_receipts_amount || data.khata_cash_receipts) || 0;
  const cashExpenses = parseFloat(data.cash_expenses_amount || data.cash_expenses) || 0;
  const expectedCash = parseFloat(data.expected_cash) || 0;
  const actualCash = parseFloat(data.actual_cash) || 0;
  const discrepancy = Number((actualCash - expectedCash).toFixed(2));
  const denominationsJson = typeof data.denominations === 'string' 
    ? data.denominations 
    : JSON.stringify(data.denominations || {});
  const notes = data.notes || '';
  const status = data.status || 'CLOSED';

  const existing = db.prepare(`SELECT id FROM cash_drawers WHERE date(shift_date) = date(?)`).get(shiftDate);

  if (existing) {
    db.prepare(`
      UPDATE cash_drawers SET
        cashier_name = ?,
        opening_float = ?,
        cash_sales_amount = ?,
        khata_receipts_amount = ?,
        cash_expenses_amount = ?,
        expected_cash = ?,
        actual_cash = ?,
        discrepancy_amount = ?,
        denominations = ?,
        notes = ?,
        status = ?,
        closed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      cashierName, openingFloat, cashSales, khataReceipts, cashExpenses,
      expectedCash, actualCash, discrepancy, denominationsJson, notes, status, existing.id
    );
    return db.prepare(`SELECT * FROM cash_drawers WHERE id = ?`).get(existing.id);
  } else {
    const res = db.prepare(`
      INSERT INTO cash_drawers (
        shift_date, cashier_name, opening_float, cash_sales_amount,
        khata_receipts_amount, cash_expenses_amount, expected_cash,
        actual_cash, discrepancy_amount, denominations, notes, status, closed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      shiftDate, cashierName, openingFloat, cashSales,
      khataReceipts, cashExpenses, expectedCash,
      actualCash, discrepancy, denominationsJson, notes, status
    );
    return db.prepare(`SELECT * FROM cash_drawers WHERE id = ?`).get(res.lastInsertRowid);
  }
}

function getCashDrawers(filters = {}) {
  if (!db) initDatabase();
  let sql = `SELECT * FROM cash_drawers WHERE 1=1`;
  const params = [];
  if (filters.startDate) {
    sql += ` AND date(shift_date) >= date(?)`;
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    sql += ` AND date(shift_date) <= date(?)`;
    params.push(filters.endDate);
  }
  sql += ` ORDER BY shift_date DESC, id DESC`;
  if (filters.limit) {
    sql += ` LIMIT ?`;
    params.push(parseInt(filters.limit, 10));
  }
  return db.prepare(sql).all(...params);
}

// ==========================================
// PHASE 3: UNIVERSAL MASTER REPORT CRITERION FILTER (Photo 21: "Define Criterion")
// ==========================================
function getUniversalReportCriterion(criterion = {}) {
  if (!db) initDatabase();
  let sql = `
    SELECT 
      inv.id as invoice_id,
      inv.invoice_no,
      inv.invoice_type,
      inv.created_at,
      substr(inv.created_at, 1, 10) as invoice_date,
      inv.customer_name,
      inv.customer_mobile,
      inv.customer_address,
      inv.doctor_name,
      inv.payment_mode,
      inv.final_amount,
      inv.discount,
      ii.id as item_id,
      ii.qty,
      ii.unit_price,
      ii.total_price,
      p.id as product_id,
      p.name as product_name,
      p.generic_salt,
      p.category,
      p.company,
      p.rack_location,
      b.batch_no,
      b.expiry_date
    FROM invoices inv
    JOIN invoice_items ii ON ii.invoice_id = inv.id
    JOIN products p ON p.id = ii.product_id
    LEFT JOIN batches b ON b.id = ii.batch_id
    WHERE 1=1
  `;
  const params = [];

  if (criterion.saleType && criterion.saleType !== 'ALL') {
    if (['CASH', 'UPI', 'KHATA', 'CARD'].includes(criterion.saleType.toUpperCase())) {
      sql += ` AND LOWER(inv.payment_mode) = ?`;
      params.push(criterion.saleType.toLowerCase());
    } else {
      sql += ` AND UPPER(COALESCE(inv.invoice_type, 'RETAIL')) = ?`;
      params.push(criterion.saleType.toUpperCase());
    }
  }

  if (criterion.startDate) {
    sql += ` AND date(inv.created_at) >= date(?)`;
    params.push(criterion.startDate);
  }

  if (criterion.endDate) {
    sql += ` AND date(inv.created_at) <= date(?)`;
    params.push(criterion.endDate);
  }

  if (criterion.category && criterion.category !== 'ALL') {
    sql += ` AND LOWER(p.category) = ?`;
    params.push(criterion.category.toLowerCase());
  }

  if (criterion.company && criterion.company.trim()) {
    sql += ` AND LOWER(p.company) LIKE ?`;
    params.push(`%${criterion.company.trim().toLowerCase()}%`);
  }

  if (criterion.searchQuery && criterion.searchQuery.trim()) {
    const q = `%${criterion.searchQuery.trim().toLowerCase()}%`;
    sql += ` AND (LOWER(p.name) LIKE ? OR LOWER(p.generic_salt) LIKE ? OR LOWER(b.batch_no) LIKE ? OR LOWER(inv.customer_name) LIKE ? OR LOWER(inv.doctor_name) LIKE ?)`;
    params.push(q, q, q, q, q);
  }

  sql += ` ORDER BY inv.id DESC, ii.id ASC`;
  if (criterion.limit) {
    sql += ` LIMIT ?`;
    params.push(parseInt(criterion.limit, 10));
  }

  const rows = db.prepare(sql).all(...params);

  // Calculate Aggregates
  let grandTotalAmount = 0;
  let grandTotalQty = 0;
  const uniqueInvoices = new Set();

  for (const row of rows) {
    grandTotalAmount += row.total_price || 0;
    grandTotalQty += row.qty || 0;
    uniqueInvoices.add(row.invoice_id);
  }

  return {
    rows,
    total_records: rows.length,
    total_invoices: uniqueInvoices.size,
    grand_total_qty: grandTotalQty,
    grand_total_amount: Number(grandTotalAmount.toFixed(2))
  };
}

function clearAllRecords() {
  if (!db) initDatabase();
  db.prepare(`DELETE FROM invoice_items`).run();
  db.prepare(`DELETE FROM invoices`).run();
  db.prepare(`DELETE FROM khata_transactions`).run();
  db.prepare(`DELETE FROM customers_khata`).run();
  db.prepare(`DELETE FROM debit_note_items`).run();
  db.prepare(`DELETE FROM debit_notes`).run();
  db.prepare(`DELETE FROM purchase_items`).run();
  db.prepare(`DELETE FROM purchases`).run();
  db.prepare(`DELETE FROM distributor_ledger`).run();
  db.prepare(`DELETE FROM shortage_diary`).run();
  db.prepare(`DELETE FROM accounting_vouchers`).run();
  try {
    db.prepare(`DELETE FROM sales_return_items`).run();
    db.prepare(`DELETE FROM sales_returns`).run();
    db.prepare(`DELETE FROM cash_drawers`).run();
  } catch {}
  db.prepare(`UPDATE distributors SET pending_balance = 0`).run();
  return { success: true };
}

// -------------------------------------------------------------
// DUAL PC + REMOVABLE USB BACKUP & DISASTER RECOVERY ENGINE
// -------------------------------------------------------------

function getAvailableBackupDrives() {
  const platform = process.platform;
  const results = {
    pc: {
      available: true,
      path: '',
      label: 'स्थानिक संगणक हार्ड ड्राइव्ह (Local Hard Drive)'
    },
    usb: {
      available: false,
      path: '',
      label: 'यूएसबी पेनड्राइव्ह जोडलेले नाही (No USB Detected)'
    }
  };

  // Determine PC default backup directory
  if (platform === 'win32') {
    let pcBase = path.join(os.homedir(), 'Documents', 'GaavPharma_Backups');
    try {
      if (fs.existsSync('D:\\')) {
        pcBase = 'D:\\GaavPharma_Backups';
      }
    } catch {
      pcBase = path.join(os.homedir(), 'Documents', 'GaavPharma_Backups');
    }
    results.pc.path = pcBase;
    results.pc.label = `स्थानिक हार्ड ड्राइव्ह (${pcBase.startsWith('D:') ? 'D: Drive' : 'Documents Folder'})`;

    // Detect USB Removable drives: scan drive letters E: through Z:
    const driveLetters = ['E', 'F', 'G', 'H', 'I', 'J', 'U'];
    for (const letter of driveLetters) {
      const rootPath = `${letter}:\\`;
      try {
        if (fs.existsSync(rootPath)) {
          results.usb.available = true;
          results.usb.path = path.join(rootPath, 'GaavPharma_Backups');
          results.usb.label = `यूएसबी पेनड्राइव्ह जोडलेले आहे (Drive ${letter}:\\)`;
          break;
        }
      } catch (e) {
        // Continue scanning
      }
    }
  } else if (platform === 'darwin') {
    // macOS
    results.pc.path = path.join(os.homedir(), 'Documents', 'GaavPharma_Backups');
    results.pc.label = 'स्थानिक संगणक (Documents / GaavPharma_Backups)';

    try {
      if (fs.existsSync('/Volumes')) {
        const volumes = fs.readdirSync('/Volumes');
        for (const vol of volumes) {
          if (vol !== 'Macintosh HD' && !vol.startsWith('.') && vol !== 'Recovery' && vol !== 'Preboot') {
            const volPath = path.join('/Volumes', vol);
            try {
              const stat = fs.statSync(volPath);
              if (stat.isDirectory()) {
                results.usb.available = true;
                results.usb.path = path.join(volPath, 'GaavPharma_Backups');
                results.usb.label = `यूएसबी पेनड्राइव्ह जोडलेले आहे (${vol})`;
                break;
              }
            } catch {}
          }
        }
      }
    } catch (e) {}
  } else {
    // Linux
    results.pc.path = path.join(os.homedir(), 'Documents', 'GaavPharma_Backups');
    results.pc.label = 'स्थानिक संगणक (Documents / GaavPharma_Backups)';

    try {
      const user = os.userInfo().username;
      const mediaPath = path.join('/media', user);
      if (fs.existsSync(mediaPath)) {
        const mounts = fs.readdirSync(mediaPath);
        if (mounts.length > 0) {
          results.usb.available = true;
          results.usb.path = path.join(mediaPath, mounts[0], 'GaavPharma_Backups');
          results.usb.label = `यूएसबी ड्राइव्ह जोडलेले आहे (${mounts[0]})`;
        }
      }
    } catch {}
  }

  return results;
}

function pruneOldBackups(folderPath, retentionDays = 30, minKeep = 10) {
  try {
    if (!fs.existsSync(folderPath)) return 0;
    const files = fs.readdirSync(folderPath);
    const backupFiles = files
      .filter(f => f.startsWith('GaavPharma_Backup_') && (f.endsWith('.db') || f.endsWith('.json')))
      .map(f => {
        const fullPath = path.join(folderPath, f);
        try {
          const stat = fs.statSync(fullPath);
          return { name: f, path: fullPath, mtime: stat.mtimeMs };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.mtime - a.mtime); // Newest first

    if (backupFiles.length <= minKeep) {
      return 0; // Always keep at least minKeep
    }

    const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    let prunedCount = 0;

    for (let i = minKeep; i < backupFiles.length; i++) {
      if (backupFiles[i].mtime < cutoffTime) {
        try {
          fs.unlinkSync(backupFiles[i].path);
          prunedCount++;
        } catch (e) {
          console.warn('[Backup Prune] Failed to delete old backup:', backupFiles[i].path, e.message);
        }
      }
    }
    return prunedCount;
  } catch (err) {
    console.warn('[Backup Prune] error:', err.message);
    return 0;
  }
}

function createDatabaseBackup(options = {}) {
  if (!db) initDatabase();

  const backupType = options.backupType || 'manual';
  const customPath = options.customPath;
  const destinations = options.destinations || ['pc', 'usb'];

  // 1. Force WAL Checkpoint to guarantee zero uncommitted data
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
  } catch (err) {
    console.warn('[Backup] wal_checkpoint warning:', err.message);
  }

  // 2. Determine source file
  const sourceFile = currentDbFilePath || path.join(__dirname, '..', 'data', 'gaavpharma.db');
  if (!fs.existsSync(sourceFile)) {
    throw new Error(`Database source file does not exist: ${sourceFile}`);
  }

  // 3. Format filename with Store Name and Timestamp
  const store = getStoreProfile();
  const safeStore = (store?.store_name || 'GaavPharma').replace(/[^a-zA-Z0-9_-]/g, '_');
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const tsStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const filename = `GaavPharma_Backup_${safeStore}_${tsStr}.db`;

  const availableDrives = getAvailableBackupDrives();
  const targets = [];

  if (options.customPath) {
    targets.push({ type: 'custom', dir: options.customPath });
  } else {
    if (destinations.includes('pc') && availableDrives.pc.path) {
      targets.push({ type: 'pc', dir: availableDrives.pc.path });
    }
    if (destinations.includes('usb')) {
      const usbDir = options.usbPath || (availableDrives.usb.available ? availableDrives.usb.path : null);
      if (usbDir) {
        targets.push({ type: 'usb', dir: usbDir });
      } else {
        // Fallback: If USB was selected but not mounted, save secondary mirror in backup subfolder
        const fallbackUsbDir = path.join(availableDrives.pc.path || os.homedir(), 'USB_Backup_Mirror');
        targets.push({ type: 'usb', dir: fallbackUsbDir });
      }
    }
  }

  if (targets.length === 0) {
    targets.push({ type: 'pc', dir: availableDrives.pc.path });
  }

  const results = [];
  const statSource = fs.statSync(sourceFile);
  const fileSize = statSource.size;

  for (const target of targets) {
    try {
      if (!fs.existsSync(target.dir)) {
        fs.mkdirSync(target.dir, { recursive: true });
      }
      const targetFilePath = path.join(target.dir, filename);

      // Perform synchronous copy
      fs.copyFileSync(sourceFile, targetFilePath);

      // Prune backups older than 30 days in this folder
      pruneOldBackups(target.dir, 30, 10);

      // Record in backup_logs
      try {
        db.prepare(`
          INSERT INTO backup_logs (filename, backup_path, backup_type, file_size_bytes, status)
          VALUES (?, ?, ?, ?, 'success')
        `).run(filename, targetFilePath, target.type, fileSize);
      } catch (logErr) {
        console.warn('[Backup] log write warning:', logErr.message);
      }

      results.push({
        destination: target.type,
        path: targetFilePath,
        size: fileSize,
        status: 'SUCCESS'
      });
    } catch (err) {
      console.error(`[Backup] Failed to backup to ${target.dir}:`, err);
      results.push({
        destination: target.type,
        path: path.join(target.dir, filename),
        error: err.message,
        status: 'FAILED'
      });
    }
  }

  return {
    success: results.some(r => r.status === 'SUCCESS'),
    filename,
    fileSize,
    timestamp: now.toISOString(),
    results
  };
}

function getBackupHistory(limit = 50) {
  if (!db) initDatabase();
  try {
    const logs = db.prepare(`
      SELECT * FROM backup_logs ORDER BY id DESC LIMIT ?
    `).all(limit);

    return logs.map(l => ({
      ...l,
      exists_on_disk: fs.existsSync(l.backup_path)
    }));
  } catch (e) {
    return [];
  }
}

function restoreDatabaseFromBackup(backupFilePath) {
  if (!backupFilePath || !fs.existsSync(backupFilePath)) {
    throw new Error('बॅकअप फाईल सापडली नाही (Backup file not found)');
  }

  // Validate SQLite file header
  const fd = fs.openSync(backupFilePath, 'r');
  const buffer = Buffer.alloc(16);
  fs.readSync(fd, buffer, 0, 16, 0);
  fs.closeSync(fd);

  const header = buffer.toString('utf-8', 0, 15);
  if (!header.startsWith('SQLite format 3')) {
    throw new Error('अवैध बॅकअप फाईल: ही वैध SQLite फाईल नाही (Invalid SQLite backup file)');
  }

  const targetDbPath = currentDbFilePath || path.join(__dirname, '..', 'data', 'gaavpharma.db');

  // 1. Close current db connection
  if (db) {
    try {
      db.close();
    } catch (e) {}
    db = null;
  }

  // 2. Replace current db file with backup file
  fs.copyFileSync(backupFilePath, targetDbPath);

  // Remove stale WAL/SHM files if any
  try {
    if (fs.existsSync(`${targetDbPath}-wal`)) fs.unlinkSync(`${targetDbPath}-wal`);
    if (fs.existsSync(`${targetDbPath}-shm`)) fs.unlinkSync(`${targetDbPath}-shm`);
  } catch (e) {}

  // 3. Re-initialize database
  initDatabase(targetDbPath);

  // 4. Log restore event
  try {
    const stat = fs.statSync(targetDbPath);
    db.prepare(`
      INSERT INTO backup_logs (filename, backup_path, backup_type, file_size_bytes, status)
      VALUES (?, ?, 'restore_event', ?, 'restored')
    `).run(path.basename(backupFilePath), backupFilePath, stat.size);
  } catch (e) {}

  return {
    success: true,
    message: 'डेटाबेस यशस्वीरीत्या पूर्ववत (Restore) केला गेला.'
  };
}

function getLastBackupTimestamp() {
  if (!db) initDatabase();
  try {
    const row = db.prepare(`
      SELECT created_at FROM backup_logs WHERE status = 'success' ORDER BY id DESC LIMIT 1
    `).get();
    return row ? row.created_at : null;
  } catch {
    return null;
  }
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
  addDistributor,
  updateDistributor,
  deleteDistributor,
  getPurchases,
  getPurchaseDetails,
  createPurchase,
  getDistributorLedger,
  addDistributorPayment,
  getPurchaseSummary,
  getDebitNotes,
  getDebitNoteDetails,
  createDebitNote,
  getScheduleH1Register,
  getGstTaxSummary,
  syncAutoShortages,
  getShortageDiary,
  addShortageItem,
  updateShortageItem,
  markShortageAsOrdered,
  deleteShortageItem,
  getAccountingVouchers,
  createAccountingVoucher,
  deleteAccountingVoucher,
  fastCreateProductWithBatch,
  getProductTransactions,
  createSalesReturn,
  getSalesReturns,
  getSalesReturnDetails,
  getDayEndDrawerSummary,
  saveDayEndDrawer,
  getCashDrawers,
  getUniversalReportCriterion,
  clearAllRecords,
  getAvailableBackupDrives,
  pruneOldBackups,
  createDatabaseBackup,
  getBackupHistory,
  restoreDatabaseFromBackup,
  getLastBackupTimestamp
};

