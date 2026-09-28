const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  createAssetFromProject,
} = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { ROLES } = require('../utils/constants');

router.use(protect);

router
  .route('/')
  .get(getProjects)
  .post(
    authorize(ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN, ROLES.ENGINEER),
    createProject
  );

router
  .route('/:id')
  .get(getProjectById)
  .put(
    authorize(ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN, ROLES.ENGINEER),
    updateProject
  );

router.post(
  '/:id/create-asset',
  authorize(ROLES.SUPER_ADMIN, ROLES.DEPARTMENT_ADMIN, ROLES.ENGINEER),
  createAssetFromProject
);

module.exports = router;
