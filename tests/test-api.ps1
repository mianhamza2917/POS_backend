$baseUrl = "http://localhost:3000"
$global:passed = 0
$global:failed = 0
$global:total = 0

function Test-Request {
    param($Name, $Method, $Url, $Body, $ExpectedStatus, $Headers = @{})
    
    $global:total++
    try {
        $params = @{
            Method = $Method
            Uri = "$baseUrl$Url"
            ContentType = "application/json"
        }
        if ($Body) { 
            $jsonBody = ($Body | ConvertTo-Json -Compress)
            $params.Body = $jsonBody
        }
        if ($Headers.Count -gt 0) { 
            $params.Headers = $Headers 
        }
        
        $response = Invoke-RestMethod @params -StatusCodeVariable statusCode
        $actualStatus = $statusCode[0]
        
        if ($actualStatus -eq $ExpectedStatus) {
            Write-Host "PASS: $Name (Status: $actualStatus)" -ForegroundColor Green
            $global:passed++
            return $true
        } else {
            Write-Host "FAIL: $Name - Expected $ExpectedStatus, got $actualStatus" -ForegroundColor Red
            $global:failed++
            return $false
        }
    } catch {
        $actualStatus = $_.Exception.Response.StatusCode.value__
        if ($actualStatus -eq $ExpectedStatus) {
            Write-Host "PASS: $Name (Status: $actualStatus)" -ForegroundColor Green
            $global:passed++
            return $true
        }
        Write-Host "FAIL: $Name - Expected $ExpectedStatus, got $actualStatus" -ForegroundColor Red
        Write-Host "   Error: $_" -ForegroundColor DarkRed
        $global:failed++
        return $false
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "     POS Backend API Comprehensive Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. AUTH TESTS
Write-Host "`n--- AUTHENTICATION TESTS ---" -ForegroundColor Yellow

Test-Request -Name "Health Check" -Method GET -Url "/" -ExpectedStatus 200

# Login as Admin
$loginBody = @{email="admin@pos.com";password="AdminPass123"}
try {
    $adminLogin = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body ($loginBody | ConvertTo-Json -Compress)
    $global:adminToken = $adminLogin.data.token
    if ($global:adminToken) { 
        Write-Host "PASS: Admin Login (Status: 200)" -ForegroundColor Green
        $global:passed++
    } else { 
        Write-Host "FAIL: Admin Login - No token" -ForegroundColor Red
        $global:failed++
    }
} catch {
    Write-Host "FAIL: Admin Login - $_" -ForegroundColor Red
    $global:failed++
}
$global:total++

# Invalid Login
Test-Request -Name "Invalid Login - Wrong Password" -Method POST -Url "/api/auth/login" -Body @{email="admin@pos.com";password="WrongPass123"} -ExpectedStatus 401

# Missing fields
Test-Request -Name "Invalid Login - Missing Password" -Method POST -Url "/api/auth/login" -Body @{email="admin@pos.com"} -ExpectedStatus 400

# Protected route without token
Test-Request -Name "Protected Route - No Token" -Method GET -Url "/api/auth/profile" -ExpectedStatus 401

# Protected route with invalid token
Test-Request -Name "Protected Route - Invalid Token" -Method GET -Url "/api/auth/profile" -Headers @{Authorization="Bearer invalidtoken123"} -ExpectedStatus 401

# Get Profile
Test-Request -Name "Get Profile - Valid Token" -Method GET -Url "/api/auth/profile" -Headers @{Authorization="Bearer $global:adminToken"} -ExpectedStatus 200

# 2. USER MANAGEMENT
Write-Host "`n--- USER MANAGEMENT TESTS ---" -ForegroundColor Yellow

# Create Manager
$managerBody = @{name="Store Manager";email="manager@pos.com";password="ManagerPass123";role="manager"}
Test-Request -Name "Admin Create Manager" -Method POST -Url "/api/users" -Body $managerBody -ExpectedStatus 201 -Headers @{Authorization="Bearer $global:adminToken"}

# Login as Manager
try {
    $managerLogin = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body (@{email="manager@pos.com";password="ManagerPass123"} | ConvertTo-Json -Compress)
    $global:managerToken = $managerLogin.data.token
    if ($global:managerToken) { 
        Write-Host "PASS: Manager Login (Status: 200)" -ForegroundColor Green
        $global:passed++
    } else { 
        Write-Host "FAIL: Manager Login - No token" -ForegroundColor Red
        $global:failed++
    }
} catch {
    Write-Host "FAIL: Manager Login - $_" -ForegroundColor Red
    $global:failed++
}
$global:total++

# Create Cashier (Admin)
$cashierBody = @{name="Cashier One";email="cashier@pos.com";password="CashierPass123";role="cashier"}
Test-Request -Name "Admin Create Cashier" -Method POST -Url "/api/users" -Body $cashierBody -ExpectedStatus 201 -Headers @{Authorization="Bearer $global:adminToken"}

# Manager Create Cashier (should succeed)
$cashier2Body = @{name="Cashier Two";email="cashier2@pos.com";password="CashierPass123";role="cashier"}
Test-Request -Name "Manager Create Cashier (Should Succeed)" -Method POST -Url "/api/users" -Body $cashier2Body -ExpectedStatus 201 -Headers @{Authorization="Bearer $global:managerToken"}

# Manager Create Manager (should fail - 403)
$failBody = @{name="Bad Manager";email="bad@pos.com";password="Pass123456";role="manager"}
Test-Request -Name "Manager Create Manager (Should Fail - 403)" -Method POST -Url "/api/users" -Body $failBody -ExpectedStatus 403 -Headers @{Authorization="Bearer $global:managerToken"}

# Manager Create User without role (should succeed, defaults to cashier)
$noRoleBody = @{name="No Role User";email="norole@pos.com";password="Pass123456"}
Test-Request -Name "Manager Create User (No Role - Should Succeed)" -Method POST -Url "/api/users" -Body $noRoleBody -ExpectedStatus 201 -Headers @{Authorization="Bearer $global:managerToken"}

# Get Users
Test-Request -Name "Get Users (Admin)" -Method GET -Url "/api/users" -ExpectedStatus 200 -Headers @{Authorization="Bearer $global:adminToken"}

# 3. CATEGORY TESTS
Write-Host "`n--- CATEGORY TESTS ---" -ForegroundColor Yellow

$catBody = @{name="Electronics";description="Electronic items"}
try {
    $catResponse = Invoke-RestMethod -Uri "$baseUrl/api/categories" -Method POST -ContentType "application/json" -Body ($catBody | ConvertTo-Json -Compress) -Headers @{Authorization="Bearer $global:adminToken"}
    $global:catId = $catResponse.data._id
    if ($global:catId) { 
        Write-Host "PASS: Create Category (Status: 201)" -ForegroundColor Green
        $global:passed++
    } else { 
        Write-Host "FAIL: Create Category" -ForegroundColor Red
        $global:failed++
    }
} catch {
    Write-Host "FAIL: Create Category - $_" -ForegroundColor Red
    $global:failed++
}
$global:total++

Test-Request -Name "Duplicate Category Name" -Method POST -Url "/api/categories" -Body @{name="Electronics"} -ExpectedStatus 400 -Headers @{Authorization="Bearer $global:adminToken"}

# Get Categories
Test-Request -Name "Get Categories" -Method GET -Url "/api/categories" -ExpectedStatus 200 -Headers @{Authorization="Bearer $global:adminToken"}

# 4. PRODUCT TESTS
Write-Host "`n--- PRODUCT TESTS ---" -ForegroundColor Yellow

$prodBody = @{name="Wireless Mouse";sku="MOUSE-001";barcode="BC-001";category=$global:catId;price=29.99;stock=50;description="Optical wireless mouse";costPrice=15.00}
try {
    $prodResponse = Invoke-RestMethod -Uri "$baseUrl/api/products" -Method POST -ContentType "application/json" -Body ($prodBody | ConvertTo-Json -Compress) -Headers @{Authorization="Bearer $global:adminToken"}
    $global:prodId = $prodResponse.data._id
    if ($global:prodId) { 
        Write-Host "PASS: Create Product (Status: 201)" -ForegroundColor Green
        $global:passed++
    } else { 
        Write-Host "FAIL: Create Product" -ForegroundColor Red
        $global:failed++
    }
} catch {
    Write-Host "FAIL: Create Product - $_" -ForegroundColor Red
    $global:failed++
}
$global:total++

# Duplicate SKU test
Test-Request -Name "Duplicate SKU (Should Fail - 400)" -Method POST -Url "/api/products" -Body @{name="Duplicate Mouse";sku="MOUSE-001";category=$global:catId;price=19.99;stock=10} -ExpectedStatus 400 -Headers @{Authorization="Bearer $global:adminToken"}

# Negative price test
Test-Request -Name "Negative Price (Should Fail - 400)" -Method POST -Url "/api/products" -Body @{name="Bad Product";sku="BAD-001";category=$global:catId;price=-15.00;stock=10} -ExpectedStatus 400 -Headers @{Authorization="Bearer $global:adminToken"}

# Negative stock test
Test-Request -Name "Negative Stock (Should Fail - 400)" -Method POST -Url "/api/products" -Body @{name="Bad Stock";sku="BAD-002";category=$global:catId;price=10.00;stock=-5} -ExpectedStatus 400 -Headers @{Authorization="Bearer $global:adminToken"}

# Get Products
Test-Request -Name "Get Products" -Method GET -Url "/api/products" -ExpectedStatus 200 -Headers @{Authorization="Bearer $global:adminToken"}

# Update Product
Test-Request -Name "Update Product" -Method PUT -Url "/api/products/$global:prodId" -Body @{price=24.99;stock=75} -ExpectedStatus 200 -Headers @{Authorization="Bearer $global:adminToken"}

# Update Product Stock
Test-Request -Name "Update Product Stock (PATCH)" -Method PATCH -Url "/api/products/$global:prodId/stock" -Body @{stock=100} -ExpectedStatus 200 -Headers @{Authorization="Bearer $global:adminToken"}

# Update Product with invalid status
Test-Request -Name "Invalid Product Status (Should Fail - 400)" -Method PUT -Url "/api/products/$global:prodId" -Body @{status="invalid_status"} -ExpectedStatus 400 -Headers @{Authorization="Bearer $global:adminToken"}

# 5. CUSTOMER TESTS
Write-Host "`n--- CUSTOMER TESTS ---" -ForegroundColor Yellow

$custBody = @{name="John Doe";email="john@example.com";phone="+1234567890";address="123 Main St"}
try {
    $custResponse = Invoke-RestMethod -Uri "$baseUrl/api/customers" -Method POST -ContentType "application/json" -Body ($custBody | ConvertTo-Json -Compress) -Headers @{Authorization="Bearer $global:adminToken"}
    $global:custId = $custResponse.data._id
    if ($global:custId) { 
        Write-Host "PASS: Create Customer (Status: 201)" -ForegroundColor Green
        $global:passed++
    } else { 
        Write-Host "FAIL: Create Customer" -ForegroundColor Red
        $global:failed++
    }
} catch {
    Write-Host "FAIL: Create Customer - $_" -ForegroundColor Red
    $global:failed++
}
$global:total++

# Duplicate phone test
Test-Request -Name "Duplicate Phone (Should Fail - 400)" -Method POST -Url "/api/customers" -Body @{name="Jane Doe";phone="+1234567890";email="jane@example.com"} -ExpectedStatus 400 -Headers @{Authorization="Bearer $global:adminToken"}

# Delete customer with cashier (should fail - 403)
try {
    $cashierLogin = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body (@{email="cashier@pos.com";password="CashierPass123"} | ConvertTo-Json -Compress)
    $cashierToken = $cashierLogin.data.token
} catch {
    Write-Host "FAIL: Cashier Login - $_" -ForegroundColor Red
}
Test-Request -Name "Cashier Delete Customer (Should Fail - 403)" -Method DELETE -Url "/api/customers/$global:custId" -ExpectedStatus 403 -Headers @{Authorization="Bearer $cashierToken"}

# 6. SALE TESTS
Write-Host "`n--- SALE TESTS ---" -ForegroundColor Yellow

$saleBody = @{
    customer=$global:custId
    items=@(@{
        product=$global:prodId
        quantity=2
        unitPrice=24.99
        discount=0
    })
    discountAmount=0
    taxAmount=2.50
    paymentMethod="cash"
    notes="Test sale"
}
Test-Request -Name "Create Sale" -Method POST -Url "/api/sales" -Body $saleBody -ExpectedStatus 201 -Headers @{Authorization="Bearer $global:adminToken"}

# Get sales
Test-Request -Name "Get Sales" -Method GET -Url "/api/sales" -ExpectedStatus 200 -Headers @{Authorization="Bearer $global:adminToken"}

# 7. INVENTORY TESTS
Write-Host "`n--- INVENTORY TESTS ---" -ForegroundColor Yellow

Test-Request -Name "Get Inventory" -Method GET -Url "/api/inventory" -ExpectedStatus 200 -Headers @{Authorization="Bearer $global:adminToken"}
Test-Request -Name "Get Low Stock" -Method GET -Url "/api/inventory/low-stock" -ExpectedStatus 200 -Headers @{Authorization="Bearer $global:adminToken"}
Test-Request -Name "Get Out of Stock" -Method GET -Url "/api/inventory/out-of-stock" -ExpectedStatus 200 -Headers @{Authorization="Bearer $global:adminToken"}
Test-Request -Name "Stock Adjustment" -Method PATCH -Url "/api/inventory/$global:prodId/adjust" -Body @{adjustment=-10} -ExpectedStatus 200 -Headers @{Authorization="Bearer $global:adminToken"}

# 8. DASHBOARD TESTS
Write-Host "`n--- DASHBOARD TESTS ---" -ForegroundColor Yellow

Test-Request -Name "Dashboard Stats" -Method GET -Url "/api/dashboard" -ExpectedStatus 200 -Headers @{Authorization="Bearer $global:adminToken"}
Test-Request -Name "Dashboard Chart" -Method GET -Url "/api/dashboard/chart" -ExpectedStatus 200 -Headers @{Authorization="Bearer $global:adminToken"}

# 9. REPORT TESTS
Write-Host "`n--- REPORT TESTS ---" -ForegroundColor Yellow

Test-Request -Name "Sales Report" -Method GET -Url "/api/reports/sales" -ExpectedStatus 200 -Headers @{Authorization="Bearer $global:adminToken"}
Test-Request -Name "Revenue Report" -Method GET -Url "/api/reports/revenue" -ExpectedStatus 200 -Headers @{Authorization="Bearer $global:adminToken"}
Test-Request -Name "Category Report" -Method GET -Url "/api/reports/categories" -ExpectedStatus 200 -Headers @{Authorization="Bearer $global:adminToken"}
Test-Request -Name "Top Products Report" -Method GET -Url "/api/reports/top-products" -ExpectedStatus 200 -Headers @{Authorization="Bearer $global:adminToken"}
Test-Request -Name "Customer Report" -Method GET -Url "/api/reports/customers" -ExpectedStatus 200 -Headers @{Authorization="Bearer $global:adminToken"}
Test-Request -Name "Payment Methods Report" -Method GET -Url "/api/reports/payment-methods" -ExpectedStatus 200 -Headers @{Authorization="Bearer $global:adminToken"}

# 10. EDGE CASE & VALIDATION TESTS
Write-Host "`n--- EDGE CASE & VALIDATION TESTS ---" -ForegroundColor Yellow

Test-Request -Name "Empty Body Product Create" -Method POST -Url "/api/products" -Body @{} -ExpectedStatus 400 -Headers @{Authorization="Bearer $global:adminToken"}
Test-Request -Name "Invalid ObjectId - Get Product" -Method GET -Url "/api/products/invalidid" -ExpectedStatus 400 -Headers @{Authorization="Bearer $global:adminToken"}
Test-Request -Name "Non-existent Product" -Method GET -Url "/api/products/000000000000000000000000" -ExpectedStatus 404 -Headers @{Authorization="Bearer $global:adminToken"}

# 404 route
Test-Request -Name "Non-existent Route" -Method GET -Url "/api/nonexistent" -ExpectedStatus 404

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "             TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Tests Run: $global:total" -ForegroundColor White
Write-Host "Tests Passed: $global:passed" -ForegroundColor Green
Write-Host "Tests Failed: $global:failed" -ForegroundColor $(if ($global:failed -gt 0) { "Red" } else { "Green" })

