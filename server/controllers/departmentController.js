const Department = require('../models/Department');
const User = require('../models/User');
const { successResponse } = require('../utils/apiResponse');

/**
 * @desc    Get all active government departments
 * @route   GET /api/departments
 * @access  Private
 */
const getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find({ isActive: true })
      .populate('headOfDepartment', 'name email designation')
      .sort({ code: 1 });
    return successResponse(res, 200, 'Departments retrieved.', departments);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get list of officers/custodians for dropdown assignment
 * @route   GET /api/users/officers
 * @access  Private
 */
const getOfficers = async (req, res, next) => {
  try {
    const users = await User.find({ isActive: true })
      .select('name email designation role department employeeId')
      .populate('department', 'code name')
      .sort({ name: 1 });
    return successResponse(res, 200, 'Officers retrieved.', users);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDepartments,
  getOfficers,
};
