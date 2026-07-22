const http = require('http');

const BASE_URL = 'http://localhost:5000';
let adminToken = '';
let managerToken = '';
let cashierToken = '';
let catId = '';
let prodId = '';
let custId = '';

let passed = 0;
let failed = 0;
let total = 0;

function request(method, path, body = null, token = '') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = { raw: data };
        }
        resolve({ status: res.statusCode, body: parsed });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function test(name, actual, expected) {
  total++;
  const statusMatch = actual.status === expected.status;
  if (statusMatch) {
    console.log(`  [PASS] ${name} (Status: ${actual.status})`);
    passed++;
  } else {
    console.log(`  [FAIL] ${name} - Expected ${expected.status}, got ${actual.status}`);
    if (actual.body && actual.body.message) {
      console.log(`         Message: ${actual.body.message}`);
    }
    failed++;
  }
}

async function runTests() {
  console.log('========================================');
  console.log('  POS Backend API Comprehensive Tests');
  console.log('========================================\n');

  // 1. AUTH TESTS
  console.log('--- AUTHENTICATION TESTS ---');

  let r = await request('GET', '/');
  test('Health Check', r, { status: 200 });

  // Login as Admin
  r = await request('POST', '/api/auth/login', { email: 'admin@pos.com', password: 'AdminPass123' });
  test('Admin Login', r, { status: 200 });
  if (r.status === 200) {
    adminToken = r.body.data.token;
  }

  // Invalid login
  r = await request('POST', '/api/auth/login', { email: 'admin@pos.com', password: 'WrongPass123' });
  test('Invalid Login - Wrong Password', r, { status: 401 });

  r = await request('POST', '/api/auth/login', { email: 'admin@pos.com' });
  test('Invalid Login - Missing Password', r, { status: 400 });

  r = await request('GET', '/api/auth/profile');
  test('Protected Route - No Token', r, { status: 401 });

  r = await request('GET', '/api/auth/profile', null, 'invalidtoken123');
  test('Protected Route - Invalid Token', r, { status: 401 });

  // 2. USER MANAGEMENT
  console.log('\n--- USER MANAGEMENT TESTS ---');

  r = await request('POST', '/api/auth/login', { email: 'admin@pos.com', password: 'AdminPass123' });
  if (r.status === 200) {
    adminToken = r.body.data.token;
    console.log(`  [INFO] Admin role: ${r.body.data.role}`);
  }

  r = await request('POST', '/api/users', { name: 'Store Manager', email: 'manager@pos.com', password: 'ManagerPass123', role: 'manager' }, adminToken);
  test('Admin Create Manager', r, { status: 201 });

  r = await request('POST', '/api/auth/login', { email: 'manager@pos.com', password: 'ManagerPass123' });
  test('Manager Login', r, { status: 200 });
  if (r.status === 200) {
    managerToken = r.body.data.token;
  }

  r = await request('POST', '/api/users', { name: 'Cashier One', email: 'cashier@pos.com', password: 'CashierPass123', role: 'cashier' }, adminToken);
  test('Admin Create Cashier', r, { status: 201 });

  if (managerToken) {
    r = await request('POST', '/api/users', { name: 'Cashier Two', email: 'cashier2@pos.com', password: 'CashierPass123', role: 'cashier' }, managerToken);
    test('Manager Create Cashier (Should Succeed)', r, { status: 201 });

    r = await request('POST', '/api/users', { name: 'Bad Manager', email: 'bad@pos.com', password: 'Pass123456', role: 'manager' }, managerToken);
    test('Manager Create Manager (Should Fail - 403)', r, { status: 403 });

    r = await request('POST', '/api/users', { name: 'No Role User', email: 'norole@pos.com', password: 'Pass123456' }, managerToken);
    test('Manager Create User (No Role - Should Succeed)', r, { status: 201 });
  }

  r = await request('GET', '/api/users', null, adminToken);
  test('Get Users (Admin)', r, { status: 200 });

  // 3. CATEGORY TESTS
  console.log('\n--- CATEGORY TESTS ---');

  r = await request('POST', '/api/categories', { name: 'Electronics', description: 'Electronic items' }, adminToken);
  test('Create Category', r, { status: 201 });
  if (r.status === 201) {
    catId = r.body.data._id;
  } else if (r.body && r.body.message && r.body.message.includes('already exists')) {
    console.log('  [INFO] Category already exists, fetching...');
    const cats = await request('GET', '/api/categories?search=Electronics', null, adminToken);
    if (cats.status === 200 && cats.body.data && cats.body.data.length > 0) {
      catId = cats.body.data[0]._id;
    }
  }

  r = await request('POST', '/api/categories', { name: 'Electronics' }, adminToken);
  test('Duplicate Category (Should Fail - 400)', r, { status: 400 });

  // 4. PRODUCT TESTS
  console.log('\n--- PRODUCT TESTS ---');

  if (catId) {
    r = await request('POST', '/api/products', { name: 'Wireless Mouse', sku: 'MOUSE-001', barcode: 'BC-001', category: catId, price: 29.99, stock: 50, description: 'Optical wireless mouse', costPrice: 15.00 }, adminToken);
    test('Create Product', r, { status: 201 });
    if (r.status === 201) {
      prodId = r.body.data._id;
    }

    r = await request('POST', '/api/products', { name: 'Duplicate Mouse', sku: 'MOUSE-001', category: catId, price: 19.99, stock: 10 }, adminToken);
    test('Duplicate SKU (Should Fail - 400)', r, { status: 400 });

    r = await request('POST', '/api/products', { name: 'Bad Price', sku: 'BAD-001', category: catId, price: -15, stock: 10 }, adminToken);
    test('Negative Price (Should Fail - 400)', r, { status: 400 });

    r = await request('POST', '/api/products', { name: 'Bad Stock', sku: 'BAD-002', category: catId, price: 10, stock: -5 }, adminToken);
    test('Negative Stock (Should Fail - 400)', r, { status: 400 });
  }

  r = await request('GET', '/api/products', null, adminToken);
  test('Get Products', r, { status: 200 });

  if (prodId) {
    r = await request('PUT', `/api/products/${prodId}`, { price: 24.99, stock: 75 }, adminToken);
    test('Update Product', r, { status: 200 });

    r = await request('PATCH', `/api/products/${prodId}/stock`, { stock: 100 }, adminToken);
    test('Update Product Stock (PATCH)', r, { status: 200 });

    r = await request('PUT', `/api/products/${prodId}`, { status: 'invalid_status' }, adminToken);
    test('Invalid Product Status (Should Fail - 400)', r, { status: 400 });
  }

  // 5. CUSTOMER TESTS
  console.log('\n--- CUSTOMER TESTS ---');

  r = await request('POST', '/api/customers', { name: 'John Doe', email: 'john@example.com', phone: '+1234567890', address: '123 Main St' }, adminToken);
  test('Create Customer', r, { status: 201 });
  if (r.status === 201) {
    custId = r.body.data._id;
  }

  r = await request('POST', '/api/customers', { name: 'Jane Doe', phone: '+1234567890', email: 'jane@example.com' }, adminToken);
  test('Duplicate Phone (Should Fail - 400)', r, { status: 400 });

  r = await request('POST', '/api/auth/login', { email: 'cashier@pos.com', password: 'CashierPass123' });
  test('Cashier Login', r, { status: 200 });
  if (r.status === 200) {
    cashierToken = r.body.data.token;
  }

  if (custId && cashierToken) {
    r = await request('DELETE', `/api/customers/${custId}`, null, cashierToken);
    test('Cashier Delete Customer (Should Fail - 403)', r, { status: 403 });
  }

  // 6. SALE TESTS
  console.log('\n--- SALE TESTS ---');

  if (prodId && custId) {
    const saleBody = {
      customer: custId,
      items: [{ product: prodId, quantity: 2, unitPrice: 24.99, discount: 0 }],
      discountAmount: 0,
      taxAmount: 2.50,
      paymentMethod: 'cash',
      notes: 'Test sale',
    };
    r = await request('POST', '/api/sales', saleBody, adminToken);
    test('Create Sale', r, { status: 201 });
  }

  r = await request('GET', '/api/sales', null, adminToken);
  test('Get Sales', r, { status: 200 });

  if (prodId && custId) {
    const saleBodyHighDiscount = {
      customer: custId,
      items: [{ product: prodId, quantity: 1, unitPrice: 10, discount: 0 }],
      discountAmount: 100,
      taxAmount: 0,
      paymentMethod: 'cash',
    };
    r = await request('POST', '/api/sales', saleBodyHighDiscount, adminToken);
    test('Sale Discount Exceeds Subtotal (Should Fail - 400)', r, { status: 400 });
  }

  // 7. INVENTORY TESTS
  console.log('\n--- INVENTORY TESTS ---');

  r = await request('GET', '/api/inventory', null, adminToken);
  test('Get Inventory', r, { status: 200 });

  r = await request('GET', '/api/inventory/low-stock', null, adminToken);
  test('Get Low Stock', r, { status: 200 });

  r = await request('GET', '/api/inventory/out-of-stock', null, adminToken);
  test('Get Out of Stock', r, { status: 200 });

  if (prodId) {
    r = await request('PATCH', `/api/inventory/${prodId}/adjust`, { adjustment: -10 }, adminToken);
    test('Stock Adjustment', r, { status: 200 });
  }

  // 8. DASHBOARD TESTS
  console.log('\n--- DASHBOARD TESTS ---');

  r = await request('GET', '/api/dashboard', null, adminToken);
  test('Dashboard Stats', r, { status: 200 });

  r = await request('GET', '/api/dashboard/chart', null, adminToken);
  test('Dashboard Chart', r, { status: 200 });

  // 9. REPORT TESTS
  console.log('\n--- REPORT TESTS ---');

  r = await request('GET', '/api/reports/sales', null, adminToken);
  test('Sales Report', r, { status: 200 });

  r = await request('GET', '/api/reports/revenue', null, adminToken);
  test('Revenue Report', r, { status: 200 });

  r = await request('GET', '/api/reports/categories', null, adminToken);
  test('Category Report', r, { status: 200 });

  r = await request('GET', '/api/reports/top-products', null, adminToken);
  test('Top Products Report', r, { status: 200 });

  r = await request('GET', '/api/reports/customers', null, adminToken);
  test('Customer Report', r, { status: 200 });

  r = await request('GET', '/api/reports/payment-methods', null, adminToken);
  test('Payment Methods Report', r, { status: 200 });

  // 10. EDGE CASE TESTS
  console.log('\n--- EDGE CASE & VALIDATION TESTS ---');

  r = await request('POST', '/api/products', {}, adminToken);
  test('Empty Body Product Create', r, { status: 400 });

  r = await request('GET', '/api/products/invalidid', null, adminToken);
  test('Invalid ObjectId - Get Product', r, { status: 400 });

  r = await request('GET', '/api/products/000000000000000000000000', null, adminToken);
  test('Non-existent Product', r, { status: 404 });

  r = await request('GET', '/api/nonexistent', null, adminToken);
  test('Non-existent Route', r, { status: 404 });

  // SUMMARY
  console.log('\n========================================');
  console.log('             TEST SUMMARY');
  console.log('========================================');
  console.log(`Tests Run:    ${total}`);
  console.log(`Tests Passed: ${passed}`);
  console.log(`Tests Failed: ${failed}`);
  console.log(`Pass Rate:    ${((passed / total) * 100).toFixed(1)}%`);
  console.log('========================================');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);

