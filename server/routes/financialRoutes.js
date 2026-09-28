const express = require('express');
const router = express.Router();
const {
  getFinancialRecords,
  getFinancialSummary,
  createFinancialRecord,
} = require('../controllers/financialController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { ROLES } = require('../utils/constants');

router.use(protect);

router.get('/summary', getFinancialSummary);

router
  .route('/')
  .get(getFinancialRecords)
  .post(
    authorize(ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN, ROLES.FINANCE_OFFICER),
    createFinancialRecord
  );

module.exports = router;
