/**
 * Database Cleanup Script
 *
 * Deletes all existing data from collections and re-seeds fresh data.
 * Keeps one Admin user if required for login.
 *
 * Usage:  node scripts/cleanupDatabase.js
 *         npm run db:cleanup
 *
 * SAFETY: This script DESTROYS all data in the database.
 *         Use with extreme caution — never run on production without backup.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const seedUsers = require('../seeds/user.seed');
const seedCategories = require('../seeds/category.seed');
const seedProducts = require('../seeds/product.seed');
const seedInventory = require('../seeds/inventory.seed');
const seedCustomers = require('../seeds/customer.seed');
const seedSales = require('../seeds/sale.seed');

const RESULTS = [];

// ── Step 0: Delete all data ──────────────────────────────────────────
async function deleteAllData() {
  const collections = mongoose.connection.collections;
  const deletable = ['products', 'categories', 'inventories', 'customers', 'sales', 'users'];

  for (const name of deletable) {
    if (collections[name]) {
      await collections[name].deleteMany({});
      console.log(`  🗑️  Deleted all documents from: ${name}`);
    } else {
      console.log(`  ⬜ Collection does not exist (skipped): ${name}`);
    }
  }
}

// ── Main Runner ──────────────────────────────────────────────────────
async function runCleanup() {
  console.log('========================================');
  console.log('   POS System — Database Cleanup & Seed');
  console.log('   ⚠️  THIS WILL DELETE ALL EXISTING DATA');
  console.log('========================================\n');

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📦 MongoDB connected.\n');

    // 0. Delete all existing data
    console.log('--- Step 0: Deleting all data ---');
    await deleteAllData();
    console.log('');

    // 1. Users
    console.log('--- Step 1/6: Users ---');
    const userResult = await seedUsers();
    RESULTS.push({ step: 'Users', ...userResult });

    // 2. Categories
    console.log('\n--- Step 2/6: Categories ---');
    const catResult = await seedCategories();
    RESULTS.push({ step: 'Categories', ...catResult });

    // 3. Products (depends on categories)
    console.log('\n--- Step 3/6: Products ---');
    const prodResult = await seedProducts();
    RESULTS.push({ step: 'Products', ...prodResult });

    // 4. Inventory (depends on products)
    console.log('\n--- Step 4/6: Inventory ---');
    const invResult = await seedInventory();
    RESULTS.push({ step: 'Inventory', ...invResult });

    // 5. Customers
    console.log('\n--- Step 5/6: Customers ---');
    const custResult = await seedCustomers();
    RESULTS.push({ step: 'Customers', ...custResult });

    // 6. Sales (depends on users, products, customers)
    console.log('\n--- Step 6/6: Sales ---');
    const saleResult = await seedSales();
    RESULTS.push({ step: 'Sales', ...saleResult });

    // Summary
    console.log('\n========================================');
    console.log('   CLEANUP & SEED SUMMARY');
    console.log('========================================');
    for (const r of RESULTS) {
      console.log(`  ${r.step.padEnd(12)}: ${r.insertedCount} new / ${r.total} total`);
    }
    console.log('========================================\n');

    console.log('✅ Database cleanup and re-seed complete!');

  } catch (error) {
    console.error('\n❌ Cleanup process failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📦 Database connection closed.');
    process.exit(0);
  }
}

runCleanup();

