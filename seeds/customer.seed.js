/**
 * Customer Seed File
 * 
 * Seeds sample customers for the POS system.
 * Safe to run multiple times — uses phone number to detect duplicates.
 * 
 * Customers created:
 *   - John Doe
 *   - Jane Smith
 *   - Bob Wilson
 *   - Alice Brown
 *   - Charlie Davis
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Customer = require('../src/models/Customer');

const customers = [
  { name: 'John Doe', email: 'john.doe@example.com', phone: '+1234567890', address: '123 Main Street, New York, NY' },
  { name: 'Jane Smith', email: 'jane.smith@example.com', phone: '+1234567891', address: '456 Oak Avenue, Los Angeles, CA' },
  { name: 'Bob Wilson', email: 'bob.wilson@example.com', phone: '+1234567892', address: '789 Pine Road, Chicago, IL' },
  { name: 'Alice Brown', email: 'alice.brown@example.com', phone: '+1234567893', address: '321 Elm Drive, Houston, TX' },
  { name: 'Charlie Davis', email: 'charlie.davis@example.com', phone: '+1234567894', address: '654 Maple Lane, Phoenix, AZ' },
];

const seedCustomers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📦 MongoDB connected — seeding customers...');

    let insertedCount = 0;
    for (const custData of customers) {
      const existing = await Customer.findOne({ phone: custData.phone });
      if (!existing) {
        await Customer.create(custData);
        console.log(`  ✅ Created customer: ${custData.name} (${custData.phone})`);
        insertedCount++;
      } else {
        console.log(`  ⏭️  Skipped (exists): ${custData.name}`);
      }
    }

    console.log(`\n✨ Customer seeding complete. ${insertedCount} new customers created.`);
    return { insertedCount, total: customers.length };
  } catch (error) {
    console.error('❌ Customer seeding failed:', error.message);
    throw error;
  }
};

if (require.main === module) {
  seedCustomers()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seedCustomers;
