const express = require('express');
const router = express.Router();
const {
  getContractors,
  getContractorById,
  createContractor,
  updateContractor,
} = require('../controllers/contractorController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { ROLES } = require('../utils/constants');

router.use(protect);

router.route('/')
  .get(getContractors)
  .post(authorize(ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN, ROLES.ENGINEER), createContractor);

router.route('/:id')
  .get(getContractorById)
  .put(authorize(ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN, ROLES.ENGINEER), updateContractor);

module.exports = router;
