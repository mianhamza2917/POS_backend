/**
 * Sale Seed File
 * 
 * Seeds sample sales linked to existing customers, products, and users.
 * Requires customers, products, and users to be seeded first.
 * Safe to run multiple times — uses invoice number to detect duplicates.
 * 
 * Sales created:
 *   - Sale #1: John Doe buys Wireless Mouse (qty 2) + USB-C Hub (qty 1) — Cash
 *   - Sale #2: Jane Smith buys Green Tea (qty 5) + Bottled Water (qty 10) — Card
 *   - Sale #3: Bob Wilson buys Cotton T-Shirt (qty 3) + Denim Jeans (qty 1) — Bank Transfer
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Sale = require('../src/models/Sale');
const Product = require('../src/models/Product');
const Customer = require('../src/models/Customer');
const User = require('../src/models/User');
const { generateInvoiceNumber } = require('../src/utils/invoiceHelper');

/**
 * Builds a sale data object with enriched item info from product records.
 */
async function buildSaleData(customerEmail, productMap, user, paymentMethod, itemSelections, discountAmount = 0, taxAmount = 0) {
  const customer = await Customer.findOne({ email: customerEmail });
  const items = [];
  let subtotal = 0;
  let profit = 0;

  for (const sel of itemSelections) {
    const product = productMap[sel.sku];
    if (!product) throw new Error(`Product not found: ${sel.sku}`);

    const unitPrice = product.price;
    const itemDiscount = sel.discount || 0;
    const total = (unitPrice * sel.quantity) - itemDiscount;
    subtotal += total;
    profit += (unitPrice - (product.costPrice || 0)) * sel.quantity - itemDiscount;

    items.push({
      product: product._id,
      name: product.name,
      sku: product.sku,
      quantity: sel.quantity,
      unitPrice,
      discount: itemDiscount,
      total,
    });
  }

  const totalAmount = subtotal - discountAmount + taxAmount;
  const invoiceNumber = await generateInvoiceNumber();

  return {
    invoiceNumber,
    customer: customer ? customer._id : null,
    items,
    subtotal,
    discountAmount,
    taxAmount,
    totalAmount: Math.max(0, totalAmount),
    profit,
    paymentMethod,
    notes: `Seeded sale — ${paymentMethod}`,
    branchId: 'main',
    createdBy: user._id,
    updatedBy: user._id,
  };
}

const seedSales = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📦 MongoDB connected — seeding sales...');

    // Get references
    const admin = await User.findOne({ email: 'admin@pos.com' });
    if (!admin) {
      console.log('  ⚠️  Admin user not found. Run user.seed.js first.');
      return { insertedCount: 0, total: 0 };
    }

    const products = await Product.find({ isDeleted: { $ne: true } });
    const productMap = {};
    for (const p of products) productMap[p.sku] = p;

    // Define sample sales
    const saleConfigs = [
      {
        customerEmail: 'john.doe@example.com',
        paymentMethod: 'cash',
        items: [
          { sku: 'ELEC-MOUSE-001', quantity: 2 },
          { sku: 'ELEC-HUB-002', quantity: 1 },
        ],
        discountAmount: 0,
        taxAmount: 5.50,
      },
      {
        customerEmail: 'jane.smith@example.com',
        paymentMethod: 'card',
        items: [
          { sku: 'FOOD-GT-001', quantity: 5 },
          { sku: 'FOOD-BW-002', quantity: 10 },
        ],
        discountAmount: 2.00,
        taxAmount: 1.50,
      },
      {
        customerEmail: 'bob.wilson@example.com',
        paymentMethod: 'other',
        items: [
          { sku: 'CLTH-TS-001', quantity: 3 },
          { sku: 'CLTH-DJ-002', quantity: 1 },
        ],
        discountAmount: 5.00,
        taxAmount: 3.00,
      },
    ];

    let insertedCount = 0;
    for (const config of saleConfigs) {
      try {
        const saleData = await buildSaleData(
          config.customerEmail,
          productMap,
          admin,
          config.paymentMethod,
          config.items,
          config.discountAmount,
          config.taxAmount,
        );

        const existing = await Sale.findOne({ invoiceNumber: saleData.invoiceNumber });
        if (!existing) {
          await Sale.create(saleData);
          console.log(`  ✅ Created sale: ${saleData.invoiceNumber} (${config.customerEmail}) — $${saleData.totalAmount.toFixed(2)}`);
          insertedCount++;
        } else {
          console.log(`  ⏭️  Skipped (exists): ${saleData.invoiceNumber}`);
        }
      } catch (err) {
        console.log(`  ⚠️  Failed to create sale for ${config.customerEmail}: ${err.message}`);
      }
    }

    console.log(`\n✨ Sale seeding complete. ${insertedCount} new sales created.`);
    return { insertedCount, total: saleConfigs.length };
  } catch (error) {
    console.error('❌ Sale seeding failed:', error.message);
    throw error;
  }
};

if (require.main === module) {
  seedSales()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seedSales;
