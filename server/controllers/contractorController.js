const mongoose = require('mongoose');
const Contractor = require('../models/Contractor');
const WorkOrder = require('../models/WorkOrder');
const Asset = require('../models/Asset');
const { logAudit } = require('../services/auditService');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * @desc    Get all registered contractors
 * @route   GET /api/contractors
 * @access  Private
 */
const getContractors = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const query = {};

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { registrationNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const contractors = await Contractor.find(query).sort({ createdAt: -1 }).lean();

    // Enrich contractors with live contract metrics without arbitrary scores
    const enriched = await Promise.all(
      contractors.map(async (c) => {
        const [activeOrders, completedOrders] = await Promise.all([
          WorkOrder.countDocuments({ contractor: c._id, status: { $in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } }),
          WorkOrder.countDocuments({ contractor: c._id, status: { $in: ['COMPLETED', 'VERIFIED', 'CLOSED'] } }),
        ]);

        return {
          ...c,
          activeWorkOrdersCount: activeOrders,
          completedWorkOrdersCount: completedOrders,
        };
      })
    );

    return successResponse(res, 200, 'Contractors retrieved successfully.', enriched);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single contractor with full detail: active/completed/overdue work orders, total value, assigned assets
 * @route   GET /api/contractors/:id
 * @access  Private
 */
const getContractorById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id) && id.length === 24;
    const filter = isObjectId ? { _id: id } : { registrationNumber: id.toUpperCase() };

    const contractor = await Contractor.findOne(filter);
    if (!contractor) {
      return errorResponse(res, 404, 'Contractor record not found.');
    }

    const now = new Date();

    // Query Work Orders for this contractor
    const workOrders = await WorkOrder.find({ contractor: contractor._id })
      .populate('asset', 'assetId name category condition healthScore location')
      .populate('issue', 'issueId title severity')
      .sort({ createdAt: -1 });

    const activeWorkOrders = workOrders.filter((w) =>
      ['OPEN', 'ASSIGNED', 'IN_PROGRESS'].includes(w.status)
    );
    const completedWorkOrders = workOrders.filter((w) =>
      ['COMPLETED', 'VERIFIED', 'CLOSED'].includes(w.status)
    );
    const overdueWorkOrders = activeWorkOrders.filter(
      (w) => w.dueDate && new Date(w.dueDate) < now
    );

    // Calculate total contract value (sum of estimated/actual cost across all orders)
    const totalContractValue = workOrders.reduce((sum, w) => sum + (w.actualCost || w.estimatedCost || 0), 0);

    // Collect distinct assigned assets
    const assetMap = new Map();
    workOrders.forEach((w) => {
      if (w.asset && !assetMap.has(w.asset._id.toString())) {
        assetMap.set(w.asset._id.toString(), w.asset);
      }
    });
    const assignedAssets = Array.from(assetMap.values());

    return successResponse(res, 200, 'Contractor details and telemetry retrieved.', {
      contractor,
      metrics: {
        activeWorkOrdersCount: activeWorkOrders.length,
        completedWorkOrdersCount: completedWorkOrders.length,
        overdueWorkOrdersCount: overdueWorkOrders.length,
        totalContractValue,
        assignedAssetsCount: assignedAssets.length,
      },
      activeWorkOrders,
      completedWorkOrders,
      overdueWorkOrders,
      assignedAssets,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Register a new contractor
 * @route   POST /api/contractors
 * @access  Private (SUPER_ADMIN, DEPARTMENT_ADMIN, ENGINEER)
 */
const createContractor = async (req, res, next) => {
  try {
    const {
      name,
      company,
      companyName,
      contactPerson,
      registrationNumber,
      email,
      phone,
      address,
      status = 'ACTIVE',
      specializations = [],
    } = req.body;

    const companyField = companyName || company;
    const personField = contactPerson || name;

    if (!companyField || !registrationNumber || !email || !phone) {
      return errorResponse(res, 400, 'Company, registration number, email, and phone are required.');
    }

    const existing = await Contractor.findOne({
      $or: [{ registrationNumber: registrationNumber.toUpperCase() }, { email: email.toLowerCase() }],
    });
    if (existing) {
      return errorResponse(res, 400, 'Contractor with this registration number or email already exists.');
    }

    const contractor = await Contractor.create({
      companyName: companyField.trim(),
      company: companyField.trim(),
      contactPerson: (personField || 'Director').trim(),
      name: (personField || 'Director').trim(),
      registrationNumber: registrationNumber.toUpperCase().trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      address: address || '',
      status,
      specializations: Array.isArray(specializations) ? specializations : [specializations],
    });

    await logAudit({
      action: 'CONTRACTOR_REGISTERED',
      entityType: 'Contractor',
      entityId: contractor._id,
      performedBy: req.user._id,
      changes: { company: contractor.companyName, registration: contractor.registrationNumber },
      req,
    });

    return successResponse(res, 201, 'Contractor registered successfully.', contractor);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update contractor profile
 * @route   PUT /api/contractors/:id
 * @access  Private (SUPER_ADMIN, DEPARTMENT_ADMIN, ENGINEER)
 */
const updateContractor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const contractor = await Contractor.findById(id);

    if (!contractor) {
      return errorResponse(res, 404, 'Contractor not found.');
    }

    const allowed = ['companyName', 'company', 'contactPerson', 'name', 'phone', 'email', 'address', 'status', 'specializations'];
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) contractor[f] = req.body[f];
    });

    await contractor.save();

    return successResponse(res, 200, 'Contractor record updated.', contractor);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getContractors,
  getContractorById,
  createContractor,
  updateContractor,
};
