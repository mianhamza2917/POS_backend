const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require(path.join(__dirname, '..', 'src', 'models', 'User'));

const setAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    const result = await User.updateOne(
      { email: 'admin@pos.com' },
      { role: 'admin' }
    );
    console.log('Update result:', JSON.stringify(result));
    
    const user = await User.findOne({ email: 'admin@pos.com' });
    if (user) {
      console.log('Admin set:', user.email, '->', user.role);
    } else {
      console.log('User not found');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

setAdmin();

