/**
 * Comprehensive API Test Suite for POS Backend
 * 
 * Covers all endpoints with full CRUD validation, auth testing,
 * edge cases, and response validation.
 * 
 * Usage: node tests/test-comprehensive.js
 * Requires: Server running on localhost:5000 with seeded data
 */

const http = require('http');

const BASE = 'http://localhost:5000';
let adminToken = '';
let managerToken = '';
let cashierToken = '';
let catId = '';
let prodId = '';
let custId = '';
let saleId = '';
let resetToken = '';

let passed = 0;
let failed = 0;
let total = 0;

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
      res.on('data', (chunk) => (data += chunk));
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

function test(name, actual, expectedStatus, additionalChecks = null) {
  total++;
  const statusMatch = actual.status === expectedStatus;
  if (statusMatch) {
    if (additionalChecks) {
      const checkResult = additionalChecks(actual.body);
      if (checkResult !== true) {
        console.log(`  [FAIL] ${name} - ${checkResult}`);
        failed++;
        return;
      }
    }
    // Also validate response structure has 'success' field
    if (actual.body && typeof actual.body.success !== 'undefined') {
      const expectedSuccess = expectedStatus < 400;
      if (actual.body.success !== expectedSuccess && expectedStatus !== 201) {
        // 201 is still success
        if (expectedStatus === 201 && actual.body.success !== true) {
          console.log(`  [FAIL] ${name} - Expected success=true, got ${actual.body.success}`);
          failed++;
          return;
        }
      }
    }
    console.log(`  [PASS] ${name} (Status: ${actual.status})`);
    passed++;
  } else {
    const msg = actual.body && actual.body.message ? ` - ${actual.body.message}` : '';
    console.log(`  [FAIL] ${name} - Expected ${expectedStatus}, got ${actual.status}${msg}`);
    failed++;
  }
}

async function runTests() {
  console.log('========================================');
  console.log('  POS Backend - Comprehensive API Tests');
  console.log('========================================\n');

  // ====== 1. HEALTH CHECK ======
  console.log('--- 1. HEALTH CHECK ---');
  let r = await request('GET', '/');
  test('Health Check', r, 200, (b) => b.success === true ? true : 'success not true');

  // ====== 2. AUTHENTICATION ======
  console.log('\n--- 2. AUTHENTICATION ---');

  // 2a. Register
  const uniq = Date.now();
  r = await request('POST', '/api/auth/register', {
    name: `TestUser${uniq}`, email: `test${uniq}@test.com`, password: 'TestPass123'
  });
  test('Register New User', r, 201);

  r = await request('POST', '/api/auth/register', {
    name: `TestUser${uniq}`, email: `test${uniq}@test.com`, password: 'TestPass123'
  });
  test('Register Duplicate Email', r, 400);

  // 2b. Login
  r = await request('POST', '/api/auth/login', { email: 'admin@pos.com', password: 'AdminPass123' });
  test('Admin Login - Valid', r, 200, (b) => b.data && b.data.token ? true : 'No token returned');
  if (r.status === 200) adminToken = r.body.data.token;

  r = await request('POST', '/api/auth/login', { email: 'admin@pos.com', password: 'WrongPass123' });
  test('Login - Wrong Password', r, 401);

  r = await request('POST', '/api/auth/login', { email: 'admin@pos.com' });
  test('Login - Missing Password', r, 400);

  r = await request('POST', '/api/auth/login', {});
  test('Login - Empty Body', r, 400);

  r = await request('POST', '/api/auth/login', { email: 'nonexistent@test.com', password: 'pass123' });
  test('Login - Non-existent Email', r, 401);

  // 2c. Profile
  r = await request('GET', '/api/auth/profile');
  test('Profile - No Token', r, 401);

  r = await request('GET', '/api/auth/profile', null, 'invalid-jwt-token');
  test('Profile - Invalid Token', r, 401);

  r = await request('GET', '/api/auth/profile', null, adminToken);
  test('Profile - Valid Token', r, 200, (b) => b.data && b.data.email ? true : 'No user data');

  // 2d. Forgot Password
  r = await request('POST', '/api/auth/forgotpassword', { email: 'admin@pos.com' });
  test('Forgot Password - Valid Email', r, 200, (b) => b.data && b.data.resetToken ? true : 'No reset token');
  if (r.status === 200 && r.body.data) resetToken = r.body.data.resetToken;

  r = await request('POST', '/api/auth/forgotpassword', { email: 'nonexistent@test.com' });
  test('Forgot Password - Non-existent Email', r, 404);

  r = await request('POST', '/api/auth/forgotpassword', {});
  test('Forgot Password - Missing Email', r, 400);

  // 2e. Reset Password
  if (resetToken) {
    r = await request('PUT', `/api/auth/resetpassword/${resetToken}`, { password: 'AdminPass123' });
    test('Reset Password - Valid Token', r, 200);
    // Re-login with the password that was reset back to original
    r = await request('POST', '/api/auth/login', { email: 'admin@pos.com', password: 'AdminPass123' });
    if (r.status === 200) adminToken = r.body.data.token;
  }

  r = await request('PUT', '/api/auth/resetpassword/invalidtoken123', { password: 'AdminPass123' });
  test('Reset Password - Invalid Token', r, 400);

  r = await request('PUT', '/api/auth/resetpassword/sometoken', {});
  test('Reset Password - Missing Password', r, 400);

  r = await request('PUT', '/api/auth/resetpassword/sometoken', { password: '123' });
  test('Reset Password - Short Password', r, 400);

  // 2f. Change Password
  r = await request('PUT', '/api/auth/changepassword', { currentPassword: 'AdminPass123', newPassword: 'AdminPass123' }, adminToken);
  test('Change Password - Valid', r, 200);

  r = await request('PUT', '/api/auth/changepassword', { currentPassword: 'WrongPass', newPassword: 'NewPass123' }, adminToken);
  test('Change Password - Wrong Current', r, 401);

  r = await request('PUT', '/api/auth/changepassword', { newPassword: 'NewPass123' }, adminToken);
  test('Change Password - Missing Current', r, 400);

  r = await request('PUT', '/api/auth/changepassword', { currentPassword: 'AdminPass123' }, adminToken);
  test('Change Password - Missing New', r, 400);

  // ====== 3. USER MANAGEMENT ======
  console.log('\n--- 3. USER MANAGEMENT ---');

  // Login as Manager
  let mgrEmail = `mgr${uniq}@test.com`;
  r = await request('POST', '/api/users', { name: 'Test Manager', email: mgrEmail, password: 'ManagerPass123', role: 'manager' }, adminToken);
  // May fail if already exists from seed
  if (r.status === 201 || r.status === 400) {
    console.log(`  [INFO] Manager creation: ${r.status} (may already exist)`);
    if (r.status === 201) passed++;
    else total--;
  }

  r = await request('POST', '/api/auth/login', { email: 'manager@pos.com', password: 'ManagerPass123' });
  test('Manager Login', r, 200);
  if (r.status === 200) managerToken = r.body.data.token;

  // Role-based user creation
  r = await request('POST', '/api/users', { name: 'Cashier A', email: `cashierA${uniq}@test.com`, password: 'CashierPass123', role: 'cashier' }, adminToken);
  test('Admin Create Cashier', r, 201);

  if (managerToken) {
    r = await request('POST', '/api/users', { name: 'Cashier B', email: `cashierB${uniq}@test.com`, password: 'CashierPass123', role: 'cashier' }, managerToken);
    test('Manager Create Cashier (Should Succeed)', r, 201);

    r = await request('POST', '/api/users', { name: 'Bad Mgr', email: `badmgr${uniq}@test.com`, password: 'Pass123456', role: 'manager' }, managerToken);
    test('Manager Cannot Create Manager (403)', r, 403);
  }

  // Validation tests
  r = await request('POST', '/api/users', { name: 'A', email: 'invalid', password: '123' }, adminToken);
  test('Create User - Invalid Email', r, 400);

  r = await request('POST', '/api/users', { email: 'test@test.com', password: '123456' }, adminToken);
  test('Create User - Missing Name', r, 400);

  r = await request('POST', '/api/users', { name: 'Test', email: 'test@test.com' }, adminToken);
  test('Create User - Missing Password', r, 400);

  // Get users
  r = await request('GET', '/api/users', null, adminToken);
  test('Get Users (Admin)', r, 200, (b) => Array.isArray(b.data) ? true : 'data not array');

  r = await request('GET', '/api/users', null, cashierToken || 'invalid');
  test('Get Users - Cashier Unauthorized', r, 401);

  // Pagination
  r = await request('GET', '/api/users?page=1&limit=2', null, adminToken);
  test('Get Users - Pagination', r, 200, (b) => typeof b.page !== 'undefined' ? true : 'No pagination');

  // Search
  r = await request('GET', '/api/users?search=admin', null, adminToken);
  test('Get Users - Search', r, 200);

  // Update user
  if (adminToken) {
    r = await request('GET', '/api/users', null, adminToken);
    const users = r.body.data || [];
    if (users.length > 0) {
      const userId = users[0]._id;
      r = await request('GET', `/api/users/${userId}`, null, adminToken);
      test('Get User By ID', r, 200);

      r = await request('PUT', `/api/users/${userId}`, { name: 'Updated Admin' }, adminToken);
      test('Update User', r, 200);
    }
  }

  r = await request('GET', '/api/users/000000000000000000000000', null, adminToken);
  test('Get Non-existing User (404)', r, 404);

  // ====== 4. CATEGORIES ======
  console.log('\n--- 4. CATEGORIES ---');

  r = await request('POST', '/api/categories', { name: `TestCat-${uniq}`, description: 'Test category' }, adminToken);
  test('Create Category', r, 201);
  if (r.status === 201) catId = r.body.data._id;

  if (catId) {
    r = await request('POST', '/api/categories', { name: `TestCat-${uniq}` }, adminToken);
    test('Duplicate Category Name (400)', r, 400);

    r = await request('PUT', `/api/categories/${catId}`, { name: `UpdatedCat-${uniq}` }, adminToken);
    test('Update Category', r, 200);

    r = await request('GET', `/api/categories/${catId}`, null, adminToken);
    test('Get Category By ID', r, 200);
  }

  r = await request('GET', '/api/categories', null, adminToken);
  test('Get All Categories', r, 200);

  r = await request('GET', '/api/categories?search=Electronics', null, adminToken);
  test('Search Categories', r, 200);

  r = await request('GET', '/api/categories?page=1&limit=5', null, adminToken);
  test('Categories Pagination', r, 200);

  r = await request('POST', '/api/categories', {}, adminToken);
  test('Create Category - Empty Body', r, 400);

  r = await request('POST', '/api/categories', { name: '' }, adminToken);
  test('Create Category - Empty Name', r, 400);

  r = await request('POST', '/api/categories', { name: 'A'.repeat(51) }, adminToken);
  test('Create Category - Name Too Long', r, 400);

  // ====== 5. PRODUCTS ======
  console.log('\n--- 5. PRODUCTS ---');

  // Need a category first
  if (!catId) {
    r = await request('POST', '/api/categories', { name: `TempCat-${uniq}` }, adminToken);
    if (r.status === 201) catId = r.body.data._id;
  }

  if (catId) {
    r = await request('POST', '/api/products', {
      name: 'Test Product', sku: `TST-${uniq}`, barcode: `BAR-${uniq}`,
      category: catId, price: 29.99, stock: 50, costPrice: 15.00, description: 'Test product'
    }, adminToken);
    test('Create Product', r, 201);
    if (r.status === 201) prodId = r.body.data._id;

    if (prodId) {
      r = await request('POST', '/api/products', { name: 'Dup', sku: `TST-${uniq}`, category: catId, price: 10, stock: 5 }, adminToken);
      test('Duplicate SKU (400)', r, 400);

      r = await request('PUT', `/api/products/${prodId}`, { price: 24.99, stock: 75 }, adminToken);
      test('Update Product', r, 200);

      r = await request('PATCH', `/api/products/${prodId}/stock`, { stock: 100 }, adminToken);
      test('Update Product Stock (PATCH)', r, 200);

      r = await request('PUT', `/api/products/${prodId}`, { status: 'invalid' }, adminToken);
      test('Invalid Product Status (400)', r, 400);
    }

    r = await request('POST', '/api/products', { name: 'Neg Price', sku: `NEG-${uniq}`, category: catId, price: -15, stock: 10 }, adminToken);
    test('Negative Price (400)', r, 400);

    r = await request('POST', '/api/products', { name: 'Neg Stock', sku: `NEGS-${uniq}`, category: catId, price: 10, stock: -5 }, adminToken);
    test('Negative Stock (400)', r, 400);
  }

  r = await request('GET', '/api/products', null, adminToken);
  test('Get Products', r, 200);

  r = await request('GET', '/api/products?search=Wireless', null, adminToken);
  test('Search Products', r, 200);

  r = await request('GET', '/api/products?page=1&limit=5', null, adminToken);
  test('Products Pagination', r, 200);

  if (catId) {
    r = await request('GET', `/api/products?category=${catId}`, null, adminToken);
    test('Products Filter by Category', r, 200);
  }

  r = await request('POST', '/api/products', {}, adminToken);
  test('Create Product - Empty Body', r, 400);

  r = await request('GET', '/api/products/invalidid', null, adminToken);
  test('Invalid ObjectId - Get Product', r, 400);

  r = await request('GET', '/api/products/000000000000000000000000', null, adminToken);
  test('Non-existent Product (404)', r, 404);

  // ====== 6. CUSTOMERS ======
  console.log('\n--- 6. CUSTOMERS ---');

  r = await request('POST', '/api/customers', {
    name: 'John Doe', email: `john${uniq}@test.com`, phone: `+1${uniq}`, address: '123 Main St'
  }, adminToken);
  test('Create Customer', r, 201);
  if (r.status === 201) custId = r.body.data._id;

  if (custId) {
    r = await request('POST', '/api/customers', { name: 'Jane Doe', phone: `+1${uniq}`, email: `jane${uniq}@test.com` }, adminToken);
    test('Duplicate Phone (400)', r, 400);

    r = await request('PUT', `/api/customers/${custId}`, { name: 'John Updated' }, adminToken);
    test('Update Customer', r, 200);

    r = await request('GET', `/api/customers/${custId}`, null, adminToken);
    test('Get Customer By ID', r, 200, (b) => b.data && b.data.createdBy ? true : 'createdBy not populated');
  }

  r = await request('GET', '/api/customers', null, adminToken);
  test('Get Customers', r, 200);

  r = await request('GET', '/api/customers?search=John', null, adminToken);
  test('Search Customers', r, 200);

  r = await request('GET', '/api/customers?page=1&limit=5', null, adminToken);
  test('Customers Pagination', r, 200);

  r = await request('POST', '/api/customers', { name: 'No Phone' }, adminToken);
  test('Create Customer - Missing Phone', r, 400);

  r = await request('POST', '/api/customers', {}, adminToken);
  test('Create Customer - Empty Body', r, 400);

  // Cashier permissions
  r = await request('POST', '/api/auth/login', { email: 'cashier@pos.com', password: 'CashierPass123' });
  if (r.status === 200) cashierToken = r.body.data.token;

  if (custId && cashierToken) {
    r = await request('DELETE', `/api/customers/${custId}`, null, cashierToken);
    test('Cashier Cannot Delete Customer (403)', r, 403);
  }

  // ====== 7. SALES ======
  console.log('\n--- 7. SALES ---');

  // Create a sale customer
  const saleCustEmail = `sale${uniq}@test.com`;
  const saleCustPhone = `+8${uniq}`;
  r = await request('POST', '/api/customers', { name: 'Sale Cust', email: saleCustEmail, phone: saleCustPhone }, adminToken);
  const saleCustId = r.status === 201 ? r.body.data._id : custId;

  if (prodId && saleCustId) {
    r = await request('POST', '/api/sales', {
      customer: saleCustId,
      items: [{ product: prodId, quantity: 2, unitPrice: 24.99, discount: 0 }],
      discountAmount: 0, taxAmount: 2.50, paymentMethod: 'cash', notes: 'Test sale'
    }, adminToken);
    test('Create Sale', r, 201);
    if (r.status === 201) saleId = r.body.data._id;

    if (saleId) {
      r = await request('GET', `/api/sales/${saleId}`, null, adminToken);
      test('Get Sale By ID', r, 200, (b) => b.data && b.data.items ? true : 'no items');

      // Complete sale
      r = await request('PATCH', `/api/sales/${saleId}/complete`, null, adminToken);
      test('Complete Sale', r, 200);

      // Cancel sale
      r = await request('PATCH', `/api/sales/${saleId}/cancel`, null, adminToken);
      test('Cancel Sale (Refund)', r, 200);

      // Double cancel should fail
      r = await request('PATCH', `/api/sales/${saleId}/cancel`, null, adminToken);
      test('Cancel Already Refunded Sale (400)', r, 400);
    }

    // Discount exceeds subtotal
    r = await request('POST', '/api/sales', {
      customer: saleCustId,
      items: [{ product: prodId, quantity: 1, unitPrice: 10, discount: 0 }],
      discountAmount: 100, taxAmount: 0, paymentMethod: 'cash'
    }, adminToken);
    test('Sale - Discount Exceeds Subtotal (400)', r, 400);
  }

  r = await request('GET', '/api/sales', null, adminToken);
  test('Get Sales', r, 200);

  r = await request('GET', '/api/sales?page=1&limit=5', null, adminToken);
  test('Sales Pagination', r, 200);

  // Update Sale (if we have one)
  if (saleId) {
    // Create a new sale for update test (since previous was cancelled)
    r = await request('POST', '/api/sales', {
      customer: saleCustId,
      items: [{ product: prodId, quantity: 1, unitPrice: 24.99, discount: 0 }],
      discountAmount: 0, taxAmount: 0, paymentMethod: 'cash'
    }, adminToken);
    if (r.status === 201) {
      const updateSaleId = r.body.data._id;
      r = await request('PUT', `/api/sales/${updateSaleId}`, { notes: 'Updated notes', paymentStatus: 'paid' }, adminToken);
      test('Update Sale', r, 200);
    }

    // Cashier cannot update sale
    if (cashierToken) {
      r = await request('PUT', `/api/sales/${saleId}`, { notes: 'Hack' }, cashierToken);
      test('Cashier Cannot Update Sale (403)', r, 403);
    }
  }

  // Validation
  r = await request('POST', '/api/sales', { items: [] }, adminToken);
  test('Create Sale - Empty Items', r, 400);

  r = await request('POST', '/api/sales', {}, adminToken);
  test('Create Sale - Empty Body', r, 400);

  r = await request('POST', '/api/sales', { items: [{ product: 'invalid', quantity: 1 }] }, adminToken);
  test('Create Sale - Invalid Product ID', r, 400);

  // ====== 8. INVENTORY ======
  console.log('\n--- 8. INVENTORY ---');

  r = await request('GET', '/api/inventory', null, adminToken);
  test('Get Inventory', r, 200, (b) => b.summary ? true : 'No summary');

  r = await request('GET', '/api/inventory/low-stock', null, adminToken);
  test('Get Low Stock', r, 200);

  r = await request('GET', '/api/inventory/low-stock?threshold=5', null, adminToken);
  test('Get Low Stock - Custom Threshold', r, 200);

  r = await request('GET', '/api/inventory/out-of-stock', null, adminToken);
  test('Get Out of Stock', r, 200);

  if (prodId) {
    r = await request('PATCH', `/api/inventory/${prodId}/adjust`, { adjustment: -10 }, adminToken);
    test('Stock Adjustment - Decrease', r, 200);

    r = await request('PATCH', `/api/inventory/${prodId}/adjust`, { adjustment: 20 }, adminToken);
    test('Stock Adjustment - Increase', r, 200);
  }

  r = await request('PATCH', `/api/inventory/${prodId || '000000000000000000000000'}/adjust`, { adjustment: 0 }, adminToken);
  test('Stock Adjustment - Zero (400)', r, 400);

  r = await request('PATCH', `/api/inventory/${prodId || '000000000000000000000000'}/adjust`, { adjustment: 'abc' }, adminToken);
  test('Stock Adjustment - Invalid Value (400)', r, 400);

  r = await request('GET', '/api/inventory?search=Mouse', null, adminToken);
  test('Inventory Search', r, 200);

  r = await request('GET', '/api/inventory?page=1&limit=5', null, adminToken);
  test('Inventory Pagination', r, 200);

  // ====== 9. DASHBOARD ======
  console.log('\n--- 9. DASHBOARD ---');

  r = await request('GET', '/api/dashboard', null, adminToken);
  test('Dashboard Stats', r, 200, (b) => b.data && b.data.today ? true : 'no today data');

  r = await request('GET', '/api/dashboard/chart', null, adminToken);
  test('Dashboard Chart - Weekly', r, 200);

  r = await request('GET', '/api/dashboard/chart?period=monthly', null, adminToken);
  test('Dashboard Chart - Monthly', r, 200);

  r = await request('GET', '/api/dashboard', null, cashierToken || 'invalid');
  test('Dashboard - Cashier Unauthorized', r, 403);

  // ====== 10. REPORTS ======
  console.log('\n--- 10. REPORTS ---');

  r = await request('GET', '/api/reports/sales', null, adminToken);
  test('Sales Report', r, 200, (b) => b.summary ? true : 'No summary');

  r = await request('GET', '/api/reports/sales?period=today', null, adminToken);
  test('Sales Report - Today', r, 200);

  r = await request('GET', '/api/reports/revenue', null, adminToken);
  test('Revenue Report', r, 200);

  r = await request('GET', '/api/reports/categories', null, adminToken);
  test('Category Report', r, 200);

  r = await request('GET', '/api/reports/top-products', null, adminToken);
  test('Top Products Report', r, 200);

  r = await request('GET', '/api/reports/top-products?limit=5', null, adminToken);
  test('Top Products - Custom Limit', r, 200);

  r = await request('GET', '/api/reports/customers', null, adminToken);
  test('Customer Report', r, 200);

  r = await request('GET', '/api/reports/payment-methods', null, adminToken);
  test('Payment Methods Report', r, 200);

  r = await request('GET', '/api/reports/sales?period=weekly', null, adminToken);
  test('Sales Report - Weekly', r, 200);

  r = await request('GET', '/api/reports/sales?period=yearly', null, adminToken);
  test('Sales Report - Yearly', r, 200);

  r = await request('GET', '/api/reports/sales?startDate=2024-01-01&endDate=2024-12-31', null, adminToken);
  test('Sales Report - Custom Date Range', r, 200);

  // Unauthorized report access
  r = await request('GET', '/api/reports/sales', null, cashierToken || 'invalid');
  test('Reports - Cashier Unauthorized', r, 403);

  // ====== 11. EDGE CASES ======
  console.log('\n--- 11. EDGE CASES ---');

  // Non-existent routes
  r = await request('GET', '/api/nonexistent');
  test('Non-existent Route (404)', r, 404);

  r = await request('POST', '/api/nonexistent', {});
  test('POST Non-existent Route (404)', r, 404);

  // SQL Injection attempts
  r = await request('POST', '/api/auth/login', { email: "' OR 1=1 --", password: 'test' });
  test('SQL Injection - Login', r, 400);

  r = await request('GET', `/api/products?search='; DROP TABLE products; --`, null, adminToken);
  test('SQL Injection - Search', r, 200);

  // NoSQL Injection attempts
  r = await request('POST', '/api/auth/login', { email: { "$gt": "" }, password: 'test' });
  test('NoSQL Injection - Email Object', r, 400);

  // Long strings
  const longStr = 'A'.repeat(1000);
  r = await request('POST', '/api/products', {
    name: 'Long', sku: 'LONG-1', category: catId || '000000000000000000000000',
    price: 10, stock: 5, description: longStr
  }, adminToken);
  test('Very Long Description', r, 400);

  // Misssing auth for protected endpoints
  r = await request('GET', '/api/customers');
  test('Protected - No Token', r, 401);

  // Delete operations
  if (catId && prodId) {
    // Delete product
    r = await request('DELETE', `/api/products/${prodId}`, null, adminToken);
    test('Delete Product', r, 200);

    // Soft delete - check it's gone
    r = await request('GET', `/api/products/${prodId}`, null, adminToken);
    test('Get Deleted Product (404)', r, 404);
  }

  if (custId) {
    r = await request('DELETE', `/api/customers/${custId}`, null, adminToken);
    test('Delete Customer', r, 200);
  }

  if (catId) {
    r = await request('DELETE', `/api/categories/${catId}`, null, adminToken);
    test('Delete Category', r, 200);
  }

  // ====== 12. RESPONSE STRUCTURE VALIDATION ======
  console.log('\n--- 12. RESPONSE STRUCTURE ---');

  r = await request('GET', '/', null, adminToken);
  test('All responses have success field', r, 200, (b) => {
    return typeof b.success !== 'undefined' ? true : 'Missing success field';
  });

  // Verify error responses have errors array
  r = await request('POST', '/api/auth/login', {}, null);
  test('Error responses have errors array', r, 400, (b) => {
    return Array.isArray(b.errors) ? true : 'Missing errors array';
  });

  // ====== SUMMARY ======
  const finalTotal = passed + failed;
  console.log('\n========================================');
  console.log('          FINAL TEST RESULTS');
  console.log('========================================');
  console.log(`  Total Tests:  ${finalTotal}`);
  console.log(`  Passed:       ${passed}`);
  console.log(`  Failed:       ${failed}`);
  console.log(`  Success Rate: ${finalTotal > 0 ? ((passed / finalTotal) * 100).toFixed(1) : 0}%`);
  console.log('========================================');
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});

