/**
 * Clear All Dummy Data Script
 * 
 * Removes all sample products, categories, inventory, customers, sales,
 * and non-admin user accounts. Preserves only the primary Admin user account
 * so you can log into the system cleanly.
 * 
 * Usage: node scripts/clearAllData.js
 *        npm run db:clear
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');

const ADMIN_EMAIL = 'admin@pos.com';
const ADMIN_PASSWORD = 'AdminPass123';

async function clearAllData() {
  console.log('========================================');
  console.log('   POS System — Purging Dummy Data');
  console.log('========================================\n');

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📦 MongoDB connected.\n');

    const collections = mongoose.connection.collections;

    // Collections to wipe completely
    const wipeCollections = ['products', 'categories', 'inventories', 'customers', 'sales'];

    for (const name of wipeCollections) {
      if (collections[name]) {
        const result = await collections[name].deleteMany({});
        console.log(`  🗑️  Cleared ${result.deletedCount} documents from collection: "${name}"`);
      }
    }

    // Handle users: keep only admin@pos.com, delete all other users
    if (collections['users']) {
      const deleteNonAdminResult = await User.deleteMany({ email: { $ne: ADMIN_EMAIL } });
      console.log(`  🗑️  Cleared ${deleteNonAdminResult.deletedCount} non-admin user accounts.`);

      let adminUser = await User.findOne({ email: ADMIN_EMAIL });
      if (!adminUser) {
        adminUser = await User.create({
          name: 'System Admin',
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          role: 'admin',
          branchId: 'main',
        });
        console.log(`  ✅ Preserved/Created primary Admin account: ${ADMIN_EMAIL}`);
      } else {
        console.log(`  ✅ Preserved primary Admin account: ${ADMIN_EMAIL}`);
      }
    }

    console.log('\n========================================');
    console.log('✨ All dummy data successfully removed!');
    console.log(`🔑 Login Credentials Preserved:`);
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ Data cleanup failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📦 Database connection closed.');
    process.exit(0);
  }
}

clearAllData();
