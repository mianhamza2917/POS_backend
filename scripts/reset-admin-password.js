/**
 * Reset admin password to the seed value
 * Run: node scripts/reset-admin-password.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const bcrypt = require('bcrypt');
const { BCRYPT } = require('../src/utils/constants');

async function resetPasswords() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');
  
  const users = [
    { email: 'admin@pos.com', password: 'AdminPass123' },
    { email: 'newadmin@pos.com', password: 'NewAdmin@123' },
    { email: 'manager@pos.com', password: 'ManagerPass123' },
    { email: 'cashier@pos.com', password: 'CashierPass123' },
  ];
  
  for (const u of users) {
    const salt = await bcrypt.genSalt(BCRYPT.SALT_ROUNDS);
    const hashed = await bcrypt.hash(u.password, salt);
    const result = await User.updateOne(
      { email: u.email },
      { 
        $set: { password: hashed },
        $unset: { resetPasswordToken: '', resetPasswordExpire: '' }
      }
    );
    if (result.modifiedCount > 0) {
      console.log(`✅ Reset password for: ${u.email}`);
    } else {
      console.log(`⏭️  User not found: ${u.email}`);
    }
  }
  
  await mongoose.disconnect();
  console.log('Done');
  process.exit(0);
}

resetPasswords().catch(err => { console.error(err); process.exit(1); });

