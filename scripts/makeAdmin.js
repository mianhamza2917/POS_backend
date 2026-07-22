require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const makeAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');

    // Update user to admin
    const user = await User.findOneAndUpdate(
      { email: 'admin@test.com' },
      { role: 'admin' },
      { new: true }
    );

    if (user) {
      console.log(`User ${user.email} is now an admin`);
    } else {
      console.log('User not found');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

makeAdmin();
