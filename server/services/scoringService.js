/**
 * InfraTrack Condition Scoring Engine
 * 
 * Configurable application/demo weighting algorithm:
 * - Structural Condition = 30%
 * - Surface Condition = 20%
 * - Safety Condition = 20%
 * - Operational Condition = 15%
 * - Age / Lifecycle Risk = 15%
 * 
 * Maps 0-100 score to Condition:
 * 90-100 -> EXCELLENT
 * 75-89  -> GOOD
 * 50-74  -> MODERATE
 * 25-49  -> POOR
 * 0-24   -> CRITICAL
 * 
 * Note: These are configurable application/demo thresholds, not official government engineering standards.
 */

const CONDITION_SUB_SCORES = {
  EXCELLENT: 100,
  GOOD: 80,
  MODERATE: 60,
  POOR: 40,
  CRITICAL: 15,
};

/**
 * Compute composite infrastructure health score
 */
const calculateHealthScore = ({
  structuralCondition = 'GOOD',
  surfaceCondition = 'GOOD',
  safetyCondition = 'GOOD',
  operationalCondition = 'GOOD',
  installationDate = null,
  expectedLifeYears = 25,
}) => {
  const structScore = CONDITION_SUB_SCORES[structuralCondition] ?? 80;
  const surfScore = CONDITION_SUB_SCORES[surfaceCondition] ?? 80;
  const safeScore = CONDITION_SUB_SCORES[safetyCondition] ?? 80;
  const opsScore = CONDITION_SUB_SCORES[operationalCondition] ?? 80;

  // Age/Risk calculation
  let ageRiskScore = 85;
  if (installationDate && expectedLifeYears > 0) {
    const ageYears = (Date.now() - new Date(installationDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    const lifeRatio = ageYears / expectedLifeYears;

    if (lifeRatio <= 0.20) {
      ageRiskScore = 100;
    } else if (lifeRatio <= 0.50) {
      ageRiskScore = 85;
    } else if (lifeRatio <= 0.75) {
      ageRiskScore = 70;
    } else if (lifeRatio <= 1.0) {
      ageRiskScore = 50;
    } else {
      ageRiskScore = 25; // Exceeded design service life
    }
  }

  // Weighted calculation
  const weightedTotal =
    structScore * 0.30 +
    surfScore * 0.20 +
    safeScore * 0.20 +
    opsScore * 0.15 +
    ageRiskScore * 0.15;

  const finalScore = Math.min(100, Math.max(0, Math.round(weightedTotal)));

  // Map to condition
  let overallCondition = 'GOOD';
  if (finalScore >= 90) {
    overallCondition = 'EXCELLENT';
  } else if (finalScore >= 75) {
    overallCondition = 'GOOD';
  } else if (finalScore >= 50) {
    overallCondition = 'MODERATE';
  } else if (finalScore >= 25) {
    overallCondition = 'POOR';
  } else {
    overallCondition = 'CRITICAL';
  }

  return {
    healthScore: finalScore,
    overallCondition,
    breakdown: {
      structural: structScore,
      surface: surfScore,
      safety: safeScore,
      operational: opsScore,
      ageRisk: ageRiskScore,
    },
  };
};

module.exports = {
  calculateHealthScore,
  CONDITION_SUB_SCORES,
};
