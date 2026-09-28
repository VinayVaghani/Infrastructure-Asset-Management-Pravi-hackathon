const mongoose = require('mongoose');
const Asset = require('../models/Asset');
const LifecycleEvent = require('../models/LifecycleEvent');
const Inspection = require('../models/Inspection');
const MaintenanceRecord = require('../models/MaintenanceRecord');
const WorkOrder = require('../models/WorkOrder');
const Document = require('../models/Document');
const FinancialRecord = require('../models/FinancialRecord');
const Issue = require('../models/Issue');
const AuditLog = require('../models/AuditLog');
const Department = require('../models/Department');
const User = require('../models/User');

const { successResponse, errorResponse } = require('../utils/apiResponse');
const { recordLifecycleEvent } = require('../services/lifecycleService');
const { logAudit } = require('../services/auditService');
const { LIFECYCLE_EVENTS, ROLES, ASSET_STATUS } = require('../utils/constants');

/**
 * Helper to resolve Asset by ObjectId or unique assetId string
 */
const resolveAssetId = async (idOrCode) => {
  if (!idOrCode) return null;
  const isObjectId = mongoose.Types.ObjectId.isValid(idOrCode) && idOrCode.length === 24;
  const filter = isObjectId ? { _id: idOrCode } : { assetId: idOrCode.toUpperCase() };
  return await Asset.findOne(filter);
};

/**
 * @desc    Get all assets with comprehensive filtering, search, sorting & pagination
 * @route   GET /api/assets
 * @access  Private
 */
const getAssets = async (req, res, next) => {
  try {
    const {
      category,
      assetType,
      status,
      condition,
      department,
      district,
      minHealthScore,
      maxHealthScore,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    if (category) query.category = category;
    if (assetType) query.assetType = assetType;
    if (status) query.status = status;
    if (condition) query.condition = condition;
    if (department) {
      if (mongoose.Types.ObjectId.isValid(department)) {
        query.department = department;
      } else {
        // Find department by code
        const dept = await Department.findOne({ code: department.toUpperCase() });
        if (dept) query.department = dept._id;
      }
    }
    if (district) {
      query['location.district'] = { $regex: district, $options: 'i' };
    }

    if (minHealthScore !== undefined || maxHealthScore !== undefined) {
      query.healthScore = {};
      if (minHealthScore !== undefined) query.healthScore.$gte = Number(minHealthScore);
      if (maxHealthScore !== undefined) query.healthScore.$lte = Number(maxHealthScore);
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { assetId: { $regex: search, $options: 'i' } },
        { 'location.city': { $regex: search, $options: 'i' } },
        { 'location.district': { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } },
      ];
    }

    const sortOptions = {};
    const validSortFields = ['createdAt', 'name', 'assetId', 'healthScore', 'acquisitionCost', 'totalLifecycleCost', 'condition', 'status'];
    const field = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    sortOptions[field] = sortOrder === 'asc' ? 1 : -1;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [assets, total] = await Promise.all([
      Asset.find(query)
        .populate('department', 'name code state district')
        .populate('custodian', 'name email designation phone')
        .populate('parentAsset', 'assetId name')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Asset.countDocuments(query),
    ]);

    // Attach latest inspection info for each asset
    const assetIds = assets.map((a) => a._id);
    const inspections = await Inspection.find({ asset: { $in: assetIds } })
      .sort({ conductedDate: -1, scheduledDate: -1 })
      .lean();

    const inspectionMap = {};
    inspections.forEach((insp) => {
      const aId = insp.asset.toString();
      if (!inspectionMap[aId]) {
        inspectionMap[aId] = {
          lastInspectionDate: insp.conductedDate || null,
          nextInspectionDate: insp.nextInspectionDate || null,
          lastCondition: insp.overallCondition || null,
        };
      }
    });

    const enrichedAssets = assets.map((asset) => {
      const inspData = inspectionMap[asset._id.toString()] || {};
      return {
        ...asset,
        lastInspectionDate: inspData.lastInspectionDate || null,
        nextInspectionDate: inspData.nextInspectionDate || null,
      };
    });

    return successResponse(
      res,
      200,
      'Assets retrieved successfully.',
      enrichedAssets,
      {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single asset by ID or unique assetId (Digital Asset Passport Core)
 * @route   GET /api/assets/:id
 * @access  Private
 */
const getAssetById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id) && id.length === 24;
    const filter = isObjectId ? { _id: id } : { assetId: id.toUpperCase() };

    const asset = await Asset.findOne(filter)
      .populate('department')
      .populate('custodian', 'name email designation phone')
      .populate('project', 'projectId projectName status')
      .populate('parentAsset', 'assetId name category assetType')
      .populate('custodyHistory.fromDepartment', 'name code')
      .populate('custodyHistory.toDepartment', 'name code')
      .populate('custodyHistory.fromCustodian', 'name email designation phone')
      .populate('custodyHistory.toCustodian', 'name email designation phone')
      .populate('custodyHistory.transferredBy', 'name role')
      .populate('createdBy', 'name email role designation');

    if (!asset) {
      return errorResponse(res, 404, `Asset not found with identifier '${id}'.`);
    }

    // Fetch latest inspection info
    const latestInspection = await Inspection.findOne({ asset: asset._id })
      .sort({ conductedDate: -1, createdAt: -1 })
      .lean();

    const nextScheduled = await Inspection.findOne({
      asset: asset._id,
      status: 'SCHEDULED',
      scheduledDate: { $gte: new Date() },
    })
      .sort({ scheduledDate: 1 })
      .lean();

    return successResponse(res, 200, 'Asset details retrieved.', {
      ...asset.toObject(),
      lastInspectionDate: latestInspection?.conductedDate || null,
      nextInspectionDate: nextScheduled?.scheduledDate || latestInspection?.nextInspectionDate || null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new infrastructure asset
 * @route   POST /api/assets
 * @access  Private (SUPER_ADMIN, DEPARTMENT_ADMIN, ENGINEER)
 */
const createAsset = async (req, res, next) => {
  try {
    const {
      assetId,
      name,
      category,
      assetType,
      description,
      department,
      custodian,
      location,
      status,
      condition,
      healthScore,
      installationDate,
      commissioningDate,
      expectedLifeYears,
      acquisitionCost,
      parentAsset,
    } = req.body;

    // Validate required fields
    if (!assetId || !name || !category || !assetType) {
      return errorResponse(res, 400, 'Asset ID, Name, Category, and Asset Type are required fields.');
    }

    // Check unique Asset ID
    const existing = await Asset.findOne({ assetId: assetId.trim().toUpperCase() });
    if (existing) {
      return errorResponse(res, 400, `Asset ID '${assetId}' already exists in the State Registry.`);
    }

    // Validate or default department
    let departmentId = department;
    if (!departmentId) {
      const defaultDept = await Department.findOne();
      departmentId = defaultDept ? defaultDept._id : null;
    }

    // Validate location coordinates
    const lat = location?.latitude !== undefined && location?.latitude !== '' ? Number(location.latitude) : 21.1824;
    const lng = location?.longitude !== undefined && location?.longitude !== '' ? Number(location.longitude) : 72.8225;

    const newAssetData = {
      assetId: assetId.trim().toUpperCase(),
      name: name.trim(),
      category,
      assetType,
      description: description || '',
      department: departmentId,
      custodian: custodian || null,
      location: {
        address: location?.address || '',
        city: location?.city || 'Surat',
        district: location?.district || 'Surat',
        state: location?.state || 'Gujarat',
        pincode: location?.pincode || '395001',
        latitude: lat,
        longitude: lng,
      },
      status: status || 'OPERATIONAL',
      condition: condition || 'GOOD',
      healthScore: healthScore !== undefined ? Number(healthScore) : 85,
      installationDate: installationDate || null,
      commissioningDate: commissioningDate || null,
      expectedLifeYears: expectedLifeYears ? Number(expectedLifeYears) : 25,
      acquisitionCost: acquisitionCost ? Number(acquisitionCost) : 0,
      parentAsset: parentAsset || null,
      createdBy: req.user._id,
    };

    const asset = await Asset.create(newAssetData);
    const populated = await Asset.findById(asset._id)
      .populate('department')
      .populate('custodian', 'name email designation');

    // 1. Create ASSET_CREATED lifecycle event
    await recordLifecycleEvent({
      eventType: LIFECYCLE_EVENTS.ASSET_CREATED,
      assetId: asset._id,
      performedBy: req.user._id,
      description: `Asset digitally registered in State Registry with ID ${asset.assetId} (${asset.name}).`,
      metadata: {
        category: asset.category,
        assetType: asset.assetType,
        condition: asset.condition,
        healthScore: asset.healthScore,
        acquisitionCost: asset.acquisitionCost,
        department: populated.department?.code || '',
      },
    });

    // 2. Create AuditLog
    await logAudit({
      action: 'ASSET_CREATED',
      entityType: 'Asset',
      entityId: asset._id,
      performedBy: req.user._id,
      changes: {
        assetId: asset.assetId,
        name: asset.name,
        category: asset.category,
        cost: asset.acquisitionCost,
      },
      req,
    });

    return successResponse(res, 201, 'Asset created and registered successfully.', populated);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update existing infrastructure asset
 * @route   PUT /api/assets/:id
 * @access  Private (SUPER_ADMIN, DEPARTMENT_ADMIN, ENGINEER)
 */
const updateAsset = async (req, res, next) => {
  try {
    const { id } = req.params;
    const asset = await resolveAssetId(id);

    if (!asset) {
      return errorResponse(res, 404, `Asset not found with identifier '${id}'.`);
    }

    const previousStatus = asset.status;
    const previousCondition = asset.condition;

    // Update allowed fields
    const fieldsToUpdate = [
      'name',
      'category',
      'assetType',
      'description',
      'department',
      'custodian',
      'status',
      'condition',
      'healthScore',
      'installationDate',
      'commissioningDate',
      'expectedLifeYears',
      'acquisitionCost',
      'totalMaintenanceCost',
      'parentAsset',
    ];

    fieldsToUpdate.forEach((field) => {
      if (req.body[field] !== undefined) {
        asset[field] = req.body[field];
      }
    });

    if (req.body.location) {
      asset.location = {
        ...asset.location.toObject(),
        ...req.body.location,
      };
    }

    await asset.save();
    const updated = await Asset.findById(asset._id)
      .populate('department')
      .populate('custodian', 'name email designation');

    // If status changed to RETIRED, record ASSET_RETIRED lifecycle event
    if (req.body.status && req.body.status !== previousStatus) {
      let eventType = null;
      if (req.body.status === 'RETIRED') eventType = LIFECYCLE_EVENTS.ASSET_RETIRED;
      else if (req.body.status === 'UNDER_MAINTENANCE') eventType = LIFECYCLE_EVENTS.MAINTENANCE_STARTED;
      else if (req.body.status === 'COMMISSIONED') eventType = LIFECYCLE_EVENTS.ASSET_COMMISSIONED;

      if (eventType) {
        await recordLifecycleEvent({
          eventType,
          assetId: asset._id,
          performedBy: req.user._id,
          description: `Asset status transitioned from ${previousStatus} to ${req.body.status}.`,
          metadata: { previousStatus, newStatus: req.body.status },
        });
      }
    }

    // Audit log
    await logAudit({
      action: 'ASSET_UPDATED',
      entityType: 'Asset',
      entityId: asset._id,
      performedBy: req.user._id,
      changes: {
        before: { status: previousStatus, condition: previousCondition },
        after: { status: asset.status, condition: asset.condition, healthScore: asset.healthScore },
      },
      req,
    });

    return successResponse(res, 200, 'Asset updated successfully.', updated);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete an infrastructure asset
 * @route   DELETE /api/assets/:id
 * @access  Private (SUPER_ADMIN, DEPARTMENT_ADMIN)
 */
const deleteAsset = async (req, res, next) => {
  try {
    const { id } = req.params;
    const asset = await resolveAssetId(id);

    if (!asset) {
      return errorResponse(res, 404, `Asset not found with identifier '${id}'.`);
    }

    const assetIdCode = asset.assetId;
    const assetName = asset.name;

    await Asset.findByIdAndDelete(asset._id);

    // Audit log
    await logAudit({
      action: 'ASSET_DELETED',
      entityType: 'Asset',
      entityId: asset._id,
      performedBy: req.user._id,
      changes: { assetId: assetIdCode, name: assetName },
      req,
    });

    return successResponse(res, 200, `Asset ${assetIdCode} successfully removed from registry.`);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get chronological lifecycle events for an asset
 * @route   GET /api/assets/:id/lifecycle
 * @access  Private
 */
const getAssetLifecycle = async (req, res, next) => {
  try {
    const asset = await resolveAssetId(req.params.id);
    if (!asset) return errorResponse(res, 404, 'Asset not found.');

    const events = await LifecycleEvent.find({ asset: asset._id })
      .populate('performedBy', 'name role designation email')
      .populate('project', 'projectCode name')
      .sort({ timestamp: -1 });

    return successResponse(res, 200, 'Lifecycle events retrieved.', events);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get inspections for an asset
 * @route   GET /api/assets/:id/inspections
 * @access  Private
 */
const getAssetInspections = async (req, res, next) => {
  try {
    const asset = await resolveAssetId(req.params.id);
    if (!asset) return errorResponse(res, 404, 'Asset not found.');

    const inspections = await Inspection.find({ asset: asset._id })
      .populate('inspector', 'name email designation')
      .sort({ scheduledDate: -1, conductedDate: -1 });

    return successResponse(res, 200, 'Asset inspections retrieved.', inspections);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get maintenance records for an asset
 * @route   GET /api/assets/:id/maintenance
 * @access  Private
 */
const getAssetMaintenance = async (req, res, next) => {
  try {
    const asset = await resolveAssetId(req.params.id);
    if (!asset) return errorResponse(res, 404, 'Asset not found.');

    const records = await MaintenanceRecord.find({ asset: asset._id })
      .populate('contractor', 'companyName registrationNumber')
      .populate('performedBy', 'name designation')
      .populate('workOrder', 'orderNumber title')
      .sort({ startDate: -1 });

    return successResponse(res, 200, 'Maintenance history retrieved.', records);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get work orders for an asset
 * @route   GET /api/assets/:id/work-orders
 * @access  Private
 */
const getAssetWorkOrders = async (req, res, next) => {
  try {
    const asset = await resolveAssetId(req.params.id);
    if (!asset) return errorResponse(res, 404, 'Asset not found.');

    const workOrders = await WorkOrder.find({ asset: asset._id })
      .populate('contractor', 'companyName registrationNumber contactPerson phone')
      .populate('assignedTo', 'name designation email')
      .populate('createdBy', 'name designation')
      .populate('issue', 'issueCode title severity')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, 'Work orders retrieved.', workOrders);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get documents for an asset
 * @route   GET /api/assets/:id/documents
 * @access  Private
 */
const getAssetDocuments = async (req, res, next) => {
  try {
    const asset = await resolveAssetId(req.params.id);
    if (!asset) return errorResponse(res, 404, 'Asset not found.');

    const documents = await Document.find({ asset: asset._id })
      .populate('uploadedBy', 'name designation')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, 'Asset documents retrieved.', documents);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get audit trail for an asset
 * @route   GET /api/assets/:id/audit
 * @access  Private
 */
const getAssetAudit = async (req, res, next) => {
  try {
    const asset = await resolveAssetId(req.params.id);
    if (!asset) return errorResponse(res, 404, 'Asset not found.');

    const logs = await AuditLog.find({
      entityType: 'Asset',
      entityId: asset._id,
    })
      .populate('performedBy', 'name email designation role')
      .sort({ timestamp: -1 })
      .limit(50);

    return successResponse(res, 200, 'Asset audit trail retrieved.', logs);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get issues for an asset
 * @route   GET /api/assets/:id/issues
 * @access  Private
 */
const getAssetIssues = async (req, res, next) => {
  try {
    const asset = await resolveAssetId(req.params.id);
    if (!asset) return errorResponse(res, 404, 'Asset not found.');

    const issues = await Issue.find({ asset: asset._id })
      .populate('reportedBy', 'name designation')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, 'Asset issues retrieved.', issues);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get financial records for an asset
 * @route   GET /api/assets/:id/financials
 * @access  Private
 */
const getAssetFinancials = async (req, res, next) => {
  try {
    const asset = await resolveAssetId(req.params.id);
    if (!asset) return errorResponse(res, 404, 'Asset not found.');

    const financials = await FinancialRecord.find({ asset: asset._id })
      .populate('approvedBy', 'name designation')
      .sort({ transactionDate: -1 });

    return successResponse(res, 200, 'Financial records retrieved.', financials);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Transfer asset custody/department
 * @route   POST /api/assets/:id/transfer
 * @access  Private (SUPER_ADMIN, DEPARTMENT_ADMIN)
 */
const transferAsset = async (req, res, next) => {
  try {
    const {
      targetDepartmentId,
      newDepartmentId,
      targetCustodianId,
      newCustodianId,
      transferDate = new Date(),
      reason = '',
      supportingDocument = '',
    } = req.body;

    const toDeptId = newDepartmentId || targetDepartmentId || req.body.department || req.body.newDepartment;
    const toCustId = newCustodianId || targetCustodianId || req.body.custodian || req.body.newCustodian;

    const asset = await resolveAssetId(req.params.id);
    if (!asset) return errorResponse(res, 404, 'Asset not found.');
    if (!toDeptId) return errorResponse(res, 400, 'Target department is required for custody transfer.');

    const [oldDept, newDept] = await Promise.all([
      Department.findById(asset.department),
      Department.findById(toDeptId),
    ]);

    if (!newDept) return errorResponse(res, 404, 'Target department not found.');

    const oldCustodian = asset.custodian ? await User.findById(asset.custodian) : null;
    const newCustodian = toCustId ? await User.findById(toCustId) : null;

    // Record Historical Custody Record in custodyHistory
    if (!asset.custodyHistory) asset.custodyHistory = [];
    asset.custodyHistory.push({
      fromDepartment: oldDept ? oldDept._id : null,
      toDepartment: newDept._id,
      fromCustodian: oldCustodian ? oldCustodian._id : null,
      toCustodian: newCustodian ? newCustodian._id : null,
      transferDate: new Date(transferDate),
      reason: reason.trim(),
      supportingDocument: supportingDocument.trim(),
      transferredBy: req.user._id,
    });

    // Update current jurisdictional department and custodian
    asset.department = newDept._id;
    if (toCustId) asset.custodian = toCustId;
    await asset.save();

    // Record ASSET_TRANSFERRED lifecycle event
    await recordLifecycleEvent({
      eventType: LIFECYCLE_EVENTS.ASSET_TRANSFERRED,
      assetId: asset._id,
      performedBy: req.user._id,
      title: 'Jurisdiction & Custody Transferred',
      description: `Asset jurisdiction transferred from ${oldDept?.name || 'Department'} (${oldDept?.code || 'N/A'}) to ${newDept.name} (${newDept.code}). ${reason ? 'Reason: ' + reason : ''}`,
      metadata: {
        fromDepartment: oldDept?.name,
        toDepartment: newDept.name,
        fromCustodian: oldCustodian?.name || 'Unassigned',
        toCustodian: newCustodian?.name || 'Unassigned',
        reason,
        supportingDocument,
      },
    });

    // Audit log
    await logAudit({
      action: 'TRANSFER',
      entityType: 'Asset',
      entityId: asset._id,
      performedBy: req.user._id,
      changes: {
        before: {
          department: oldDept?.name,
          custodian: oldCustodian?.name,
        },
        after: {
          department: newDept.name,
          custodian: newCustodian?.name,
          transferDate,
          reason,
        },
      },
      req,
    });

    const populatedAsset = await Asset.findById(asset._id)
      .populate('department')
      .populate('custodian')
      .populate('custodyHistory.fromDepartment', 'name code')
      .populate('custodyHistory.toDepartment', 'name code')
      .populate('custodyHistory.fromCustodian', 'name designation')
      .populate('custodyHistory.toCustodian', 'name designation')
      .populate('custodyHistory.transferredBy', 'name role');

    return successResponse(
      res,
      200,
      `Asset custody officially transferred to ${newDept.name}.`,
      populatedAsset
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create an issue for an asset
 * @route   POST /api/assets/:id/issues
 * @access  Private
 */
const createAssetIssue = async (req, res, next) => {
  try {
    const { title, severity = 'MEDIUM', description = '', locationDetails = '' } = req.body;
    const asset = await resolveAssetId(req.params.id);
    if (!asset) return errorResponse(res, 404, 'Asset not found.');

    const count = await Issue.countDocuments();
    const issueCode = `ISS-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const issue = await Issue.create({
      issueId: issueCode,
      issueCode,
      title,
      asset: asset._id,
      reportedBy: req.user._id,
      severity,
      description,
      locationDetails,
      status: 'REPORTED',
    });

    // Record ISSUE_REPORTED lifecycle event
    await recordLifecycleEvent({
      eventType: LIFECYCLE_EVENTS.ISSUE_REPORTED,
      assetId: asset._id,
      performedBy: req.user._id,
      description: `Issue flagged: ${title} (Severity: ${severity}).`,
      metadata: { issueId: issueCode, issueCode, severity },
    });

    // Audit log
    await logAudit({
      action: 'ISSUE_REPORTED',
      entityType: 'Issue',
      entityId: issue._id,
      performedBy: req.user._id,
      changes: { issueCode, severity, title },
      req,
    });

    return successResponse(res, 201, 'Issue reported successfully.', issue);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a work order for an asset
 * @route   POST /api/assets/:id/work-orders
 * @access  Private (SUPER_ADMIN, DEPARTMENT_ADMIN, ENGINEER)
 */
const createAssetWorkOrder = async (req, res, next) => {
  try {
    const { title, priority = 'MEDIUM', estimatedCost = 0, targetCompletionDate, contractor, issueId } = req.body;
    const asset = await resolveAssetId(req.params.id);
    if (!asset) return errorResponse(res, 404, 'Asset not found.');

    const count = await WorkOrder.countDocuments();
    const orderNumber = `WO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const workOrder = await WorkOrder.create({
      workOrderId: orderNumber,
      orderNumber,
      title,
      asset: asset._id,
      contractor: contractor || null,
      priority,
      status: 'ASSIGNED',
      estimatedCost: Number(estimatedCost) || 0,
      targetCompletionDate: targetCompletionDate || null,
      dueDate: targetCompletionDate || null,
      issue: issueId || null,
      createdBy: req.user._id,
    });

    // Record WORK_ORDER_CREATED lifecycle event
    await recordLifecycleEvent({
      eventType: LIFECYCLE_EVENTS.WORK_ORDER_CREATED,
      assetId: asset._id,
      performedBy: req.user._id,
      description: `Work order ${orderNumber} issued: "${title}" (Priority: ${priority}, Est. Cost: ₹${estimatedCost}).`,
      metadata: { workOrderId: orderNumber, priority, estimatedCost },
    });

    // Audit log
    await logAudit({
      action: 'WORK_ORDER_CREATED',
      entityType: 'WorkOrder',
      entityId: workOrder._id,
      performedBy: req.user._id,
      changes: { orderNumber, title, estimatedCost },
      req,
    });

    return successResponse(res, 201, 'Work order created successfully.', workOrder);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a document for an asset
 * @route   POST /api/assets/:id/documents
 * @access  Private
 */
const createAssetDocument = async (req, res, next) => {
  try {
    const { title, documentType = 'OTHER', fileUrl, fileType = 'application/pdf', fileSize = 0 } = req.body;
    const asset = await resolveAssetId(req.params.id);
    if (!asset) return errorResponse(res, 404, 'Asset not found.');

    const document = await Document.create({
      title,
      documentType,
      fileUrl: fileUrl || '/uploads/sample-blueprint.pdf',
      fileType,
      fileSize: Number(fileSize) || 1024000,
      asset: asset._id,
      uploadedBy: req.user._id,
    });

    // Audit log
    await logAudit({
      action: 'DOCUMENT_UPLOADED',
      entityType: 'Document',
      entityId: document._id,
      performedBy: req.user._id,
      changes: { title, documentType },
      req,
    });

    return successResponse(res, 201, 'Document attached successfully.', document);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Conduct or schedule an inspection for an asset
 * @route   POST /api/assets/:id/inspections
 * @access  Private (SUPER_ADMIN, DEPARTMENT_ADMIN, ENGINEER, INSPECTOR)
 */
const createAssetInspection = async (req, res, next) => {
  try {
    const { overallCondition, score = 85, remarks = '', checklist = [], scheduledDate, conductedDate } = req.body;
    const asset = await resolveAssetId(req.params.id);
    if (!asset) return errorResponse(res, 404, 'Asset not found.');

    const count = await Inspection.countDocuments();
    const inspectionNumber = `INSP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const isConducted = Boolean(conductedDate || overallCondition);

    const inspection = await Inspection.create({
      inspectionNumber,
      asset: asset._id,
      inspector: req.user._id,
      scheduledDate: scheduledDate || new Date(),
      conductedDate: isConducted ? conductedDate || new Date() : null,
      status: isConducted ? 'COMPLETED' : 'SCHEDULED',
      overallCondition: overallCondition || asset.condition,
      checklist: checklist || [],
      remarks,
      score: Number(score) || 80,
      nextInspectionDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months later
    });

    // Update asset condition and healthScore if conducted
    if (isConducted && overallCondition) {
      asset.condition = overallCondition;
      if (score) asset.healthScore = Number(score);
      await asset.save();

      // Record INSPECTION_COMPLETED lifecycle event
      await recordLifecycleEvent({
        eventType: LIFECYCLE_EVENTS.INSPECTION_COMPLETED,
        assetId: asset._id,
        performedBy: req.user._id,
        description: `Periodic inspection ${inspectionNumber} completed. Condition rated ${overallCondition} with health score ${score}%.`,
        metadata: { inspectionNumber, overallCondition, score },
      });
    }

    // Audit log
    await logAudit({
      action: 'INSPECTION_LOGGED',
      entityType: 'Inspection',
      entityId: inspection._id,
      performedBy: req.user._id,
      changes: { inspectionNumber, score, overallCondition },
      req,
    });

    return successResponse(res, 201, 'Inspection logged successfully.', inspection);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  getAssetLifecycle,
  getAssetInspections,
  getAssetMaintenance,
  getAssetWorkOrders,
  getAssetDocuments,
  getAssetAudit,
  getAssetIssues,
  getAssetFinancials,
  transferAsset,
  createAssetIssue,
  createAssetWorkOrder,
  createAssetDocument,
  createAssetInspection,
};
