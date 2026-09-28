const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const assetRoutes = require('./assetRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const healthRoutes = require('./healthRoutes');
const departmentRoutes = require('./departmentRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const inspectionRoutes = require('./inspectionRoutes');
const auditRoutes = require('./auditRoutes');
const issueRoutes = require('./issueRoutes');
const maintenanceRoutes = require('./maintenanceRoutes');
const workOrderRoutes = require('./workOrderRoutes');
const contractorRoutes = require('./contractorRoutes');
const projectRoutes = require('./projectRoutes');
const documentRoutes = require('./documentRoutes');
const financialRoutes = require('./financialRoutes');
const governanceRoutes = require('./governanceRoutes');

router.use('/auth', authRoutes);
router.use('/assets', assetRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/health', healthRoutes);
router.use('/departments', departmentRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/inspections', inspectionRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/issues', issueRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/work-orders', workOrderRoutes);
router.use('/contractors', contractorRoutes);
router.use('/projects', projectRoutes);
router.use('/documents', documentRoutes);
router.use('/financials', financialRoutes);
router.use('/governance', governanceRoutes);

module.exports = router;
