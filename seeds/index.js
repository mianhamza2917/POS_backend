/**
 * Seed Runner — Preserves Primary Admin Account
 *
 * Usage: node seeds/index.js
 *        npm run seed
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const seedUsers = require('./user.seed');

async function runAll() {
  console.log('========================================');
  console.log('   POS System — Admin Seed Runner');
  console.log('========================================\n');

  try {
    console.log('--- Seeding Admin User ---');
    const userResult = await seedUsers();

    console.log('\n========================================');
    console.log(`  Users: ${userResult.insertedCount} new / ${userResult.total} total`);
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
