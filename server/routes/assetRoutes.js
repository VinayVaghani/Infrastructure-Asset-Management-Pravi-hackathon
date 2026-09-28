const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/assetController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { ROLES } = require('../utils/constants');

// All asset routes require authentication
router.use(protect);

router
  .route('/')
  .get(getAssets)
  .post(
    authorize(ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN, ROLES.ENGINEER),
    createAsset
  );

router
  .route('/:id')
  .get(getAssetById)
  .put(
    authorize(ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN, ROLES.ENGINEER),
    updateAsset
  )
  .delete(
    authorize(ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN),
    deleteAsset
  );

// Digital Asset Passport Sub-Resources
router.get('/:id/lifecycle', getAssetLifecycle);
router.get('/:id/inspections', getAssetInspections);
router.get('/:id/maintenance', getAssetMaintenance);
router.get('/:id/work-orders', getAssetWorkOrders);
router.get('/:id/documents', getAssetDocuments);
router.get('/:id/audit', getAssetAudit);
router.get('/:id/issues', getAssetIssues);
router.get('/:id/financials', getAssetFinancials);

// Asset Passport Actions
router.post(
  '/:id/transfer',
  authorize(ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN),
  transferAsset
);
router.post(
  '/:id/issues',
  authorize(ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN, ROLES.ENGINEER, ROLES.INSPECTOR),
  createAssetIssue
);
router.post(
  '/:id/work-orders',
  authorize(ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN, ROLES.ENGINEER),
  createAssetWorkOrder
);
router.post(
  '/:id/inspections',
  authorize(ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN, ROLES.ENGINEER, ROLES.INSPECTOR),
  createAssetInspection
);
router.post('/:id/documents', createAssetDocument);

module.exports = router;
