const express = require('express');
const router = express.Router();
const {
  getDocuments,
  getDocumentById,
  createDocument,
  deleteDocument,
} = require('../controllers/documentController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { ROLES } = require('../utils/constants');

router.use(protect);

router
  .route('/')
  .get(getDocuments)
  .post(createDocument);

router
  .route('/:id')
  .get(getDocumentById)
  .delete(
    authorize(ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN),
    deleteDocument
  );

module.exports = router;
