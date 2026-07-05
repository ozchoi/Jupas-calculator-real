import type { Programme } from "../types/programme";

export type AdmissionStatus = "uq" | "medianMean" | "lq" | "minimumOnly" | "notQualified";

export type ChanceCategory =
  | "Above median"
  | "Around LQ-Median"
  | "Below LQ"
  | "Profile reference only"
  | "Insufficient data";

export function classifyRecommendation(programme: Programme, score: number): ChanceCategory {
  if (programme.medianProfile || programme.lowerQuartileProfile || programme.dataQuality === "profile-only") {
    return "Profile reference only";
  }
  if (typeof programme.median !== "number" || typeof programme.lowerQuartile !== "number") {
    return "Insufficient data";
  }
  if (score >= programme.median) return "Above median";
  if (score >= programme.lowerQuartile) return "Around LQ-Median";
  return "Below LQ";
}

export function chanceRank(category: ChanceCategory): number {
  return {
    "Above median": 4,
    "Around LQ-Median": 3,
    "Below LQ": 1,
    "Profile reference only": 0,
    "Insufficient data": 0,
  }[category];
}

export function scoreTier(programme: Programme, score: number): "uq" | "median" | "lq" | "below" | "na" {
  if (typeof programme.upperQuartile === "number" && score >= programme.upperQuartile) return "uq";
  if (typeof programme.median === "number" && score >= programme.median) return "median";
  if (typeof programme.lowerQuartile === "number" && score >= programme.lowerQuartile) return "lq";
  if (typeof programme.lowerQuartile === "number") return "below";
  return "na";
}

export function scoreTierLabel(tier: ReturnType<typeof scoreTier>, fallback: ChanceCategory): string {
  return {
    uq: ">= UQ",
    median: ">= Median",
    lq: ">= LQ",
    below: "Below LQ",
    na: fallback,
  }[tier];
}

export function admissionStatus(programme: Programme, score: number, meetsRequirements: boolean): AdmissionStatus {
  if (!meetsRequirements) return "notQualified";
  if (typeof programme.upperQuartile === "number" && score >= programme.upperQuartile) return "uq";
  if (typeof programme.median === "number" && score >= programme.median) return "medianMean";
  if (typeof programme.mean === "number" && score >= programme.mean) return "medianMean";
  if (typeof programme.lowerQuartile === "number" && score >= programme.lowerQuartile) return "lq";
  return "minimumOnly";
}

export function admissionStatusLabel(status: AdmissionStatus): string {
  return {
    uq: ">= UQ",
    medianMean: ">= Median/Mean",
    lq: ">= LQ",
    minimumOnly: "Meets minimum only",
    notQualified: "Does not meet requirement",
  }[status];
}
