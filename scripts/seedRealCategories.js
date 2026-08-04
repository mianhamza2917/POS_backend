const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Category = require('../src/models/Category');
const User = require('../src/models/User');

async function seedCategories() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📦 Connected to MongoDB.');

    const admin = await User.findOne({ email: 'admin@pos.com' });
    const adminId = admin ? admin._id : null;

    const realCategories = [
      {
        name: 'Electronics',
        description: 'Consumer electronics, gadgets, and electronic accessories',
      },
      {
        name: 'Clothing & Apparel',
        description: 'Men, women, and kids clothing, apparel, and fashion items',
      },
      {
        name: 'Household Items',
        description: 'Home goods, kitchenware, and everyday household essentials',
      },
    ];

    for (const cat of realCategories) {
      const existing = await Category.findOne({ name: cat.name, isDeleted: { $ne: true } });
      if (!existing) {
        await Category.create({
          name: cat.name,
          description: cat.description,
          branchId: 'main',
          createdBy: adminId,
          updatedBy: adminId,
        });
        console.log(`✅ Created category: ${cat.name}`);
      } else {
        console.log(`ℹ️ Category already exists: ${cat.name}`);
      }
    }

    const count = await Category.countDocuments({ isDeleted: { $ne: true } });
    console.log(`\n🎉 Total Active Categories in Database: ${count}`);
  } catch (error) {
    console.error('❌ Error creating categories:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('📦 Database connection closed.');
    process.exit(0);
  }
}

seedCategories();
