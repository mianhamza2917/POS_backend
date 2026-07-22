const Sale = require('../models/Sale');
const { INVOICE } = require('./constants');

const generateInvoiceNumber = async () => {
  const now = new Date();

  // Build dateStr from a stable copy BEFORE any mutation
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // Build start/end of day using separate Date objects (no mutation of 'now')
  const startOfDay = new Date(year, now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(year, now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const count = await Sale.countDocuments({ createdAt: { $gte: startOfDay, $lte: endOfDay } });
  const seq = String(count + 1).padStart(INVOICE.SEQUENCE_PAD, '0');

  return `${INVOICE.PREFIX}${dateStr}-${seq}`;
};

module.exports = { generateInvoiceNumber };
