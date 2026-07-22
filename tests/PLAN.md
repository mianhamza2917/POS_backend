# Comprehensive Bug Fix & Improvement Plan

## CRITICAL BUGS (High Priority)

### 1. dashboardController.js - Wrong LOW_STOCK_THRESHOLD Import
- **File:** `src/controllers/dashboardController.js`
- **Bug:** `LOW_STOCK_THRESHOLD` is imported directly from `constants.js` but it's nested under `INVENTORY` object
- **Fix:** Change import to use `INVENTORY` destructured object

### 2. inventoryController.js - Low Stock Sort Logic
- **File:** `src/controllers/inventoryController.js`
- **Bug:** `getLowStock()` sort has useless ternary `INVENTORY.LOW_STOCK_THRESHOLD > 0 ? 1 : 1` (always 1)
- **Fix:** Use threshold from query param for sort logic

### 3. saleController.js - deleteSale Doesn't Restore Stock
- **File:** `src/controllers/saleController.js`
- **Bug:** Soft-deleting a sale doesn't restore product inventory
- **Fix:** Add stock restoration for each item before soft-deleting

### 4. categoryController.js - deleteCategory Doesn't Check Product References
- **File:** `src/controllers/categoryController.js`
- **Bug:** Deleting a category with associated products would break product references
- **Fix:** Check for products using this category before allowing delete

### 5. authController.js - Register Endpoint is Public (No Role Validation)
- **File:** `src/controllers/authController.js`
- **Bug:** Anyone can register as a cashier - no authentication required
- **Fix:** This is intentional for signup flow - but add rate limiting consideration

## MISSING FUNCTIONALITY (Medium Priority)

### 6. customerController.js - Missing Populate on getCustomerById
- **File:** `src/controllers/customerController.js`
- **Fix:** Add `.populate('createdBy', 'name')` for consistency

### 7. userController.js - getUsers Missing Pagination
- **File:** `src/controllers/userController.js`
- **Fix:** Add pagination support like other list endpoints

### 8. Missing .env.example File
- **File:** `.env.example` (new)
- **Fix:** Create template for developers

### 9. reportController.js - Customer Report Doesn't Filter Deleted
- **File:** `src/controllers/reportController.js`
- **Fix:** Filter out deleted customers in the lookup

## RESPONSE CONSISTENCY (Medium Priority)

### 10. Validation Error Response Inconsistency
- **Files:** `src/middleware/validateMiddleware.js`, `src/middleware/errorMiddleware.js`, all controllers
- **Fix:** Ensure consistent `errors` field format across all responses

## TEST COVERAGE (Medium Priority)

### 11. Test File Issues
- **Files:** `tests/test-api.js`, `tests/test-individual.js`
- **Fix:** Handle cases where seed data already exists (skip instead of fail)
- Add missing test cases for: forgot/reset password, change password, cancel/complete sale, update/delete sale

### 12. Add Comprehensive Test Suite
- **File:** `tests/test-comprehensive.js` (new)
- **Fix:** Create thorough test file covering all edge cases

## MINOR FIXES (Low Priority)

### 13. inventoryController.js - getLowStock Threshold Sort
- **Fix:** Use dynamic threshold for sort logic

### 14. Error handling improvements
- Better error messages for common failure scenarios

