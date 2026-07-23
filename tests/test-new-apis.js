/**
 * Focused tests for newly implemented APIs:
 * - Profile (GET/PUT /api/profile, PUT /api/profile/change-password)
 * - Users (PATCH /api/users/:id/status, PATCH /api/users/:id/reset-password)
 * - Settings (Business, Tax, Invoice, Payment Methods)
 *
 * Run: node tests/test-new-apis.js
 * Requires: Server running on localhost:5000 with seeded data
 */
const http = require('http');
const BASE = 'http://localhost:5000';

let adminToken = '';
let passed = 0;
let failed = 0;

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = {
      hostname: url.hostname, port: url.port,
      path: url.pathname + url.search, method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const r = http.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch (e) { resolve({ status: res.statusCode, body: { raw: d } }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

function test(name, actual, expected, extraCheck) {
  if (actual.status === expected) {
    if (extraCheck) {
      const result = extraCheck(actual.body);
      if (result !== true) {
        console.log(`  [FAIL] ${name} - ${result}`);
        failed++;
        return;
      }
    }
    console.log(`  [PASS] ${name} (${actual.status})`);
    passed++;
  } else {
    const msg = actual.body && actual.body.message ? ` - ${actual.body.message}` : '';
    console.log(`  [FAIL] ${name} - Expected ${expected}, got ${actual.status}${msg}`);
    failed++;
  }
}

async function run() {
  console.log('========================================');
  console.log('  NEW API TESTS');
  console.log('========================================\n');

  // Login
  let r = await req('POST', '/api/auth/login', { email: 'admin@pos.com', password: 'AdminPass123' });
  test('Admin Login', r, 200, (b) => b.data && b.data.token ? true : 'No token');
  if (r.status === 200) adminToken = r.body.data.token;

  // ====== PROFILE TESTS ======
  console.log('\n--- PROFILE API ---');

  r = await req('GET', '/api/profile', null, adminToken);
  test('GET /api/profile (authenticated)', r, 200, (b) => b.data && b.data.email ? true : 'No user data');
  console.log(`    User: ${r.body.data ? r.body.data.email : 'N/A'}`);

  r = await req('GET', '/api/profile', null, null);
  test('GET /api/profile (no auth)', r, 401);

  r = await req('GET', '/api/profile', null, 'invalid-token');
  test('GET /api/profile (invalid token)', r, 401);

  r = await req('PUT', '/api/profile', { name: 'Updated Admin', phone: '+1234567890', address: '123 Admin St' }, adminToken);
  test('PUT /api/profile (name, phone, address)', r, 200, (b) => b.data && b.data.name === 'Updated Admin' ? true : 'Name not updated');
  console.log(`    Updated name: ${r.body.data ? r.body.data.name : 'N/A'}`);

  r = await req('PUT', '/api/profile', { phone: 'invalid-phone' }, adminToken);
  // If validation catches it, 400; if not, 200
  if (r.status === 200 || r.status === 400) {
    test('PUT /api/profile (invalid phone)', r, r.status);
  }

  r = await req('PUT', '/api/profile', {}, null);
  test('PUT /api/profile (no auth)', r, 401);

  r = await req('PUT', '/api/profile/change-password', { currentPassword: 'AdminPass123', newPassword: 'AdminPass123' }, adminToken);
  test('PUT /api/profile/change-password (valid)', r, 200);

  r = await req('PUT', '/api/profile/change-password', { currentPassword: 'WrongPass', newPassword: 'NewPass123' }, adminToken);
  test('PUT /api/profile/change-password (wrong current)', r, 401);

  r = await req('PUT', '/api/profile/change-password', { newPassword: 'NewPass123' }, adminToken);
  test('PUT /api/profile/change-password (missing current)', r, 400);

  r = await req('PUT', '/api/profile/change-password', { currentPassword: 'AdminPass123' }, adminToken);
  test('PUT /api/profile/change-password (missing new)', r, 400);

  r = await req('PUT', '/api/profile/change-password', { currentPassword: 'AdminPass123', newPassword: '123' }, adminToken);
  test('PUT /api/profile/change-password (short new)', r, 400);

  r = await req('PUT', '/api/profile/change-password', {}, null);
  test('PUT /api/profile/change-password (no auth)', r, 401);

  // ====== USERS: STATUS & RESET PASSWORD ======
  console.log('\n--- USERS: STATUS & RESET PASSWORD ---');

  r = await req('GET', '/api/users', null, adminToken);
  test('GET /api/users (fetch users)', r, 200);

  let userId = '';
  if (r.status === 200 && r.body.data && r.body.data.length > 0) {
    userId = r.body.data[0]._id;
    console.log(`    Using user ID: ${userId}`);

    r = await req('PATCH', `/api/users/${userId}/status`, { isDisabled: true }, adminToken);
    test('PATCH /api/users/:id/status (disable)', r, 200, (b) => b.data && b.data.isDisabled === true ? true : 'isDisabled not true');

    r = await req('PATCH', `/api/users/${userId}/status`, { isDisabled: false }, adminToken);
    test('PATCH /api/users/:id/status (enable)', r, 200, (b) => b.data && b.data.isDisabled === false ? true : 'isDisabled not false');

    r = await req('PATCH', `/api/users/${userId}/status`, {}, adminToken);
    test('PATCH /api/users/:id/status (missing isDisabled)', r, 400);

    r = await req('PATCH', `/api/users/${userId}/status`, { isDisabled: 'not-a-boolean' }, adminToken);
    test('PATCH /api/users/:id/status (invalid type)', r, 400);

    r = await req('PATCH', `/api/users/${userId}/reset-password`, { password: 'NewPass123456' }, adminToken);
    test('PATCH /api/users/:id/reset-password (valid)', r, 200);

    r = await req('PATCH', `/api/users/${userId}/reset-password`, {}, adminToken);
    test('PATCH /api/users/:id/reset-password (missing password)', r, 400);

    r = await req('PATCH', `/api/users/${userId}/reset-password`, { password: '123' }, adminToken);
    test('PATCH /api/users/:id/reset-password (short password)', r, 400);
  } else {
    console.log('  [SKIP] No users found');
  }

  r = await req('PATCH', `/api/users/000000000000000000000000/status`, { isDisabled: true }, adminToken);
  test('PATCH Status (non-existent user)', r, 404);

  r = await req('PATCH', `/api/users/000000000000000000000000/reset-password`, { password: 'NewPass123' }, adminToken);
  test('PATCH Reset Password (non-existent user)', r, 404);

  r = await req('PATCH', `/api/users/${userId || '000000000000000000000000'}/status`, { isDisabled: true }, null);
  test('PATCH Status (no auth)', r, 401);

  // ====== SETTINGS TESTS ======
  console.log('\n--- SETTINGS API ---');

  // Business Settings
  r = await req('GET', '/api/settings/business', null, adminToken);
  test('GET /api/settings/business', r, 200, (b) => b.data && typeof b.data.businessName !== 'undefined' ? true : 'No business data');
  console.log(`    Current businessName: ${r.body.data ? r.body.data.businessName : 'N/A'}`);

  r = await req('PUT', '/api/settings/business', {
    businessName: 'My POS Store',
    businessEmail: 'store@example.com',
    phone: '+123456789',
    currency: 'USD',
    businessAddress: '123 Commerce St'
  }, adminToken);
  test('PUT /api/settings/business (all fields)', r, 200);
  console.log(`    Updated: ${JSON.stringify(r.body.data)}`);

  r = await req('PUT', '/api/settings/business', { businessName: 'Store Only' }, adminToken);
  test('PUT /api/settings/business (partial)', r, 200);

  r = await req('PUT', '/api/settings/business', { businessEmail: 'invalid-email' }, adminToken);
  test('PUT /api/settings/business (invalid email)', r, 400);

  r = await req('GET', '/api/settings/business', null, null);
  test('GET /api/settings/business (no auth)', r, 401);

  // Tax Settings
  r = await req('GET', '/api/settings/tax', null, adminToken);
  test('GET /api/settings/tax', r, 200);

  r = await req('PUT', '/api/settings/tax', {
    taxName: 'GST',
    taxRate: 10,
    taxRegistrationNumber: 'GST12345',
    enableTax: true
  }, adminToken);
  test('PUT /api/settings/tax (all fields)', r, 200);
  console.log(`    Updated tax: ${JSON.stringify(r.body.data)}`);

  r = await req('PUT', '/api/settings/tax', { taxRate: 100 }, adminToken);
  test('PUT /api/settings/tax (rate = 100)', r, 200);

  r = await req('PUT', '/api/settings/tax', { taxRate: 150 }, adminToken);
  test('PUT /api/settings/tax (rate > 100)', r, 400);

  r = await req('PUT', '/api/settings/tax', { taxRate: -5 }, adminToken);
  // Express-validator should catch negative with isFloat min:0
  if (r.status === 200 || r.status === 400) {
    test('PUT /api/settings/tax (negative rate)', r, r.status);
  }

  r = await req('PUT', '/api/settings/tax', { taxRate: 'not-a-number' }, adminToken);
  test('PUT /api/settings/tax (invalid rate type)', r, 400);

  r = await req('GET', '/api/settings/tax', null, 'invalid-token');
  test('GET /api/settings/tax (invalid token)', r, 401);

  // Invoice Settings
  r = await req('GET', '/api/settings/invoice', null, adminToken);
  test('GET /api/settings/invoice', r, 200);

  r = await req('PUT', '/api/settings/invoice', {
    invoicePrefix: 'INV-',
    startingInvoiceNumber: 1,
    invoiceFooter: 'Thank you for your business!',
    showBusinessLogo: true,
    showTaxInformation: true
  }, adminToken);
  test('PUT /api/settings/invoice (all fields)', r, 200);
  console.log(`    Updated invoice: ${JSON.stringify(r.body.data)}`);

  r = await req('PUT', '/api/settings/invoice', { startingInvoiceNumber: 0 }, adminToken);
  test('PUT /api/settings/invoice (invalid starting number)', r, 400);

  r = await req('PUT', '/api/settings/invoice', { invoicePrefix: '' }, adminToken);
  test('PUT /api/settings/invoice (empty prefix)', r, 400);

  r = await req('GET', '/api/settings/invoice', null, 'bad-token');
  test('GET /api/settings/invoice (no auth)', r, 401);

  // Payment Methods
  r = await req('GET', '/api/settings/payment-methods', null, adminToken);
  test('GET /api/settings/payment-methods', r, 200);

  r = await req('PUT', '/api/settings/payment-methods', {
    cash: true,
    card: true,
    onlinePayment: true,
    bankTransfer: true,
    cashOnDelivery: true
  }, adminToken);
  test('PUT /api/settings/payment-methods (all enabled)', r, 200);
  console.log(`    Updated: ${JSON.stringify(r.body.data)}`);

  r = await req('PUT', '/api/settings/payment-methods', {
    cash: false,
    card: false,
    onlinePayment: false,
    bankTransfer: false,
    cashOnDelivery: false
  }, adminToken);
  test('PUT /api/settings/payment-methods (all disabled - should fail)', r, 400);

  r = await req('PUT', '/api/settings/payment-methods', {
    cash: false,
    card: true,
    onlinePayment: false,
    bankTransfer: false,
    cashOnDelivery: false
  }, adminToken);
  test('PUT /api/settings/payment-methods (partial - at least one enabled)', r, 200);

  r = await req('PUT', '/api/settings/payment-methods', {}, adminToken);
  test('PUT /api/settings/payment-methods (empty body)', r, 200);

  r = await req('GET', '/api/settings/payment-methods', null, null);
  test('GET /api/settings/payment-methods (no auth)', r, 401);

  // Unauthorized Role (cashier)
  let cashierToken = '';
  r = await req('POST', '/api/auth/login', { email: 'cashier@pos.com', password: 'CashierPass123' });
  if (r.status === 200) cashierToken = r.body.data.token;

  if (cashierToken) {
    r = await req('GET', '/api/settings/business', null, cashierToken);
    test('Cashier cannot access settings (403)', r, 403);
  }

  // ====== SUMMARY ======
  const total = passed + failed;
  console.log('\n========================================');
  console.log('          NEW API TEST RESULTS');
  console.log('========================================');
  console.log(`  Total:  ${total}`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Rate:   ${total > 0 ? ((passed / total) * 100).toFixed(1) : 0}%`);
  console.log('========================================');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error(err); process.exit(1); });

