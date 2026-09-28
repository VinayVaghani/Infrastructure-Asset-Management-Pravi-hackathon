const mongoose = require('mongoose');
const Project = require('../models/Project');
const Asset = require('../models/Asset');
const Department = require('../models/Department');
const Contractor = require('../models/Contractor');
const { recordLifecycleEvent } = require('../services/lifecycleService');
const { logAudit } = require('../services/auditService');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { LIFECYCLE_EVENTS, PROJECT_STATUS, ASSET_STATUS, ASSET_CONDITION } = require('../utils/constants');

/**
 * @desc    Get all capital projects with filtering & pagination
 * @route   GET /api/projects
 * @access  Private
 */
const getProjects = async (req, res, next) => {
  try {
    const {
      status,
      departmentId,
      contractorId,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (departmentId) query.department = departmentId;
    if (contractorId) query.contractor = contractorId;

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { projectId: regex },
        { projectCode: regex },
        { projectName: regex },
        { name: regex },
        { description: regex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [projects, total] = await Promise.all([
      Project.find(query)
        .populate('department', 'name code district')
        .populate('contractor', 'company companyName registrationNumber name')
        .populate('createdAsset', 'assetId name status condition healthScore')
        .populate('createdBy', 'name email designation role')
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limitNum),
      Project.countDocuments(query),
    ]);

    return successResponse(res, 200, 'Projects retrieved successfully.', projects, {
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
 * @desc    Get single project by ID
 * @route   GET /api/projects/:id
 * @access  Private
 */
const getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id) && id.length === 24;
    const filter = isObjectId ? { _id: id } : { $or: [{ projectId: id.toUpperCase() }, { projectCode: id.toUpperCase() }] };

    const project = await Project.findOne(filter)
      .populate('department')
      .populate('contractor')
      .populate('createdAsset')
      .populate('createdBy', 'name email designation role');

    if (!project) {
      return errorResponse(res, 404, 'Capital project not found.');
    }

    return successResponse(res, 200, 'Project details retrieved.', project);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new capital project
 * @route   POST /api/projects
 * @access  Private (SUPER_ADMIN, DEPARTMENT_ADMIN, ENGINEER)
 */
const createProject = async (req, res, next) => {
  try {
    const {
      projectName,
      name,
      description = '',
      department: departmentParam,
      location = {},
      estimatedCost = 0,
      approvedBudget = 0,
      budget,
      contractor,
      startDate,
      expectedCompletion,
      estimatedEndDate,
      status = PROJECT_STATUS.PROPOSED,
    } = req.body;

    const pName = projectName || name;
    if (!pName || !departmentParam) {
      return errorResponse(res, 400, 'Project name and department are required.');
    }

    // Resolve Department
    let deptId = departmentParam;
    if (!mongoose.Types.ObjectId.isValid(departmentParam)) {
      const foundDept = await Department.findOne({ code: departmentParam.toUpperCase() });
      if (foundDept) deptId = foundDept._id;
    }

    // Resolve Contractor
    let resolvedContractor = null;
    if (contractor && mongoose.Types.ObjectId.isValid(contractor)) {
      resolvedContractor = contractor;
    } else if (contractor && typeof contractor === 'string') {
      const foundContractor = await Contractor.findOne({
        $or: [{ company: contractor }, { name: contractor }, { registrationNumber: contractor }],
      });
      if (foundContractor) resolvedContractor = foundContractor._id;
    }

    const year = new Date().getFullYear();
    const count = await Project.countDocuments();
    const projectId = req.body.projectId || `PRJ-${year}-${String(count + 1).padStart(4, '0')}`;

    const project = await Project.create({
      projectId,
      projectCode: projectId,
      projectName: pName.trim(),
      name: pName.trim(),
      description: description.trim(),
      department: deptId,
      location: typeof location === 'object' ? location : { address: location },
      estimatedCost: Number(estimatedCost) || 0,
      approvedBudget: Number(approvedBudget || budget) || 0,
      budget: Number(approvedBudget || budget) || 0,
      contractor: resolvedContractor,
      startDate: startDate ? new Date(startDate) : new Date(),
      expectedCompletion: expectedCompletion || estimatedEndDate ? new Date(expectedCompletion || estimatedEndDate) : null,
      status,
      milestones: req.body.milestones || undefined,
      createdBy: req.user._id,
    });

    // Record Lifecycle Event (Project Level)
    await recordLifecycleEvent({
      eventType: LIFECYCLE_EVENTS.PROJECT_CREATED,
      projectId: project._id,
      performedBy: req.user._id,
      title: 'Project Initiated',
      description: `Capital project ${project.projectId} ("${project.projectName}") proposed with approved outlay of ₹${project.approvedBudget}.`,
      metadata: { projectId: project.projectId, status: project.status, budget: project.approvedBudget },
    });

    // Audit log
    await logAudit({
      action: 'PROJECT_CREATED',
      entityType: 'Project',
      entityId: project._id,
      performedBy: req.user._id,
      changes: {
        after: {
          projectId: project.projectId,
          projectName: project.projectName,
          status: project.status,
          approvedBudget: project.approvedBudget,
        },
      },
      req,
    });

    return successResponse(res, 201, 'Capital project created successfully.', project);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update project details or advance status/milestones
 * @route   PUT /api/projects/:id
 * @access  Private (SUPER_ADMIN, DEPARTMENT_ADMIN, ENGINEER)
 */
const updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id) && id.length === 24;
    const filter = isObjectId ? { _id: id } : { $or: [{ projectId: id.toUpperCase() }, { projectCode: id.toUpperCase() }] };

    const project = await Project.findOne(filter);
    if (!project) {
      return errorResponse(res, 404, 'Capital project not found.');
    }

    const previousStatus = project.status;
    const updates = { ...req.body };

    // Milestone completion handling
    if (updates.milestoneUpdate) {
      const { milestoneName, status: mStatus, notes } = updates.milestoneUpdate;
      const mIdx = project.milestones.findIndex((m) => m.name === milestoneName);
      if (mIdx !== -1) {
        project.milestones[mIdx].status = mStatus;
        if (mStatus === 'COMPLETED') project.milestones[mIdx].completedAt = new Date();
        if (notes) project.milestones[mIdx].notes = notes;
      }
      delete updates.milestoneUpdate;
    }

    if (updates.contractor !== undefined) {
      if (updates.contractor && mongoose.Types.ObjectId.isValid(updates.contractor)) {
        project.contractor = updates.contractor;
      } else if (updates.contractor && typeof updates.contractor === 'string') {
        const found = await Contractor.findOne({
          $or: [{ company: updates.contractor }, { name: updates.contractor }],
        });
        project.contractor = found ? found._id : null;
      } else {
        project.contractor = null;
      }
      delete updates.contractor;
    }

    Object.assign(project, updates);
    await project.save();

    // Trigger lifecycle event if status changed
    if (updates.status && updates.status !== previousStatus) {
      let eventType = LIFECYCLE_EVENTS.PROJECT_CREATED;
      if (updates.status === 'UNDER_CONSTRUCTION') eventType = LIFECYCLE_EVENTS.CONSTRUCTION_STARTED;
      else if (updates.status === 'COMPLETED') eventType = LIFECYCLE_EVENTS.CONSTRUCTION_COMPLETED;
      else if (updates.status === 'COMMISSIONED') eventType = LIFECYCLE_EVENTS.ASSET_COMMISSIONED;

      await recordLifecycleEvent({
        eventType,
        projectId: project._id,
        assetId: project.createdAsset || null,
        performedBy: req.user._id,
        title: `Project Status: ${updates.status}`,
        description: `Project ${project.projectId} transitioned status from ${previousStatus} to ${updates.status}.`,
        metadata: { previousStatus, newStatus: updates.status },
      });
    }

    // Audit log
    await logAudit({
      action: 'PROJECT_UPDATED',
      entityType: 'Project',
      entityId: project._id,
      performedBy: req.user._id,
      changes: {
        before: { status: previousStatus },
        after: { status: project.status, approvedBudget: project.approvedBudget },
      },
      req,
    });

    const populated = await Project.findById(project._id)
      .populate('department')
      .populate('contractor')
      .populate('createdAsset');

    return successResponse(res, 200, 'Project updated successfully.', populated);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Convert/Commission completed project into an Asset linked to project
 * @route   POST /api/projects/:id/create-asset
 * @access  Private (SUPER_ADMIN, DEPARTMENT_ADMIN, ENGINEER)
 */
const createAssetFromProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id) && id.length === 24;
    const filter = isObjectId ? { _id: id } : { $or: [{ projectId: id.toUpperCase() }, { projectCode: id.toUpperCase() }] };

    const project = await Project.findOne(filter).populate('department').populate('contractor');
    if (!project) {
      return errorResponse(res, 404, 'Capital project not found.');
    }

    if (!['COMPLETED', 'COMMISSIONED', 'UNDER_CONSTRUCTION'].includes(project.status)) {
      return errorResponse(
        res,
        400,
        `Cannot commission asset while project is in '${project.status}' state. Project must be UNDER_CONSTRUCTION, COMPLETED, or COMMISSIONED.`
      );
    }

    if (project.createdAsset) {
      return errorResponse(
        res,
        400,
        'An infrastructure asset has already been commissioned from this project.'
      );
    }

    const {
      category = 'TRANSPORT',
      assetType = 'Bridge',
      custodian,
      latitude,
      longitude,
      expectedLifeYears = 50,
      description,
    } = req.body;

    // Generate unique Asset ID (e.g., BR-GJ-SRT-000123)
    const categoryPrefix = (category.slice(0, 2) || 'IN').toUpperCase();
    const deptCode = project.department?.code || 'PWD';
    const districtCode = (project.location?.district?.slice(0, 3) || 'SRT').toUpperCase();
    const count = await Asset.countDocuments();
    const assetId = `${categoryPrefix}-GJ-${districtCode}-${String(count + 1).padStart(6, '0')}`;

    const locCoords = {
      address: project.location?.address || `${project.projectName} Site`,
      city: project.location?.city || 'Surat',
      district: project.location?.district || 'Surat',
      state: project.location?.state || 'Gujarat',
      pincode: project.location?.pincode || '395001',
      latitude: latitude ? parseFloat(latitude) : (project.location?.latitude || 21.1702),
      longitude: longitude ? parseFloat(longitude) : (project.location?.longitude || 72.8311),
    };

    const newAsset = await Asset.create({
      assetId,
      name: project.projectName,
      category,
      assetType,
      description: description || project.description || `Commissioned from capital project ${project.projectId}`,
      department: project.department._id,
      custodian: custodian || req.user._id,
      location: locCoords,
      status: ASSET_STATUS.COMMISSIONED,
      condition: ASSET_CONDITION.EXCELLENT,
      healthScore: 100,
      installationDate: project.startDate || new Date(),
      commissioningDate: new Date(),
      expectedLifeYears: Number(expectedLifeYears) || 50,
      acquisitionCost: project.approvedBudget || project.estimatedCost || 0,
      totalMaintenanceCost: 0,
      totalLifecycleCost: project.approvedBudget || project.estimatedCost || 0,
      project: project._id,
      createdBy: req.user._id,
    });

    // Link Asset back to Project
    project.createdAsset = newAsset._id;
    if (project.status !== 'COMMISSIONED') {
      project.status = 'COMMISSIONED';
    }
    project.actualCompletion = new Date();
    await project.save();

    // 1. Record ASSET_CREATED lifecycle event
    await recordLifecycleEvent({
      eventType: LIFECYCLE_EVENTS.ASSET_CREATED,
      assetId: newAsset._id,
      projectId: project._id,
      performedBy: req.user._id,
      title: 'Digital Asset Identity Registered',
      description: `Asset ${newAsset.assetId} ("${newAsset.name}") officially commissioned from Project ${project.projectId}. Capitalized acquisition: ₹${newAsset.acquisitionCost}.`,
      metadata: {
        assetId: newAsset.assetId,
        projectId: project.projectId,
        acquisitionCost: newAsset.acquisitionCost,
        category: newAsset.category,
      },
    });

    // 2. Record ASSET_COMMISSIONED lifecycle event
    await recordLifecycleEvent({
      eventType: LIFECYCLE_EVENTS.ASSET_COMMISSIONED,
      assetId: newAsset._id,
      projectId: project._id,
      performedBy: req.user._id,
      title: 'Commissioned for Public Service',
      description: `Asset inaugurated and entered public operations under jurisdiction of ${project.department?.name}.`,
      metadata: { commissioningDate: newAsset.commissioningDate },
    });

    // Audit log
    await logAudit({
      action: 'ASSET_CREATED_FROM_PROJECT',
      entityType: 'Asset',
      entityId: newAsset._id,
      performedBy: req.user._id,
      changes: {
        after: {
          assetId: newAsset.assetId,
          projectId: project.projectId,
          cost: newAsset.acquisitionCost,
        },
      },
      req,
    });

    return successResponse(
      res,
      201,
      `Asset ${newAsset.assetId} successfully commissioned from Project ${project.projectId}.`,
      {
        asset: newAsset,
        project,
      }
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  createAssetFromProject,
};
