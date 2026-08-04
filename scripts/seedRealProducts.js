const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Product = require('../src/models/Product');
const Category = require('../src/models/Category');
const Inventory = require('../src/models/Inventory');
const User = require('../src/models/User');

const SOURCE_IMAGES = {
  headphones: 'C:\\Users\\786\\.gemini\\antigravity\\brain\\b45da9ad-4061-4558-b9b7-d87d31de4284\\headphones_product_1785841202492.jpg',
  charger: 'C:\\Users\\786\\.gemini\\antigravity\\brain\\b45da9ad-4061-4558-b9b7-d87d31de4284\\charger_product_1785841219353.jpg',
  lamp: 'C:\\Users\\786\\.gemini\\antigravity\\brain\\b45da9ad-4061-4558-b9b7-d87d31de4284\\lamp_product_1785841238755.jpg',
  tshirt: 'C:\\Users\\786\\.gemini\\antigravity\\brain\\b45da9ad-4061-4558-b9b7-d87d31de4284\\tshirt_product_1785841255460.jpg',
  jeans: 'C:\\Users\\786\\.gemini\\antigravity\\brain\\b45da9ad-4061-4558-b9b7-d87d31de4284\\jeans_product_1785841279195.jpg',
  shoes: 'C:\\Users\\786\\.gemini\\antigravity\\brain\\b45da9ad-4061-4558-b9b7-d87d31de4284\\shoes_product_1785841301140.jpg',
  containers: 'C:\\Users\\786\\.gemini\\antigravity\\brain\\b45da9ad-4061-4558-b9b7-d87d31de4284\\containers_product_1785841329783.jpg',
  spray: 'C:\\Users\\786\\.gemini\\antigravity\\brain\\b45da9ad-4061-4558-b9b7-d87d31de4284\\spray_product_1785841358195.jpg',
  bottle: 'C:\\Users\\786\\.gemini\\antigravity\\brain\\b45da9ad-4061-4558-b9b7-d87d31de4284\\bottle_product_1785841378688.jpg',
  kettle: 'C:\\Users\\786\\.gemini\\antigravity\\brain\\b45da9ad-4061-4558-b9b7-d87d31de4284\\kettle_product_1785841402863.jpg',
};

const DEST_DIR = path.join(__dirname, '..', 'uploads', 'products');

async function seedProducts() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📦 Connected to MongoDB.');

    // Ensure uploads/products folder exists
    if (!fs.existsSync(DEST_DIR)) {
      fs.mkdirSync(DEST_DIR, { recursive: true });
    }

    // Copy generated images to local uploads/products/
    const copiedImages = {};
    for (const [key, srcPath] of Object.entries(SOURCE_IMAGES)) {
      const destFilename = `${key}.jpg`;
      const destPath = path.join(DEST_DIR, destFilename);
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        copiedImages[key] = `uploads/products/${destFilename}`;
        console.log(`🖼️ Copied image for ${key} -> uploads/products/${destFilename}`);
      } else {
        copiedImages[key] = '';
      }
    }

    const admin = await User.findOne({ email: 'admin@pos.com' });
    const adminId = admin ? admin._id : null;

    // Fetch Category ObjectIds
    const electronics = await Category.findOne({ name: 'Electronics', isDeleted: { $ne: true } });
    const clothing = await Category.findOne({ name: 'Clothing & Apparel', isDeleted: { $ne: true } });
    const household = await Category.findOne({ name: 'Household Items', isDeleted: { $ne: true } });

    if (!electronics || !clothing || !household) {
      console.error('❌ Required categories not found. Please ensure categories are seeded.');
      process.exit(1);
    }

    const realProducts = [
      {
        name: 'Wireless Bluetooth Headphones',
        sku: 'ELE-HDPH-001',
        barcode: '8901234567891',
        category: electronics._id,
        price: 59.99,
        costPrice: 32.50,
        stock: 45,
        image: copiedImages.headphones,
        description: 'Premium noise-canceling over-ear wireless headphones with long battery life.',
      },
      {
        name: 'Smartphone Charger',
        sku: 'ELE-CHRG-002',
        barcode: '8901234567892',
        category: electronics._id,
        price: 19.99,
        costPrice: 8.00,
        stock: 120,
        image: copiedImages.charger,
        description: 'Fast-charging USB-C wall adapter with durable braided cable.',
      },
      {
        name: 'LED Desk Lamp',
        sku: 'ELE-LAMP-003',
        barcode: '8901234567893',
        category: electronics._id,
        price: 29.99,
        costPrice: 14.20,
        stock: 35,
        image: copiedImages.lamp,
        description: 'Modern touch-controlled dimmable LED desk lamp with USB charging port.',
      },
      {
        name: 'Cotton T-Shirt',
        sku: 'CLO-TSHT-004',
        barcode: '8901234567894',
        category: clothing._id,
        price: 24.99,
        costPrice: 10.00,
        stock: 80,
        image: copiedImages.tshirt,
        description: 'Soft 100% organic cotton breathable crewneck t-shirt.',
      },
      {
        name: 'Denim Jeans',
        sku: 'CLO-JEAN-005',
        barcode: '8901234567895',
        category: clothing._id,
        price: 49.99,
        costPrice: 22.00,
        stock: 50,
        image: copiedImages.jeans,
        description: 'Classic fit durable dark indigo denim jeans with stretch comfort.',
      },
      {
        name: 'Casual Shoes',
        sku: 'CLO-SHOE-006',
        barcode: '8901234567896',
        category: clothing._id,
        price: 69.99,
        costPrice: 35.00,
        stock: 30,
        image: copiedImages.shoes,
        description: 'Lightweight cushioned athletic sneakers for daily walking comfort.',
      },
      {
        name: 'Kitchen Storage Container Set',
        sku: 'HOU-CONT-007',
        barcode: '8901234567897',
        category: household._id,
        price: 34.99,
        costPrice: 16.50,
        stock: 40,
        image: copiedImages.containers,
        description: 'Airtight glass food storage containers with eco-friendly bamboo lids.',
      },
      {
        name: 'Cleaning Spray',
        sku: 'HOU-SPRY-008',
        barcode: '8901234567898',
        category: household._id,
        price: 8.99,
        costPrice: 3.20,
        stock: 150,
        image: copiedImages.spray,
        description: 'Multi-surface eco-friendly streak-free kitchen and glass cleaner.',
      },
      {
        name: 'Water Bottle',
        sku: 'HOU-BTTL-009',
        barcode: '8901234567899',
        category: household._id,
        price: 18.99,
        costPrice: 7.50,
        stock: 90,
        image: copiedImages.bottle,
        description: 'Double-wall vacuum insulated stainless steel water bottle (750ml).',
      },
      {
        name: 'Electric Kettle',
        sku: 'ELE-KETL-010',
        barcode: '8901234567900',
        category: electronics._id,
        price: 39.99,
        costPrice: 19.00,
        stock: 25,
        image: copiedImages.kettle,
        description: 'Fast-boiling 1.7L stainless steel cordless electric tea kettle with auto-shutoff.',
      },
    ];

    for (const prodData of realProducts) {
      let product = await Product.findOne({ sku: prodData.sku, isDeleted: { $ne: true } });
      if (!product) {
        product = await Product.create({
          ...prodData,
          branchId: 'main',
          createdBy: adminId,
          updatedBy: adminId,
        });
        console.log(`✅ Created Product: ${product.name} (SKU: ${product.sku})`);
      } else {
        product.name = prodData.name;
        product.barcode = prodData.barcode;
        product.category = prodData.category;
        product.price = prodData.price;
        product.costPrice = prodData.costPrice;
        product.stock = prodData.stock;
        product.image = prodData.image;
        product.description = prodData.description;
        await product.save();
        console.log(`ℹ️ Updated Product: ${product.name}`);
      }

      // Ensure matching Inventory record exists
      await Inventory.findOneAndUpdate(
        { product: product._id },
        {
          $set: {
            product: product._id,
            quantity: product.stock,
            location: 'Main Store',
            lowStockThreshold: 10,
            branchId: 'main',
            isDeleted: false,
            createdBy: adminId,
            updatedBy: adminId,
          },
        },
        { upsert: true, new: true }
      );
    }

    const totalProd = await Product.countDocuments({ isDeleted: { $ne: true } });
    const totalInv = await Inventory.countDocuments({ isDeleted: { $ne: true } });

    console.log(`\n🎉 Total Active Products: ${totalProd}`);
    console.log(`📦 Total Active Inventories: ${totalInv}`);
  } catch (error) {
    console.error('❌ Error seeding products:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('📦 Database connection closed.');
    process.exit(0);
  }
}

seedProducts();
