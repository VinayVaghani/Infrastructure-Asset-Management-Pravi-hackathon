const mongoose = require('mongoose');
const WorkOrder = require('../models/WorkOrder');
const Asset = require('../models/Asset');
const Issue = require('../models/Issue');
const Contractor = require('../models/Contractor');
const { recordLifecycleEvent } = require('../services/lifecycleService');
const { logAudit } = require('../services/auditService');
const { recordFinancialTransaction } = require('../services/financialService');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { LIFECYCLE_EVENTS, ASSET_STATUS } = require('../utils/constants');

/**
 * @desc    Get all work orders (contractors only see assigned orders)
 * @route   GET /api/work-orders
 * @access  Private
 */
const getWorkOrders = async (req, res, next) => {
  try {
    const {
      status,
      priority,
      assetId,
      contractorId,
      overdue,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = {};

    // 1. Role-based enforcement: Contractor role must only see assigned work orders
    if (req.user.role === 'CONTRACTOR') {
      const contractorRecord = await Contractor.findOne({
        $or: [{ userAccount: req.user._id }, { email: req.user.email }],
      });
      if (contractorRecord) {
        query.contractor = contractorRecord._id;
      } else {
        return successResponse(res, 200, 'No assigned work orders.', [], {
          page: 1,
          limit: Number(limit),
          total: 0,
          totalPages: 1,
        });
      }
    } else if (contractorId) {
      query.contractor = contractorId;
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;

    if (assetId) {
      if (mongoose.Types.ObjectId.isValid(assetId)) {
        query.asset = assetId;
      } else {
        const foundAsset = await Asset.findOne({ assetId: assetId.toUpperCase() });
        if (foundAsset) query.asset = foundAsset._id;
      }
    }

    const now = new Date();
    // Overdue filter: dueDate / targetCompletionDate passed and status is not COMPLETED/VERIFIED/CLOSED/CANCELLED
    if (overdue === 'true') {
      query.status = { $nin: ['COMPLETED', 'VERIFIED', 'CLOSED', 'CANCELLED'] };
      query.$or = [
        { dueDate: { $lt: now } },
        { targetCompletionDate: { $lt: now } },
      ];
    }

    if (search) {
      query.$or = [
        { workOrderId: { $regex: search, $options: 'i' } },
        { orderNumber: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [orders, total] = await Promise.all([
      WorkOrder.find(query)
        .populate('asset', 'assetId name category condition healthScore location')
        .populate('contractor', 'companyName company contactPerson name phone email registrationNumber')
        .populate('issue', 'issueId issueCode title severity status')
        .populate('assignedTo', 'name email designation')
        .populate('createdBy', 'name designation')
        .populate('verifiedBy', 'name designation')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      WorkOrder.countDocuments(query),
    ]);

    // Annotate whether order is overdue automatically
    const enrichedOrders = orders.map((o) => {
      const targetDate = o.dueDate || o.targetCompletionDate;
      const isOverdue =
        targetDate &&
        new Date(targetDate) < now &&
        !['COMPLETED', 'VERIFIED', 'CLOSED', 'CANCELLED'].includes(o.status);

      return {
        ...o,
        isOverdue: Boolean(isOverdue),
      };
    });

    return successResponse(res, 200, 'Work orders retrieved successfully.', enrichedOrders, {
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
 * @desc    Get single work order by ID
 * @route   GET /api/work-orders/:id
 * @access  Private
 */
const getWorkOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id) && id.length === 24;
    const filter = isObjectId ? { _id: id } : { $or: [{ workOrderId: id.toUpperCase() }, { orderNumber: id.toUpperCase() }] };

    const order = await WorkOrder.findOne(filter)
      .populate('asset')
      .populate('contractor')
      .populate('issue')
      .populate('assignedTo', 'name email designation role')
      .populate('createdBy', 'name email designation role')
      .populate('verifiedBy', 'name email designation role');

    if (!order) {
      return errorResponse(res, 404, 'Work order not found.');
    }

    // Role check: If contractor, must match assigned contractor
    if (req.user.role === 'CONTRACTOR') {
      const contractorRecord = await Contractor.findOne({
        $or: [{ userAccount: req.user._id }, { email: req.user.email }],
      });
      if (!contractorRecord || order.contractor?._id.toString() !== contractorRecord._id.toString()) {
        return errorResponse(res, 403, 'Access denied. You may only view work orders assigned to your firm.');
      }
    }

    const now = new Date();
    const targetDate = order.dueDate || order.targetCompletionDate;
    const isOverdue =
      targetDate &&
      new Date(targetDate) < now &&
      !['COMPLETED', 'VERIFIED', 'CLOSED', 'CANCELLED'].includes(order.status);

    const result = order.toObject();
    result.isOverdue = Boolean(isOverdue);

    return successResponse(res, 200, 'Work order details retrieved.', result);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new work order
 * @route   POST /api/work-orders
 * @access  Private (SUPER_ADMIN, DEPARTMENT_ADMIN, ENGINEER)
 */
const createWorkOrder = async (req, res, next) => {
  try {
    const {
      asset: assetParam,
      issue: issueParam,
      title,
      description = '',
      priority = 'MEDIUM',
      contractor: contractorParam,
      estimatedCost = 0,
      startDate = new Date(),
      dueDate,
      status = 'OPEN',
    } = req.body;

    if (!assetParam || (!title && !description)) {
      return errorResponse(res, 400, 'Target asset and work order title or description are required.');
    }

    const orderTitle = (title || description || 'Infrastructure Work Order').trim();

    // Resolve Asset
    const isObjectId = mongoose.Types.ObjectId.isValid(assetParam) && assetParam.length === 24;
    const asset = await Asset.findOne(
      isObjectId ? { _id: assetParam } : { assetId: assetParam.toUpperCase() }
    );

    if (!asset) {
      return errorResponse(res, 404, 'Target asset not found in State Registry.');
    }

    // Generate unique Work Order ID
    const year = new Date().getFullYear();
    const count = await WorkOrder.countDocuments();
    const workOrderId = `WO-${year}-${String(count + 1).padStart(4, '0')}`;

    // Resolve Contractor if provided
    let contractorId = null;
    if (contractorParam) {
      if (mongoose.Types.ObjectId.isValid(contractorParam)) {
        contractorId = contractorParam;
      } else {
        const found = await Contractor.findOne({ registrationNumber: contractorParam.toUpperCase() });
        if (found) contractorId = found._id;
      }
    }

    const initialStatus = contractorId ? 'ASSIGNED' : status;

    const workOrder = await WorkOrder.create({
      workOrderId,
      orderNumber: workOrderId,
      title: orderTitle,
      description: (description || '').trim(),
      asset: asset._id,
      issue: issueParam || null,
      contractor: contractorId,
      priority,
      estimatedCost: Number(estimatedCost) || 0,
      actualCost: 0,
      startDate: startDate ? new Date(startDate) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : null,
      targetCompletionDate: dueDate ? new Date(dueDate) : null,
      status: initialStatus,
      createdBy: req.user._id,
    });

    // If linked to an issue, mark issue as ASSIGNED / IN_PROGRESS
    if (issueParam) {
      await Issue.findByIdAndUpdate(issueParam, { status: 'ASSIGNED' });
    }

    // Update Asset status to UNDER_MAINTENANCE if priority is HIGH or CRITICAL
    if (priority === 'HIGH' || priority === 'CRITICAL' || priority === 'URGENT') {
      asset.status = ASSET_STATUS.UNDER_MAINTENANCE;
      await asset.save();
    }

    // 1. Record LifecycleEvent
    await recordLifecycleEvent({
      eventType: LIFECYCLE_EVENTS.WORK_ORDER_CREATED,
      assetId: asset._id,
      performedBy: req.user._id,
      description: `Work order ${workOrderId} issued: "${title}" (Priority: ${priority}, Est. Cost: ₹${estimatedCost}).`,
      metadata: {
        workOrderId,
        title,
        priority,
        estimatedCost,
        contractor: contractorId,
      },
    });

    // 2. Log AuditLog
    await logAudit({
      action: 'WORK_ORDER_CREATED',
      entityType: 'WorkOrder',
      entityId: workOrder._id,
      performedBy: req.user._id,
      changes: { workOrderId, assetId: asset.assetId, priority, estimatedCost },
      req,
    });

    const populated = await WorkOrder.findById(workOrder._id)
      .populate('asset', 'assetId name category')
      .populate('contractor', 'companyName contactPerson phone');

    return successResponse(res, 201, 'Work order created successfully.', populated);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Work Order lifecycle status & execution details
 * @route   PUT /api/work-orders/:id
 * @access  Private
 * Workflow steps:
 * - Create Work Order (OPEN)
 * - Assign Contractor (ASSIGNED)
 * - Contractor accepts / Work starts (IN_PROGRESS)
 * - Contractor uploads evidence / marks completed (COMPLETED)
 * - Engineer verifies (VERIFIED)
 * - Work Order closed (CLOSED) -> Triggers financial record & updates asset maintenance costs!
 */
const updateWorkOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const workOrder = await WorkOrder.findById(id).populate('asset');

    if (!workOrder) {
      return errorResponse(res, 404, 'Work order not found.');
    }

    const previousStatus = workOrder.status;
    const {
      status,
      contractor,
      actualCost,
      estimatedCost,
      completionNotes,
      evidencePhotos,
      dueDate,
      priority,
      description,
      title,
    } = req.body;

    if (contractor !== undefined) workOrder.contractor = contractor;
    if (actualCost !== undefined) workOrder.actualCost = Number(actualCost);
    if (estimatedCost !== undefined) workOrder.estimatedCost = Number(estimatedCost);
    if (completionNotes !== undefined) workOrder.completionNotes = completionNotes;
    if (dueDate !== undefined) {
      workOrder.dueDate = new Date(dueDate);
      workOrder.targetCompletionDate = new Date(dueDate);
    }
    if (priority !== undefined) workOrder.priority = priority;
    if (description !== undefined) workOrder.description = description;
    if (title !== undefined) workOrder.title = title;

    if (Array.isArray(evidencePhotos)) {
      workOrder.evidencePhotos = evidencePhotos;
    } else if (evidencePhotos) {
      workOrder.evidencePhotos.push(evidencePhotos);
    }

    // Status State Machine & Workflow Transitions
    if (status && status !== previousStatus) {
      workOrder.status = status;

      let lifecycleEventType = LIFECYCLE_EVENTS.WORK_ORDER_STARTED;
      let lifecycleDesc = `Work order ${workOrder.workOrderId} transitioned: ${previousStatus} → ${status}.`;

      if (status === 'ASSIGNED') {
        lifecycleEventType = LIFECYCLE_EVENTS.WORK_ORDER_ASSIGNED;
        lifecycleDesc = `Contractor assigned to work order ${workOrder.workOrderId}.`;
      } else if (status === 'IN_PROGRESS') {
        lifecycleEventType = LIFECYCLE_EVENTS.WORK_ORDER_STARTED;
        workOrder.startDate = workOrder.startDate || new Date();
        lifecycleDesc = `On-site execution commenced for work order ${workOrder.workOrderId}.`;

        // Update linked Asset status
        if (workOrder.asset) {
          const assetObj = await Asset.findById(workOrder.asset._id || workOrder.asset);
          if (assetObj) {
            assetObj.status = ASSET_STATUS.UNDER_MAINTENANCE;
            await assetObj.save();
          }
        }
      } else if (status === 'COMPLETED') {
        lifecycleEventType = LIFECYCLE_EVENTS.WORK_ORDER_COMPLETED;
        workOrder.completionDate = new Date();
        workOrder.completedAt = new Date();
        lifecycleDesc = `Contractor completed scope of work for ${workOrder.workOrderId}. Pending quality engineer certification.`;

        // Update linked Issue status
        if (workOrder.issue) {
          await Issue.findByIdAndUpdate(workOrder.issue, { status: 'RESOLVED', resolvedDate: new Date() });
        }
      } else if (status === 'VERIFIED') {
        lifecycleEventType = LIFECYCLE_EVENTS.WORK_ORDER_VERIFIED;
        workOrder.verifiedBy = req.user._id;
        workOrder.verifiedAt = new Date();
        lifecycleDesc = `Executive QC engineer ${req.user.name} inspected and certified completion of work order ${workOrder.workOrderId}.`;
      } else if (status === 'CLOSED') {
        lifecycleEventType = LIFECYCLE_EVENTS.WORK_ORDER_CLOSED;
        lifecycleDesc = `Work order ${workOrder.workOrderId} closed and liquidated into state ledger.`;

        // Reset asset operational status and boost condition
        if (workOrder.asset) {
          const assetObj = await Asset.findById(workOrder.asset._id || workOrder.asset);
          if (assetObj) {
            assetObj.status = ASSET_STATUS.OPERATIONAL;
            // Rehabilitation improves condition
            if (assetObj.condition === 'CRITICAL' || assetObj.condition === 'POOR') {
              assetObj.condition = 'MODERATE';
              assetObj.healthScore = Math.max(assetObj.healthScore, 65);
            } else if (assetObj.condition === 'MODERATE') {
              assetObj.condition = 'GOOD';
              assetObj.healthScore = Math.max(assetObj.healthScore, 82);
            }
            await assetObj.save();
          }
        }

        // Financial Integration: Create permanent FinancialRecord and increment Asset costs
        const finalCost = Number(workOrder.actualCost) || Number(workOrder.estimatedCost) || 0;
        if (finalCost > 0 && workOrder.asset) {
          await recordFinancialTransaction({
            assetId: workOrder.asset._id || workOrder.asset,
            workOrderId: workOrder._id,
            type: 'MAINTENANCE',
            category: 'REPAIR',
            amount: finalCost,
            estimatedCost: workOrder.estimatedCost,
            actualCost: finalCost,
            description: `Settlement for Work Order ${workOrder.workOrderId}: ${workOrder.title}`,
            approvedBy: req.user._id,
          });
        }
      }

      // Record LifecycleEvent
      if (workOrder.asset) {
        await recordLifecycleEvent({
          eventType: lifecycleEventType,
          assetId: workOrder.asset._id || workOrder.asset,
          performedBy: req.user._id,
          description: lifecycleDesc,
          metadata: {
            workOrderId: workOrder.workOrderId,
            previousStatus,
            newStatus: status,
            actualCost: workOrder.actualCost,
            completionNotes: workOrder.completionNotes,
          },
        });
      }

      // Log AuditLog
      await logAudit({
        action: 'WORK_ORDER_STATUS_CHANGED',
        entityType: 'WorkOrder',
        entityId: workOrder._id,
        performedBy: req.user._id,
        changes: { previousStatus, newStatus: status, actualCost: workOrder.actualCost },
        req,
      });
    }

    await workOrder.save();

    const updated = await WorkOrder.findById(workOrder._id)
      .populate('asset', 'assetId name category condition healthScore')
      .populate('contractor', 'companyName contactPerson phone email')
      .populate('issue', 'issueId title severity')
      .populate('verifiedBy', 'name designation');

    return successResponse(res, 200, 'Work order updated successfully.', updated);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWorkOrders,
  getWorkOrderById,
  createWorkOrder,
  updateWorkOrder,
};
