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
        const result = results.find((item) => item.subject === requirement.subject);
        return !result || gradeToScore(result.grade) < gradeToScore(requirement.minGrade);
      })
      .map((requirement) => `${requirement.subject} ${requirement.minGrade}+`) ?? [];

  return {
    meetsRequirements: missing.length === 0,
    missing,
  };
}
