import gradeConversion from "../data/gradeConversion.json";
import type { CalculationConfidence, CalculationResult, Programme, ScoreScale, UsedSubject } from "../types/programme";
import type { StudentResult } from "../types/student";

const coreCsdSubject = "Citizenship and Social Development";
const coreScoreSubjects = ["Chinese Language", "English Language", "Mathematics Compulsory Part"];

export function gradeToScore(grade: string, scale: ScoreScale = "SCALE_8_5"): number {
  const scoreMap = gradeConversion[scale] as Record<string, number>;
  return scoreMap[grade] ?? 0;
}

function formulaCount(formulaType: Programme["formulaType"]): number {
  if (formulaType === "BEST_6" || formulaType === "SIX_GRADED_SUBJECTS") return 6;
  if (formulaType === "BEST_4") return 4;
  return 5;
}

function isCoreScoreSubject(subject: string): boolean {
  return coreScoreSubjects.includes(subject);
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

  const selected = selectSubjects(programme, scored);

  const totalScore = Number(selected.reduce((sum, item) => sum + item.weightedScore, 0).toFixed(2));
  const breakdown = selected.map(
    (item) =>
      `${item.subject}: ${item.grade} = ${item.baseScore} x ${item.multiplier} = ${item.weightedScore}`,
  );

  return {
    totalScore,
    usedSubjects: selected,
    breakdown,
    confidence: calculationConfidence(programme),
    warning: calculationWarning(programme),
  };
}

function selectSubjects(programme: Programme, scored: UsedSubject[]): UsedSubject[] {
  if (programme.formulaType === "THREE_CORE_PLUS_TWO_ELECTIVE") {
    return selectWithRequired(scored, coreScoreSubjects, 5, (item) => !isCoreScoreSubject(item.subject));
  }

  if (programme.formulaType === "ENG_MATH_PLUS_BEST_3") {
    return selectWithRequired(scored, ["English Language", "Mathematics Compulsory Part"], 5);
  }

  if (programme.formulaType === "CHINESE_ENGLISH_PLUS_BEST_3") {
    return selectWithRequired(scored, ["Chinese Language", "English Language"], 5);
  }

  const required = requiredSubjectsFromFormula(programme.formulaRaw);
  const count = formulaCount(programme.formulaType);
  const selected = required.length ? selectWithRequired(scored, required, count) : bestSubjects(scored, count);

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

  return selected;
}

function bestSubjects(scored: UsedSubject[], count: number): UsedSubject[] {
  return [...scored].sort((a, b) => b.weightedScore - a.weightedScore).slice(0, count);
}

function selectWithRequired(
  scored: UsedSubject[],
  requiredSubjects: string[],
  totalCount: number,
  fillPredicate: (item: UsedSubject) => boolean = () => true,
): UsedSubject[] {
  const selected: UsedSubject[] = [];

  requiredSubjects.forEach((subject) => {
    const match = scored.find((item) => item.subject === subject);
    if (match && !selected.some((item) => item.subject === match.subject)) selected.push(match);
  });

  const fill = scored
    .filter((item) => !selected.some((used) => used.subject === item.subject))
    .filter(fillPredicate)
    .sort((a, b) => b.weightedScore - a.weightedScore)
    .slice(0, Math.max(0, totalCount - selected.length));

  return [...selected, ...fill].sort((a, b) => b.weightedScore - a.weightedScore);
}

function requiredSubjectsFromFormula(formulaRaw: string): string[] {
  const formula = formulaRaw.toLowerCase();
  const required: string[] = [];
  if (/include(?:s|\s)?[^.]*english/.test(formula)) required.push("English Language");
  if (/include(?:s|\s)?[^.]*chinese/.test(formula)) required.push("Chinese Language");
  if (/include(?:s|\s)?[^.]*math/.test(formula)) required.push("Mathematics Compulsory Part");
  return required;
}

function calculationConfidence(programme: Programme): CalculationConfidence {
  if (programme.weightingRules?.length && programme.source?.url) return "official-structured";
  if (isGenericFormula(programme) && (!programme.weightingRaw || programme.weightingRaw.trim() === "1")) {
    return "generic-formula";
  }
  return "reference-estimate";
}

function isGenericFormula(programme: Programme): boolean {
  switch (programme.formulaType) {
    case "BEST_4":
    case "BEST_5":
    case "BEST_6":
    case "SIX_GRADED_SUBJECTS":
    case "THREE_CORE_PLUS_TWO_ELECTIVE":
    case "ENG_MATH_PLUS_BEST_3":
    case "CHINESE_ENGLISH_PLUS_BEST_3":
      return true;
    default:
      return false;
  }
}

function calculationWarning(programme: Programme): string | undefined {
  if (calculationConfidence(programme) !== "reference-estimate") return undefined;
  return "Reference estimate: this programme has raw formula/weighting text that is not fully machine-verified against the official 2026 calculator.";
}
