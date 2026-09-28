const mongoose = require('mongoose');
const Issue = require('../models/Issue');
const Asset = require('../models/Asset');
const Alert = require('../models/Alert');
const { recordLifecycleEvent } = require('../services/lifecycleService');
const { logAudit } = require('../services/auditService');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { LIFECYCLE_EVENTS } = require('../utils/constants');

/**
 * @desc    Get all issues with filters, search, pagination
 * @route   GET /api/issues
 * @access  Private
 */
const getIssues = async (req, res, next) => {
  try {
    const {
      assetId,
      severity,
      status,
      issueType,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = {};

    if (severity) query.severity = severity;
    if (status) query.status = status;
    if (issueType) query.issueType = issueType;

    if (assetId) {
      if (mongoose.Types.ObjectId.isValid(assetId)) {
        query.asset = assetId;
      } else {
        const foundAsset = await Asset.findOne({ assetId: assetId.toUpperCase() });
        if (foundAsset) query.asset = foundAsset._id;
      }
    }

    if (search) {
      query.$or = [
        { issueId: { $regex: search, $options: 'i' } },
        { issueCode: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [issues, total] = await Promise.all([
      Issue.find(query)
        .populate('asset', 'assetId name category assetType location condition healthScore')
        .populate('reportedBy', 'name email designation role')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Issue.countDocuments(query),
    ]);

    return successResponse(res, 200, 'Issues retrieved successfully.', issues, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single issue by ID
 * @route   GET /api/issues/:id
 * @access  Private
 */
const getIssueById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id) && id.length === 24;
    const filter = isObjectId ? { _id: id } : { $or: [{ issueId: id.toUpperCase() }, { issueCode: id.toUpperCase() }] };

    const issue = await Issue.findOne(filter)
      .populate('asset')
      .populate('reportedBy', 'name email designation role');

    if (!issue) {
      return errorResponse(res, 404, 'Issue record not found.');
    }

    return successResponse(res, 200, 'Issue details retrieved.', issue);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new issue for an asset
 * @route   POST /api/issues
 * @access  Private
 */
const createIssue = async (req, res, next) => {
  try {
    const {
      asset: assetParam,
      title,
      description = '',
      issueType = 'STRUCTURAL',
      severity = 'MEDIUM',
      photos = [],
      locationDetails = '',
      status = 'REPORTED',
    } = req.body;

    if (!assetParam || !title) {
      return errorResponse(res, 400, 'Target asset and issue title are required.');
    }

    // Resolve Asset
    const isObjectId = mongoose.Types.ObjectId.isValid(assetParam) && assetParam.length === 24;
    const asset = await Asset.findOne(
      isObjectId ? { _id: assetParam } : { assetId: assetParam.toUpperCase() }
    );

    if (!asset) {
      return errorResponse(res, 404, 'Target asset not found in State Registry.');
    }

    const year = new Date().getFullYear();
    const count = await Issue.countDocuments();
    const issueId = `ISS-${year}-${String(count + 1).padStart(4, '0')}`;

    const issue = await Issue.create({
      issueId,
      issueCode: issueId,
      asset: asset._id,
      title: title.trim(),
      description: description.trim(),
      issueType,
      severity,
      reportedBy: req.user._id,
      reportedDate: new Date(),
      photos: Array.isArray(photos) ? photos : [],
      locationDetails,
      status,
    });

    // 1. Record LifecycleEvent: ISSUE_REPORTED
    await recordLifecycleEvent({
      eventType: LIFECYCLE_EVENTS.ISSUE_REPORTED,
      assetId: asset._id,
      performedBy: req.user._id,
      description: `New ${severity} severity issue ${issueId} reported: "${title}".`,
      metadata: {
        issueId,
        title,
        severity,
        issueType,
      },
    });

    // 2. Log AuditLog
    await logAudit({
      action: 'ISSUE_REPORTED',
      entityType: 'Issue',
      entityId: issue._id,
      performedBy: req.user._id,
      changes: {
        assetId: asset.assetId,
        issueId,
        title,
        severity,
      },
      req,
    });

    // 3. Create Alert if severity is HIGH or CRITICAL
    if (severity === 'HIGH' || severity === 'CRITICAL') {
      await Alert.create({
        type: 'DEFECT_REPORTED',
        severity: severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        title: `${severity} Defect: ${asset.name} (${asset.assetId})`,
        description: `Issue ${issueId} reported: ${title}. ${description || 'Immediate engineering assessment requested.'}`,
        asset: asset._id,
        read: false,
        resolved: false,
      });
    }

    const populatedIssue = await Issue.findById(issue._id)
      .populate('asset', 'assetId name category condition healthScore')
      .populate('reportedBy', 'name designation');

    return successResponse(res, 201, 'Issue reported and recorded in lifecycle stream.', populatedIssue);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update existing issue (status, resolution, severity)
 * @route   PUT /api/issues/:id
 * @access  Private
 */
const updateIssue = async (req, res, next) => {
  try {
    const { id } = req.params;
    const issue = await Issue.findById(id);

    if (!issue) {
      return errorResponse(res, 404, 'Issue not found.');
    }

    const previousStatus = issue.status;
    const { status, resolution, severity, description, photos, issueType } = req.body;

    if (severity) issue.severity = severity;
    if (description !== undefined) issue.description = description;
    if (photos !== undefined) issue.photos = photos;
    if (issueType) issue.issueType = issueType;
    if (resolution !== undefined) issue.resolution = resolution;

    if (status && status !== previousStatus) {
      issue.status = status;
      if (status === 'RESOLVED') {
        issue.resolvedDate = new Date();
        issue.resolvedAt = new Date();
      }

      // Record LifecycleEvent on status change
      await recordLifecycleEvent({
        eventType: 'ISSUE_REPORTED',
        assetId: issue.asset,
        performedBy: req.user._id,
        description: `Issue ${issue.issueId} transition: ${previousStatus} → ${status}. ${resolution ? `Resolution: ${resolution}` : ''}`,
        metadata: {
          issueId: issue.issueId,
          previousStatus,
          newStatus: status,
          resolution,
        },
      });

      // AuditLog
      await logAudit({
        action: 'ISSUE_UPDATED',
        entityType: 'Issue',
        entityId: issue._id,
        performedBy: req.user._id,
        changes: { previousStatus, newStatus: status, resolution },
        req,
      });
    }

    await issue.save();

    const updated = await Issue.findById(issue._id)
      .populate('asset', 'assetId name category')
      .populate('reportedBy', 'name designation');

    return successResponse(res, 200, 'Issue updated successfully.', updated);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getIssues,
  getIssueById,
  createIssue,
  updateIssue,
};
