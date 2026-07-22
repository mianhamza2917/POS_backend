/**
 * Master Seed Runner
 *
 * Executes all seed files in dependency order:
 *   1. Users (no dependencies)
 *   2. Categories (no dependencies)
 *   3. Products (depends on Categories)
 *   4. Customers (no dependencies)
 *   5. Sales (depends on Users, Products, Customers)
 *
 * Usage:  node seeds/index.js
 *         npm run seed
 *
 * Safe to run multiple times — each seed file handles duplicate detection.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const seedUsers = require('./user.seed');
const seedCategories = require('./category.seed');
const seedProducts = require('./product.seed');
const seedCustomers = require('./customer.seed');
const seedSales = require('./sale.seed');

const RESULTS = [];

async function runAll() {
  console.log('========================================');
  console.log('   POS System — Database Seed Runner');
  console.log('========================================\n');

  try {
    // Step 1: Users
    console.log('--- Step 1/5: Users ---');
    const userResult = await seedUsers();
    RESULTS.push({ step: 'Users', ...userResult });

    // Step 2: Categories
    console.log('\n--- Step 2/5: Categories ---');
    const catResult = await seedCategories();
    RESULTS.push({ step: 'Categories', ...catResult });

    // Step 3: Products (depends on categories)
    console.log('\n--- Step 3/5: Products ---');
    const prodResult = await seedProducts();
    RESULTS.push({ step: 'Products', ...prodResult });

    // Step 4: Customers
    console.log('\n--- Step 4/5: Customers ---');
    const custResult = await seedCustomers();
    RESULTS.push({ step: 'Customers', ...custResult });

    // Step 5: Sales (depends on users, products, customers)
    console.log('\n--- Step 5/5: Sales ---');
    const saleResult = await seedSales();
    RESULTS.push({ step: 'Sales', ...saleResult });

    // Summary
    console.log('\n========================================');
    console.log('   SEED SUMMARY');
    console.log('========================================');
    for (const r of RESULTS) {
      console.log(`  ${r.step.padEnd(12)}: ${r.insertedCount} new / ${r.total} total`);
    }
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ Seed process failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📦 Database connection closed.');
    process.exit(0);
  }
}

runAll();
