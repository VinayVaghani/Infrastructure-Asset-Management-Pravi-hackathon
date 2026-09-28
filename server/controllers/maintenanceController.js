const mongoose = require('mongoose');
const MaintenanceRecord = require('../models/MaintenanceRecord');
const Asset = require('../models/Asset');
const Issue = require('../models/Issue');
const WorkOrder = require('../models/WorkOrder');
const Contractor = require('../models/Contractor');
const { recordLifecycleEvent } = require('../services/lifecycleService');
const { logAudit } = require('../services/auditService');
const { recordFinancialTransaction } = require('../services/financialService');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { LIFECYCLE_EVENTS } = require('../utils/constants');

/**
 * @desc    Get all maintenance records with filtering and pagination
 * @route   GET /api/maintenance
 * @access  Private
 */
const getMaintenanceRecords = async (req, res, next) => {
  try {
    const {
      status,
      type,
      assetId,
      contractorId,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (type) query.type = type;
    if (contractorId) query.contractor = contractorId;

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
        { maintenanceId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [records, total] = await Promise.all([
      MaintenanceRecord.find(query)
        .populate('asset', 'assetId name category condition healthScore location')
        .populate('issue', 'issueId title severity status')
        .populate('workOrder', 'workOrderId orderNumber title status priority')
        .populate('contractor', 'companyName company contactPerson phone registrationNumber')
        .populate('performedBy', 'name designation')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      MaintenanceRecord.countDocuments(query),
    ]);

    return successResponse(res, 200, 'Maintenance records retrieved.', records, {
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
 * @desc    Get single maintenance record by ID
 * @route   GET /api/maintenance/:id
 * @access  Private
 */
const getMaintenanceRecordById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id) && id.length === 24;
    const filter = isObjectId ? { _id: id } : { maintenanceId: id.toUpperCase() };

    const record = await MaintenanceRecord.findOne(filter)
      .populate('asset')
      .populate('issue')
      .populate('workOrder')
      .populate('contractor')
      .populate('performedBy', 'name email designation role');

    if (!record) {
      return errorResponse(res, 404, 'Maintenance record not found.');
    }

    return successResponse(res, 200, 'Maintenance details retrieved.', record);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new maintenance record / recommendation
 * @route   POST /api/maintenance
 * @access  Private
 */
const createMaintenanceRecord = async (req, res, next) => {
  try {
    const {
      asset: assetParam,
      issue: issueParam,
      type = 'ROUTINE',
      description,
      estimatedCost = 0,
      actualCost = 0,
      startDate = new Date(),
      completionDate,
      contractor: contractorParam,
      status = 'PLANNED',
      documents = [],
      notes = '',
    } = req.body;

    if (!assetParam || !description) {
      return errorResponse(res, 400, 'Target asset and maintenance description are required.');
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
    const count = await MaintenanceRecord.countDocuments();
    const maintenanceId = `MN-${year}-${String(count + 1).padStart(4, '0')}`;

    // Resolve Contractor
    let contractorId = null;
    if (contractorParam) {
      if (mongoose.Types.ObjectId.isValid(contractorParam)) {
        contractorId = contractorParam;
      } else {
        const found = await Contractor.findOne({ registrationNumber: contractorParam.toUpperCase() });
        if (found) contractorId = found._id;
      }
    }

    const record = await MaintenanceRecord.create({
      maintenanceId,
      asset: asset._id,
      issue: issueParam || null,
      type,
      description: description.trim(),
      estimatedCost: Number(estimatedCost) || 0,
      actualCost: Number(actualCost) || 0,
      cost: Number(actualCost) || Number(estimatedCost) || 0,
      startDate: startDate ? new Date(startDate) : new Date(),
      completionDate: completionDate ? new Date(completionDate) : null,
      contractor: contractorId,
      performedBy: req.user._id,
      status,
      documents: Array.isArray(documents) ? documents : [],
      notes,
    });

    // 1. Record LifecycleEvent: MAINTENANCE_RECOMMENDED or MAINTENANCE_STARTED
    const eventType = status === 'IN_PROGRESS' ? LIFECYCLE_EVENTS.MAINTENANCE_STARTED : LIFECYCLE_EVENTS.MAINTENANCE_RECOMMENDED;
    await recordLifecycleEvent({
      eventType,
      assetId: asset._id,
      performedBy: req.user._id,
      description: `Maintenance action ${maintenanceId} (${type}) logged: "${description}".`,
      metadata: {
        maintenanceId,
        type,
        estimatedCost,
        status,
      },
    });

    // 2. Log AuditLog
    await logAudit({
      action: 'MAINTENANCE_LOGGED',
      entityType: 'MaintenanceRecord',
      entityId: record._id,
      performedBy: req.user._id,
      changes: { maintenanceId, type, assetId: asset.assetId, estimatedCost },
      req,
    });

    const populated = await MaintenanceRecord.findById(record._id)
      .populate('asset', 'assetId name category')
      .populate('contractor', 'companyName contactPerson phone');

    return successResponse(res, 201, 'Maintenance action registered successfully.', populated);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update maintenance record
 * @route   PUT /api/maintenance/:id
 * @access  Private
 */
const updateMaintenanceRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const record = await MaintenanceRecord.findById(id).populate('asset');

    if (!record) {
      return errorResponse(res, 404, 'Maintenance record not found.');
    }

    const previousStatus = record.status;
    const {
      status,
      actualCost,
      estimatedCost,
      completionDate,
      contractor,
      documents,
      notes,
      type,
      description,
    } = req.body;

    if (actualCost !== undefined) {
      record.actualCost = Number(actualCost);
      record.cost = Number(actualCost);
    }
    if (estimatedCost !== undefined) record.estimatedCost = Number(estimatedCost);
    if (completionDate !== undefined) record.completionDate = new Date(completionDate);
    if (contractor !== undefined) record.contractor = contractor;
    if (documents !== undefined) record.documents = documents;
    if (notes !== undefined) record.notes = notes;
    if (type !== undefined) record.type = type;
    if (description !== undefined) record.description = description;

    if (status && status !== previousStatus) {
      record.status = status;

      let eventType = LIFECYCLE_EVENTS.MAINTENANCE_STARTED;
      if (status === 'COMPLETED') {
        eventType = LIFECYCLE_EVENTS.MAINTENANCE_COMPLETED;
        record.completionDate = record.completionDate || new Date();

        // Financial integration if completed with actualCost
        const finalCost = Number(record.actualCost) || Number(record.cost) || 0;
        if (finalCost > 0 && record.asset) {
          await recordFinancialTransaction({
            assetId: record.asset._id || record.asset,
            maintenanceRecordId: record._id,
            type: 'MAINTENANCE',
            category: 'MAINTENANCE',
            amount: finalCost,
            estimatedCost: record.estimatedCost,
            actualCost: finalCost,
            description: `Expenditure for Maintenance ${record.maintenanceId}: ${record.description}`,
            approvedBy: req.user._id,
          });
        }
      }

      if (record.asset) {
        await recordLifecycleEvent({
          eventType,
          assetId: record.asset._id || record.asset,
          performedBy: req.user._id,
          description: `Maintenance ${record.maintenanceId} status changed: ${previousStatus} → ${status}.`,
          metadata: {
            maintenanceId: record.maintenanceId,
            previousStatus,
            newStatus: status,
            actualCost: record.actualCost,
          },
        });
      }

      await logAudit({
        action: 'MAINTENANCE_STATUS_CHANGED',
        entityType: 'MaintenanceRecord',
        entityId: record._id,
        performedBy: req.user._id,
        changes: { previousStatus, newStatus: status, actualCost: record.actualCost },
        req,
      });
    }

    await record.save();

    const updated = await MaintenanceRecord.findById(record._id)
      .populate('asset', 'assetId name category')
      .populate('contractor', 'companyName contactPerson phone')
      .populate('issue', 'issueId title');

    return successResponse(res, 200, 'Maintenance record updated.', updated);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMaintenanceRecords,
  getMaintenanceRecordById,
  createMaintenanceRecord,
  updateMaintenanceRecord,
};
