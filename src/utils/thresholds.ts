import type { Programme } from "../types/programme";

export type ThresholdKey = "lowerQuartile" | "median" | "upperQuartile";

export function isNumericThreshold(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function meetsNumericThreshold(score: number, threshold: unknown): boolean {
  return Number.isFinite(score) && isNumericThreshold(threshold) && score >= threshold;
}

export function scoreDifference(score: number, threshold: unknown): number | undefined {
  if (!Number.isFinite(score) || !isNumericThreshold(threshold)) return undefined;
  return Number((score - threshold).toFixed(2));
}

export function programmeMeetsThreshold(programme: Programme, score: number, key: ThresholdKey): boolean {
  return meetsNumericThreshold(score, programme[key]);
}

export function programmeMeetsInclusiveThreshold(programme: Programme, score: number, key: ThresholdKey): boolean {
  const meetsUq = meetsNumericThreshold(score, programme.upperQuartile);
  const meetsMedianMean =
    meetsNumericThreshold(score, programme.median) ||
    meetsNumericThreshold(score, programme.mean) ||
    meetsNumericThreshold(score, programme.averageScore);
  const meetsLq = meetsNumericThreshold(score, programme.lowerQuartile);

  if (key === "upperQuartile") return meetsUq;
  if (key === "median") return meetsUq || meetsMedianMean;
  return meetsUq || meetsMedianMean || meetsLq;
}
