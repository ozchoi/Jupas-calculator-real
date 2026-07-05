import { gradeToScore } from "./scoreCalculator";
import type { Programme } from "../types/programme";
import type { StudentResult } from "../types/student";

export type RequirementCheck = {
  meetsRequirements: boolean;
  missing: string[];
};

export function checkRequirements(programme: Programme, results: StudentResult[]): RequirementCheck {
  const requirements = programme.requiredSubjects ?? [];
  const missing = requirements
    .filter((requirement) => {
      if (isGenericElectiveRequirement(requirement.subject)) return false;
      if (requirement.subject === "Citizenship and Social Development") {
        return !results.some((item) => item.subject === requirement.subject && normalizeCsdGrade(item.grade) === "Attained");
      }
      const result = results.find((item) => item.subject === requirement.subject);
      return !result || gradeToScore(result.grade, programme.scoreScale) < gradeToScore(requirement.minGrade, programme.scoreScale);
    })
    .map(formatRequirement);

  const electiveRequirements = requirements.filter((requirement) => isGenericElectiveRequirement(requirement.subject));
  if (electiveRequirements.length) {
    const minGrade = electiveRequirements
      .map((requirement) => requirement.minGrade)
      .sort((a, b) => gradeToScore(b, programme.scoreScale) - gradeToScore(a, programme.scoreScale))[0];
    const qualifiedElectives = results.filter(
      (result) =>
        result.grade !== "Not taken" &&
        !isCoreSubject(result.subject) &&
        gradeToScore(result.grade, programme.scoreScale) >= gradeToScore(minGrade, programme.scoreScale),
    );
    if (qualifiedElectives.length < electiveRequirements.length) {
      missing.push(`${electiveRequirements.length} elective subjects: ${minGrade}+`);
    }
  }

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

function isGenericElectiveRequirement(subject: string): boolean {
  return /^Elective Subject/i.test(subject);
}

function isCoreSubject(subject: string): boolean {
  return [
    "Chinese Language",
    "English Language",
    "Mathematics Compulsory Part",
    "Citizenship and Social Development",
  ].includes(subject);
}
