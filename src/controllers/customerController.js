const Customer = require('../models/Customer');
const { parsePagination, parseSort } = require('../utils/queryHelper');
const { SORT_FIELDS, CUSTOMER_STATUSES } = require('../utils/constants');

const ALLOWED_SORT_FIELDS = SORT_FIELDS.CUSTOMERS;

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private (Admin, Manager, Cashier)
const getCustomers = async (req, res, next) => {
  try {
    const { search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const { pageNum, limitNum, skip } = parsePagination(req.query);
    const sort = parseSort(sortBy, sortOrder, ALLOWED_SORT_FIELDS);

    const query = { isDeleted: { $ne: true } };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [customers, total] = await Promise.all([
      Customer.find(query).sort(sort).skip(skip).limit(limitNum),
      Customer.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      message: 'Customers retrieved successfully',
      count: customers.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: customers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single customer by ID
// @route   GET /api/customers/:id
// @access  Private (Admin, Manager, Cashier)
const getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, isDeleted: { $ne: true } })
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found', errors: ['Customer not found'] });
    }

    res.status(200).json({ success: true, message: 'Customer retrieved successfully', data: customer });
  } catch (error) {
    next(error);
  }
};

// @desc    Add new customer
// @route   POST /api/customers
// @access  Private (Admin, Manager, Cashier)
const createCustomer = async (req, res, next) => {
  try {
    const { name, phone, email, address } = req.body;

    if (phone) {
      const phoneExists = await Customer.findOne({ phone, isDeleted: { $ne: true } });
      if (phoneExists) {
        return res.status(400).json({ success: false, message: 'Customer with this phone number already exists', errors: ['Duplicate phone'] });
      }
    }

    if (email) {
      const emailExists = await Customer.findOne({ email: email.toLowerCase(), isDeleted: { $ne: true } });
      if (emailExists) {
        return res.status(400).json({ success: false, message: 'Customer with this email already exists', errors: ['Duplicate email'] });
      }
    }

    const customer = await Customer.create({
      name, phone, email, address,
      branchId: req.user.branchId || 'main',
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    res.status(201).json({ success: true, message: 'Customer created successfully', data: customer });
  } catch (error) {
    next(error);
  }
};

// @desc    Update customer details
// @route   PUT /api/customers/:id
// @access  Private (Admin, Manager, Cashier)
const updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found', errors: ['Customer not found'] });
    }

    // Check for duplicate phone (if updating)
    if (req.body.phone) {
      const phoneExists = await Customer.findOne({ phone: req.body.phone, _id: { $ne: req.params.id }, isDeleted: { $ne: true } });
      if (phoneExists) {
        return res.status(400).json({ success: false, message: 'Customer with this phone number already exists', errors: ['Duplicate phone'] });
      }
    }

    // Check for duplicate email (if updating)
    if (req.body.email) {
      const emailExists = await Customer.findOne({ email: req.body.email.toLowerCase(), _id: { $ne: req.params.id }, isDeleted: { $ne: true } });
      if (emailExists) {
        return res.status(400).json({ success: false, message: 'Customer with this email already exists', errors: ['Duplicate email'] });
      }
    }

    // Whitelist updatable fields — prevent mass assignment
    if (req.body.name !== undefined) customer.name = req.body.name;
    if (req.body.phone !== undefined) customer.phone = req.body.phone;
    if (req.body.email !== undefined) customer.email = req.body.email;
    if (req.body.address !== undefined) customer.address = req.body.address;
if (req.body.status !== undefined) {
      if (!CUSTOMER_STATUSES.ALL.includes(req.body.status)) {
        return res.status(400).json({ success: false, message: 'Invalid status value', errors: ['Status must be active or inactive'] });
      }
      customer.status = req.body.status;
    }
    customer.updatedBy = req.user._id;

    await customer.save();

    res.status(200).json({ success: true, message: 'Customer updated successfully', data: customer });
  } catch (error) {
    next(error);
  }
};

// @desc    Soft delete customer
// @route   DELETE /api/customers/:id
// @access  Private (Admin, Manager ONLY - Cashiers prohibited)
const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found', errors: ['Customer not found'] });
    }

    customer.isDeleted = true;
    customer.deletedAt = new Date();
    customer.updatedBy = req.user._id;
    await customer.save();

    res.status(200).json({ success: true, message: 'Customer deleted successfully', data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer };
