const express = require('express');
const router = express.Router();
const {
  getDataQualitySummary,
  getAssetDataQuality,
  getDuplicates,
  mergeDuplicates,
} = require('../controllers/governanceController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { ROLES } = require('../utils/constants');

router.use(protect);

router.get('/data-quality', getDataQualitySummary);
router.get('/data-quality/:id', getAssetDataQuality);
router.get('/duplicates', getDuplicates);
router.post(
  '/duplicates/merge',
  authorize(ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN),
  mergeDuplicates
);

module.exports = router;
