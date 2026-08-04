/**
 * User Seed File
 * 
 * Seeds default users for the POS system.
 * Can be run standalone or via seeds/index.js.
 * Safe to run multiple times — uses upsert to avoid duplicates.
 * 
 * Users created:
 *   - System Admin (admin@pos.com / AdminPass123)
 *   - New Admin (newadmin@pos.com / NewAdmin@123)
 *   - Manager (manager@pos.com / ManagerPass123)
 *   - Cashier (cashier@pos.com / CashierPass123)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');

const users = [
  {
    name: 'System Admin',
    email: 'admin@pos.com',
    password: 'AdminPass123',
    role: 'admin',
    branchId: 'main',
  },
];

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📦 MongoDB connected — seeding users...');

    let insertedCount = 0;
    for (const userData of users) {
      const existing = await User.findOne({ email: userData.email });
      if (!existing) {
        await User.create(userData);
        console.log(`  ✅ Created user: ${userData.email} (${userData.role})`);
        insertedCount++;
      } else {
        console.log(`  ⏭️  Skipped (exists): ${userData.email}`);
      }
    }

    console.log(`\n✨ User seeding complete. ${insertedCount} new users created.`);
    return { insertedCount, total: users.length };
  } catch (error) {
    console.error('❌ User seeding failed:', error.message);
    throw error;
  }
};

// Run standalone if called directly
if (require.main === module) {
  seedUsers()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seedUsers;
