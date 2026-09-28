const express = require('express');
const router = express.Router();
const {
  getDashboardSummary,
  getConditionDistribution,
  getCategoryDistribution,
  getMaintenanceTrends,
  getDashboardAlerts,
  resolveAlert,
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/summary', getDashboardSummary);
router.get('/condition-distribution', getConditionDistribution);
router.get('/category-distribution', getCategoryDistribution);
router.get('/maintenance-trends', getMaintenanceTrends);
router.get('/alerts', getDashboardAlerts);
router.patch('/alerts/:id/resolve', resolveAlert);

module.exports = router;
