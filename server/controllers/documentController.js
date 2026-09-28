const mongoose = require('mongoose');
const Document = require('../models/Document');
const Asset = require('../models/Asset');
const Project = require('../models/Project');
const { logAudit } = require('../services/auditService');
const { recordLifecycleEvent } = require('../services/lifecycleService');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * Storage Abstraction:
 * Generates secure persistent URL for documents (never saves raw binary buffers in MongoDB)
 */
const processDocumentUpload = (rawUrl, originalName, fileType) => {
  if (rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:'))) {
    return {
      fileUrl: rawUrl,
      storageProvider: rawUrl.includes('cloudinary.com') ? 'cloudinary' : 'storage_abstraction',
    };
  }
  // If simulated/abstracted storage
  const cleanExt = (originalName || 'file.pdf').split('.').pop();
  const safeId = `infratrack-vault-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${cleanExt}`;
  return {
    fileUrl: `https://storage.infratrack.gov.in/vault/${safeId}`,
    storageProvider: 'storage_abstraction',
  };
};

/**
 * @desc    Get all documents with associations & filtering
 * @route   GET /api/documents
 * @access  Private
 */
const getDocuments = async (req, res, next) => {
  try {
    const {
      assetId,
      projectId,
      inspectionId,
      maintenanceId,
      workOrderId,
      type,
      search,
      page = 1,
      limit = 30,
    } = req.query;

    const query = {};

    if (assetId) query.asset = assetId;
    if (projectId) query.project = projectId;
    if (inspectionId) query.inspection = inspectionId;
    if (maintenanceId) query.maintenance = maintenanceId;
    if (workOrderId) query.workOrder = workOrderId;
    if (type) {
      query.$or = [{ type: new RegExp(`^${type}$`, 'i') }, { documentType: new RegExp(`^${type}$`, 'i') }];
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { name: regex },
        { title: regex },
        { documentId: regex },
        { description: regex },
        { tags: regex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [documents, total] = await Promise.all([
      Document.find(query)
        .populate('asset', 'assetId name category')
        .populate('project', 'projectId projectName')
        .populate('uploadedBy', 'name email designation role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Document.countDocuments(query),
    ]);

    return successResponse(res, 200, 'Documents retrieved successfully.', documents, {
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
 * @desc    Get single document
 * @route   GET /api/documents/:id
 * @access  Private
 */
const getDocumentById = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('asset')
      .populate('project')
      .populate('uploadedBy', 'name email designation role');

    if (!document) {
      return errorResponse(res, 404, 'Document record not found.');
    }

    return successResponse(res, 200, 'Document retrieved.', document);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload / Register new document
 * @route   POST /api/documents
 * @access  Private
 */
const createDocument = async (req, res, next) => {
  try {
    const {
      name,
      title,
      type = 'Other',
      documentType,
      fileUrl,
      fileType = 'application/pdf',
      fileSize = 1048576,
      version = 1,
      description = '',
      asset: assetParam,
      project: projectParam,
      inspection,
      maintenance,
      workOrder,
      tags = [],
    } = req.body;

    const docName = name || title;
    if (!docName) {
      return errorResponse(res, 400, 'Document name or title is required.');
    }

    const { fileUrl: finalUrl, storageProvider } = processDocumentUpload(fileUrl, docName, fileType);

    // Resolve Asset if provided
    let assetId = null;
    if (assetParam) {
      if (mongoose.Types.ObjectId.isValid(assetParam)) {
        assetId = assetParam;
      } else {
        const found = await Asset.findOne({ assetId: assetParam.toUpperCase() });
        if (found) assetId = found._id;
      }
    }

    // Resolve Project if provided
    let projectId = null;
    if (projectParam) {
      if (mongoose.Types.ObjectId.isValid(projectParam)) {
        projectId = projectParam;
      } else {
        const found = await Project.findOne({ projectId: projectParam.toUpperCase() });
        if (found) projectId = found._id;
      }
    }

    const finalType = type || documentType || 'Other';
    const document = await Document.create({
      name: docName.trim(),
      title: docName.trim(),
      type: finalType,
      documentType: finalType,
      fileUrl: finalUrl,
      storageProvider,
      fileType,
      fileSize: Number(fileSize) || 1048576,
      version: Number(version) || 1,
      description: description.trim(),
      asset: assetId,
      project: projectId,
      inspection: inspection || null,
      maintenance: maintenance || null,
      workOrder: workOrder || null,
      tags: Array.isArray(tags) ? tags : [tags].filter(Boolean),
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
    });

    // Audit log
    await logAudit({
      action: 'DOCUMENT_UPLOADED',
      entityType: 'Document',
      entityId: document._id,
      performedBy: req.user._id,
      changes: {
        after: {
          name: document.name,
          type: document.type,
          asset: assetId,
          project: projectId,
        },
      },
      req,
    });

    const populated = await Document.findById(document._id)
      .populate('asset', 'assetId name category')
      .populate('project', 'projectId projectName')
      .populate('uploadedBy', 'name email designation role');

    return successResponse(res, 201, 'Document successfully vaulted in State Repository.', populated);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a document
 * @route   DELETE /api/documents/:id
 * @access  Private (SUPER_ADMIN, DEPARTMENT_ADMIN)
 */
const deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return errorResponse(res, 404, 'Document record not found.');
    }

    await Document.findByIdAndDelete(req.params.id);

    await logAudit({
      action: 'DOCUMENT_DELETED',
      entityType: 'Document',
      entityId: req.params.id,
      performedBy: req.user._id,
      changes: { before: { name: document.name, fileUrl: document.fileUrl } },
      req,
    });

    return successResponse(res, 200, 'Document removed from repository.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDocuments,
  getDocumentById,
  createDocument,
  deleteDocument,
};
