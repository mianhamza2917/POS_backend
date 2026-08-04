const Sale = require('../models/Sale');
const Settings = require('../models/Settings');

const generateInvoiceNumber = async () => {
  const settings = await Settings.getOrCreate();
  const prefix = settings.invoicePrefix !== undefined ? settings.invoicePrefix : 'INV-';
  const startNum = Number(settings.startingInvoiceNumber) || 1;

  const totalSalesCount = await Sale.countDocuments({});
  const nextSeq = startNum + totalSalesCount;
  const seqStr = String(nextSeq).padStart(4, '0');

  return `${prefix}${seqStr}`;
};

module.exports = { generateInvoiceNumber };
