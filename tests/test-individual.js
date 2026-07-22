const http = require('http');
const BASE = 'http://localhost:5000';
let pass = 0, fail = 0;

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

function test(name, actual, expected) {
  if (actual.status === expected) {
    console.log(`  ✅ PASS: ${name} (${actual.status})`);
    pass++;
  } else {
    console.log(`  ❌ FAIL: ${name} - Expected ${expected}, got ${actual.status}`);
    if (actual.body && actual.body.message) console.log(`     Message: ${actual.body.message}`);
    fail++;
  }
}

async function run() {
  // ============ 1. AUTH TESTS ============
  console.log('\n==================== AUTHENTICATION ====================');
  let r = await req('GET', '/');
  test('Health Check', r, 200);

  r = await req('POST', '/api/auth/login', { email: 'admin@pos.com', password: 'AdminPass123' });
  test('Admin Login - Valid Credentials', r, 200);
  const token = r.status === 200 ? r.body.data.token : '';

  r = await req('POST', '/api/auth/login', { email: 'admin@pos.com', password: 'WrongPassword!' });
  test('Login - Invalid Password', r, 401);

  r = await req('POST', '/api/auth/login', { email: 'admin@pos.com' });
  test('Login - Missing Password Field', r, 400);

  r = await req('POST', '/api/auth/login', {});
  test('Login - Empty Body', r, 400);

  r = await req('GET', '/api/auth/profile');
  test('Profile - No Token', r, 401);

  r = await req('GET', '/api/auth/profile', null, 'this-is-a-fake-token');
  test('Profile - Invalid Token', r, 401);

  r = await req('GET', '/api/auth/profile', null, token);
  test('Profile - Valid Token', r, 200);

  // ============ 2. USER MANAGEMENT ============
  console.log('\n==================== USER MANAGEMENT ====================');
  const uniq = Date.now();

  r = await req('POST', '/api/users', { name: 'Test Manager', email: `mgr${uniq}@test.com`, password: 'Pass123', role: 'manager' }, token);
  test('Admin Create Manager', r, 201);
  const mgrEmail = r.status === 201 ? r.body.data.email : null;

  let mgrToken = '';
  if (mgrEmail) {
    r = await req('POST', '/api/auth/login', { email: mgrEmail, password: 'Pass123' });
    test('Manager Login', r, 200);
    mgrToken = r.status === 200 ? r.body.data.token : '';
  }

  r = await req('POST', '/api/users', { name: 'Test Cashier', email: `csh${uniq}@test.com`, password: 'Pass123', role: 'cashier' }, token);
  test('Admin Create Cashier', r, 201);

  if (mgrToken) {
    r = await req('POST', '/api/users', { name: 'Mgr Cashier', email: `csh2${uniq}@test.com`, password: 'Pass123', role: 'cashier' }, mgrToken);
    test('Manager Create Cashier', r, 201);

    r = await req('POST', '/api/users', { name: 'Bad Mgr', email: `badmgr${uniq}@test.com`, password: 'Pass123', role: 'manager' }, mgrToken);
    test('Manager Cannot Create Manager (403)', r, 403);
  }

  r = await req('GET', '/api/users', null, token);
  test('Get Users List', r, 200);

  if (r.status === 200 && r.body.data && r.body.data.length > 0) {
    const userId = r.body.data[0]._id;
    r = await req('GET', `/api/users/${userId}`, null, token);
    test('Get User By ID', r, 200);

    r = await req('PUT', `/api/users/${userId}`, { name: 'Updated Name' }, token);
    test('Update User', r, 200);

    r = await req('GET', '/api/users/000000000000000000000000', null, token);
    test('Get Non-existing User (404)', r, 404);
  }

  // ============ 3. CATEGORY TESTS ============
  console.log('\n==================== CATEGORIES ====================');
  r = await req('POST', '/api/categories', { name: `TechGadgets${uniq}`, description: 'Electronic items' }, token);
  test('Create Category', r, 201);
  const catId = r.status === 201 ? r.body.data._id : null;

  if (catId) {
    r = await req('POST', '/api/categories', { name: `TechGadgets${uniq}` }, token);
    test('Duplicate Category Name (400)', r, 400);

    r = await req('PUT', `/api/categories/${catId}`, { name: `UpdatedCat${uniq}` }, token);
    test('Update Category', r, 200);

    r = await req('GET', `/api/categories/${catId}`, null, token);
    test('Get Category By ID', r, 200);
  }

  r = await req('GET', '/api/categories', null, token);
  test('Get All Categories', r, 200);

  // ============ 4. PRODUCT TESTS ============
  console.log('\n==================== PRODUCTS ====================');
  if (catId) {
    r = await req('POST', '/api/products', {
      name: 'Wireless Mouse', sku: `MOUSE-${uniq}`, barcode: `BAR-${uniq}`,
      category: catId, price: 29.99, stock: 50, costPrice: 15.00, description: 'Optical mouse'
    }, token);
    test('Create Product', r, 201);
  }
  const prodId = r.status === 201 ? r.body.data._id : null;

  if (catId && prodId) {
    r = await req('POST', '/api/products', { name: 'Dup Mouse', sku: `MOUSE-${uniq}`, category: catId, price: 19.99, stock: 10 }, token);
    test('Duplicate SKU (400)', r, 400);
  }

  r = await req('POST', '/api/products', { name: 'Bad Price', sku: `BADP-${uniq}`, category: catId || '000000000000000000000000', price: -15, stock: 10 }, token);
  test('Negative Price (400)', r, 400);

  r = await req('POST', '/api/products', { name: 'Bad Stock', sku: `BADS-${uniq}`, category: catId || '000000000000000000000000', price: 10, stock: -5 }, token);
  test('Negative Stock (400)', r, 400);

  if (prodId) {
    r = await req('PUT', `/api/products/${prodId}`, { price: 24.99, stock: 75 }, token);
    test('Update Product', r, 200);

    r = await req('PATCH', `/api/products/${prodId}/stock`, { stock: 100 }, token);
    test('Update Stock (PATCH)', r, 200);

    r = await req('PUT', `/api/products/${prodId}`, { status: 'invalid_status' }, token);
    test('Invalid Status Value (400)', r, 400);
  }

  r = await req('GET', '/api/products', null, token);
  test('Get Products List', r, 200);

  r = await req('GET', '/api/products?search=mouse', null, token);
  test('Search Products', r, 200);

  r = await req('GET', '/api/products?page=1&limit=5', null, token);
  test('Products Pagination', r, 200);

  // ============ 5. CUSTOMER TESTS ============
  console.log('\n==================== CUSTOMERS ====================');
  r = await req('POST', '/api/customers', { name: 'John Doe', email: `john${uniq}@test.com`, phone: `+1${uniq}`, address: '123 Main St' }, token);
  test('Create Customer', r, 201);
  const custId = r.status === 201 ? r.body.data._id : null;

  if (custId) {
    r = await req('POST', '/api/customers', { name: 'Jane Doe', phone: `+1${uniq}`, email: `jane${uniq}@test.com` }, token);
    test('Duplicate Phone (400)', r, 400);

    r = await req('PUT', `/api/customers/${custId}`, { name: 'John Updated' }, token);
    test('Update Customer', r, 200);
  }

  r = await req('GET', '/api/customers', null, token);
  test('Get Customers', r, 200);

  // Cashier permission check
  r = await req('POST', '/api/auth/login', { email: 'cashier@pos.com', password: 'CashierPass123' });
  test('Cashier Login', r, 200);
  const cashierToken = r.status === 200 ? r.body.data.token : '';

  if (custId && cashierToken) {
    r = await req('DELETE', `/api/customers/${custId}`, null, cashierToken);
    test('Cashier Cannot Delete Customer (403)', r, 403);
  }

  if (custId && token) {
    r = await req('DELETE', `/api/customers/${custId}`, null, token);
    test('Admin Delete Customer', r, 200);
  }

  // ============ 6. SALE TESTS ============
  console.log('\n==================== SALES ====================');
  if (prodId) {
    // Create a fresh customer for sale
    r = await req('POST', '/api/customers', { name: 'Sale Cust', email: `sale${uniq}@test.com`, phone: `+9${uniq}` }, token);
    test('Create Sale Customer', r, 201);
    const saleCustId = r.status === 201 ? r.body.data._id : null;

    if (saleCustId) {
      r = await req('POST', '/api/sales', {
        customer: saleCustId,
        items: [{ product: prodId, quantity: 2, unitPrice: 24.99, discount: 0 }],
        discountAmount: 0, taxAmount: 2.50, paymentMethod: 'cash', notes: 'Test sale'
      }, token);
      test('Create Sale', r, 201);

      if (r.status === 201) {
        const saleId = r.body.data._id;
        r = await req('GET', `/api/sales/${saleId}`, null, token);
        test('Get Sale By ID', r, 200);
      }

      r = await req('POST', '/api/sales', {
        customer: saleCustId,
        items: [{ product: prodId, quantity: 1, unitPrice: 10, discount: 0 }],
        discountAmount: 100, taxAmount: 0, paymentMethod: 'cash'
      }, token);
      test('Discount Exceeds Subtotal (400)', r, 400);
    }
  }

  r = await req('GET', '/api/sales', null, token);
  test('Get Sales History', r, 200);

  // ============ 7. INVENTORY TESTS ============
  console.log('\n==================== INVENTORY ====================');
  r = await req('GET', '/api/inventory', null, token);
  test('Get Inventory', r, 200);

  r = await req('GET', '/api/inventory/low-stock', null, token);
  test('Low Stock Products', r, 200);

  r = await req('GET', '/api/inventory/out-of-stock', null, token);
  test('Out of Stock Products', r, 200);

  if (prodId) {
    r = await req('PATCH', `/api/inventory/${prodId}/adjust`, { adjustment: -10 }, token);
    test('Stock Adjustment', r, 200);
  }

  // ============ 8. DASHBOARD TESTS ============
  console.log('\n==================== DASHBOARD ====================');
  r = await req('GET', '/api/dashboard', null, token);
  test('Dashboard Statistics', r, 200);

  r = await req('GET', '/api/dashboard/chart', null, token);
  test('Dashboard Chart (Weekly)', r, 200);

  r = await req('GET', '/api/dashboard/chart?period=monthly', null, token);
  test('Dashboard Chart (Monthly)', r, 200);

  // ============ 9. REPORT TESTS ============
  console.log('\n==================== REPORTS ====================');
  r = await req('GET', '/api/reports/sales', null, token);
  test('Sales Report', r, 200);

  r = await req('GET', '/api/reports/revenue', null, token);
  test('Revenue Report', r, 200);

  r = await req('GET', '/api/reports/categories', null, token);
  test('Category Sales Report', r, 200);

  r = await req('GET', '/api/reports/top-products', null, token);
  test('Top Products Report', r, 200);

  r = await req('GET', '/api/reports/customers', null, token);
  test('Customer Report', r, 200);

  r = await req('GET', '/api/reports/payment-methods', null, token);
  test('Payment Method Report', r, 200);

  // ============ 10. EDGE CASES ============
  console.log('\n==================== EDGE CASES ====================');
  r = await req('POST', '/api/products', {}, token);
  test('Empty Body Product Create (400)', r, 400);

  r = await req('GET', '/api/products/invalidid', null, token);
  test('Invalid ObjectId (400)', r, 400);

  r = await req('GET', '/api/products/000000000000000000000000', null, token);
  test('Non-existent Product (404)', r, 404);

  r = await req('GET', '/api/nonexistent', null, token);
  test('Non-existent Route (404)', r, 404);

  r = await req('POST', '/api/categories', {}, token);
  test('Empty Category Body (400)', r, 400);

  r = await req('POST', '/api/customers', { name: 'No Phone' }, token);
  test('Missing Required Customer Field (400)', r, 400);

  r = await req('POST', '/api/users', { name: 'Bad', email: 'notanemail', password: '123' }, token);
  test('Invalid Email Format (400)', r, 400);

  // ============ SUMMARY ============
  const total = pass + fail;
  console.log('\n========================================');
  console.log('          FINAL TEST RESULTS');
  console.log('========================================');
  console.log(`  Total Tests:  ${total}`);
  console.log(`  Passed:       ${pass}`);
  console.log(`  Failed:       ${fail}`);
  console.log(`  Success Rate: ${((pass / total) * 100).toFixed(1)}%`);
  console.log('========================================');
  process.exit(fail > 0 ? 1 : 0);
}

run().catch(console.error);

