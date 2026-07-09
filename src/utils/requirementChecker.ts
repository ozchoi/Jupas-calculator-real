import { gradeToScore } from "./scoreCalculator";
import type { Programme } from "../types/programme";
import type { StudentResult } from "../types/student";

export type RequirementCheck = {
  meetsRequirements: boolean;
  missing: string[];
};

type InferredRequirement =
  | { type: "must"; subject: string; minGrade: string }
  | { type: "oneOf"; subjects: string[]; minGrade: string };

export function checkRequirements(programme: Programme, results: StudentResult[]): RequirementCheck {
  const requirements = programme.requiredSubjects ?? [];
  const inferredRequirements = parseInferredRequirements(programme);
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

  const existingSubjects = requirements.map((requirement) => requirement.subject);
  for (const inferred of inferredRequirements) {
    if (inferred.type === "must") {
      if (existingSubjects.includes(inferred.subject)) continue;
      const result = results.find((item) => item.subject === inferred.subject);
      const meetsInferred = Boolean(result) && gradeToScore(result.grade, programme.scoreScale) >= gradeToScore(inferred.minGrade, programme.scoreScale);
      if (!meetsInferred) {
        missing.push(formatRequirement({ subject: inferred.subject, minGrade: inferred.minGrade }));
      }
      continue;
    }

    const hasExplicitMatch = inferred.subjects.some((subject) => existingSubjects.includes(subject));
    if (hasExplicitMatch) continue;

    const meetsAtLeastOne = inferred.subjects.some((subject) => {
      const result = results.find((item) => item.subject === subject);
      return Boolean(result) && gradeToScore(result.grade, programme.scoreScale) >= gradeToScore(inferred.minGrade, programme.scoreScale);
    });
    if (!meetsAtLeastOne) {
      missing.push(formatOneOfRequirement(inferred.subjects, inferred.minGrade));
    }
  }

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

function parseInferredRequirements(programme: Programme): InferredRequirement[] {
  const fullText = `${programme.formulaRaw ?? ""} ${programme.weightingRaw ?? ""}`.toLowerCase();
  const clauses = [...fullText.matchAll(/([^;.\n•]*?)must be included/gi)];
  const requirements: InferredRequirement[] = [];

  const seenSubjects = new Set<string>();
  const seenGroups = new Set<string>();

  for (const clauseMatch of clauses) {
    const clause = (clauseMatch[1] || "").trim();
    if (!clause) continue;

    const bestOfRegex = /best of\s*([a-z0-9_/,\s]+?)(?=$|\s+(?:and|or)\b|[;,]|\s*must be included)/gi;
    const bestOfMatches = [...clause.matchAll(bestOfRegex)];
    const oneOfSubjectsInClause = new Set<string>();

    for (const bestMatch of bestOfMatches) {
      const options = parseSubjectList(bestMatch[1]);
      if (options.length < 2) continue;
      const key = `oneOf:${options.sort().join("|")}`;
      if (!seenGroups.has(key)) {
        seenGroups.add(key);
        requirements.push({ type: "oneOf", subjects: options, minGrade: "3" });
      }
      options.forEach((subject) => oneOfSubjectsInClause.add(subject));
    }

    const clauseWithoutBestOf = clause.replace(/best of\s*[a-z0-9_/,\s]+/gi, " ");
    const mandatorySubjects = parseSubjectList(clauseWithoutBestOf);
    const hasM1M2Pair = hasM1M2Requirement(clauseWithoutBestOf);

    if (hasM1M2Pair && !seenSubjects.has("M1|M2")) {
      seenSubjects.add("M1|M2");
      requirements.push({ type: "oneOf", subjects: ["M1", "M2"], minGrade: "3" });
    }

    for (const subject of mandatorySubjects) {
      if (subject === "M1" || subject === "M2") continue;
      if (seenSubjects.has(subject)) continue;
      if (oneOfSubjectsInClause.has(subject)) continue;
      seenSubjects.add(subject);
      requirements.push({ type: "must", subject, minGrade: "3" });
    }
  }

  return requirements;
}

function parseSubjectList(text: string): string[] {
  const subjectSet = new Set<string>();
  const sanitized = text.toLowerCase().replace(/[()]/g, " ");
  const directTokens = [
    { match: /\b(chinese|chin)\b/, subject: "Chinese Language" },
    { match: /\b(english|eng)\b/, subject: "English Language" },
    { match: /\b(mathematics|math)\b/, subject: "Mathematics Compulsory Part" },
    { match: /\bchemistry\b/, subject: "Chemistry" },
    { match: /\bbiology\b/, subject: "Biology" },
    { match: /\bphysics\b/, subject: "Physics" },
    { match: /\beconomics\b/, subject: "Economics" },
    { match: /\bcitizenship\b/, subject: "Citizenship and Social Development" },
    { match: /\bm1\s*\/\s*m2\b/, subject: "M1/M2" },
    { match: /\bm1\b/, subject: "M1" },
    { match: /\bm2\b/, subject: "M2" },
  ];

  const hasM1M2 = /\bm1\s*\/\s*m2\b/.test(sanitized) || /\bm1\s+or\s+m2\b/.test(sanitized) || /\bm2\s+or\s+m1\b/.test(sanitized);
  if (hasM1M2) {
    subjectSet.add("M1");
    subjectSet.add("M2");
    return Array.from(subjectSet);
  }

  for (const entry of directTokens) {
    if (entry.match.test(sanitized)) {
      if (entry.subject === "M1/M2") continue;
      subjectSet.add(entry.subject);
    }
  }
  return Array.from(subjectSet);
}

function hasM1M2Requirement(text: string): boolean {
  return /\bm1\s*\/\s*m2\b/i.test(text) || /\bm1\s+or\s+m2\b/i.test(text) || /\bm2\s+or\s+m1\b/i.test(text);
}

function formatOneOfRequirement(subjects: string[], minGrade: string): string {
  return `One of (${subjects.join(" / ")}) ${minGrade}+`;
}
