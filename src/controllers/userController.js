const User = require('../models/User');
const { USER_ROLES } = require('../utils/constants');
const { parsePagination } = require('../utils/queryHelper');

// @desc    Create a new user (Manager creates Cashier, Admin creates Manager/Cashier)
// @route   POST /api/users
// @access  Private (Admin, Manager)
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, branchId } = req.body;
    const currentUserRole = req.user.role;

    // Manager role guardrails: Manager can ONLY create Cashiers
    if (currentUserRole === 'manager' && role && role !== 'cashier') {
      const message = 'Managers can only create Cashier accounts';
      return res.status(403).json({
        success: false,
        message,
        errors: [message],
      });
    }

    // Admin can create Manager or Cashier (or Admin if specified)
    if (currentUserRole === 'admin' && !['manager', 'cashier', 'admin'].includes(role)) {
      const message = 'Invalid user role specified';
      return res.status(400).json({
        success: false,
        message,
        errors: [message],
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      const message = 'User already exists with this email';
      return res.status(400).json({
        success: false,
        message,
        errors: [message],
      });
    }

    // Create user (password will be hashed by User model pre-save hook)
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'cashier',
      branchId: branchId || 'main',
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        isDisabled: user.isDisabled,
        createdBy: user.createdBy,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get users list (Admin sees all users, Manager sees Cashiers only)
// @route   GET /api/users
// @access  Private (Admin, Manager)
const getUsers = async (req, res, next) => {
  try {
    const currentUserRole = req.user.role;
    const { search } = req.query;
    const { pageNum, limitNum, skip } = parsePagination(req.query);
    let query = { isDeleted: { $ne: true } };

    if (currentUserRole === 'manager') {
      // Manager can view Cashiers only
      query.role = 'cashier';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      count: users.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private (Admin, Manager)
const getUserById = async (req, res, next) => {
  try {
    const currentUserRole = req.user.role;
    const user = await User.findOne({ _id: req.params.id, isDeleted: { $ne: true } }).select('-password');

    if (!user) {
      const message = 'User not found';
      return res.status(404).json({
        success: false,
        message,
        errors: [message],
      });
    }

    // Manager can only view Cashier profiles
    if (currentUserRole === 'manager' && user.role !== 'cashier') {
      const message = 'Managers can only view Cashier profiles';
      return res.status(403).json({
        success: false,
        message,
        errors: [message],
      });
    }

    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user details
// @route   PUT /api/users/:id
// @access  Private (Admin, Manager)
const updateUser = async (req, res, next) => {
  try {
    const currentUserRole = req.user.role;
    const targetUser = await User.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

    if (!targetUser) {
      const message = 'User not found';
      return res.status(404).json({
        success: false,
        message,
        errors: [message],
      });
    }

    // Manager can only update Cashiers and cannot edit Admins or Managers
    if (currentUserRole === 'manager') {
      if (targetUser.role !== 'cashier') {
        const message = 'Managers can only update Cashier accounts';
        return res.status(403).json({
          success: false,
          message,
          errors: [message],
        });
      }
      if (req.body.role && req.body.role !== 'cashier') {
        const message = 'Managers cannot change user role to Manager or Admin';
        return res.status(403).json({
          success: false,
          message,
          errors: [message],
        });
      }
    }

    // Update allowed fields
    const { name, email, role, branchId } = req.body;
    if (name) targetUser.name = name;
    if (email) targetUser.email = email;
    if (role) targetUser.role = role;
    if (branchId) targetUser.branchId = branchId;
    if (req.body.password) targetUser.password = req.body.password;
    targetUser.updatedBy = req.user._id;

    await targetUser.save();

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        branchId: targetUser.branchId,
        isDisabled: targetUser.isDisabled,
        updatedBy: targetUser.updatedBy,
        updatedAt: targetUser.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Disable/Enable user account
// @route   PATCH /api/users/:id/disable
// @access  Private (Admin only)
const disableUser = async (req, res, next) => {
  try {
    const targetUser = await User.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

    if (!targetUser) {
      const message = 'User not found';
      return res.status(404).json({
        success: false,
        message,
        errors: [message],
      });
    }

    if (req.body.isDisabled !== undefined) {
      targetUser.isDisabled = req.body.isDisabled;
    } else {
      targetUser.isDisabled = true;
    }
    targetUser.updatedBy = req.user._id;

    await targetUser.save();

    res.status(200).json({
      success: true,
      message: `User account ${targetUser.isDisabled ? 'disabled' : 'enabled'} successfully`,
      data: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        isDisabled: targetUser.isDisabled,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Soft delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin, Manager)
const deleteUser = async (req, res, next) => {
  try {
    const currentUserRole = req.user.role;
    const targetUser = await User.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

    if (!targetUser) {
      const message = 'User not found';
      return res.status(404).json({
        success: false,
        message,
        errors: [message],
      });
    }

    // Manager can only soft delete Cashier accounts
    if (currentUserRole === 'manager' && targetUser.role !== 'cashier') {
      const message = 'Managers can only delete Cashier accounts';
      return res.status(403).json({
        success: false,
        message,
        errors: [message],
      });
    }

    targetUser.isDeleted = true;
    targetUser.deletedAt = new Date();
    targetUser.updatedBy = req.user._id;

    await targetUser.save();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle user enable/disable status
// @route   PATCH /api/users/:id/status
// @access  Private (Admin only)
const toggleStatus = async (req, res, next) => {
  try {
    const targetUser = await User.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

    if (!targetUser) {
      const message = 'User not found';
      return res.status(404).json({
        success: false,
        message,
        errors: [message],
      });
    }

    if (req.body.isDisabled === undefined) {
      const message = 'isDisabled field is required';
      return res.status(400).json({
        success: false,
        message,
        errors: [message],
      });
    }

    targetUser.isDisabled = req.body.isDisabled;
    targetUser.updatedBy = req.user._id;

    await targetUser.save();

    res.status(200).json({
      success: true,
      message: `User account ${targetUser.isDisabled ? 'disabled' : 'enabled'} successfully`,
      data: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        isDisabled: targetUser.isDisabled,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin forces reset password for a user
// @route   PATCH /api/users/:id/reset-password
// @access  Private (Admin only)
const resetPasswordForUser = async (req, res, next) => {
  try {
    const targetUser = await User.findOne({ _id: req.params.id, isDeleted: { $ne: true } }).select('+password');

    if (!targetUser) {
      const message = 'User not found';
      return res.status(404).json({
        success: false,
        message,
        errors: [message],
      });
    }

    if (!req.body.password) {
      const message = 'New password is required';
      return res.status(400).json({
        success: false,
        message,
        errors: [message],
      });
    }

    targetUser.password = req.body.password;
    targetUser.updatedBy = req.user._id;

    await targetUser.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  disableUser,
  deleteUser,
  toggleStatus,
  resetPasswordForUser,
};

