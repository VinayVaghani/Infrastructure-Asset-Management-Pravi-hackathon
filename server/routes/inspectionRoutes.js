const express = require('express');
const router = express.Router();
const {
  getInspections,
  getInspectionById,
  createInspection,
  updateInspection,
} = require('../controllers/inspectionController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { ROLES } = require('../utils/constants');

router.use(protect);

router
  .route('/')
  .get(getInspections)
  .post(
    authorize(ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN, ROLES.ENGINEER, ROLES.INSPECTOR),
    createInspection
  );

router
  .route('/:id')
  .get(getInspectionById)
  .put(
    authorize(ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN, ROLES.ENGINEER, ROLES.INSPECTOR),
    updateInspection
  );

module.exports = router;
