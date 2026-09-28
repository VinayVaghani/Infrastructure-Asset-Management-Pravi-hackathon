const express = require('express');
const router = express.Router();
const {
  getIssues,
  getIssueById,
  createIssue,
  updateIssue,
} = require('../controllers/issueController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getIssues)
  .post(createIssue);

router.route('/:id')
  .get(getIssueById)
  .put(updateIssue);

module.exports = router;
