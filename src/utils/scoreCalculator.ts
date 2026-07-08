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
  const direct = directFormulaMultiplier(programme.formulaRaw, subject);
  let multiplier = direct.multiplier;
  let note = direct.note;

  programme.weightingRules?.forEach((rule) => {
    if (rule.subjects.includes(subject) && rule.multiplier > multiplier) {
      multiplier = rule.multiplier;
      note = rule.note ?? `x${rule.multiplier}`;
    }
  });

  return { multiplier, note };
}

function directFormulaMultiplier(formulaRaw: string, subject: string): { multiplier: number; note?: string } {
  const formula = formulaRaw.replace(/\s+/g, " ");
  const directChecks: Array<[string, string[]]> = [
    ["English Language", ["Eng", "English"]],
    ["Chinese Language", ["Chin", "Chinese"]],
    ["Mathematics Compulsory Part", ["Math", "Mathematics"]],
    ["M1", ["M1"]],
    ["M2", ["M2"]],
  ];

  for (const [targetSubject, aliases] of directChecks) {
    if (subject !== targetSubject) continue;
    for (const alias of aliases) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const match = formula.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*x\\s*${escaped}\\b`, "i"));
      if (match) {
        const multiplier = Number(match[1]);
        return { multiplier, note: `${alias} x${multiplier}` };
      }
    }
  }

  if (subject === "M2") {
    const match = formula.match(/(\d+(?:\.\d+)?)\s*x\s*M1\s*\/\s*M2/i);
    if (match) {
      const multiplier = Number(match[1]);
      return { multiplier, note: `M1/M2 x${multiplier}` };
    }
  }

  if (["Biology", "Chemistry", "Physics"].includes(subject)) {
    const match = formula.match(/(\d+(?:\.\d+)?)\s*x\s*Best\s+Sci\s+Subject/i);
    if (match) {
      const multiplier = Number(match[1]);
      return { multiplier, note: `Best Sci Subject x${multiplier}` };
    }
  }

  return { multiplier: 1 };
}

export function calculateProgrammeScore(
  programme: Programme,
  results: StudentResult[],
): CalculationResult {
  const scored: UsedSubject[] = results
    .filter((result) => result.grade !== "Not taken" && (result.subject !== coreCsdSubject || countsCsdAsScore(programme)))
    .map((result) => {
      const baseScore = result.subject === coreCsdSubject && countsCsdAsScore(programme) ? csdScore(result.grade) : gradeToScore(result.grade, programme.scoreScale);
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

function countsCsdAsScore(programme: Programme): boolean {
  return /Citizenship and Social Development[^.;]*(?:counted|recognised).*Level 2|CSD[^.;]*(?:counted|recognised).*Level 2/i.test(programme.formulaRaw);
}

function csdScore(grade: string): number {
  return grade === "Attained" ? 2 : 0;
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
  const count = subjectCount(programme, required.length);
  const selected = required.length ? selectWithRequired(scored, required, count) : bestSubjects(scored, count);

  const bonus = bonusRule(programme.formulaRaw, programme.formulaType);
  if (bonus) {
    const sixth = scored
      .filter((item) => !selected.some((used) => used.subject === item.subject))
      .sort((a, b) => b.weightedScore - a.weightedScore)[0];

    if (sixth) {
      selected.push({
        ...sixth,
        multiplier: Number((sixth.multiplier * bonus.multiplier).toFixed(2)),
        weightedScore: Number((sixth.weightedScore * bonus.multiplier).toFixed(2)),
        note: `${bonus.ordinal} subject bonus x${bonus.multiplier}`,
      });
    }
  }

  return selected;
}

function bestSubjects(scored: UsedSubject[], count: number): UsedSubject[] {
  return [...scored].sort((a, b) => b.weightedScore - a.weightedScore).slice(0, count);
}

function subjectCount(programme: Programme, requiredCount: number): number {
  const formula = programme.formulaRaw.replace(/\s+/g, " ");
  const bestMatch = formula.match(/Best\s+(\d+)\s+(?:Subjects?|from)/i);
  const extraBestSubject = /\+\s*Best\s+(?:Remaining\s+)?Subject\b/i.test(formula) ? 1 : 0;
  const explicitPrefix = /(?:^|\+)\s*(?:\d+(?:\.\d+)?\s*x\s*)?(?:Eng|Chin|Math|M1|M2|Best\s+Sci\s+Subject)\b/i.test(formula);

  if (bestMatch && explicitPrefix) {
    return requiredCount + Number(bestMatch[1]) + extraBestSubject;
  }

  if (bestMatch) return Number(bestMatch[1]) + extraBestSubject;
  return formulaCount(programme.formulaType);
}

function bonusRule(
  formulaRaw: string,
  formulaType: Programme["formulaType"],
): { multiplier: number; ordinal: string } | undefined {
  const formula = formulaRaw.replace(/\s+/g, " ");
  const match = formula.match(/(\d+(?:\.\d+)?)\s*x\s*(6th|7th)\s+Best\s+Subject/i);
  if (match) return { multiplier: Number(match[1]), ordinal: match[2] };
  if (formulaType === "BEST_5_PLUS_BONUS") return { multiplier: 0.5, ordinal: "6th" };
  return undefined;
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
  if (/include(?:s|\s)?[^.]*english/.test(formula) || /\beng\b/.test(formula)) required.push("English Language");
  if (/include(?:s|\s)?[^.]*chinese/.test(formula) || /\bchin\b/.test(formula)) required.push("Chinese Language");
  if (/include(?:s|\s)?[^.]*math/.test(formula) || /\bmath\b/.test(formula)) required.push("Mathematics Compulsory Part");
  return required;
}

function calculationConfidence(programme: Programme): CalculationConfidence {
  if (programme.weightingRules?.length && programme.source?.name) return "official-structured";
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
