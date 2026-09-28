const User = require('../models/User');
const Department = require('../models/Department');
const generateToken = require('../utils/generateToken');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../services/auditService');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public (or Super Admin / Dept Admin in enterprise context)
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, department, designation, phone, employeeId } = req.body;

    // Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 400, 'A user with this email address already exists.');
    }

    // Check if department exists if provided
    let departmentId = null;
    if (department) {
      const dept = await Department.findById(department);
      if (dept) {
        departmentId = dept._id;
      }
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || undefined,
      department: departmentId,
      designation: designation || 'Officer',
      phone: phone || '',
      employeeId: employeeId || null,
      isActive: true,
    });

    const populatedUser = await User.findById(user._id).populate('department');

    // Audit log
    await logAudit({
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: user._id,
      performedBy: user._id,
      changes: { email: user.email, role: user.role },
      req,
    });

    const token = generateToken(user._id, user.role);

    return successResponse(
      res,
      201,
      'User registered successfully.',
      {
        user: {
          _id: populatedUser._id,
          name: populatedUser.name,
          email: populatedUser.email,
          role: populatedUser.role,
          department: populatedUser.department,
          designation: populatedUser.designation,
          phone: populatedUser.phone,
          employeeId: populatedUser.employeeId,
        },
        token,
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, 400, 'Please provide both email and password.');
    }

    // Explicitly select password field as it is excluded by default
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password')
      .populate('department');

    if (!user) {
      return errorResponse(res, 401, 'Invalid email or password.');
    }

    if (!user.isActive) {
      return errorResponse(
        res,
        403,
        'Account is disabled. Please contact your system administrator.'
      );
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return errorResponse(res, 401, 'Invalid email or password.');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate JWT
    const token = generateToken(user._id, user.role);

    // Audit log
    await logAudit({
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user._id,
      performedBy: user._id,
      changes: { email: user.email, role: user.role },
      req,
    });

    return successResponse(
      res,
      200,
      'Authentication successful.',
      {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          designation: user.designation,
          phone: user.phone,
          employeeId: user.employeeId,
          lastLogin: user.lastLogin,
        },
        token,
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get currently authenticated user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('department');

    return successResponse(res, 200, 'Profile retrieved successfully.', {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        designation: user.designation,
        phone: user.phone,
        employeeId: user.employeeId,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
};
