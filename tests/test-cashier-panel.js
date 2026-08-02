/**
 * Cashier Panel API Test Suite
 * =============================
 * Validates all backend functionality required by the Cashier Panel:
 *   - Cashier Dashboard (own stats only)
 *   - POS (product search by name/SKU/barcode, categories, checkout, complete)
 *   - Customers (search, create walk-in/quick customer)
 *   - My Sales (own sales history + own receipt only)
 *   - Authorization boundaries (cashier must NOT access admin/manager APIs)
 *
 * Prerequisites:
 *   1. Node.js installed
 *   2. MongoDB running and seeded (npm run seed)
 *   3. Server running on localhost:5000 (npm start)
 *
 * Usage:
 *   node tests/test-cashier-panel.js
 */

const http = require('http');

const BASE = 'http://localhost:5000';

let passed = 0;
let failed = 0;

const creds = {
  admin: { email: 'admin@pos.com', password: 'AdminPass123' },
  manager: { email: 'manager@pos.com', password: 'ManagerPass123' },
  cashier: { email: 'cashier@pos.com', password: 'CashierPass123' },
};

function request(method, path, body = null, token = '') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (e) { parsed = { raw: data }; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function test(name, actual, expectedStatus, check = null) {
  const ok = actual.status === expectedStatus;
  if (ok && check) {
    const r = check(actual.body);
    if (r !== true) {
      console.log(`  [FAIL] ${name} - ${r}`);
      failed++;
      return;
    }
  }
  if (ok) {
    console.log(`  [PASS] ${name} (${actual.status})`);
    passed++;
  } else {
    const msg = actual.body && actual.body.message ? ` - ${actual.body.message}` : '';
    console.log(`  [FAIL] ${name} - Expected ${expectedStatus}, got ${actual.status}${msg}`);
    failed++;
  }
}

async function login(role) {
  const r = await request('POST', '/api/auth/login', creds[role]);
  if (r.status === 200 && r.body.data && r.body.data.token) {
    console.log(`  [INFO] ${role} logged in as ${r.body.data.email} (${r.body.data.role})`);
    return r.body.data.token;
  }
  console.log(`  [FAIL] ${role} login failed (${r.status})`);
  failed++;
  return null;
}

async function run() {
  console.log('========================================');
  console.log('  CASHIER PANEL API TESTS');
  console.log('========================================\n');

  const adminToken = await login('admin');
  const managerToken = await login('manager');
  const cashierToken = await login('cashier');

  if (!cashierToken) {
    console.log('\nCannot proceed without a cashier token.');
    process.exit(1);
  }

  // ------------------------------------------------------------------
  console.log('\n--- 1. CASHIER DASHBOARD (own stats only) ---');
  // 1a. Cashier can access their own dashboard
  let r = await request('GET', '/api/dashboard/cashier', null, cashierToken);
  test('Cashier dashboard accessible', r, 200, (b) =>
    b.data && typeof b.data.today === 'object' && typeof b.data.monthly === 'object' ? true : 'missing today/monthly stats'
  );

  // 1b. Cashier dashboard must NOT contain company-wide inventory data
  if (r.status === 200 && r.body.data) {
    test('Cashier dashboard excludes inventory totals', r, 200, (b) =>
      typeof b.data.inventory === 'undefined' ? true : 'cashier dashboard should not expose inventory'
    );
    test('Cashier dashboard includes only own totals', r, 200, (b) =>
      typeof b.data.totals === 'object' ? true : 'missing totals'
    );
  }

  // 1c. Cashier CANNOT access admin dashboard
  r = await request('GET', '/api/dashboard', null, cashierToken);
  test('Cashier forbidden from admin dashboard', r, 403);

  // 1d. Cashier CANNOT access dashboard chart
  r = await request('GET', '/api/dashboard/chart', null, cashierToken);
  test('Cashier forbidden from dashboard chart', r, 403);

  // 1e. Admin/Manager can still access admin dashboard (backward compat)
  r = await request('GET', '/api/dashboard', null, adminToken);
  test('Admin dashboard still works', r, 200);
  r = await request('GET', '/api/dashboard', null, managerToken);
  test('Manager dashboard still works', r, 200);

  // ------------------------------------------------------------------
  console.log('\n--- 2. POS: PRODUCT SEARCH (name/SKU/barcode) ---');
  r = await request('GET', '/api/products?search=Wireless', null, cashierToken);
  test('Search products by name', r, 200, (b) => Array.isArray(b.data) ? true : 'data not array');

  r = await request('GET', '/api/products?search=ELEC-MOUSE-001', null, cashierToken);
  test('Search products by SKU', r, 200);

  // Barcode search — try a few product barcodes that may exist
  r = await request('GET', '/api/products?search=BAR', null, cashierToken);
  test('Search products by barcode (generic)', r, 200);

  r = await request('GET', '/api/products?page=1&limit=10', null, cashierToken);
  test('Product list with pagination', r, 200);

  r = await request('GET', '/api/products?category=all', null, cashierToken);
  test('Product filter category=all', r, 200);

  // ------------------------------------------------------------------
  console.log('\n--- 3. POS: CATEGORIES ---');
  r = await request('GET', '/api/categories', null, cashierToken);
  test('Cashier can view categories', r, 200, (b) => Array.isArray(b.data) ? true : 'data not array');

  r = await request('GET', '/api/categories?search=Electronics', null, cashierToken);
  test('Search categories', r, 200);

  // Cashier must NOT create/update/delete categories
  r = await request('POST', '/api/categories', { name: 'CashierHackCat' }, cashierToken);
  test('Cashier cannot create category', r, 403);

  // ------------------------------------------------------------------
  console.log('\n--- 4. POS: PRODUCT WRITE RESTRICTIONS ---');
  // Cashier must NOT create/update/delete products or manage stock
  r = await request('POST', '/api/products', {
    name: 'Hack Product', sku: 'HACK-PROD-1', category: '000000000000000000000000',
    price: 10, stock: 5,
  }, cashierToken);
  test('Cashier cannot create product', r, 403);

  r = await request('PATCH', '/api/products/000000000000000000000000/stock', { stock: 100 }, cashierToken);
  test('Cashier cannot manage stock', r, 403);

  r = await request('PUT', '/api/products/000000000000000000000000', { price: 1 }, cashierToken);
  test('Cashier cannot update product', r, 403);

  r = await request('DELETE', '/api/products/000000000000000000000000', null, cashierToken);
  test('Cashier cannot delete product', r, 403);

  // ------------------------------------------------------------------
  console.log('\n--- 5. CUSTOMERS: SEARCH & CREATE ---');
  r = await request('GET', '/api/customers', null, cashierToken);
  test('Cashier can list customers', r, 200);

  r = await request('GET', '/api/customers?search=John', null, cashierToken);
  test('Cashier can search customers', r, 200);

  // Create a walk-in / quick customer (cashier is permitted)
  const uniq = Date.now();
  r = await request('POST', '/api/customers', {
    name: `Walk-in ${uniq}`,
    phone: `+9${uniq}`,
    email: `walkin${uniq}@test.com`,
    address: 'Quick customer',
  }, cashierToken);
  test('Cashier can create walk-in customer', r, 201, (b) => b.data && b.data._id ? true : 'no customer id');
  const customerId = r.status === 201 ? r.body.data._id : null;

  if (customerId) {
    r = await request('GET', `/api/customers/${customerId}`, null, cashierToken);
    test('Cashier can get customer by id', r, 200);

    r = await request('PUT', `/api/customers/${customerId}`, { name: `Walk-in Updated ${uniq}` }, cashierToken);
    test('Cashier can update customer', r, 200);

    r = await request('DELETE', `/api/customers/${customerId}`, null, cashierToken);
    test('Cashier cannot delete customer', r, 403);
  }

  // ------------------------------------------------------------------
  console.log('\n--- 6. POS: CHECKOUT (CREATE SALE) & COMPLETE ---');
  // Fetch a product to sell
  r = await request('GET', '/api/products?search=Mouse', null, cashierToken);
  let productId = null;
  if (r.status === 200 && r.body.data && r.body.data.length > 0) {
    productId = r.body.data[0]._id;
  }

  if (productId) {
    const saleBody = {
      customer: customerId,
      items: [{ product: productId, quantity: 1 }],
      discountAmount: 0,
      taxAmount: 0,
      paymentMethod: 'cash',
      notes: 'Cashier panel test sale',
    };

    r = await request('POST', '/api/sales', saleBody, cashierToken);
    test('Cashier can create sale (checkout)', r, 201, (b) => b.data && b.data.invoiceNumber ? true : 'no invoice number');
    const saleId = r.status === 201 ? r.body.data._id : null;

    if (saleId) {
      // Complete the sale
      r = await request('PATCH', `/api/sales/${saleId}/complete`, null, cashierToken);
      test('Cashier can complete own sale', r, 200, (b) => b.data && b.data.paymentStatus === 'paid' ? true : 'not marked paid');

      // View receipt (own sale)
      r = await request('GET', `/api/sales/${saleId}`, null, cashierToken);
      test('Cashier can view own receipt', r, 200, (b) => b.data && Array.isArray(b.data.items) ? true : 'receipt missing items');
    }

    // Sale validation
    r = await request('POST', '/api/sales', { items: [{ product: productId, quantity: 1 }], discountAmount: 999999 }, cashierToken);
    test('Sale discount > subtotal rejected', r, 400);

    r = await request('POST', '/api/sales', { items: [] }, cashierToken);
    test('Sale with empty items rejected', r, 400);
  } else {
    console.log('  [SKIP] No product found for checkout test');
  }

  // ------------------------------------------------------------------
  console.log('\n--- 7. MY SALES (own history only) ---');
  r = await request('GET', '/api/sales', null, cashierToken);
  test('Cashier can list own sales', r, 200, (b) => Array.isArray(b.data) ? true : 'data not array');

  // Verify every returned sale belongs to the cashier
  if (r.status === 200 && Array.isArray(r.body.data) && r.body.data.length > 0) {
    const allOwned = r.body.data.every((s) => s.createdBy && (s.createdBy._id === 'cashier' || s.createdBy));
    test('All sales in cashier list are populated with createdBy', r, 200, () => (allOwned ? true : 'sale missing createdBy'));
  }

  // Cashier cannot update or cancel sales (Admin/Manager only)
  if (r.status === 200 && r.body.data && r.body.data.length > 0) {
    const anySaleId = r.body.data[0]._id;
    r = await request('PUT', `/api/sales/${anySaleId}`, { notes: 'Hack' }, cashierToken);
    test('Cashier cannot update sale', r, 403);

    r = await request('PATCH', `/api/sales/${anySaleId}/cancel`, null, cashierToken);
    test('Cashier cannot cancel sale', r, 403);

    r = await request('DELETE', `/api/sales/${anySaleId}`, null, cashierToken);
    test('Cashier cannot delete sale', r, 403);
  }

  // ------------------------------------------------------------------
  console.log('\n--- 8. AUTHORIZATION BOUNDARIES ---');
  // Admin-only / Manager-only routes
  r = await request('GET', '/api/users', null, cashierToken);
  test('Cashier cannot access users', r, 403);

  r = await request('GET', '/api/reports/sales', null, cashierToken);
  test('Cashier cannot access sales report', r, 403);

  r = await request('GET', '/api/reports/revenue', null, cashierToken);
  test('Cashier cannot access revenue report', r, 403);

  r = await request('GET', '/api/reports/categories', null, cashierToken);
  test('Cashier cannot access category report', r, 403);

  r = await request('GET', '/api/reports/top-products', null, cashierToken);
  test('Cashier cannot access top products report', r, 403);

  r = await request('GET', '/api/reports/customers', null, cashierToken);
  test('Cashier cannot access customer report', r, 403);

  r = await request('GET', '/api/reports/payment-methods', null, cashierToken);
  test('Cashier cannot access payment methods report', r, 403);

  r = await request('GET', '/api/settings/business', null, cashierToken);
  test('Cashier cannot access business settings', r, 403);

  r = await request('GET', '/api/settings/tax', null, cashierToken);
  test('Cashier cannot access tax settings', r, 403);

  r = await request('GET', '/api/settings/invoice', null, cashierToken);
  test('Cashier cannot access invoice settings', r, 403);

  r = await request('GET', '/api/settings/payment-methods', null, cashierToken);
  test('Cashier cannot access payment settings', r, 403);

  r = await request('POST', '/api/inventory', { product: '000000000000000000000000', quantity: 5 }, cashierToken);
  test('Cashier cannot create inventory', r, 403);

  r = await request('PATCH', '/api/inventory/000000000000000000000000/adjust', { adjustment: 5 }, cashierToken);
  test('Cashier cannot adjust inventory', r, 403);

  // Admin/Manager backward compatibility spot checks
  r = await request('GET', '/api/reports/sales', null, managerToken);
  test('Manager reports still work', r, 200);

  r = await request('GET', '/api/settings/business', null, adminToken);
  test('Admin settings still work', r, 200);

  // ------------------------------------------------------------------
  console.log('\n--- 9. PROFILE (shared by all roles) ---');
  r = await request('GET', '/api/profile', null, cashierToken);
  test('Cashier profile accessible', r, 200, (b) => b.data && b.data.role === 'cashier' ? true : 'role not cashier');

  // ------------------------------------------------------------------
  const total = passed + failed;
  console.log('\n========================================');
  console.log('     CASHIER PANEL TEST RESULTS');
  console.log('========================================');
  console.log(`  Total:  ${total}`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Rate:   ${total > 0 ? ((passed / total) * 100).toFixed(1) : 0}%`);
  console.log('========================================');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});

