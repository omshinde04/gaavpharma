// API Client wrapper for Electron IPC with web fallback

const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;

// In-memory fallback mock for development/browser preview if not in Electron
const fallbackStorage = {
  products: [
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
  ],
  customers: [
    { id: 1, name: 'Ramesh Patil (Grampanchayat)', mobile: '9822114477', balance: 1450.00, last_activity: '2026-10-14 18:20:00' },
    { id: 2, name: 'Sanjay Deshmukh (Teacher)', mobile: '9422336699', balance: 680.00, last_activity: '2026-10-15 11:30:00' },
    { id: 3, name: 'Sunita Kadam (Asha Worker)', mobile: '9158442200', balance: 250.00, last_activity: '2026-10-12 09:15:00' },
    { id: 4, name: 'Vitthal Shinde (Krushi Seva)', mobile: '9890123456', balance: 0.00, last_activity: '2026-10-10 14:00:00' }
  ],
  invoices: [
    { id: 1, invoice_no: 'INV-20261016-001', customer_name: 'Ganesh Kulkarni', customer_mobile: '9822345678', doctor_name: 'Dr. Joshi', payment_mode: 'upi', total_amount: 238.50, discount: 0, final_amount: 238.50, created_at: '2026-10-16 17:00:00', item_count: 2 },
    { id: 2, invoice_no: 'INV-20261016-002', customer_name: 'Anita Pawar', customer_mobile: '9421556677', doctor_name: null, payment_mode: 'cash', total_amount: 253.00, discount: 5.00, final_amount: 248.00, created_at: '2026-10-16 19:15:00', item_count: 2 },
    { id: 3, invoice_no: 'INV-20261016-003', customer_name: 'Ramesh Patil (Grampanchayat)', customer_mobile: '9822114477', doctor_name: 'Dr. Patil', payment_mode: 'khata', total_amount: 450.00, discount: 0, final_amount: 450.00, created_at: '2026-10-16 20:30:00', item_count: 1 }
  ],
  distributors: [
    { id: 1, name: 'Mahaveer Pharma Distributors', phone: '9822012345', gstin: '27AABCM1234P1Z2', pending_balance: 14250.00 },
    { id: 2, name: 'Sunlife Healthcare Agency', phone: '9423098765', gstin: '27AABCS9876Q1Z8', pending_balance: 8600.00 },
    { id: 3, name: 'Balaji FMCG & Surgicals', phone: '9860011223', gstin: '27AABCB4321R1Z5', pending_balance: 3100.00 }
  ]
};

export const api = {
  isElectron,

  // Products
  searchProducts: async (query) => {
    if (isElectron) return window.electronAPI.searchProducts(query);
    const q = (query || '').toLowerCase().trim();
    if (!q) return [];
    return fallbackStorage.products
      .filter(p => p.name.toLowerCase().includes(q) || (p.generic_salt && p.generic_salt.toLowerCase().includes(q)) || (p.barcode && p.barcode.includes(q)))
      .map(p => ({
        ...p,
        active_batch: p.batches[0] || null
      }));
  },

  getProductByBarcode: async (barcode) => {
    if (isElectron) return window.electronAPI.getProductByBarcode(barcode);
    const item = fallbackStorage.products.find(p => p.barcode === barcode.trim());
    if (!item) return null;
    return { ...item, active_batch: item.batches[0] || null };
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
    return newProd;
  },

  addBatch: async (data) => {
    if (isElectron) return window.electronAPI.addBatch(data);
    const p = fallbackStorage.products.find(prod => prod.id === data.product_id);
    if (p) {
      const b = { id: Date.now(), ...data };
      p.batches.push(b);
      p.total_stock = (p.total_stock || 0) + (data.stock_qty || 0);
      return b;
    }
    return null;
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

    if (invoiceData.payment_mode === 'khata' && invoiceData.customer_mobile) {
      const cust = fallbackStorage.customers.find(c => c.mobile === invoiceData.customer_mobile);
      if (cust) {
        cust.balance += invoiceData.final_amount;
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
    return newInv;
  },

  getInvoices: async (limit) => {
    if (isElectron) return window.electronAPI.getInvoices(limit);
    return fallbackStorage.invoices;
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

  addKhataPayment: async (customerId, amount, note) => {
    if (isElectron) return window.electronAPI.addKhataPayment(customerId, amount, note);
    const cust = fallbackStorage.customers.find(c => c.id === customerId);
    if (cust) {
      cust.balance = Math.max(0, cust.balance - parseFloat(amount));
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
    return newCust;
  },

  // Distributors
  getDistributors: async () => {
    if (isElectron) return window.electronAPI.getDistributors();
    return fallbackStorage.distributors;
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
