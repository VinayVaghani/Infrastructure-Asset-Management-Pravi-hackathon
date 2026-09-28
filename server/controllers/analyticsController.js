const Asset = require('../models/Asset');
const Project = require('../models/Project');
const Inspection = require('../models/Inspection');
const Issue = require('../models/Issue');
const LifecycleEvent = require('../models/LifecycleEvent');
const { successResponse } = require('../utils/apiResponse');

/**
 * @desc    Get comprehensive government infrastructure dashboard metrics
 * @route   GET /api/analytics/dashboard-summary
 * @access  Private
 */
const getDashboardSummary = async (req, res, next) => {
  try {
    const [
      totalAssets,
      operationalCount,
      maintenanceCount,
      criticalConditionCount,
      activeProjectsCount,
      pendingInspectionsCount,
      openIssuesCount,
      categoryStats,
      conditionStats,
      recentEvents,
    ] = await Promise.all([
      Asset.countDocuments(),
      Asset.countDocuments({ status: 'OPERATIONAL' }),
      Asset.countDocuments({ status: 'UNDER_MAINTENANCE' }),
      Asset.countDocuments({ condition: 'CRITICAL' }),
      Project.countDocuments({ status: { $in: ['PLANNING', 'IN_PROGRESS'] } }),
      Inspection.countDocuments({ status: 'SCHEDULED' }),
      Issue.countDocuments({ status: { $in: ['OPEN', 'INVESTIGATING'] } }),
      Asset.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 }, totalCost: { $sum: '$acquisitionCost' } } },
        { $project: { category: '$_id', count: 1, totalCost: 1, _id: 0 } },
      ]),
      Asset.aggregate([
        { $group: { _id: '$condition', count: { $sum: 1 } } },
        { $project: { condition: '$_id', count: 1, _id: 0 } },
      ]),
      LifecycleEvent.find()
        .populate('asset', 'assetId name category')
        .populate('performedBy', 'name role designation')
        .sort({ timestamp: -1 })
        .limit(8),
    ]);

    // Compute total infrastructure portfolio valuation
    const totalValuationResult = await Asset.aggregate([
      { $group: { _id: null, totalValuation: { $sum: '$acquisitionCost' } } },
    ]);
    const totalValuation = totalValuationResult[0]?.totalValuation || 0;

    return successResponse(res, 200, 'Dashboard metrics retrieved successfully.', {
      kpi: {
        totalAssets,
        operationalCount,
        maintenanceCount,
        criticalConditionCount,
        activeProjectsCount,
        pendingInspectionsCount,
        openIssuesCount,
        totalValuation,
      },
      categoryDistribution: categoryStats,
      conditionDistribution: conditionStats,
      recentLifecycleEvents: recentEvents,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardSummary,
};
