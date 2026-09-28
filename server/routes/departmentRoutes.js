const express = require('express');
const router = express.Router();
const { getDepartments, getOfficers } = require('../controllers/departmentController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getDepartments);
router.get('/officers', getOfficers);

module.exports = router;
