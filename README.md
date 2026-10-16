# 🌿 gaavpharma — Offline Desktop POS for Pharmacy & General Stores

[![Electron](https://img.shields.io/badge/Electron-33.x-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18%2B-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-003B57?logo=sqlite&logoColor=white)](https://github.com/WiseLibs/better-sqlite3)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

**gaavpharma** is an offline-first desktop billing and inventory software engineered specifically for Indian retail pharmacies and village/town general stores (like *Anand Medical & General Stores*).

It replaces legacy 1990s DOS-style software (like MedVision and Marg ERP) with a clean, high-contrast, lightning-fast modern SaaS interface that operates 100% offline with zero cloud dependency.

---

## 🚀 Key Modules & Capabilities

### 1. ⚡ Rapid Billing Counter
- **Global USB Barcode Scanner Listener:** Instantly buffers and processes hardware barcode scans from any counter scanner without requiring mouse clicks on inputs.
- **Instant Search with Rack Chips:** Fast search across 10,000+ medicines, FMCG products, and generic salt compositions with high-visibility rack location badges (e.g. `[📍 Rack B-2]`).
- **Salt Substitute Recommender:** Suggests available alternative brands with identical generic salt compositions when stock is low.
- **Loose Tablet Cut Math:** Allows selling fractional strips (e.g. 4 tablets out of a 10-tablet strip) with automatic precision pricing: `(MRP / Strip_Size) * Qty`.
- **Auto-FIFO Batch Allocation:** Automatically selects the earliest expiring batch first to protect inventory value.
- **Huge Billboard Total Box:** 36px high-visibility payable amount box readable from across the counter.
- **1-Click WhatsApp Receipt:** Formats clean, itemized receipt breakdown directly into WhatsApp (`wa.me`) messages for paperless billing.
- **Thermal POS Slip Printing:** Built-in 80mm & 58mm ESC/POS compatible thermal receipt printer layout.

### 2. 🚨 Expiry Loss Radar
- **Visual Expiry Categorization:**
  - 🔴 **Critical (< 30 days / Expired):** Immediate write-off alert.
  - 🟡 **Warning (< 90 days):** Distributor return window.
  - 🟢 **Safe Stock (> 90 days):** Healthy shelf life.
- **Financial Exposure Calculator:** Real-time computation of purchase capital at risk (PTR value).
- **1-Click Distributor Return Slip:** Automatically generates and prints formal debit memos/credit note requests for pharmaceutical distributors (e.g. Mahaveer Pharma, Sunlife Healthcare).

### 3. 📦 Inventory Manager
- **Dual-Category Management:**
  - **Medicines:** Batch numbers, expiry dates, strip sizes, rack locations, and Schedule H1 FDA flags.
  - **General FMCG / Cosmetics / Baby Care:** Barcodes, categories, minimum stock thresholds, and stock counters.
- **Batch Addition & Stock Adjustments:** Quick modal to record new stock receipts with PTR and MRP.
- **Stock Alert Thresholds:** Highlights items below minimum stock level.

### 4. 📒 Daily Register & Family Khata Ledger
- **Cash Drawer Balancing:** Daily revenue split into **Cash in Hand**, **UPI / QR**, **Khata (Credit)**, and **Card / POS**.
- **Family Credit Tracking (Khata):** Search village family ledger accounts with live pending balances and transaction histories.
- **1-Click WhatsApp Payment Reminders:** Sends polite Hindi/English payment reminder messages with outstanding dues directly to the customer's phone.
- **Partial/Full Payment Settlement:** Records repayments with automatic balance decrement and credit entry.

---

## ⌨️ Counter Ergonomics & Keyboard Shortcuts

Counters operate for 14+ hours a day. Cashiers rarely touch the mouse:

| Shortcut | Action |
|---|---|
| `F2` | Clear / Start New Bill |
| `F3` | Open Expiry Loss Radar |
| `F4` | Focus Search / Open Inventory |
| `F5` | Open Daily Register & Khata |
| `F8` | Cycle Payment Mode (Cash → UPI → Khata → Card) |
| `F9` / `Ctrl+Enter` | Complete Sale & Print Bill |
| `Esc` | Close Modals / Clear Search |

---

## 🛠️ Technology Stack

- **Shell:** Electron 33 (Secure `contextBridge` IPC via `preload.js`)
- **Frontend:** React 18+ with Vite 6
- **Database:** SQLite 3 via `better-sqlite3` (Embedded synchronous WAL database stored in the system AppData / UserData folder)
- **Styling:** Tailwind CSS with Clinical Emerald & Slate high-contrast glare-free theme
- **Typography:** `Inter` (UI) and `JetBrains Mono` (Prices, quantities, and batch codes)
- **Packaging:** `electron-builder` configured for Windows `.exe` (NSIS) and macOS builds

---

## 📂 Database Schema (SQLite)

```sql
-- Core Products Catalog
CREATE TABLE products (
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

-- Batches with Expiry and Pricing
CREATE TABLE batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  batch_no TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  purchase_rate REAL DEFAULT 0,
  mrp REAL NOT NULL,
  stock_qty INTEGER DEFAULT 0
);

-- Invoices & Sales
CREATE TABLE invoices (
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

-- Itemized Invoice Rows
CREATE TABLE invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  batch_id INTEGER REFERENCES batches(id),
  is_loose_tablet BOOLEAN DEFAULT 0,
  qty INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL
);

-- Distributors
CREATE TABLE distributors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  gstin TEXT,
  pending_balance REAL DEFAULT 0
);

-- Family Khata Accounts
CREATE TABLE customers_khata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL UNIQUE,
  balance REAL DEFAULT 0
);
```

---

## 💻 Setup & Development

### 1. Install Dependencies
```bash
npm install
```
*(The `postinstall` hook will automatically compile `better-sqlite3` native binaries for Electron).*

### 2. Run in Development Mode
Launches the Vite dev server and the Electron desktop application window concurrently:
```bash
npm run dev
```

### 3. Run Frontend Only (Web Browser Preview)
```bash
npm run dev:web
```

### 4. Build Production Bundle
```bash
npm run build
```

### 5. Build Windows Installer (.exe)
Generates the installer in `release/`:
```bash
npm run build:win
```

---

## 📄 License
ISC © Om Shinde
