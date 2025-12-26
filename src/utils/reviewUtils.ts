// src/utils/reviewUtils.ts

/**
 * Calculates weighted KPI score based on individual KPI weights.
 */
export function calculateKPIScore(kpis: any[]) {
  if (!kpis || !kpis.length) return 0;

  const score = kpis.reduce((sum, k) => {
    const pct =
      k.targetValue > 0
        ? Math.min(100, (k.currentValue / k.targetValue) * 100)
        : 0;

    // Apply the weight of each individual KPI (e.g., 20% of total KPI score)
    return sum + pct * ((k.weight || 0) / 100);
  }, 0);

  return Math.round(score);
}

/**
 * Calculates Final Score using dynamic weights from Admin Settings.
 * Default is 70/30 if no settings are provided.
 */
export function calculateFinalScore(
  kpiScore: number, 
  feedback360: number, 
  kpiWeight: number = 70, 
  feedbackWeight: number = 30
) {
  // Formula: (KPI Score * KPI Weight%) + (Feedback Score * Feedback Weight%)
  const final = (kpiScore * (kpiWeight / 100)) + (feedback360 * (feedbackWeight / 100));
  return Math.round(final);
}

/**
 * Maps a numeric score to a performance category string.
 * Syncs with HRRewards.tsx and HRFinalReview.tsx categories.
 */
export function mapPerformanceCategory(score: number) {
  if (score >= 90) return "Outstanding";
  if (score >= 75) return "Good";
  if (score >= 60) return "Satisfactory";
  return "Needs Improvement";
}