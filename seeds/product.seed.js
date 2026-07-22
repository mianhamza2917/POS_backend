/**
 * Product Seed File
 * 
 * Seeds sample products linked to categories.
 * Requires categories to be seeded first (uses names to look up IDs).
 * Safe to run multiple times — uses SKU to detect duplicates.
 * 
 * Products created:
 *   - Wireless Mouse (Electronics)
 *   - USB-C Hub (Electronics)
 *   - Cotton T-Shirt (Clothing)
 *   - Denim Jeans (Clothing)
 *   - Green Tea (Food & Beverages)
 *   - Bottled Water (Food & Beverages)
 *   - Ballpoint Pens (Stationery)
 *   - Notebook A5 (Stationery)
 *   - Hand Sanitizer (Health & Beauty)
 *   - Sunscreen SPF50 (Health & Beauty)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');

const products = [
  { name: 'Wireless Mouse', sku: 'ELEC-MOUSE-001', categoryName: 'Electronics', price: 29.99, costPrice: 15.00, stock: 100, description: 'Ergonomic wireless optical mouse' },
  { name: 'USB-C Hub', sku: 'ELEC-HUB-002', categoryName: 'Electronics', price: 49.99, costPrice: 25.00, stock: 75, description: '7-in-1 USB-C multiport adapter' },
  { name: 'Cotton T-Shirt', sku: 'CLTH-TS-001', categoryName: 'Clothing', price: 19.99, costPrice: 8.00, stock: 200, description: 'Premium cotton crew neck t-shirt' },
  { name: 'Denim Jeans', sku: 'CLTH-DJ-002', categoryName: 'Clothing', price: 59.99, costPrice: 30.00, stock: 50, description: 'Classic fit denim jeans' },
  { name: 'Green Tea', sku: 'FOOD-GT-001', categoryName: 'Food & Beverages', price: 4.99, costPrice: 2.00, stock: 500, description: 'Organic Japanese green tea' },
  { name: 'Bottled Water', sku: 'FOOD-BW-002', categoryName: 'Food & Beverages', price: 1.99, costPrice: 0.50, stock: 1000, description: 'Natural spring water 500ml' },
  { name: 'Ballpoint Pens', sku: 'STAT-BP-001', categoryName: 'Stationery', price: 2.99, costPrice: 1.00, stock: 300, description: 'Blue ink ballpoint pens (pack of 10)' },
  { name: 'Notebook A5', sku: 'STAT-NB-002', categoryName: 'Stationery', price: 6.99, costPrice: 3.00, stock: 150, description: 'A5 ruled notebook, 200 pages' },
  { name: 'Hand Sanitizer', sku: 'HEALTH-HS-001', categoryName: 'Health & Beauty', price: 3.99, costPrice: 1.50, stock: 250, description: 'Alcohol-based hand sanitizer 100ml' },
  { name: 'Sunscreen SPF50', sku: 'HEALTH-SS-002', categoryName: 'Health & Beauty', price: 14.99, costPrice: 7.00, stock: 80, description: 'Broad spectrum sunscreen SPF 50+' },
];

const seedProducts = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📦 MongoDB connected — seeding products...');

    // Get category ID mappings
    const allCategories = await Category.find({ isDeleted: { $ne: true } });
    const categoryMap = {};
    for (const cat of allCategories) {
      categoryMap[cat.name] = cat._id;
    }

    let insertedCount = 0;
    for (const prodData of products) {
      const categoryId = categoryMap[prodData.categoryName];
      if (!categoryId) {
        console.log(`  ⚠️  Skipped: Category "${prodData.categoryName}" not found for "${prodData.name}"`);
        continue;
      }

      const existing = await Product.findOne({ sku: prodData.sku });
      if (!existing) {
        await Product.create({
          name: prodData.name,
          sku: prodData.sku,
          category: categoryId,
          price: prodData.price,
          costPrice: prodData.costPrice,
          stock: prodData.stock,
          description: prodData.description,
        });
        console.log(`  ✅ Created product: ${prodData.name} (${prodData.sku})`);
        insertedCount++;
      } else {
        console.log(`  ⏭️  Skipped (exists): ${prodData.name}`);
      }
    }

    console.log(`\n✨ Product seeding complete. ${insertedCount} new products created.`);
    return { insertedCount, total: products.length };
  } catch (error) {
    console.error('❌ Product seeding failed:', error.message);
    throw error;
  }
};

if (require.main === module) {
  seedProducts()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seedProducts;
