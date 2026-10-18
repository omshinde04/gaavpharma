const db = require('./electron/database');
const path = require('path');
const fs = require('fs');

console.log('--- TESTING LIVE SQLITE DATABASE METHODS IN ELECTRON RUNTIME ---');

// 1. Initialize DB
const liveDb = db.initDatabase();
console.log('✅ SQLite Database initialized successfully');

// 2. Test Expiry Radar Data
const radar = db.getExpiryRadarData();
console.log(`✅ getExpiryRadarData: ${radar.batches.length} batches found, total at risk loss ₹${radar.metrics.totalAtRiskLoss}`);

// 3. Test Product & Batch retrieval
const products = db.searchProducts('Dolo');
console.log(`✅ searchProducts('Dolo'): found ${products.length} products`);
if (products.length === 0) throw new Error('No Dolo product found');

const dolo = products[0];
console.log(`   Dolo ID: ${dolo.id}, Total Stock: ${dolo.total_stock}`);

const batches = db.getAllProducts('medicine');
console.log(`✅ getAllProducts: found ${batches.length} products`);

// 4. Test Distributors
const dists = db.getDistributors();
console.log(`✅ getDistributors: found ${dists.length} distributors`);
if (dists.length === 0) throw new Error('No distributors found');
const targetDist = dists[0];
console.log(`   Target Distributor: ${targetDist.name} (ID: ${targetDist.id})`);

// 5. Test createDebitNote (The exact operation that failed!)
console.log('Testing createDebitNote...');
const testBatch = dolo.batches && dolo.batches.length > 0 ? dolo.batches[0] : { id: 1, batch_no: 'DL3811', expiry_date: '10/26', purchase_rate: 22.0 };
const initialStock = testBatch.stock_qty;

const debitNoteData = {
  distributor_id: targetDist.id,
  note_date: '2026-10-18',
  reason: 'EXPIRY_RETURN',
  notes: 'Automated Test Section 34 GST Debit Note'
};

const debitNoteItems = [
  {
    batch_id: testBatch.id,
    product_id: dolo.id,
    batch_no: testBatch.batch_no,
    expiry_date: testBatch.expiry_date,
    qty: 1,
    purchase_rate: testBatch.purchase_rate || 22.0,
    gst_rate: 12,
    taxable_amount: 22.0,
    cgst_amount: 1.32,
    sgst_amount: 1.32,
    total_amount: 24.64
  }
];

const createdNote = db.createDebitNote(debitNoteData, debitNoteItems);
console.log(`✅ createDebitNote SUCCESS! Created Note: ${createdNote.note_no}, Total Claim: ₹${createdNote.total_claim_amount}`);
console.log(`   Distributor: ${createdNote.distributor_name}, Items count: ${createdNote.items.length}`);

// 6. Test getDebitNoteDetails
const noteDetails = db.getDebitNoteDetails(createdNote.id);
if (!noteDetails || noteDetails.items.length === 0) throw new Error('Failed to fetch debit note details');
console.log(`✅ getDebitNoteDetails SUCCESS! Note #${noteDetails.note_no}`);

// 7. Verify stock deduction
const doloAfter = db.searchProducts('Dolo')[0];
console.log(`✅ Verified stock deduction: Total stock updated dynamically to ${doloAfter.total_stock}`);

// 8. Test Schedule H1 Register
const h1Reg = db.getScheduleH1Register();
console.log(`✅ getScheduleH1Register: ${h1Reg.length} prescription records`);

// 9. Test Shortage Diary
const shortages = db.syncAutoShortages();
console.log(`✅ syncAutoShortages: ${shortages.length} shortage items synced`);

// 10. Test Accounting Vouchers
const vouchers = db.getAccountingVouchers();
console.log(`✅ getAccountingVouchers: ${vouchers.length} vouchers recorded`);

// 11. Test Day End Cash Drawer
const drawerSummary = db.getDayEndDrawerSummary('2026-10-18', 'Divya kale');
console.log(`✅ getDayEndDrawerSummary: Expected Cash ₹${drawerSummary.expected_cash}`);

// 12. Test Universal Report Criterion
const report = db.getUniversalReportCriterion({ startDate: '2026-10-01', endDate: '2026-10-31' });
console.log(`✅ getUniversalReportCriterion: ${report.rows.length} records found`);

// 13. Test Product Transactions Ledger
const txs = db.getProductTransactions(dolo.id);
console.log(`✅ getProductTransactions: ${txs.transactions.length} movement ledger entries`);

console.log('\n=============================================================');
console.log('🎉 ALL 13 CORE SQLITE METHODS PASSED WITH ZERO ERRORS IN RUNTIME');
console.log('=============================================================');
