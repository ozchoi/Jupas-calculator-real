import type { Programme } from "../types/programme";

export type ChanceCategory =
  | "Above median"
  | "Around median"
  | "Around lower quartile"
  | "Below lower quartile"
  | "Insufficient data";

export function classifyRecommendation(programme: Programme, score: number): ChanceCategory {
  const stats = programme.admissionStats;
  if (!stats?.lowerQuartile && !stats?.median) return "Insufficient data";
  if (stats.median && score >= stats.median + 1) return "Above median";
  if (stats.median && score >= stats.median - 1) return "Around median";
  if (stats.lowerQuartile && score >= stats.lowerQuartile - 1) return "Around lower quartile";
  return "Below lower quartile";
}

export function chanceRank(category: ChanceCategory): number {
  return {
    "Above median": 4,
    "Around median": 3,
    "Around lower quartile": 2,
    "Below lower quartile": 1,
    "Insufficient data": 0,
  }[category];
}
