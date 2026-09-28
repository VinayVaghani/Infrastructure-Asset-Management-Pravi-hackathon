const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// All audit routes require authentication
router.use(protect);

/**
 * @desc    Get system-wide audit logs with rich filters (User, Action, Entity, Date range)
 * @route   GET /api/audit-logs
 * @access  Private
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      action,
      entity,
      entityType,
      user,
      userId,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 25,
    } = req.query;

    const query = {};

    if (action) {
      query.action = new RegExp(`^${action}$`, 'i');
    }

    const targetEntity = entityType || entity;
    if (targetEntity) {
      query.entityType = new RegExp(`^${targetEntity}$`, 'i');
    }

    if (userId) {
      query.performedBy = userId;
    } else if (user) {
      if (mongoose.Types.ObjectId.isValid(user)) {
        query.performedBy = user;
      } else {
        const matchingUsers = await User.find({
          $or: [
            { name: new RegExp(user, 'i') },
            { email: new RegExp(user, 'i') },
          ],
        }).select('_id');
        query.performedBy = { $in: matchingUsers.map((u) => u._id) };
      }
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { action: regex },
        { entityType: regex },
        { ipAddress: regex },
      ];
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('performedBy', 'name email designation role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    // Format logs with user, oldValue, newValue for frontend ease
    const formattedLogs = logs.map((log) => ({
      ...log,
      user: log.performedBy,
      oldValue: log.changes?.before || null,
      newValue: log.changes?.after || null,
    }));

    return successResponse(res, 200, 'Audit logs retrieved.', formattedLogs, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Reject deletion of audit records (Legally immutable)
 * @route   DELETE /api/audit-logs/:id
 * @access  Private (Rejects all)
 */
router.delete('/:id', (req, res) => {
  return errorResponse(
    res,
    403,
    'Audit logs are legally immutable state records and cannot be deleted or purged.'
  );
});

module.exports = router;
