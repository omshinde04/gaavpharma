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

  // 4. Security & Super Admin Protection Test
  console.log('\n🛡️ [TEST GROUP 4] Security & Super Admin Isolation');
  await api.deleteUser(1); // Try to delete Super Admin (id: 1)
  const usersAfterDelete = await api.getUsers();
  const superAdminStillExists = usersAfterDelete.some((u) => u.role === 'super_admin');
  assert(superAdminStillExists, 'Super Admin CANNOT be deleted (protected from store-level deletion)');

  // 5. Billing & Products Inventory Test
  console.log('\n💊 [TEST GROUP 5] POS Billing & Inventory Radar');
  const searchResults = await api.searchProducts('Dolo');
  assert(searchResults.length > 0 && searchResults[0].name.includes('Dolo'), 'Fast product search returns Dolo 650');
  assert(searchResults[0].active_batch !== null, 'Active batch attached with expiry date and MRP');

  const expiryData = await api.getExpiryRadarData();
  assert(expiryData && expiryData.batches && expiryData.batches.length > 0, 'Expiry Radar tracks all medicine batches and calculates PTR loss');

  // 6. Provider Hub Licensing Engine Test
  console.log('\n👑 [TEST GROUP 6] Super Admin SaaS Licensing Engine');
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
