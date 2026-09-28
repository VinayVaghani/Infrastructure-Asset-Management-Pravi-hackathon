const express = require('express');
const router = express.Router();
const {
  getWorkOrders,
  getWorkOrderById,
  createWorkOrder,
  updateWorkOrder,
} = require('../controllers/workOrderController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getWorkOrders)
  .post(createWorkOrder);

router.route('/:id')
  .get(getWorkOrderById)
  .put(updateWorkOrder);

module.exports = router;
