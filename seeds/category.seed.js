/**
 * Category Seed File
 * 
 * Seeds default product categories for the POS system.
 * Safe to run multiple times — uses upsert to avoid duplicates.
 * 
 * Categories created:
 *   - Electronics
 *   - Clothing
 *   - Food & Beverages
 *   - Stationery
 *   - Health & Beauty
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Category = require('../src/models/Category');

const categories = [
  { name: 'Electronics', description: 'Electronic devices and accessories' },
  { name: 'Clothing', description: 'Apparel and fashion items' },
  { name: 'Food & Beverages', description: 'Food items and drinks' },
  { name: 'Stationery', description: 'Office and school supplies' },
  { name: 'Health & Beauty', description: 'Personal care and beauty products' },
];

const seedCategories = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📦 MongoDB connected — seeding categories...');

    let insertedCount = 0;
    for (const catData of categories) {
      const existing = await Category.findOne({ name: catData.name });
      if (!existing) {
        await Category.create(catData);
        console.log(`  ✅ Created category: ${catData.name}`);
        insertedCount++;
      } else {
        console.log(`  ⏭️  Skipped (exists): ${catData.name}`);
      }
    }

    console.log(`\n✨ Category seeding complete. ${insertedCount} new categories created.`);
    return { insertedCount, total: categories.length };
  } catch (error) {
    console.error('❌ Category seeding failed:', error.message);
    throw error;
  }
};

if (require.main === module) {
  seedCategories()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seedCategories;
