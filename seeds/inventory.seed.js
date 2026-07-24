/**
 * Inventory Seed File
 *
 * Creates inventory records for all seeded products.
 * Requires products to be seeded first (uses SKU to look up product IDs).
 * The Product model's post('save') hook auto-creates Inventory records when
 * products are saved, so this seed file mainly ensures the inventory records
 * exist with correct quantities and thresholds.
 *
 * Safe to run multiple times — uses product reference to detect duplicates.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Inventory = require('../src/models/Inventory');
const Product = require('../src/models/Product');

const LOW_STOCK_THRESHOLD = 10;

const inventoryItems = [
  { sku: 'ELEC-MOUSE-001', location: 'Shelf A-1' },
  { sku: 'ELEC-HUB-002', location: 'Shelf A-2' },
  { sku: 'CLTH-TS-001', location: 'Rack B-1' },
  { sku: 'CLTH-DJ-002', location: 'Rack B-2' },
  { sku: 'FOOD-GT-001', location: 'Aisle C-1' },
  { sku: 'FOOD-BW-002', location: 'Aisle C-2' },
  { sku: 'STAT-BP-001', location: 'Drawer D-1' },
  { sku: 'STAT-NB-002', location: 'Drawer D-2' },
  { sku: 'HEALTH-HS-001', location: 'Cabinet E-1' },
  { sku: 'HEALTH-SS-002', location: 'Cabinet E-2' },
];

const seedInventory = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📦 MongoDB connected — seeding inventory...');

    // Get all products
    const allProducts = await Product.find({ isDeleted: { $ne: true } });
    const productSkuMap = {};
    for (const p of allProducts) {
      productSkuMap[p.sku] = p;
    }

    let insertedCount = 0;
    for (const item of inventoryItems) {
      const product = productSkuMap[item.sku];
      if (!product) {
        console.log(`  ⚠️  Skipped: Product with SKU "${item.sku}" not found`);
        continue;
      }

      const existing = await Inventory.findOne({ product: product._id });
      if (!existing) {
        await Inventory.create({
          product: product._id,
          quantity: product.stock,
          lowStockThreshold: LOW_STOCK_THRESHOLD,
          location: item.location,
          branchId: 'main',
        });
        console.log(`  ✅ Created inventory for: ${product.name} (${item.sku}) — qty: ${product.stock}, location: ${item.location}`);
        insertedCount++;
      } else {
        // Update existing inventory to ensure quantity matches product stock
        if (existing.quantity !== product.stock) {
          existing.quantity = product.stock;
          existing.lowStockThreshold = LOW_STOCK_THRESHOLD;
          existing.location = item.location;
          await existing.save();
          console.log(`  🔄 Updated inventory for: ${product.name} (${item.sku}) — qty: ${product.stock}`);
        } else {
          console.log(`  ⏭️  Skipped (exists): ${product.name}`);
        }
      }
    }

    console.log(`\n✨ Inventory seeding complete. ${insertedCount} new records created.`);
    return { insertedCount, total: inventoryItems.length };
  } catch (error) {
    console.error('❌ Inventory seeding failed:', error.message);
    throw error;
  }
};

if (require.main === module) {
  seedInventory()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seedInventory;

