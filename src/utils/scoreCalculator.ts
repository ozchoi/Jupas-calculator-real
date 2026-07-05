import gradeConversion from "../data/gradeConversion.json";
import type { CalculationResult, Programme, ScoreScale, UsedSubject } from "../types/programme";
import type { StudentResult } from "../types/student";

const coreCsdSubject = "Citizenship and Social Development";

export function gradeToScore(grade: string, scale: ScoreScale = "SCALE_8_5"): number {
  const scoreMap = gradeConversion[scale] as Record<string, number>;
  return scoreMap[grade] ?? 0;
}

function formulaCount(formulaType: Programme["formulaType"]): number {
  if (formulaType === "BEST_6") return 6;
  if (formulaType === "BEST_4") return 4;
  return 5;
}

function multiplierFor(programme: Programme, subject: string): { multiplier: number; note?: string } {
  let multiplier = 1;
  let note: string | undefined;

  programme.weightingRules?.forEach((rule) => {
    if (rule.subjects.includes(subject) && rule.multiplier > multiplier) {
      multiplier = rule.multiplier;
      note = rule.note ?? `x${rule.multiplier}`;
    }
  });

  return { multiplier, note };
}

export function calculateProgrammeScore(
  programme: Programme,
  results: StudentResult[],
): CalculationResult {
  const scored: UsedSubject[] = results
    .filter((result) => result.grade !== "Not taken" && result.subject !== coreCsdSubject)
    .map((result) => {
      const baseScore = gradeToScore(result.grade, programme.scoreScale);
      const { multiplier, note } = multiplierFor(programme, result.subject);
      return {
        subject: result.subject,
        grade: result.grade,
        baseScore,
        multiplier,
        weightedScore: Number((baseScore * multiplier).toFixed(2)),
        note,
      };
    })
    .filter((item) => item.baseScore > 0);

  const selected = scored
    .sort((a, b) => b.weightedScore - a.weightedScore)
    .slice(0, formulaCount(programme.formulaType));

  if (programme.formulaType === "BEST_5_PLUS_BONUS") {
    const sixth = scored
      .filter((item) => !selected.some((used) => used.subject === item.subject))
      .sort((a, b) => b.weightedScore - a.weightedScore)[0];

    if (sixth) {
      selected.push({
        ...sixth,
        multiplier: Number((sixth.multiplier * 0.5).toFixed(2)),
        weightedScore: Number((sixth.weightedScore * 0.5).toFixed(2)),
        note: "6th subject bonus x0.5",
      });
    }
  }

  const totalScore = Number(selected.reduce((sum, item) => sum + item.weightedScore, 0).toFixed(2));
  const breakdown = selected.map(
    (item) =>
      `${item.subject}: ${item.grade} = ${item.baseScore} x ${item.multiplier} = ${item.weightedScore}`,
  );

  return {
    totalScore,
    usedSubjects: selected,
    breakdown,
  };
}
