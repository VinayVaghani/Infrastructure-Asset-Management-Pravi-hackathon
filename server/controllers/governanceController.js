const Asset = require('../models/Asset');
const {
  evaluateAssetDataQuality,
  detectDuplicates,
  mergeDuplicateAssets,
} = require('../services/governanceService');
const { logAudit } = require('../services/auditService');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * @desc    Get system-wide Data Quality & Completeness Dashboard
 * @route   GET /api/governance/data-quality
 * @access  Private
 */
const getDataQualitySummary = async (req, res, next) => {
  try {
    const assets = await Asset.find({})
      .populate('department', 'name code')
      .populate('custodian', 'name email designation');

    const assetResults = [];
    let totalScoreSum = 0;
    let completeCount = 0;
    let incompleteCount = 0;
    let criticalIncompleteCount = 0;

    for (const asset of assets) {
      const evaluation = await evaluateAssetDataQuality(asset);
      totalScoreSum += evaluation.completenessScore;

      if (evaluation.qualityRating === 'COMPLETE') completeCount++;
      else if (evaluation.qualityRating === 'INCOMPLETE') incompleteCount++;
      else criticalIncompleteCount++;

      assetResults.push({
        _id: asset._id,
        assetId: asset.assetId,
        name: asset.name,
        category: asset.category,
        assetType: asset.assetType,
        department: asset.department,
        custodian: asset.custodian,
        completenessScore: evaluation.completenessScore,
        qualityRating: evaluation.qualityRating,
        passedCount: evaluation.passedCount,
        totalCriteria: evaluation.totalCriteria,
        missingFields: evaluation.missingFields,
      });
    }

    const totalAssets = assets.length;
    const averageScore = totalAssets > 0 ? Math.round(totalScoreSum / totalAssets) : 100;

    return successResponse(res, 200, 'Data quality audit completed.', {
      summary: {
        totalAssets,
        averageScore,
        completeAssetsCount: completeCount,
        incompleteAssetsCount: incompleteCount,
        criticalIncompleteAssetsCount: criticalIncompleteCount,
      },
      assets: assetResults.sort((a, b) => a.completenessScore - b.completenessScore),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get data completeness for single asset
 * @route   GET /api/governance/data-quality/:id
 * @access  Private
 */
const getAssetDataQuality = async (req, res, next) => {
  try {
    const { id } = req.params;
    const asset = await Asset.findById(id).populate('department').populate('custodian');
    if (!asset) {
      return errorResponse(res, 404, 'Asset not found.');
    }

    const evaluation = await evaluateAssetDataQuality(asset);
    return successResponse(res, 200, 'Asset data quality evaluated.', {
      assetId: asset.assetId,
      name: asset.name,
      ...evaluation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Scan and detect duplicate asset pairs
 * @route   GET /api/governance/duplicates
 * @access  Private
 */
const getDuplicates = async (req, res, next) => {
  try {
    const duplicates = await detectDuplicates();
    return successResponse(res, 200, 'Duplicate candidate scan completed.', {
      totalFound: duplicates.length,
      duplicates,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Merge duplicate asset into primary asset
 * @route   POST /api/governance/duplicates/merge
 * @access  Private (SUPER_ADMIN, DEPARTMENT_ADMIN)
 */
const mergeDuplicates = async (req, res, next) => {
  try {
    const { primaryAssetId, secondaryAssetId } = req.body;
    if (!primaryAssetId || !secondaryAssetId) {
      return errorResponse(res, 400, 'Both primaryAssetId and secondaryAssetId are required for merge.');
    }

    const result = await mergeDuplicateAssets(primaryAssetId, secondaryAssetId, req.user, req);
    return successResponse(
      res,
      200,
      `Asset ${result.duplicate.assetId} successfully consolidated into ${result.primary.assetId}.`,
      result
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDataQualitySummary,
  getAssetDataQuality,
  getDuplicates,
  mergeDuplicates,
};
