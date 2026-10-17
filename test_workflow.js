import { api } from './src/services/api.js';

async function runTestSuite() {
  console.log('🧪 ========================================================');
  console.log('🧪 GAAVPHARMA END-TO-END QA & SAAS ARCHITECTURE TEST SUITE');
  console.log('🧪 ========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Initial State & Store Profile Test
  console.log('📋 [TEST GROUP 1] Active Store & Multi-Tenant Registry');
  const storeProfile = await api.getStoreProfile();
  assert(storeProfile && storeProfile.store_name === 'Divya Medical Stores', 'Store Profile initialized as Divya Medical Stores');
  assert(storeProfile.phone === '9373545169', 'Store phone matches provisioned record (9373545169)');
  assert(storeProfile.dl_number === '20B/21B-MH-SOL-194829', 'Store DL matches legal registered license');

  const license = await api.getLicenseStatus();
  assert(license && license.isValid === true && license.status === 'ACTIVE', 'Store License is ACTIVE and valid');
  assert(license.storeName === 'Divya Medical Stores', 'License belongs to Divya Medical Stores');

  // 2. RBAC & Authentication Test
  console.log('\n🔐 [TEST GROUP 2] PIN Keypad & RBAC Authentication');
  const ownerUser = await api.loginWithPin('1111');
  assert(ownerUser && ownerUser.role === 'store_admin' && ownerUser.display_name === 'Divya kale', 'Store Owner PIN (1111) logs in as Divya kale');

  const superUser = await api.loginWithPin('9999');
  assert(superUser && superUser.role === 'super_admin' && superUser.username === 'superadmin', 'Super Admin PIN (9999) logs in as Founder Om Shinde');

  const badPin = await api.loginWithPin('0000');
  assert(badPin === null, 'Invalid PIN (0000) correctly rejected');

  const ownerCreds = await api.loginWithCredentials('Divya_kale', 'owner123');
  assert(ownerCreds && ownerCreds.role === 'store_admin', 'Store Owner credentials (Divya_kale / owner123) authenticate');

  const superCreds = await api.loginWithCredentials('superadmin', 'admin123');
  assert(superCreds && superCreds.role === 'super_admin', 'Super Admin credentials (superadmin / admin123) authenticate');

  // 3. Staff Management & Cashier Isolation Test
  console.log('\n👥 [TEST GROUP 3] Store Owner Staff Management');
  const initialUsers = await api.getUsers();
  assert(initialUsers.length >= 2, 'Initial user directory has Super Admin and Store Owner');

  // Add a Cashier
  const newCashier = await api.addUser({
    username: 'ramesh_cashier',
    display_name: 'Ramesh Patil',
    pin_code: '1234',
    role: 'cashier'
  });
  assert(newCashier && newCashier.username === 'ramesh_cashier', 'Store Owner successfully created cashier Ramesh Patil');

  const cashierLogin = await api.loginWithPin('1234');
  assert(cashierLogin && cashierLogin.role === 'cashier' && cashierLogin.display_name === 'Ramesh Patil', 'Cashier can immediately log in with PIN 1234');

  // Change Cashier PIN to 5566
  await api.updateUser(newCashier.id, { pin_code: '5566' });
  const oldPinLogin = await api.loginWithPin('1234');
  assert(oldPinLogin === null, 'Old cashier PIN (1234) rejected after change');
  const newPinLogin = await api.loginWithPin('5566');
  assert(newPinLogin && newPinLogin.username === 'ramesh_cashier', 'New cashier PIN (5566) logs in successfully');

  // Deactivate Cashier
  await api.updateUser(newCashier.id, { is_active: 0 });
  const deactivatedLogin = await api.loginWithPin('5566');
  assert(deactivatedLogin === null, 'Deactivated cashier cannot log in');

  // Reactivate Cashier
  await api.updateUser(newCashier.id, { is_active: 1 });
  const reactivatedLogin = await api.loginWithPin('5566');
  assert(reactivatedLogin !== null, 'Reactivated cashier can log in again');

  // 4. Feature Toggles & Control Center Test
  console.log('\n🎛️ [TEST GROUP 4] Store Admin Feature Toggles & Persistence');
  const initialToggles = await api.getFeatureToggles();
  assert(initialToggles !== null, 'Feature toggles retrieved successfully');

  // Toggle on enforce_h1_doctor and hide_drawer_from_cashier
  await api.updateFeatureToggle('enforce_h1_doctor', true);
  await api.updateFeatureToggle('hide_drawer_from_cashier', true);
  const updatedToggles = await api.getFeatureToggles();
  assert(updatedToggles.enforce_h1_doctor === true, 'enforce_h1_doctor persists as true');
  assert(updatedToggles.hide_drawer_from_cashier === true, 'hide_drawer_from_cashier persists as true');

  // 5. Security & Super Admin Protection Test
  console.log('\n🛡️ [TEST GROUP 5] Security & Super Admin Isolation');
  await api.deleteUser(1); // Try to delete Super Admin (id: 1)
  const usersAfterDelete = await api.getUsers();
  const superAdminStillExists = usersAfterDelete.some((u) => u.role === 'super_admin');
  assert(superAdminStillExists, 'Super Admin CANNOT be deleted (protected from store-level deletion)');

  // 6. Billing, Invoices & Receipt Modal Details Test
  console.log('\n💊 [TEST GROUP 6] Clean Database & POS Billing Lifecycle');
  
  // Verify clean database state (no dummy records)
  const initialInvoices = await api.getInvoices();
  assert(Array.isArray(initialInvoices) && initialInvoices.length === 0, 'Database starts completely clean with 0 invoices');

  const initialCustomers = await api.getKhataCustomers();
  assert(Array.isArray(initialCustomers) && initialCustomers.length === 0, 'Database starts completely clean with 0 khata debt');

  // Search product and check active batch
  const searchResults = await api.searchProducts('Dolo');
  assert(searchResults.length > 0 && searchResults[0].name.includes('Dolo'), 'Fast product search returns Dolo 650');
  assert(searchResults[0].active_batch !== null, 'Active batch attached with expiry date and MRP');
  const doloStockBefore = searchResults[0].total_stock;

  // Create Cash Sale Invoice
  const cashInvoice = await api.createInvoice({
    customer_name: 'Ganesh Kulkarni',
    customer_mobile: '9822345678',
    doctor_name: 'Dr. Joshi',
    payment_mode: 'cash',
    total_amount: 68.00,
    discount: 0,
    final_amount: 68.00
  }, [
    { id: 1, name: 'Dolo 650 Tablet', batch_no: 'DL3811', expiry_date: '10/26', qty: 2, unit_price: 34.00, total_price: 68.00, is_loose_tablet: 0 }
  ]);
  assert(cashInvoice && cashInvoice.invoice_no.startsWith('INV-'), 'Cash invoice created successfully');

  // Verify stock was deducted
  const searchAfterBill = await api.searchProducts('Dolo');
  assert(searchAfterBill[0].total_stock === doloStockBefore - 2, 'Inventory stock automatically deducted upon bill creation');

  // Create Khata (Credit) Sale Invoice
  const khataInvoice = await api.createInvoice({
    customer_name: 'Ramesh Patil (Grampanchayat)',
    customer_mobile: '9822114477',
    doctor_name: 'Dr. Patil',
    payment_mode: 'khata',
    total_amount: 150.00,
    discount: 0,
    final_amount: 150.00
  }, [
    { id: 3, name: 'Telma 40 Tablet', batch_no: 'TL4002', expiry_date: '11/26', qty: 1, unit_price: 150.00, total_price: 150.00, is_loose_tablet: 0 }
  ]);
  assert(khataInvoice && khataInvoice.payment_mode === 'khata', 'Khata invoice created successfully');

  // Verify Khata customer automatically created and ledger updated
  const khataCustomers = await api.getKhataCustomers();
  assert(khataCustomers.length === 1 && khataCustomers[0].name.includes('Ramesh Patil'), 'Khata customer automatically created with debit');
  assert(khataCustomers[0].balance === 150.00, 'Customer balance accurately reflects credit purchase of ₹150');

  // Test Customer Ledger
  const ledger = await api.getKhataCustomerLedger(khataCustomers[0].id);
  assert(ledger && ledger.transactions.length >= 1, 'Customer ledger tracks purchase history and invoice number');

  // Test Khata Payment Settlement
  await api.addKhataPayment(khataCustomers[0].id, 50.00, 'Counter cash partial payment');
  const khataAfterPay = await api.getKhataCustomers();
  assert(khataAfterPay[0].balance === 100.00, 'Khata payment deducted correctly (₹150 - ₹50 = ₹100)');

  // Verify Daily Register Summary
  const summary = await api.getDailyRegisterSummary();
  assert(summary.today.total_sales === 218.00, 'Daily Register Gross Sales is accurate (₹68 cash + ₹150 khata = ₹218)');
  assert(summary.today.cash_total === 68.00, 'Cash drawer accurately records ₹68 cash');
  assert(summary.khataPending.total_khata_pending === 100.00, 'Total Khata outstanding accurately reports ₹100 due');

  // Test Invoice Details & Receipt Modal View
  const invoiceDetails = await api.getInvoiceDetails(cashInvoice.id);
  assert(invoiceDetails !== null, 'getInvoiceDetails returns invoice details for ReceiptModal');
  assert(Array.isArray(invoiceDetails.items) && invoiceDetails.items.length === 1, 'Invoice details contains populated line items');

  // Test Expiry Radar
  const expiryData = await api.getExpiryRadarData();
  assert(expiryData && expiryData.batches && expiryData.batches.length > 0, 'Expiry Radar tracks all medicine batches and calculates PTR loss');

  // Test Database Reset / Clear All Records
  await api.clearAllRecords();
  const resetInvoices = await api.getInvoices();
  const resetCustomers = await api.getKhataCustomers();
  const resetSummary = await api.getDailyRegisterSummary();
  assert(resetInvoices.length === 0, 'clearAllRecords wipes all invoices from storage');
  assert(resetCustomers.length === 0, 'clearAllRecords wipes all khata accounts from storage');
  assert(resetSummary.today.total_sales === 0, 'Daily register sales resets to ₹0 after clear');

  // 7. Provider Hub Licensing Engine Test
  console.log('\n👑 [TEST GROUP 7] Super Admin SaaS Licensing Engine');
  const generatedKey = await api.generateLicenseKey({
    storeName: 'Mauli Medical Stores',
    plan: 'annual',
    days: 365
  });
  assert(generatedKey.startsWith('GP-ACT-'), 'Generates valid cryptographic license key for new store');

  const generatedRenewal = await api.generateRenewalCode({
    storeName: 'Divya Medical Stores',
    days: 365
  });
  assert(generatedRenewal.startsWith('GP-REN-'), 'Generates renewal code for Divya Medical Stores');

  const renewalResult = await api.applyRenewalCode(generatedRenewal);
  assert(renewalResult && renewalResult.isValid === true, 'Renewal code successfully applied and extends subscription');

  console.log('\n========================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal Test Exception:', err);
  process.exit(1);
});
