# Refactoring Tasks

## ✅ Completed

### Validators Created
- [x] Create `src/validators/authValidators.js`
- [x] Create `src/validators/customerValidators.js`
- [x] Create `src/validators/inventoryValidators.js`
- [x] Create `src/validators/userValidators.js`
- [x] Create `src/validators/saleValidators.js`

### Routes Refactored
- [x] Refactor `src/routes/authRoutes.js` — uses `authValidators`
- [x] Refactor `src/routes/customerRoutes.js` — uses `customerValidators`
- [x] Refactor `src/routes/inventoryRoutes.js` — uses `inventoryValidators`
- [x] Refactor `src/routes/userRoutes.js` — uses `userValidators`
- [x] Refactor `src/routes/saleRoutes.js` — uses `saleValidators`

### Project Structure Organized
- [x] Create `tests/` folder
- [x] Move `test-api.js`, `test-api.ps1`, `test-individual.js`, `debug-reports.js` → `tests/`
- [x] Create `docs/` folder
- [x] Move `TODO.md`, `README.md`, `API_DOCUMENTATION.md`, `postman_collection.json`, `nodemon.json` → `docs/`

### Seed Data Infrastructure
- [x] Create `seeds/` folder with user, category, product, customer, sale seed files
- [x] Create `seeds/index.js` master runner with dependency ordering
- [x] Add `"seed": "node seeds/index.js"` script to `package.json`

## Remaining Improvements
- [ ] Run `npm run seed` to populate database with sample data
- [ ] Run tests via `node tests/test-individual.js` to validate endpoints
- [ ] Configure proper Gmail App Password in `.env` for email functionality
  - EMAIL_USER, EMAIL_PASSWORD need real credentials (App Password for Gmail)
  - See: https://support.google.com/mail/?p=BadCredentials
