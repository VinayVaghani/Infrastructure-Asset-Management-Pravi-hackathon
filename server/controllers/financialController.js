const mongoose = require('mongoose');
const FinancialRecord = require('../models/FinancialRecord');
const Asset = require('../models/Asset');
const Project = require('../models/Project');
const { logAudit } = require('../services/auditService');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * @desc    Get all financial transaction records with filtering & pagination
 * @route   GET /api/financials
 * @access  Private (FINANCE_OFFICER, SUPER_ADMIN, DEPARTMENT_ADMIN, AUDITOR)
 */
const getFinancialRecords = async (req, res, next) => {
  try {
    const {
      assetId,
      projectId,
      type,
      status,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 30,
    } = req.query;

    const query = {};

    if (assetId) {
      if (mongoose.Types.ObjectId.isValid(assetId)) {
        query.asset = assetId;
      } else {
        const found = await Asset.findOne({ assetId: assetId.toUpperCase() });
        if (found) query.asset = found._id;
      }
    }

    if (projectId) {
      if (mongoose.Types.ObjectId.isValid(projectId)) {
        query.project = projectId;
      } else {
        const found = await Project.findOne({ projectId: projectId.toUpperCase() });
        if (found) query.project = found._id;
      }
    }

    if (type) query.type = type.toUpperCase();
    if (status) query.status = status.toUpperCase();

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { recordId: regex },
        { referenceNumber: regex },
        { invoiceNumber: regex },
        { description: regex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [records, total] = await Promise.all([
      FinancialRecord.find(query)
        .populate('asset', 'assetId name category totalLifecycleCost')
        .populate('project', 'projectId projectName')
        .populate('workOrder', 'workOrderId title')
        .populate('approvedBy', 'name email designation role')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limitNum),
      FinancialRecord.countDocuments(query),
    ]);

    return successResponse(res, 200, 'Financial transactions retrieved successfully.', records, {
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
 * @desc    Get aggregated financial summary and cost breakdown
 * @route   GET /api/financials/summary
 * @access  Private
 */
const getFinancialSummary = async (req, res, next) => {
  try {
    const { assetId, projectId } = req.query;
    const matchFilter = {};

    if (assetId) {
      if (mongoose.Types.ObjectId.isValid(assetId)) {
        matchFilter.asset = new mongoose.Types.ObjectId(assetId);
      } else {
        const found = await Asset.findOne({ assetId: assetId.toUpperCase() });
        if (found) matchFilter.asset = found._id;
      }
    }

    if (projectId) {
      if (mongoose.Types.ObjectId.isValid(projectId)) {
        matchFilter.project = new mongoose.Types.ObjectId(projectId);
      } else {
        const found = await Project.findOne({ projectId: projectId.toUpperCase() });
        if (found) matchFilter.project = found._id;
      }
    }

    const aggregation = await FinancialRecord.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const breakdown = {
      ACQUISITION: 0,
      CONSTRUCTION: 0,
      MAINTENANCE: 0,
      REPAIR: 0,
      OPERATION: 0,
      DISPOSAL: 0,
    };

    let totalLifecycleCost = 0;

    aggregation.forEach((item) => {
      const typeKey = item._id ? item._id.toUpperCase() : 'MAINTENANCE';
      if (breakdown[typeKey] !== undefined) {
        breakdown[typeKey] += item.totalAmount;
      } else if (typeKey === 'CAPEX') {
        breakdown.CONSTRUCTION += item.totalAmount;
      } else if (typeKey === 'OPEX') {
        breakdown.OPERATION += item.totalAmount;
      }
      totalLifecycleCost += item.totalAmount;
    });

    // If an asset was specified, also factor baseline acquisition cost
    if (assetId && matchFilter.asset) {
      const targetAsset = await Asset.findById(matchFilter.asset);
      if (targetAsset) {
        if (breakdown.ACQUISITION === 0 && targetAsset.acquisitionCost > 0) {
          breakdown.ACQUISITION = targetAsset.acquisitionCost;
        }
        totalLifecycleCost = Math.max(totalLifecycleCost, targetAsset.totalLifecycleCost || 0);
      }
    }

    const responseBreakdown = {
      acquisitionCost: breakdown.ACQUISITION,
      constructionCost: breakdown.CONSTRUCTION,
      maintenanceCost: breakdown.MAINTENANCE,
      repairCost: breakdown.REPAIR,
      operationCost: breakdown.OPERATION,
      disposalCost: breakdown.DISPOSAL,
      totalLifecycleCost,
    };

    return successResponse(res, 200, 'Financial lifecycle summary computed.', {
      breakdown: responseBreakdown,
      summary: responseBreakdown,
      totalLifecycleCost,
      transactionCount: aggregation.reduce((acc, curr) => acc + curr.count, 0),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Record new financial transaction
 * @route   POST /api/financials
 * @access  Private (FINANCE_OFFICER, SUPER_ADMIN, DEPARTMENT_ADMIN)
 */
const createFinancialRecord = async (req, res, next) => {
  try {
    const {
      asset: assetParam,
      project: projectParam,
      workOrder: workOrderParam,
      type = 'MAINTENANCE',
      amount,
      date = new Date(),
      description = '',
      referenceNumber = '',
      invoiceNumber,
      status = 'APPROVED',
    } = req.body;

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return errorResponse(res, 400, 'A valid transaction amount greater than 0 is required.');
    }

    // Resolve Asset
    let resolvedAsset = null;
    if (assetParam) {
      resolvedAsset = await Asset.findOne(
        mongoose.Types.ObjectId.isValid(assetParam)
          ? { _id: assetParam }
          : { assetId: assetParam.toUpperCase() }
      );
    }

    // Resolve Project
    let resolvedProject = null;
    if (projectParam) {
      resolvedProject = await Project.findOne(
        mongoose.Types.ObjectId.isValid(projectParam)
          ? { _id: projectParam }
          : { projectId: projectParam.toUpperCase() }
      );
    }

    const year = new Date().getFullYear();
    const count = await FinancialRecord.countDocuments();
    const recordId = `FIN-${year}-${String(count + 1).padStart(5, '0')}`;
    const ref = referenceNumber || invoiceNumber || `VCH-${year}-${String(count + 1).padStart(4, '0')}`;

    const record = await FinancialRecord.create({
      recordId,
      asset: resolvedAsset ? resolvedAsset._id : null,
      project: resolvedProject ? resolvedProject._id : null,
      workOrder: workOrderParam || null,
      type: type.toUpperCase(),
      category: type.toUpperCase(),
      amount: Number(amount),
      actualCost: Number(amount),
      date: new Date(date),
      transactionDate: new Date(date),
      description: description.trim(),
      referenceNumber: ref.trim(),
      invoiceNumber: ref.trim(),
      approvedBy: req.user._id,
      status,
    });

    // If linked to Asset and type is MAINTENANCE or REPAIR, update Asset totalMaintenanceCost
    if (resolvedAsset && ['MAINTENANCE', 'REPAIR'].includes(type.toUpperCase())) {
      resolvedAsset.totalMaintenanceCost = (resolvedAsset.totalMaintenanceCost || 0) + Number(amount);
      resolvedAsset.totalLifecycleCost = (resolvedAsset.acquisitionCost || 0) + resolvedAsset.totalMaintenanceCost;
      await resolvedAsset.save();
    }

    // Audit log
    await logAudit({
      action: 'FINANCIAL_TRANSACTION_RECORDED',
      entityType: 'FinancialRecord',
      entityId: record._id,
      performedBy: req.user._id,
      changes: {
        after: {
          recordId: record.recordId,
          type: record.type,
          amount: record.amount,
          assetId: resolvedAsset?.assetId,
        },
      },
      req,
    });

    const populated = await FinancialRecord.findById(record._id)
      .populate('asset', 'assetId name category')
      .populate('project', 'projectId projectName')
      .populate('approvedBy', 'name email designation role');

    return successResponse(res, 201, 'Financial transaction posted to State Ledger.', populated);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFinancialRecords,
  getFinancialSummary,
  createFinancialRecord,
};
