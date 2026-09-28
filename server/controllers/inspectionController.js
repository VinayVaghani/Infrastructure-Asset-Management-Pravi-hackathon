const mongoose = require('mongoose');
const Inspection = require('../models/Inspection');
const Asset = require('../models/Asset');
const Alert = require('../models/Alert');
const User = require('../models/User');
const { calculateHealthScore } = require('../services/scoringService');
const { recordLifecycleEvent } = require('../services/lifecycleService');
const { logAudit } = require('../services/auditService');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { LIFECYCLE_EVENTS } = require('../utils/constants');

/**
 * @desc    Get all inspections with filtering, pagination & sorting
 * @route   GET /api/inspections
 * @access  Private
 */
const getInspections = async (req, res, next) => {
  try {
    const {
      assetId,
      condition,
      status,
      inspector,
      search,
      page = 1,
      limit = 15,
      sortBy = 'conductedDate',
      sortOrder = 'desc',
    } = req.query;

    const query = {};

    if (condition) query.overallCondition = condition;
    if (status) query.status = status;
    if (inspector) query.inspector = inspector;

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
        { inspectionNumber: { $regex: search, $options: 'i' } },
        { observations: { $regex: search, $options: 'i' } },
        { remarks: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy || 'createdAt'] = sortOrder === 'asc' ? 1 : -1;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [inspections, total] = await Promise.all([
      Inspection.find(query)
        .populate('asset', 'assetId name category assetType location condition healthScore')
        .populate('inspector', 'name email designation role')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Inspection.countDocuments(query),
    ]);

    return successResponse(res, 200, 'Inspections retrieved successfully.', inspections, {
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
 * @desc    Get single inspection by ID or number
 * @route   GET /api/inspections/:id
 * @access  Private
 */
const getInspectionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id) && id.length === 24;
    const filter = isObjectId ? { _id: id } : { inspectionNumber: id.toUpperCase() };

    const inspection = await Inspection.findOne(filter)
      .populate('asset')
      .populate('inspector', 'name email designation phone role');

    if (!inspection) {
      return errorResponse(res, 404, `Inspection not found with ID '${id}'.`);
    }

    return successResponse(res, 200, 'Inspection details retrieved.', inspection);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit new inspection and execute automated condition scoring
 * @route   POST /api/inspections
 * @access  Private (SUPER_ADMIN, DEPARTMENT_ADMIN, ENGINEER, INSPECTOR)
 */
const createInspection = async (req, res, next) => {
  try {
    const {
      asset: assetParam,
      inspectionDate,
      inspector: inspectorParam,
      structuralCondition = 'GOOD',
      surfaceCondition = 'GOOD',
      safetyCondition = 'GOOD',
      operationalCondition = 'GOOD',
      observations = '',
      defects = [],
      recommendations = '',
      photos = [],
      checklist = [],
      nextInspectionDate: customNextDate,
      scheduledDate,
      status = 'COMPLETED',
    } = req.body;

    if (!assetParam) {
      return errorResponse(res, 400, 'Target asset is required.');
    }

    // Resolve Asset
    const isObjectId = mongoose.Types.ObjectId.isValid(assetParam) && assetParam.length === 24;
    const asset = await Asset.findOne(
      isObjectId ? { _id: assetParam } : { assetId: assetParam.toUpperCase() }
    );

    if (!asset) {
      return errorResponse(res, 404, 'Specified asset does not exist in State Registry.');
    }

    // Generate unique inspection number
    const year = new Date().getFullYear();
    const count = await Inspection.countDocuments();
    const inspectionNumber = `INSP-${year}-${String(count + 1).padStart(4, '0')}`;

    // Compute Health Score & Overall Condition using scoringService
    const scoringResult = calculateHealthScore({
      structuralCondition,
      surfaceCondition,
      safetyCondition,
      operationalCondition,
      installationDate: asset.installationDate,
      expectedLifeYears: asset.expectedLifeYears,
    });

    const conductedDate = inspectionDate ? new Date(inspectionDate) : new Date();

    // Default next inspection date based on condition if not provided
    let nextInspection = customNextDate ? new Date(customNextDate) : null;
    if (!nextInspection) {
      const monthsToAdd =
        scoringResult.overallCondition === 'CRITICAL'
          ? 1
          : scoringResult.overallCondition === 'POOR'
          ? 3
          : scoringResult.overallCondition === 'MODERATE'
          ? 6
          : 12;
      nextInspection = new Date(conductedDate);
      nextInspection.setMonth(nextInspection.getMonth() + monthsToAdd);
    }

    const inspection = await Inspection.create({
      inspectionNumber,
      asset: asset._id,
      inspector: inspectorParam || req.user._id,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : conductedDate,
      conductedDate,
      status,
      structuralCondition,
      surfaceCondition,
      safetyCondition,
      operationalCondition,
      overallCondition: scoringResult.overallCondition,
      score: scoringResult.healthScore,
      conditionScores: {
        ...scoringResult.breakdown,
        finalScore: scoringResult.healthScore,
      },
      observations,
      defects: Array.isArray(defects) ? defects : defects ? [defects] : [],
      recommendations,
      photos: Array.isArray(photos) ? photos : [],
      checklist: Array.isArray(checklist) ? checklist : [],
      remarks: observations,
      nextInspectionDate: nextInspection,
    });

    // 1. Update Asset condition, health score, and inspection dates
    const previousCondition = asset.condition;
    const previousScore = asset.healthScore;
    asset.condition = scoringResult.overallCondition;
    asset.healthScore = scoringResult.healthScore;
    asset.nextInspectionDate = nextInspection;
    asset.lastInspectionDate = conductedDate;
    await asset.save();

    // 2. Create INSPECTION_COMPLETED Lifecycle Event
    await recordLifecycleEvent({
      eventType: LIFECYCLE_EVENTS.INSPECTION_COMPLETED,
      assetId: asset._id,
      performedBy: req.user._id,
      description: `Comprehensive inspection ${inspectionNumber} completed. Health score evaluated at ${scoringResult.healthScore}% (${scoringResult.overallCondition}).`,
      metadata: {
        inspectionNumber,
        previousCondition,
        newCondition: scoringResult.overallCondition,
        healthScore: scoringResult.healthScore,
        breakdown: scoringResult.breakdown,
        recommendations,
      },
    });

    // 3. Create AuditLog
    await logAudit({
      action: 'INSPECTION_SUBMITTED',
      entityType: 'Inspection',
      entityId: inspection._id,
      performedBy: req.user._id,
      changes: {
        assetId: asset.assetId,
        score: scoringResult.healthScore,
        condition: scoringResult.overallCondition,
        previousScore,
      },
      req,
    });

    // 4. If condition is POOR or CRITICAL, generate an Alert!
    let generatedAlert = null;
    if (scoringResult.overallCondition === 'POOR' || scoringResult.overallCondition === 'CRITICAL') {
      generatedAlert = await Alert.create({
        type: scoringResult.overallCondition === 'CRITICAL' ? 'CRITICAL_CONDITION' : 'POOR_CONDITION',
        severity: scoringResult.overallCondition === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        title: `${scoringResult.overallCondition} Degradation: ${asset.name} (${asset.assetId})`,
        description: `Inspection ${inspectionNumber} identified health score dropped to ${scoringResult.healthScore}%. ${observations || recommendations || 'Immediate structural mitigation required.'}`,
        asset: asset._id,
        read: false,
        resolved: false,
      });
    }

    const populatedInspection = await Inspection.findById(inspection._id)
      .populate('asset', 'assetId name category assetType location condition healthScore')
      .populate('inspector', 'name email designation');

    return successResponse(res, 201, 'Inspection conducted and condition scored successfully.', {
      inspection: populatedInspection,
      scoring: scoringResult,
      alertGenerated: Boolean(generatedAlert),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update existing inspection
 * @route   PUT /api/inspections/:id
 * @access  Private (SUPER_ADMIN, DEPARTMENT_ADMIN, ENGINEER, INSPECTOR)
 */
const updateInspection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const inspection = await Inspection.findById(id);

    if (!inspection) {
      return errorResponse(res, 404, 'Inspection not found.');
    }

    const updatable = ['observations', 'defects', 'recommendations', 'photos', 'checklist', 'remarks', 'nextInspectionDate'];
    updatable.forEach((f) => {
      if (req.body[f] !== undefined) inspection[f] = req.body[f];
    });

    await inspection.save();
    const updated = await Inspection.findById(inspection._id)
      .populate('asset', 'assetId name category')
      .populate('inspector', 'name designation');

    return successResponse(res, 200, 'Inspection updated successfully.', updated);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInspections,
  getInspectionById,
  createInspection,
  updateInspection,
};
