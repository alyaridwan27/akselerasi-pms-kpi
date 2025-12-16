// src/utils/reviewUtils.ts

export function calculateKPIScore(kpis: any[]) {
  if (!kpis.length) return 0;

  const score = kpis.reduce((sum, k) => {
    const pct =
      k.targetValue > 0
        ? Math.min(100, (k.currentValue / k.targetValue) * 100)
        : 0;

    return sum + pct * (k.weight / 100);
  }, 0);

  return Math.round(score);
}

export function calculateFinalScore(kpiScore: number, feedback360: number) {
  return Math.round(kpiScore * 0.7 + feedback360 * 0.3);
}

export function mapPerformanceCategory(score: number) {
  if (score >= 90) return "Outstanding";
  if (score >= 80) return "High Performer";
  if (score >= 70) return "Solid Performer";
  return "Needs Improvement";
}
