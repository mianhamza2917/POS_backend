/**
 * Comprehensive API Test Suite for POS Backend
 * ============================================
 * Tests EVERY API endpoint across all modules (Auth, Profile, Users,
 * Customers, Products, Categories, Sales, Dashboard, Inventory,
 * Reports, Settings) for success, validation, auth, authorization,
 * duplicates, pagination, search/filter/sort, edge cases and response
 * format consistency. Writes results to tests/api-results.json.
 *
 * Usage: node tests/test-all-apis.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:5000';
const results = [];
let passed = 0;
let failed = 0;
let totalTests = 0;

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

function record(endpoint, method, actual, expected, check = null) {
  totalTests++;
  const statusOk = actual.status === expected;
  let checkMsg = null;
  if (statusOk && check) {
    const r = check(actual.body);
    if (r !== true) checkMsg = r;
  }
  const pass = statusOk && !checkMsg;
  if (pass) {
    passed++;
    results.push({ method, endpoint, status: actual.status, expected, pass: true, reason: 'Working' });
    console.log(`  [PASS] ${method} ${endpoint} (${actual.status})`);
  } else {
    failed++;
    const reason = checkMsg || (actual.body && actual.body.message ? actual.body.message : `Expected ${expected}, got ${actual.status}`);
    results.push({ method, endpoint, status: actual.status, expected, pass: false, reason });
    console.log(`  [FAIL] ${method} ${endpoint} - Expected ${expected}, got ${actual.status} | ${reason}`);
  }
}

function section(name) {
  console.log(`\n=== ${name} ===`);
}

const uniq = Date.now();

async function run() {
  console.log('========================================');
  console.log('  POS BACKEND - COMPLETE API TEST SUITE');
  console.log('========================================');

  let adminToken = '';
  let managerToken = '';
  let cashierToken = '';
  let catId = '';
  let prodId = '';
  let prod2Id = '';
  let custId = '';
  let saleId = '';
  let inventoryId = '';
  let userId = '';
  let resetToken = '';

  // ============ HEALTH ============
  section('HEALTH');
  let r = await request('GET', '/');
  record('/', 'GET', r, 200, (b) => (b.success === true ? true : 'success not true'));

  // ============ AUTH REGISTER ============
  section('AUTH - REGISTER');
  const regEmail = `reg${uniq}@test.com`;
  r = await request('POST', '/api/auth/register', { name: 'Test Register', email: regEmail, password: 'RegPass123' });
  record('/api/auth/register', 'POST', r, 201, (b) => (b.data && b.data.token ? true : 'No token'));

  r = await request('POST', '/api/auth/register', { name: 'Test Register', email: regEmail, password: 'RegPass123' });
  record('/api/auth/register (duplicate email)', 'POST', r, 400);

  r = await request('POST', '/api/auth/register', { name: 'A', email: `a${uniq}@test.com`, password: 'RegPass123' });
  record('/api/auth/register (short name)', 'POST', r, 400);

  r = await request('POST', '/api/auth/register', { name: 'Test', email: 'invalid-email', password: 'RegPass123' });
  record('/api/auth/register (invalid email)', 'POST', r, 400);

  r = await request('POST', '/api/auth/register', { name: 'Test', email: `b${uniq}@test.com`, password: '123' });
  record('/api/auth/register (short password)', 'POST', r, 400);

  r = await request('POST', '/api/auth/register', {});
  record('/api/auth/register (empty body)', 'POST', r, 400);

  // ============ AUTH LOGIN ============
  section('AUTH - LOGIN');
  r = await request('POST', '/api/auth/login', { email: 'admin@pos.com', password: 'AdminPass123' });
  record('/api/auth/login (admin)', 'POST', r, 200, (b) => (b.data && b.data.token ? true : 'No token'));
  if (r.status === 200) adminToken = r.body.data.token;

  r = await request('POST', '/api/auth/login', { email: 'manager@pos.com', password: 'ManagerPass123' });
  record('/api/auth/login (manager)', 'POST', r, 200, (b) => (b.data && b.data.token ? true : 'No token'));
  if (r.status === 200) managerToken = r.body.data.token;

  r = await request('POST', '/api/auth/login', { email: 'cashier@pos.com', password: 'CashierPass123' });
  record('/api/auth/login (cashier)', 'POST', r, 200, (b) => (b.data && b.data.token ? true : 'No token'));
  if (r.status === 200) cashierToken = r.body.data.token;

  r = await request('POST', '/api/auth/login', { email: 'admin@pos.com', password: 'WrongPass' });
  record('/api/auth/login (wrong password)', 'POST', r, 401);

  r = await request('POST', '/api/auth/login', { email: 'nonexistent@test.com', password: 'Pass123' });
  record('/api/auth/login (nonexistent email)', 'POST', r, 401);

  r = await request('POST', '/api/auth/login', { email: 'admin@pos.com' });
  record('/api/auth/login (missing password)', 'POST', r, 400);

  r = await request('POST', '/api/auth/login', {});
  record('/api/auth/login (empty body)', 'POST', r, 400);

  r = await request('POST', '/api/auth/login', { email: 'bad-email', password: 'Pass123' });
  record('/api/auth/login (invalid email format)', 'POST', r, 400);

  // ============ AUTH PROFILE / PASSWORD FLOWS ============
  section('AUTH - PROFILE / FORGOT / RESET / CHANGE');
  r = await request('GET', '/api/auth/profile');
  record('/api/auth/profile (no token)', 'GET', r, 401);

  r = await request('GET', '/api/auth/profile', null, 'invalid-token');
  record('/api/auth/profile (invalid token)', 'GET', r, 401);

  r = await request('GET', '/api/auth/profile', null, adminToken);
  record('/api/auth/profile (valid token)', 'GET', r, 200, (b) => (b.data && b.data.email ? true : 'No user data'));

  r = await request('POST', '/api/auth/forgotpassword', { email: 'admin@pos.com' });
  record('/api/auth/forgotpassword (valid email)', 'POST', r, 200, (b) => (b.data && b.data.resetToken ? true : 'No reset token'));
  if (r.status === 200 && r.body.data) resetToken = r.body.data.resetToken;

  r = await request('POST', '/api/auth/forgotpassword', { email: 'nonexistent@test.com' });
  record('/api/auth/forgotpassword (nonexistent)', 'POST', r, 404);

  r = await request('POST', '/api/auth/forgotpassword', {});
  record('/api/auth/forgotpassword (missing email)', 'POST', r, 400);

  if (resetToken) {
    r = await request('PUT', `/api/auth/resetpassword/${resetToken}`, { password: 'AdminPass123' });
    record('/api/auth/resetpassword/:token (valid)', 'PUT', r, 200, (b) => (b.data && b.data.token ? true : 'No token'));
  }

  r = await request('PUT', '/api/auth/resetpassword/invalidtoken', { password: 'AdminPass123' });
  record('/api/auth/resetpassword/:token (invalid token)', 'PUT', r, 400);

  r = await request('PUT', '/api/auth/resetpassword/sometoken', {});
  record('/api/auth/resetpassword/:token (missing password)', 'PUT', r, 400);

  r = await request('PUT', '/api/auth/resetpassword/sometoken', { password: '123' });
  record('/api/auth/resetpassword/:token (short password)', 'PUT', r, 400);

  r = await request('PUT', '/api/auth/changepassword', { currentPassword: 'AdminPass123', newPassword: 'AdminPass123' }, adminToken);
  record('/api/auth/changepassword (valid)', 'PUT', r, 200);

  r = await request('PUT', '/api/auth/changepassword', { currentPassword: 'WrongPass', newPassword: 'NewPass123' }, adminToken);
  record('/api/auth/changepassword (wrong current)', 'PUT', r, 401);

  r = await request('PUT', '/api/auth/changepassword', { newPassword: 'NewPass123' }, adminToken);
  record('/api/auth/changepassword (missing current)', 'PUT', r, 400);

  r = await request('PUT', '/api/auth/changepassword', { currentPassword: 'AdminPass123' }, adminToken);
  record('/api/auth/changepassword (missing new)', 'PUT', r, 400);

  r = await request('PUT', '/api/auth/changepassword', {}, null);
  record('/api/auth/changepassword (no auth)', 'PUT', r, 401);

  // ============ PROFILE ============
  section('PROFILE');
  r = await request('GET', '/api/profile', null, adminToken);
  record('/api/profile (authenticated)', 'GET', r, 200, (b) => (b.data && b.data.email ? true : 'No user data'));

  r = await request('GET', '/api/profile');
  record('/api/profile (no auth)', 'GET', r, 401);

  r = await request('PUT', '/api/profile', { name: 'Updated Admin', phone: '+1112223333', address: '123 Admin St' }, adminToken);
  record('/api/profile (update name/phone/address)', 'PUT', r, 200, (b) => (b.data && b.data.name === 'Updated Admin' ? true : 'Name not updated'));

  r = await request('PUT', '/api/profile', { name: 'A' }, adminToken);
  record('/api/profile (invalid short name)', 'PUT', r, 400);

  r = await request('PUT', '/api/profile', {}, null);
  record('/api/profile (update no auth)', 'PUT', r, 401);

  r = await request('PUT', '/api/profile/photo', {}, adminToken);
  record('/api/profile/photo (no file)', 'PUT', r, 400);

  r = await request('PUT', '/api/profile/change-password', { currentPassword: 'AdminPass123', newPassword: 'AdminPass123' }, adminToken);
  record('/api/profile/change-password (valid)', 'PUT', r, 200);

  r = await request('PUT', '/api/profile/change-password', { currentPassword: 'Wrong', newPassword: 'NewPass123' }, adminToken);
  record('/api/profile/change-password (wrong current)', 'PUT', r, 401);

  r = await request('PUT', '/api/profile/change-password', { currentPassword: 'AdminPass123', newPassword: '123' }, adminToken);
  record('/api/profile/change-password (short new)', 'PUT', r, 400);

  r = await request('PUT', '/api/profile/change-password', {}, null);
  record('/api/profile/change-password (no auth)', 'PUT', r, 401);

  // ============ USERS ============
  section('USERS');
  r = await request('POST', '/api/users', { name: `Manager ${uniq}`, email: `mgr${uniq}@test.com`, password: 'MgrPass123', role: 'manager' }, adminToken);
  record('/api/users (admin create manager)', 'POST', r, 201, (b) => (b.data && b.data.role === 'manager' ? true : 'Role not manager'));

  r = await request('POST', '/api/users', { name: `Cashier A ${uniq}`, email: `ca${uniq}@test.com`, password: 'CashPass123', role: 'cashier' }, adminToken);
  record('/api/users (admin create cashier)', 'POST', r, 201);

  r = await request('POST', '/api/users', { name: 'Cashier B', email: `cb${uniq}@test.com`, password: 'CashPass123', role: 'cashier' }, managerToken);
  record('/api/users (manager create cashier)', 'POST', r, 201);

  r = await request('POST', '/api/users', { name: 'Bad Manager', email: `badmgr${uniq}@test.com`, password: 'Pass123', role: 'manager' }, managerToken);
  record('/api/users (manager create manager - 403)', 'POST', r, 403);

  r = await request('POST', '/api/users', { name: 'Dup', email: 'admin@pos.com', password: 'Pass123' }, adminToken);
  record('/api/users (duplicate email)', 'POST', r, 400);

  r = await request('POST', '/api/users', { name: 'X', email: `inv${uniq}@test.com`, password: 'Pass123' }, adminToken);
  record('/api/users (short name)', 'POST', r, 400);

  r = await request('POST', '/api/users', { name: 'Test', email: 'bad-email', password: 'Pass123' }, adminToken);
  record('/api/users (invalid email)', 'POST', r, 400);

  r = await request('POST', '/api/users', { name: 'Test', email: `nopass${uniq}@test.com` }, adminToken);
  record('/api/users (missing password)', 'POST', r, 400);

  r = await request('POST', '/api/users', { name: 'Test', email: `x${uniq}@test.com`, password: 'Pass123', role: 'superadmin' }, adminToken);
  record('/api/users (invalid role)', 'POST', r, 400);

  r = await request('GET', '/api/users', null, adminToken);
  record('/api/users (get list - admin)', 'GET', r, 200, (b) => (Array.isArray(b.data) ? true : 'data not array'));

  r = await request('GET', '/api/users', null, managerToken);
  record('/api/users (get list - manager)', 'GET', r, 200);

  r = await request('GET', '/api/users', null, cashierToken);
  record('/api/users (get list - cashier 403)', 'GET', r, 403);

  r = await request('GET', '/api/users?page=1&limit=2', null, adminToken);
  record('/api/users (pagination)', 'GET', r, 200, (b) => (typeof b.page !== 'undefined' ? true : 'No pagination'));

  r = await request('GET', '/api/users?search=admin', null, adminToken);
  record('/api/users (search)', 'GET', r, 200);

  r = await request('GET', '/api/users?search=zzzzerodoesnotexist', null, adminToken);
  record('/api/users (search no results)', 'GET', r, 200);

  if (r.status === 200 && r.body.data && r.body.data.length > 0) {
    userId = r.body.data[0]._id;
  }

  r = await request('GET', '/api/users?sortBy=name&sortOrder=asc', null, adminToken);
  record('/api/users (sort)', 'GET', r, 200);

  // Fetch a user id directly from the full list
  r = await request('GET', '/api/users?page=1&limit=50', null, adminToken);
  if (r.status === 200 && r.body.data && r.body.data.length > 0) {
    userId = r.body.data[0]._id;
  }

  if (userId) {
    r = await request('GET', `/api/users/${userId}`, null, adminToken);
    record('/api/users/:id (get by id)', 'GET', r, 200);

    r = await request('PUT', `/api/users/${userId}`, { name: 'Updated Name' }, adminToken);
    record('/api/users/:id (update)', 'PUT', r, 200);

    r = await request('PUT', `/api/users/${userId}`, { role: 'superadmin' }, adminToken);
    record('/api/users/:id (update invalid role)', 'PUT', r, 400);

    r = await request('PATCH', `/api/users/${userId}/status`, { isDisabled: true }, adminToken);
    record('/api/users/:id/status (disable)', 'PATCH', r, 200, (b) => (b.data && b.data.isDisabled === true ? true : 'not disabled'));

    r = await request('PATCH', `/api/users/${userId}/status`, { isDisabled: false }, adminToken);
    record('/api/users/:id/status (enable)', 'PATCH', r, 200, (b) => (b.data && b.data.isDisabled === false ? true : 'not enabled'));

    r = await request('PATCH', `/api/users/${userId}/status`, {}, adminToken);
    record('/api/users/:id/status (missing isDisabled)', 'PATCH', r, 400);

    r = await request('PATCH', `/api/users/${userId}/status`, { isDisabled: 'yes' }, adminToken);
    record('/api/users/:id/status (invalid type)', 'PATCH', r, 400);

    r = await request('PATCH', `/api/users/${userId}/reset-password`, { password: 'NewPass123' }, adminToken);
    record('/api/users/:id/reset-password (valid)', 'PATCH', r, 200);

    r = await request('PATCH', `/api/users/${userId}/reset-password`, {}, adminToken);
    record('/api/users/:id/reset-password (missing)', 'PATCH', r, 400);

    r = await request('PATCH', `/api/users/${userId}/reset-password`, { password: '123' }, adminToken);
    record('/api/users/:id/reset-password (short)', 'PATCH', r, 400);

    r = await request('PATCH', `/api/users/${userId}/disable`, { isDisabled: true }, adminToken);
    record('/api/users/:id/disable (disable)', 'PATCH', r, 200);
  }

  r = await request('GET', '/api/users/invalidid', null, adminToken);
  record('/api/users/:id (invalid ObjectId)', 'GET', r, 400);

  r = await request('GET', '/api/users/000000000000000000000000', null, adminToken);
  record('/api/users/:id (nonexistent)', 'GET', r, 404);

  r = await request('PATCH', '/api/users/000000000000000000000000/status', { isDisabled: true }, managerToken);
  record('/api/users/:id/status (manager 403)', 'PATCH', r, 403);

  r = await request('PATCH', '/api/users/000000000000000000000000/disable', {}, adminToken);
  record('/api/users/:id/disable (nonexistent)', 'PATCH', r, 404);

  r = await request('GET', '/api/users', null, 'expired.token.here');
  record('/api/users (invalid token - 401)', 'GET', r, 401);

  // ============ CATEGORIES ============
  section('CATEGORIES');
  const catName = `TestCat-${uniq}`;
  r = await request('POST', '/api/categories', { name: catName, description: 'Test category' }, adminToken);
  record('/api/categories (create)', 'POST', r, 201);
  if (r.status === 201) catId = r.body.data._id;

  if (catId) {
    r = await request('POST', '/api/categories', { name: catName }, adminToken);
    record('/api/categories (duplicate name)', 'POST', r, 400);

    r = await request('GET', `/api/categories/${catId}`, null, adminToken);
    record('/api/categories/:id (get by id)', 'GET', r, 200);

    r = await request('PUT', `/api/categories/${catId}`, { name: `${catName}-upd` }, adminToken);
    record('/api/categories/:id (update)', 'PUT', r, 200);

    r = await request('PUT', `/api/categories/${catId}`, { name: '' }, adminToken);
    record('/api/categories/:id (update empty name)', 'PUT', r, 400);
  }

  r = await request('POST', '/api/categories', {}, adminToken);
  record('/api/categories (empty body)', 'POST', r, 400);

  r = await request('POST', '/api/categories', { name: 'A'.repeat(51) }, adminToken);
  record('/api/categories (name too long)', 'POST', r, 400);

  r = await request('POST', '/api/categories', { name: `CashCat-${uniq}` }, cashierToken);
  record('/api/categories (cashier create - 403)', 'POST', r, 403);

  r = await request('GET', '/api/categories', null, adminToken);
  record('/api/categories (get all)', 'GET', r, 200, (b) => (Array.isArray(b.data) ? true : 'data not array'));

  r = await request('GET', '/api/categories?search=Electronics', null, adminToken);
  record('/api/categories (search)', 'GET', r, 200);

  r = await request('GET', '/api/categories?page=1&limit=3', null, adminToken);
  record('/api/categories (pagination)', 'GET', r, 200);

  r = await request('GET', '/api/categories?sortBy=name&sortOrder=asc', null, adminToken);
  record('/api/categories (sort)', 'GET', r, 200);

  r = await request('GET', '/api/categories?sortBy=invalidField', null, adminToken);
  record('/api/categories (invalid sort field fallback)', 'GET', r, 200);

  r = await request('GET', '/api/categories/invalidid', null, adminToken);
  record('/api/categories/:id (invalid ObjectId)', 'GET', r, 400);

  r = await request('GET', '/api/categories/000000000000000000000000', null, adminToken);
  record('/api/categories/:id (nonexistent)', 'GET', r, 404);

  r = await request('GET', '/api/categories', null, cashierToken);
  record('/api/categories (cashier read)', 'GET', r, 200);

  // ============ PRODUCTS ============
  section('PRODUCTS');
  let sku = `TST-${uniq}`;
  if (catId) {
    r = await request('POST', '/api/products', {
      name: 'Test Product', sku, barcode: `BAR-${uniq}`, category: catId,
      price: 29.99, stock: 50, costPrice: 15.00, description: 'Test product',
    }, adminToken);
    record('/api/products (create)', 'POST', r, 201, (b) => (b.data && b.data._id ? true : 'No product id'));
    if (r.status === 201) prodId = r.body.data._id;

    if (prodId) {
      r = await request('POST', '/api/products', { name: 'Dup', sku, category: catId, price: 10, stock: 5 }, adminToken);
      record('/api/products (duplicate SKU)', 'POST', r, 400);

      r = await request('GET', `/api/products/${prodId}`, null, adminToken);
      record('/api/products/:id (get by id)', 'GET', r, 200);

      r = await request('PUT', `/api/products/${prodId}`, { price: 24.99, stock: 75 }, adminToken);
      record('/api/products/:id (update)', 'PUT', r, 200);

      r = await request('PUT', `/api/products/${prodId}`, { status: 'invalid' }, adminToken);
      record('/api/products/:id (invalid status)', 'PUT', r, 400);

      r = await request('PATCH', `/api/products/${prodId}/stock`, { stock: 100 }, adminToken);
      record('/api/products/:id/stock (update stock)', 'PATCH', r, 200);

      r = await request('PATCH', `/api/products/${prodId}/stock`, { stock: -5 }, adminToken);
      record('/api/products/:id/stock (negative stock)', 'PATCH', r, 400);

      r = await request('PATCH', `/api/products/${prodId}/stock`, {}, adminToken);
      record('/api/products/:id/stock (missing stock)', 'PATCH', r, 400);
    }

    // Second product for sale/checkout tests
    r = await request('POST', '/api/products', {
      name: 'Second Product', sku: `SKU2-${uniq}`, category: catId,
      price: 9.99, stock: 200, costPrice: 4.00,
    }, adminToken);
    if (r.status === 201) prod2Id = r.body.data._id;

    r = await request('POST', '/api/products', { name: 'Neg Price', sku: `NEG-${uniq}`, category: catId, price: -15, stock: 10 }, adminToken);
    record('/api/products (negative price)', 'POST', r, 400);

    r = await request('POST', '/api/products', { name: 'Neg Stock', sku: `NEGS-${uniq}`, category: catId, price: 10, stock: -5 }, adminToken);
    record('/api/products (negative stock)', 'POST', r, 400);

    r = await request('POST', '/api/products', { name: 'No Price', sku: `NOP-${uniq}`, category: catId, stock: 5 }, adminToken);
    record('/api/products (missing price)', 'POST', r, 400);

    r = await request('POST', '/api/products', { name: 'Bad Cat', sku: `BAD-${uniq}`, category: 'invalid', price: 10, stock: 5 }, adminToken);
    record('/api/products (invalid category ObjectId)', 'POST', r, 400);

    r = await request('POST', '/api/products', {}, adminToken);
    record('/api/products (empty body)', 'POST', r, 400);
  }

  r = await request('POST', '/api/products', { name: 'Cashier Prod', sku: `CP-${uniq}`, category: catId || '000000000000000000000000', price: 1, stock: 1 }, cashierToken);
  record('/api/products (cashier create - 403)', 'POST', r, 403);

  r = await request('GET', '/api/products', null, adminToken);
  record('/api/products (get all)', 'GET', r, 200, (b) => (Array.isArray(b.data) ? true : 'data not array'));

  r = await request('GET', '/api/products?search=Test', null, adminToken);
  record('/api/products (search)', 'GET', r, 200);

  r = await request('GET', '/api/products?page=1&limit=3', null, adminToken);
  record('/api/products (pagination)', 'GET', r, 200);

  if (catId) {
    r = await request('GET', `/api/products?category=${catId}`, null, adminToken);
    record('/api/products (filter by category)', 'GET', r, 200);
  }

  r = await request('GET', '/api/products?sortBy=price&sortOrder=asc', null, adminToken);
  record('/api/products (sort)', 'GET', r, 200);

  r = await request('GET', '/api/products/invalidid', null, adminToken);
  record('/api/products/:id (invalid ObjectId)', 'GET', r, 400);

  r = await request('GET', '/api/products/000000000000000000000000', null, adminToken);
  record('/api/products/:id (nonexistent)', 'GET', r, 404);

  r = await request('GET', '/api/products', null, cashierToken);
  record('/api/products (cashier read)', 'GET', r, 200);

  // ============ CUSTOMERS ============
  section('CUSTOMERS');
  r = await request('POST', '/api/customers', {
    name: 'John Doe', email: `john${uniq}@test.com`, phone: `+1${uniq}`, address: '123 Main St',
  }, adminToken);
  record('/api/customers (create)', 'POST', r, 201);
  if (r.status === 201) custId = r.body.data._id;

  if (custId) {
    r = await request('POST', '/api/customers', { name: 'Jane Doe', phone: `+1${uniq}`, email: `jane${uniq}@test.com` }, adminToken);
    record('/api/customers (duplicate phone)', 'POST', r, 400);

    r = await request('GET', `/api/customers/${custId}`, null, adminToken);
    record('/api/customers/:id (get by id)', 'GET', r, 200, (b) => (b.data && b.data.createdBy ? true : 'createdBy not populated'));

    r = await request('PUT', `/api/customers/${custId}`, { name: 'John Updated', status: 'active' }, adminToken);
    record('/api/customers/:id (update)', 'PUT', r, 200);

    r = await request('PUT', `/api/customers/${custId}`, { status: 'invalid' }, adminToken);
    record('/api/customers/:id (invalid status)', 'PUT', r, 400);

    r = await request('DELETE', `/api/customers/${custId}`, null, cashierToken);
    record('/api/customers/:id (cashier delete - 403)', 'DELETE', r, 403);
  }

  r = await request('POST', '/api/customers', { name: 'No Phone' }, adminToken);
  record('/api/customers (missing phone)', 'POST', r, 400);

  r = await request('POST', '/api/customers', {}, adminToken);
  record('/api/customers (empty body)', 'POST', r, 400);

  r = await request('POST', '/api/customers', { name: 'Bad Email', email: 'bad-email', phone: `+2${uniq}` }, adminToken);
  record('/api/customers (invalid email)', 'POST', r, 400);

  r = await request('GET', '/api/customers', null, adminToken);
  record('/api/customers (get all)', 'GET', r, 200);

  r = await request('GET', '/api/customers?search=John', null, adminToken);
  record('/api/customers (search)', 'GET', r, 200);

  r = await request('GET', '/api/customers?page=1&limit=3', null, adminToken);
  record('/api/customers (pagination)', 'GET', r, 200);

  r = await request('GET', '/api/customers?sortBy=name&sortOrder=asc', null, adminToken);
  record('/api/customers (sort)', 'GET', r, 200);

  r = await request('GET', '/api/customers/invalidid', null, adminToken);
  record('/api/customers/:id (invalid ObjectId)', 'GET', r, 400);

  r = await request('GET', '/api/customers/000000000000000000000000', null, adminToken);
  record('/api/customers/:id (nonexistent)', 'GET', r, 404);

  r = await request('GET', '/api/customers', null, cashierToken);
  record('/api/customers (cashier read)', 'GET', r, 200);

  // ============ SALES ============
  section('SALES');
  if (prodId && custId) {
    r = await request('POST', '/api/sales', {
      customer: custId,
      items: [{ product: prodId, quantity: 2, unitPrice: 24.99, discount: 0 }],
      discountAmount: 0, taxAmount: 2.50, paymentMethod: 'cash', notes: 'Test sale',
    }, adminToken);
    record('/api/sales (create)', 'POST', r, 201, (b) => (b.data && b.data.invoiceNumber ? true : 'No invoice number'));
    if (r.status === 201) saleId = r.body.data._id;

    if (saleId) {
      r = await request('GET', `/api/sales/${saleId}`, null, adminToken);
      record('/api/sales/:id (get by id)', 'GET', r, 200, (b) => (b.data && Array.isArray(b.data.items) ? true : 'No items'));

      r = await request('PATCH', `/api/sales/${saleId}/complete`, null, adminToken);
      record('/api/sales/:id/complete (complete)', 'PATCH', r, 200, (b) => (b.data && b.data.paymentStatus === 'paid' ? true : 'Not paid'));

      r = await request('PATCH', `/api/sales/${saleId}/cancel`, null, adminToken);
      record('/api/sales/:id/cancel (cancel)', 'PATCH', r, 200, (b) => (b.data && b.data.paymentStatus === 'refunded' ? true : 'Not refunded'));

      r = await request('PATCH', `/api/sales/${saleId}/cancel`, null, adminToken);
      record('/api/sales/:id/cancel (double cancel - 400)', 'PATCH', r, 400);

      // Update with notes (sale is refunded, so update should be blocked)
      r = await request('PUT', `/api/sales/${saleId}`, { notes: 'Hack notes' }, adminToken);
      record('/api/sales/:id (update refunded - 400)', 'PUT', r, 400);

      r = await request('DELETE', `/api/sales/${saleId}`, null, cashierToken);
      record('/api/sales/:id (cashier delete - 403)', 'DELETE', r, 403);
    }
  }

  if (prodId && custId) {
    r = await request('POST', '/api/sales', {
      customer: custId,
      items: [{ product: prodId, quantity: 1, unitPrice: 24.99, discount: 0 }],
      discountAmount: 0, taxAmount: 0, paymentMethod: 'cash',
    }, adminToken);
    if (r.status === 201) saleId = r.body.data._id;

    if (saleId) {
      r = await request('PUT', `/api/sales/${saleId}`, { notes: 'Updated notes', paymentStatus: 'paid' }, adminToken);
      record('/api/sales/:id (update)', 'PUT', r, 200);

      r = await request('PUT', `/api/sales/${saleId}`, { paymentMethod: 'invalid' }, adminToken);
      record('/api/sales/:id (invalid payment method)', 'PUT', r, 400);

      r = await request('DELETE', `/api/sales/${saleId}`, null, adminToken);
      record('/api/sales/:id (delete)', 'DELETE', r, 200);
    }
  }

  if (prodId && custId) {
    r = await request('POST', '/api/sales', {
      customer: custId,
      items: [{ product: prodId, quantity: 1, unitPrice: 10, discount: 0 }],
      discountAmount: 100, taxAmount: 0, paymentMethod: 'cash',
    }, adminToken);
    record('/api/sales (discount exceeds subtotal - 400)', 'POST', r, 400);
  }

  r = await request('POST', '/api/sales', { items: [] }, adminToken);
  record('/api/sales (empty items - 400)', 'POST', r, 400);

  r = await request('POST', '/api/sales', {}, adminToken);
  record('/api/sales (empty body - 400)', 'POST', r, 400);

  r = await request('POST', '/api/sales', { items: [{ product: 'invalid', quantity: 1 }] }, adminToken);
  record('/api/sales (invalid product ObjectId - 400)', 'POST', r, 400);

  r = await request('GET', '/api/sales', null, adminToken);
  record('/api/sales (get all)', 'GET', r, 200, (b) => (Array.isArray(b.data) ? true : 'data not array'));

  r = await request('GET', '/api/sales?page=1&limit=3', null, adminToken);
  record('/api/sales (pagination)', 'GET', r, 200);

  r = await request('GET', '/api/sales?sortBy=totalAmount&sortOrder=desc', null, adminToken);
  record('/api/sales (sort)', 'GET', r, 200);

  r = await request('GET', '/api/sales?paymentMethod=cash', null, adminToken);
  record('/api/sales (filter paymentMethod)', 'GET', r, 200);

  r = await request('GET', '/api/sales?startDate=2024-01-01&endDate=2024-12-31', null, adminToken);
  record('/api/sales (date range filter)', 'GET', r, 200);

  r = await request('GET', '/api/sales/invalidid', null, adminToken);
  record('/api/sales/:id (invalid ObjectId)', 'GET', r, 400);

  r = await request('GET', '/api/sales/000000000000000000000000', null, adminToken);
  record('/api/sales/:id (nonexistent)', 'GET', r, 404);

  r = await request('GET', '/api/sales', null, cashierToken);
  record('/api/sales (cashier own list)', 'GET', r, 200);

  r = await request('PUT', `/api/sales/${saleId || '000000000000000000000000'}`, { notes: 'Hack' }, cashierToken);
  record('/api/sales/:id (cashier update - 403)', 'PUT', r, 403);

  // ============ DASHBOARD ============
  section('DASHBOARD');
  r = await request('GET', '/api/dashboard', null, adminToken);
  record('/api/dashboard (admin)', 'GET', r, 200, (b) => (b.data && b.data.today ? true : 'No today data'));

  r = await request('GET', '/api/dashboard', null, managerToken);
  record('/api/dashboard (manager)', 'GET', r, 200);

  r = await request('GET', '/api/dashboard', null, cashierToken);
  record('/api/dashboard (cashier - 403)', 'GET', r, 403);

  r = await request('GET', '/api/dashboard');
  record('/api/dashboard (no auth)', 'GET', r, 401);

  r = await request('GET', '/api/dashboard/cashier', null, cashierToken);
  record('/api/dashboard/cashier (cashier)', 'GET', r, 200, (b) => (b.data && b.data.today ? true : 'No today data'));

  r = await request('GET', '/api/dashboard/cashier', null, adminToken);
  record('/api/dashboard/cashier (admin)', 'GET', r, 200);

  r = await request('GET', '/api/dashboard/chart', null, adminToken);
  record('/api/dashboard/chart (weekly)', 'GET', r, 200);

  r = await request('GET', '/api/dashboard/chart?period=monthly', null, adminToken);
  record('/api/dashboard/chart (monthly)', 'GET', r, 200);

  r = await request('GET', '/api/dashboard/chart', null, cashierToken);
  record('/api/dashboard/chart (cashier - 403)', 'GET', r, 403);

  // ============ INVENTORY ============
  section('INVENTORY');
  r = await request('GET', '/api/inventory', null, adminToken);
  record('/api/inventory (get all)', 'GET', r, 200, (b) => (b.data && Array.isArray(b.data) ? true : 'data not array'));

  if (r.status === 200 && r.body.data && r.body.data.length > 0) {
    inventoryId = r.body.data[0]._id;
  }

  r = await request('GET', '/api/inventory/low-stock', null, adminToken);
  record('/api/inventory/low-stock (default)', 'GET', r, 200);

  r = await request('GET', '/api/inventory/low-stock?threshold=5', null, adminToken);
  record('/api/inventory/low-stock (custom threshold)', 'GET', r, 200);

  r = await request('GET', '/api/inventory/out-of-stock', null, adminToken);
  record('/api/inventory/out-of-stock', 'GET', r, 200);

  if (inventoryId) {
    r = await request('GET', `/api/inventory/${inventoryId}`, null, adminToken);
    record('/api/inventory/:id (get by id)', 'GET', r, 200);

    r = await request('PATCH', `/api/inventory/${inventoryId}/adjust`, { adjustment: -5, reason: 'Test adjustment' }, adminToken);
    record('/api/inventory/:id/adjust (decrease)', 'PATCH', r, 200);

    r = await request('PATCH', `/api/inventory/${inventoryId}/adjust`, { adjustment: 10, reason: 'Restock' }, adminToken);
    record('/api/inventory/:id/adjust (increase)', 'PATCH', r, 200);
  }

  if (prodId) {
    r = await request('POST', '/api/inventory', { product: prodId, quantity: 10, lowStockThreshold: 5, location: 'Test Shelf' }, adminToken);
    // May already exist from the product auto-sync (post-save hook) -> 400 acceptable
    record('/api/inventory (create for existing product - 400)', 'POST', r, 400);
  }

  r = await request('PATCH', `/api/inventory/${inventoryId || '000000000000000000000000'}/adjust`, { adjustment: 0 }, adminToken);
  record('/api/inventory/:id/adjust (zero - 400)', 'PATCH', r, 400);

  r = await request('PATCH', `/api/inventory/${inventoryId || '000000000000000000000000'}/adjust`, { adjustment: 'abc' }, adminToken);
  record('/api/inventory/:id/adjust (invalid - 400)', 'PATCH', r, 400);

  r = await request('GET', '/api/inventory?search=Mouse', null, adminToken);
  record('/api/inventory (search)', 'GET', r, 200);

  r = await request('GET', '/api/inventory?page=1&limit=3', null, adminToken);
  record('/api/inventory (pagination)', 'GET', r, 200);

  r = await request('GET', '/api/inventory?sortBy=stock&sortOrder=asc', null, adminToken);
  record('/api/inventory (sort)', 'GET', r, 200);

  r = await request('GET', '/api/inventory', null, cashierToken);
  record('/api/inventory (cashier read)', 'GET', r, 200);

  r = await request('GET', '/api/inventory/invalidid', null, adminToken);
  record('/api/inventory/:id (invalid ObjectId)', 'GET', r, 400);

  r = await request('GET', '/api/inventory/000000000000000000000000', null, adminToken);
  record('/api/inventory/:id (nonexistent)', 'GET', r, 404);

  r = await request('PATCH', `/api/inventory/${inventoryId || '000000000000000000000000'}/adjust`, { adjustment: 5 }, cashierToken);
  record('/api/inventory/:id/adjust (cashier - 403)', 'PATCH', r, 403);

  r = await request('POST', '/api/inventory', { product: '000000000000000000000000', quantity: 5 }, cashierToken);
  record('/api/inventory (cashier create - 403)', 'POST', r, 403);

  // ============ REPORTS ============
  section('REPORTS');
  r = await request('GET', '/api/reports/sales', null, adminToken);
  record('/api/reports/sales (default)', 'GET', r, 200, (b) => (b.summary ? true : 'No summary'));

  r = await request('GET', '/api/reports/sales?period=today', null, adminToken);
  record('/api/reports/sales (period today)', 'GET', r, 200);

  r = await request('GET', '/api/reports/sales?period=weekly', null, adminToken);
  record('/api/reports/sales (period weekly)', 'GET', r, 200);

  r = await request('GET', '/api/reports/sales?period=yearly', null, adminToken);
  record('/api/reports/sales (period yearly)', 'GET', r, 200);

  r = await request('GET', '/api/reports/sales?startDate=2024-01-01&endDate=2024-12-31', null, adminToken);
  record('/api/reports/sales (custom date range)', 'GET', r, 200);

  r = await request('GET', '/api/reports/revenue', null, adminToken);
  record('/api/reports/revenue (default)', 'GET', r, 200);

  r = await request('GET', '/api/reports/revenue?period=today', null, adminToken);
  record('/api/reports/revenue (period today)', 'GET', r, 200);

  r = await request('GET', '/api/reports/categories', null, adminToken);
  record('/api/reports/categories', 'GET', r, 200);

  r = await request('GET', '/api/reports/top-products', null, adminToken);
  record('/api/reports/top-products (default)', 'GET', r, 200);

  r = await request('GET', '/api/reports/top-products?limit=5', null, adminToken);
  record('/api/reports/top-products (limit)', 'GET', r, 200);

  r = await request('GET', '/api/reports/customers', null, adminToken);
  record('/api/reports/customers', 'GET', r, 200);

  r = await request('GET', '/api/reports/payment-methods', null, adminToken);
  record('/api/reports/payment-methods', 'GET', r, 200);

  // Cashier forbidden
  r = await request('GET', '/api/reports/sales', null, cashierToken);
  record('/api/reports/sales (cashier - 403)', 'GET', r, 403);

  // ============ SETTINGS ============
  section('SETTINGS');
  r = await request('GET', '/api/settings/business', null, adminToken);
  record('/api/settings/business (get)', 'GET', r, 200, (b) => (b.data && typeof b.data.businessName !== 'undefined' ? true : 'No business data'));

  r = await request('PUT', '/api/settings/business', {
    businessName: 'My POS Store', businessEmail: 'store@example.com',
    phone: '+123456789', currency: 'USD', businessAddress: '123 Commerce St',
  }, adminToken);
  record('/api/settings/business (update)', 'PUT', r, 200);

  r = await request('PUT', '/api/settings/business', { businessEmail: 'invalid-email' }, adminToken);
  record('/api/settings/business (invalid email)', 'PUT', r, 400);

  r = await request('PUT', '/api/settings/business/logo', {}, adminToken);
  record('/api/settings/business/logo (no file)', 'PUT', r, 400);

  r = await request('GET', '/api/settings/business', null, cashierToken);
  record('/api/settings/business (cashier - 403)', 'GET', r, 403);

  r = await request('GET', '/api/settings/tax', null, adminToken);
  record('/api/settings/tax (get)', 'GET', r, 200);

  r = await request('PUT', '/api/settings/tax', { taxName: 'GST', taxRate: 10, taxRegistrationNumber: 'GST123', enableTax: true }, adminToken);
  record('/api/settings/tax (update)', 'PUT', r, 200);

  r = await request('PUT', '/api/settings/tax', { taxRate: 150 }, adminToken);
  record('/api/settings/tax (rate > 100)', 'PUT', r, 400);

  r = await request('PUT', '/api/settings/tax', { taxRate: -5 }, adminToken);
  record('/api/settings/tax (negative rate)', 'PUT', r, 400);

  r = await request('PUT', '/api/settings/tax', { enableTax: 'yes' }, adminToken);
  record('/api/settings/tax (invalid boolean)', 'PUT', r, 400);

  r = await request('GET', '/api/settings/tax', null, cashierToken);
  record('/api/settings/tax (cashier - 403)', 'GET', r, 403);

  r = await request('GET', '/api/settings/invoice', null, adminToken);
  record('/api/settings/invoice (get)', 'GET', r, 200);

  r = await request('PUT', '/api/settings/invoice', {
    invoicePrefix: 'INV-', startingInvoiceNumber: 1, invoiceFooter: 'Thank you!',
    showBusinessLogo: true, showTaxInformation: true,
  }, adminToken);
  record('/api/settings/invoice (update)', 'PUT', r, 200);

  r = await request('PUT', '/api/settings/invoice', { startingInvoiceNumber: 0 }, adminToken);
  record('/api/settings/invoice (invalid starting number)', 'PUT', r, 400);

  r = await request('PUT', '/api/settings/invoice', { invoicePrefix: '' }, adminToken);
  record('/api/settings/invoice (empty prefix)', 'PUT', r, 400);

  r = await request('PUT', '/api/settings/invoice', { showBusinessLogo: 'no' }, adminToken);
  record('/api/settings/invoice (invalid boolean)', 'PUT', r, 400);

  r = await request('GET', '/api/settings/invoice', null, cashierToken);
  record('/api/settings/invoice (cashier - 403)', 'GET', r, 403);

  r = await request('GET', '/api/settings/payment-methods', null, adminToken);
  record('/api/settings/payment-methods (get)', 'GET', r, 200);

  r = await request('PUT', '/api/settings/payment-methods', { cash: true, card: true, onlinePayment: true, bankTransfer: true, cashOnDelivery: true }, adminToken);
  record('/api/settings/payment-methods (update all enabled)', 'PUT', r, 200);

  r = await request('PUT', '/api/settings/payment-methods', { cash: false, card: false, onlinePayment: false, bankTransfer: false, cashOnDelivery: false }, adminToken);
  record('/api/settings/payment-methods (all disabled - 400)', 'PUT', r, 400);

  r = await request('PUT', '/api/settings/payment-methods', { cash: "yes" }, adminToken);
  record('/api/settings/payment-methods (invalid boolean)', 'PUT', r, 400);

  r = await request('GET', '/api/settings/payment-methods', null, cashierToken);
  record('/api/settings/payment-methods (cashier - 403)', 'GET', r, 403);

  // ============ EDGE CASES ============
  section('EDGE CASES');
  r = await request('GET', '/api/nonexistent');
  record('/api/nonexistent (404)', 'GET', r, 404);

  r = await request('POST', '/api/nonexistent', {});
  record('/api/nonexistent (404 POST)', 'POST', r, 404);

  if (catId && prodId) {
    r = await request('DELETE', `/api/products/${prodId}`, null, adminToken);
    record('/api/products/:id (delete)', 'DELETE', r, 200);

    r = await request('GET', `/api/products/${prodId}`, null, adminToken);
    record('/api/products/:id (get deleted - 404)', 'GET', r, 404);

    r = await request('DELETE', `/api/categories/${catId}`, null, adminToken);
    record('/api/categories/:id (delete)', 'DELETE', r, 200);
  }

  if (custId) {
    r = await request('DELETE', `/api/customers/${custId}`, null, adminToken);
    record('/api/customers/:id (delete)', 'DELETE', r, 200);
  }

  // ============ SUMMARY ============
  console.log('\n========================================');
  console.log('          COMPLETE API TEST RESULTS');
  console.log('========================================');
  console.log(`  Total endpoint-tests: ${totalTests}`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Rate: ${totalTests > 0 ? ((passed / totalTests) * 100).toFixed(1) : 0}%`);
  console.log('========================================');

  // Write results to JSON for reporting
  const outPath = path.join(__dirname, 'api-results.json');
  fs.writeFileSync(outPath, JSON.stringify({ total: totalTests, passed, failed, results }, null, 2));
  console.log(`\nResults written to ${outPath}`);

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});

