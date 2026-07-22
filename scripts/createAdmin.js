const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require(path.join(__dirname, '..', 'src', 'models', 'User'));

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully');

    // NEW Admin credentials - change these as needed
    const adminData = {
      name: 'New Super Admin',
      email: 'newadmin@pos.com',
      password: 'NewAdmin@123',
      role: 'admin',
    };

    // Check if admin already exists
    const existing = await User.findOne({ email: adminData.email });
    if (existing) {
      console.log(`Admin user with email ${adminData.email} already exists.`);
      console.log('\nUse these credentials to login:');
      console.log('  Email:    ' + adminData.email);
      console.log('  Password: ' + adminData.password);
    } else {
      // Create new admin user
      const admin = await User.create(adminData);
      console.log('New admin user created successfully!');
      console.log('\nUse these credentials to login:');
      console.log('  Email:    ' + admin.email);
      console.log('  Password: ' + adminData.password);
      console.log('  Role:     ' + admin.role);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error.message);
    process.exit(1);
  }
};

createAdmin();
