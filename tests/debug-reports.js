const http = require('http');

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
  const url = new URL(path, 'http://localhost:5000');
    const options = {
      hostname: url.hostname, port: url.port,
      path: url.pathname + url.search, method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) options.headers['Authorization'] = 'Bearer ' + token;
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  // Login
  let r = await request('POST', '/api/auth/login', { email: 'admin@pos.com', password: 'AdminPass123' });
  const token = JSON.parse(r.body).data.token;
  console.log('Token acquired');

  // Test category report
  r = await request('GET', '/api/reports/categories', null, token);
  console.log('Category Report Status:', r.status);
  try { console.log('Category Report Body:', JSON.stringify(JSON.parse(r.body), null, 2)); } catch(e) { console.log('Raw:', r.body); }

  // Test customer report
  r = await request('GET', '/api/reports/customers', null, token);
  console.log('\nCustomer Report Status:', r.status);
  try { console.log('Customer Report Body:', JSON.stringify(JSON.parse(r.body), null, 2)); } catch(e) { console.log('Raw:', r.body); }

  // Test empty product create
  r = await request('POST', '/api/products', {}, token);
  console.log('\nEmpty Product Create Status:', r.status);
  try { console.log('Body:', JSON.stringify(JSON.parse(r.body), null, 2)); } catch(e) { console.log('Raw:', r.body); }

  // Test invalid ObjectId
  r = await request('GET', '/api/products/invalidid', null, token);
  console.log('\nInvalid ObjectId Status:', r.status);
  try { console.log('Body:', JSON.stringify(JSON.parse(r.body), null, 2)); } catch(e) { console.log('Raw:', r.body); }

  process.exit(0);
})();

