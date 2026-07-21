const Category = require('../models/Category');
const { parsePagination, parseSort } = require('../utils/queryHelper');

const ALLOWED_SORT_FIELDS = ['name', 'createdAt', 'updatedAt'];

// @desc    Get all categories
// @route   GET /api/categories
// @access  Private (Admin, Manager, Cashier)
const getCategories = async (req, res, next) => {
  try {
    const { search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const { pageNum, limitNum, skip } = parsePagination(req.query);
    const sort = parseSort(sortBy, sortOrder, ALLOWED_SORT_FIELDS);

    const query = { isDeleted: { $ne: true } };
    if (search) query.name = { $regex: search, $options: 'i' };

    const [categories, total] = await Promise.all([
      Category.find(query).sort(sort).skip(skip).limit(limitNum),
      Category.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      message: 'Categories retrieved successfully',
      count: categories.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single category by ID
// @route   GET /api/categories/:id
// @access  Private (Admin, Manager, Cashier)
const getCategoryById = async (req, res, next) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found', errors: ['Category not found'] });
    }

    res.status(200).json({ success: true, message: 'Category retrieved successfully', data: category });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new category
// @route   POST /api/categories
// @access  Private (Admin, Manager, Cashier)
const createCategory = async (req, res, next) => {
  try {
    // Whitelist fields — prevent mass assignment
    const { name, description } = req.body;

    const category = await Category.create({
      name,
      description,
      branchId: req.user.branchId || 'main',
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    res.status(201).json({ success: true, message: 'Category created successfully', data: category });
  } catch (error) {
    next(error);
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private (Admin, Manager, Cashier)
const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found', errors: ['Category not found'] });
    }

    // Whitelist updatable fields — prevent mass assignment
    category.updatedBy = req.user._id;
    if (req.body.name !== undefined) category.name = req.body.name;
    if (req.body.description !== undefined) category.description = req.body.description;

    await category.save();

    res.status(200).json({ success: true, message: 'Category updated successfully', data: category });
  } catch (error) {
    next(error);
  }
};

// @desc    Soft delete category
// @route   DELETE /api/categories/:id
// @access  Private (Admin, Manager, Cashier)
const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found', errors: ['Category not found'] });
    }

    category.isDeleted = true;
    category.deletedAt = new Date();
    category.updatedBy = req.user._id;
    await category.save();

    res.status(200).json({ success: true, message: 'Category deleted successfully', data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCategories, getCategoryById, createCategory, updateCategory, deleteCategory };
