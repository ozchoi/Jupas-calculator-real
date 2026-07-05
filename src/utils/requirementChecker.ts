import { gradeToScore } from "./scoreCalculator";
import type { Programme } from "../types/programme";
import type { StudentResult } from "../types/student";

export type RequirementCheck = {
  meetsRequirements: boolean;
  missing: string[];
};

export function checkRequirements(programme: Programme, results: StudentResult[]): RequirementCheck {
  const missing =
    programme.requiredSubjects
      ?.filter((requirement) => {
        if (requirement.subject === "Citizenship and Social Development") {
          return !results.some((item) => item.subject === requirement.subject && normalizeCsdGrade(item.grade) === "Attained");
        }
        const result = results.find((item) => item.subject === requirement.subject);
        return !result || gradeToScore(result.grade, programme.scoreScale) < gradeToScore(requirement.minGrade, programme.scoreScale);
      })
      .map(formatRequirement) ?? [];

  return {
    meetsRequirements: missing.length === 0,
    missing,
  };
}

function normalizeCsdGrade(grade: string): string {
  return grade === "UnAttained" ? "Unattained" : grade;
}

function formatRequirement(requirement: { subject: string; minGrade: string }): string {
  if (requirement.subject === "Citizenship and Social Development") {
    return `${requirement.subject}: ${requirement.minGrade}`;
  }
  return `${requirement.subject}: ${requirement.minGrade}+`;
}
