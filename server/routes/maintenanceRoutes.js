const express = require('express');
const router = express.Router();
const {
  getMaintenanceRecords,
  getMaintenanceRecordById,
  createMaintenanceRecord,
  updateMaintenanceRecord,
} = require('../controllers/maintenanceController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getMaintenanceRecords)
  .post(createMaintenanceRecord);

router.route('/:id')
  .get(getMaintenanceRecordById)
  .put(updateMaintenanceRecord);

module.exports = router;
