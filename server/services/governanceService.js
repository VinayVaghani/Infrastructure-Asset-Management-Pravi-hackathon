const Asset = require('../models/Asset');
const Inspection = require('../models/Inspection');
const Document = require('../models/Document');
const WorkOrder = require('../models/WorkOrder');
const Issue = require('../models/Issue');
const MaintenanceRecord = require('../models/MaintenanceRecord');
const FinancialRecord = require('../models/FinancialRecord');
const { recordLifecycleEvent } = require('./lifecycleService');
const { logAudit } = require('./auditService');
const { LIFECYCLE_EVENTS } = require('../utils/constants');

/**
 * 1. Data Quality Engine
 * Evaluates completeness across 15 standard government infrastructure criteria
 */
const evaluateAssetDataQuality = async (asset) => {
  const criteria = [
    { field: 'assetId', label: 'Asset ID Code', check: () => Boolean(asset.assetId && asset.assetId.trim()) },
    { field: 'name', label: 'Asset Title / Name', check: () => Boolean(asset.name && asset.name.length >= 3) },
    { field: 'category', label: 'Asset Category', check: () => Boolean(asset.category) },
    { field: 'assetType', label: 'Asset Classification Type', check: () => Boolean(asset.assetType) },
    { field: 'department', label: 'Jurisdictional Department', check: () => Boolean(asset.department) },
    { field: 'custodian', label: 'Assigned Custodian Officer', check: () => Boolean(asset.custodian) },
    { field: 'address', label: 'Physical Site Address', check: () => Boolean(asset.location?.address && asset.location.address.trim()) },
    {
      field: 'gps',
      label: 'Geospatial GPS Coordinates',
      check: () => Boolean(asset.location?.latitude && asset.location?.longitude && !isNaN(asset.location.latitude) && !isNaN(asset.location.longitude)),
    },
    { field: 'status', label: 'Operational Status', check: () => Boolean(asset.status) },
    { field: 'condition', label: 'Structural Condition Rating', check: () => Boolean(asset.condition) },
    { field: 'commissioningDate', label: 'Commissioning Date', check: () => Boolean(asset.commissioningDate) },
    { field: 'expectedLifeYears', label: 'Design Service Life', check: () => Boolean(asset.expectedLifeYears && asset.expectedLifeYears > 0) },
    { field: 'acquisitionCost', label: 'Acquisition / Capitalization Cost', check: () => Boolean(asset.acquisitionCost && asset.acquisitionCost > 0) },
  ];

  let passed = 0;
  const missingFields = [];

  for (const item of criteria) {
    if (item.check()) {
      passed += 1;
    } else {
      missingFields.push(item.label);
    }
  }

  // 14. Check Latest Inspection
  const hasInspection = await Inspection.exists({ asset: asset._id, status: 'COMPLETED' });
  if (hasInspection) {
    passed += 1;
  } else {
    missingFields.push('Completed Inspection Audit');
  }

  // 15. Check Attached Documents
  const hasDocument = await Document.exists({ asset: asset._id });
  if (hasDocument) {
    passed += 1;
  } else {
    missingFields.push('Official Document / Drawing / Certificate');
  }

  const totalCriteria = criteria.length + 2; // 15
  const completenessScore = Math.round((passed / totalCriteria) * 100);

  let qualityRating = 'COMPLETE';
  if (completenessScore < 50) {
    qualityRating = 'CRITICAL_INCOMPLETE';
  } else if (completenessScore < 85) {
    qualityRating = 'INCOMPLETE';
  }

  return {
    completenessScore,
    qualityRating,
    passedCount: passed,
    totalCriteria,
    missingFields,
  };
};

/**
 * Helper: Haversine distance in meters
 */
const calculateHaversineMeters = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * 2. Duplicate Detection Engine
 * Scans assets for duplicates based on name, proximity, type, department
 */
const detectDuplicates = async () => {
  const assets = await Asset.find({})
    .populate('department', 'name code')
    .populate('custodian', 'name')
    .lean();

  const duplicates = [];

  for (let i = 0; i < assets.length; i++) {
    for (let j = i + 1; j < assets.length; j++) {
      const a = assets[i];
      const b = assets[j];

      let matchScore = 0;
      const reasons = [];

      // 1. Same Asset Type
      if (a.assetType && b.assetType && a.assetType.toLowerCase() === b.assetType.toLowerCase()) {
        matchScore += 20;
        reasons.push(`Identical asset type: ${a.assetType}`);
      }

      // 2. Same Department
      if (
        a.department &&
        b.department &&
        a.department._id?.toString() === b.department._id?.toString()
      ) {
        matchScore += 20;
        reasons.push(`Same managing department: ${a.department.name || a.department.code}`);
      }

      // 3. Name similarity check (Exact, Substring, and Token Jaccard overlap)
      const nameA = a.name.toLowerCase().trim();
      const nameB = b.name.toLowerCase().trim();
      const wordsA = new Set(nameA.split(/\s+/).filter((w) => w.length > 2));
      const wordsB = new Set(nameB.split(/\s+/).filter((w) => w.length > 2));
      const intersection = [...wordsA].filter((w) => wordsB.has(w));
      const overlapRatio = Math.max(wordsA.size, wordsB.size) > 0 ? intersection.length / Math.max(wordsA.size, wordsB.size) : 0;

      if (nameA === nameB) {
        matchScore += 40;
        reasons.push('Identical asset name');
      } else if (nameA.includes(nameB) || nameB.includes(nameA)) {
        matchScore += 25;
        reasons.push('High substring name similarity');
      } else if (overlapRatio >= 0.4) {
        matchScore += 20;
        reasons.push(`High name token overlap (${Math.round(overlapRatio * 100)}%)`);
      }

      // 4. GPS proximity check
      const dist = calculateHaversineMeters(
        a.location?.latitude,
        a.location?.longitude,
        b.location?.latitude,
        b.location?.longitude
      );

      if (dist <= 30) {
        matchScore += 35;
        reasons.push(`Colocated GPS: ${Math.round(dist)}m apart`);
      } else if (dist <= 100) {
        matchScore += 20;
        reasons.push(`Immediate proximity: ${Math.round(dist)}m apart`);
      }

      // Flag if matchScore >= 50
      if (matchScore >= 50) {
        duplicates.push({
          primaryAsset: a,
          candidateDuplicate: b,
          matchScore: Math.min(100, matchScore),
          matchReasons: reasons,
          distanceMeters: Math.round(dist),
        });
      }
    }
  }

  return duplicates;
};

/**
 * 3. Merge Duplicate Assets
 * Reassigns child entities to primary asset and decommissions duplicate
 */
const mergeDuplicateAssets = async (primaryId, duplicateId, user, req) => {
  const [primary, duplicate] = await Promise.all([
    Asset.findById(primaryId),
    Asset.findById(duplicateId),
  ]);

  if (!primary || !duplicate) {
    throw new Error('Both primary asset and duplicate candidate must exist.');
  }

  if (primary._id.toString() === duplicate._id.toString()) {
    throw new Error('Cannot merge an asset into itself.');
  }

  // Re-link Inspections
  await Inspection.updateMany({ asset: duplicate._id }, { asset: primary._id });

  // Re-link Issues
  await Issue.updateMany({ asset: duplicate._id }, { asset: primary._id });

  // Re-link Work Orders
  await WorkOrder.updateMany({ asset: duplicate._id }, { asset: primary._id });

  // Re-link Maintenance
  await MaintenanceRecord.updateMany({ asset: duplicate._id }, { asset: primary._id });

  // Re-link Documents
  await Document.updateMany({ asset: duplicate._id }, { asset: primary._id });

  // Re-link Financial Records
  await FinancialRecord.updateMany({ asset: duplicate._id }, { asset: primary._id });

  // Sum total maintenance costs
  primary.totalMaintenanceCost = (primary.totalMaintenanceCost || 0) + (duplicate.totalMaintenanceCost || 0);
  primary.totalLifecycleCost = (primary.acquisitionCost || 0) + primary.totalMaintenanceCost;
  await primary.save();

  // Mark duplicate as RETIRED / DECOMMISSIONED
  duplicate.status = 'DECOMMISSIONED';
  duplicate.description = `${duplicate.description || ''} [MERGED into ${primary.assetId} on ${new Date().toISOString()}]`;
  await duplicate.save();

  // Record Lifecycle Event on primary
  await recordLifecycleEvent({
    eventType: LIFECYCLE_EVENTS.ASSET_CREATED,
    assetId: primary._id,
    performedBy: user._id,
    title: 'Duplicate Asset Record Merged',
    description: `Asset ${duplicate.assetId} ("${duplicate.name}") was merged into this primary record. All historical inspections, maintenance, work orders, and financial transactions consolidated.`,
    metadata: {
      mergedDuplicateId: duplicate.assetId,
      mergedDuplicateDbId: duplicate._id,
    },
  });

  // Audit log
  await logAudit({
    action: 'MERGE',
    entityType: 'Asset',
    entityId: primary._id,
    performedBy: user._id,
    changes: {
      primaryAsset: primary.assetId,
      mergedAsset: duplicate.assetId,
    },
    req,
  });

  return { primary, duplicate };
};

module.exports = {
  evaluateAssetDataQuality,
  detectDuplicates,
  mergeDuplicateAssets,
};
