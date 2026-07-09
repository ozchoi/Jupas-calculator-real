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
      const meetsInferred = (() => {
        if (!result) return false;
        return gradeToScore(result.grade, programme.scoreScale) >= gradeToScore(inferred.minGrade, programme.scoreScale);
      })();
      if (!meetsInferred) {
        missing.push(formatRequirement({ subject: inferred.subject, minGrade: inferred.minGrade }));
      }
      continue;
    }

    const hasExplicitMatch = inferred.subjects.some((subject) => existingSubjects.includes(subject));
    if (hasExplicitMatch) continue;

    const meetsAtLeastOne = inferred.subjects.some((subject) => {
      const result = results.find((item) => item.subject === subject);
      if (!result) return false;
      return gradeToScore(result.grade, programme.scoreScale) >= gradeToScore(inferred.minGrade, programme.scoreScale);
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
  const fullText = `${programme.formulaRaw ?? ""} ${programme.weightingRaw ?? ""} ${programme.notes ?? ""}`.toLowerCase();
  const clauses = fullText.split(/[;\n•]+/).map((clause) => clause.trim()).filter(Boolean);
  const requirements: InferredRequirement[] = [];
  const overrideText = getInferredRequirementOverride(programme);
  if (overrideText) {
    clauses.unshift(overrideText);
  }

  const seenSubjects = new Set<string>();
  const seenGroups = new Set<string>();

  for (const clauseMatch of clauses) {
    const clause = clauseMatch.trim();
    if (!clause) continue;
    if (/(no specific subject requirements|none required)/i.test(clause)) continue;
    if (/\belective subject\b/i.test(clause)) {
      const noSpecificElectives = /\belective subject[s]?\s*(1|2|3|4|5|:)?\s*(not required|no specific|none)\b/i.test(clause);
      if (noSpecificElectives) continue;
    }

    for (const explicitRequirement of parseExplicitIncludeRequirements(clause)) {
      if (explicitRequirement.type === "must") {
        const subject = explicitRequirement.subject;
        if (seenSubjects.has(subject)) continue;
        seenSubjects.add(subject);
        requirements.push({ type: "must", subject, minGrade: inferMinGrade(clause) });
      } else {
        const key = `oneOf:${explicitRequirement.subjects.sort().join("|")}`;
        if (!seenGroups.has(key)) {
          seenGroups.add(key);
          requirements.push({ type: "oneOf", subjects: explicitRequirement.subjects, minGrade: inferMinGrade(clause) });
        }
      }
    }

    const bestOfGroups = extractInferredGroups(clause, /\bbest of\s+([^.;]+)/gi, 2);
    for (const subjects of bestOfGroups) {
      const key = `oneOf:${subjects.sort().join("|")}`;
      if (subjects.length === 1) {
        const subject = subjects[0];
        if (!seenSubjects.has(subject)) {
          seenSubjects.add(subject);
          requirements.push({ type: "must", subject, minGrade: inferMinGrade(clause) });
        }
        continue;
      }
      if (subjects.length >= 2 && !seenGroups.has(key)) {
        seenGroups.add(key);
        requirements.push({ type: "oneOf", subjects, minGrade: inferMinGrade(clause) });
      }
    }

    const oneOfGroups = extractInferredGroups(
      clause,
      /\b(?:one of|at least one (?:of|from)|one subject from|at least one subject from)\b\s*[:\-]?\s*([^.;]+)/gi,
      1,
    );
    for (const subjects of oneOfGroups) {
      if (!subjects.length) continue;
      const key = `oneOf:${subjects.sort().join("|")}`;
      if (subjects.length === 1) {
        const subject = subjects[0];
        if (!seenSubjects.has(subject)) {
          seenSubjects.add(subject);
          requirements.push({ type: "must", subject, minGrade: inferMinGrade(clause) });
        }
        continue;
      }
      if (subjects.length >= 2 && !seenGroups.has(key)) {
        seenGroups.add(key);
        requirements.push({ type: "oneOf", subjects, minGrade: inferMinGrade(clause) });
      }
    }

    const specifiedSubjectMatch = clause.match(/specified subject\s*:?([^.]*)/i);
    if (specifiedSubjectMatch?.[1]) {
      const subjects = parseSubjectList(specifiedSubjectMatch[1]);
      if (subjects.length >= 2 && !specifiedSubjectMatch[1].toLowerCase().includes("no specific")) {
        const key = `oneOf:${subjects.sort().join("|")}`;
        if (!seenGroups.has(key)) {
          seenGroups.add(key);
          requirements.push({ type: "oneOf", subjects, minGrade: inferMinGrade(clause) });
        }
      } else if (subjects.length === 1 && !specifiedSubjectMatch[1].toLowerCase().includes("no specific")) {
        const subject = subjects[0];
        if (!seenSubjects.has(subject)) {
          seenSubjects.add(subject);
          requirements.push({ type: "must", subject, minGrade: inferMinGrade(clause) });
        }
      }
    }

    const mustBeIncludedMatches = [...clause.matchAll(/(?:^|,|\s)([^;]+?)\s+must be included/gi)];
    const mustMatch = mustBeIncludedMatches[0]?.[1];
    const oneOfSubjectsInClause = new Set<string>(extractInferredGroups(clause, /\bbest of\s+([^.;]+)/gi, 2).flat());

    if (mustMatch) {
      const clauseWithoutBestOf = mustMatch.replace(/\bbest of\s+[^,.;]+/gi, " ");
      const mandatorySubjects = parseSubjectList(clauseWithoutBestOf);
      const hasM1M2Pair = hasM1M2Requirement(clauseWithoutBestOf);
      if (hasM1M2Pair && !seenSubjects.has("M1|M2")) {
        seenSubjects.add("M1|M2");
        const key = `oneOf:M1|M2`;
        if (!seenGroups.has(key)) {
          seenGroups.add(key);
          requirements.push({ type: "oneOf", subjects: ["M1", "M2"], minGrade: inferMinGrade(clause) });
        }
      }

      for (const subject of mandatorySubjects) {
        if (subject === "M1" || subject === "M2") continue;
        if (seenSubjects.has(subject)) continue;
        if (oneOfSubjectsInClause.has(subject)) continue;
        seenSubjects.add(subject);
        requirements.push({ type: "must", subject, minGrade: inferMinGrade(clause) });
      }
    }
  }

  return requirements;
}

function parseExplicitIncludeRequirements(clause: string): Array<{ type: "must"; subject: string } | { type: "oneOf"; subjects: string[] }> {
  const matches = [...clause.matchAll(/\binclude(?:s|d|ing)?\s+([^;.)]+?)(?:$|[;.)])/gi)];
  const requirements: Array<{ type: "must"; subject: string } | { type: "oneOf"; subjects: string[] }> = [];
  const seenLocal = new Set<string>();

  for (const match of matches) {
    const text = match[1].trim();
    if (!text) continue;

    const oneOfGroups = extractInferredGroups(
      text,
      /\b(?:at least one (?:of|from)|at least one subject from|one of|one subject from)\b\s*[:\-]?\s*([^.;]+)/gi,
      1,
    );

    for (const group of oneOfGroups) {
      if (group.length === 0) continue;
      const key = `oneOf:${group.sort().join("|")}`;
      if (seenLocal.has(key)) continue;
      seenLocal.add(key);
      requirements.push({ type: "oneOf", subjects: group });
    }

    const withoutOneOf = text.replace(
      /\b(?:at least one (?:of|from)|at least one subject from|one of|one subject from)\b\s*[^;.)]+(?:,|\s+and)?/gi,
      " ",
    );
    const subjects = parseSubjectList(withoutOneOf);
    for (const subject of subjects) {
      const key = `must:${subject}`;
      if (seenLocal.has(key)) continue;
      seenLocal.add(key);
      requirements.push({ type: "must", subject });
    }
  }

  return requirements;
}

function getInferredRequirementOverride(programme: Programme): string | null {
  const key = `${programme.institution}|${programme.jupasCode}`;
  const overrides: Record<string, string> = {
    "HKU|JS6456": "At least one of: Biology / Chemistry at level 3",
    "HKU|JS6494": "At least one of: Chemistry, or Combined Science with Chemistry component at level 3",
  };
  return overrides[key] || null;
}

function parseSubjectList(text: string): string[] {
  const subjectSet = new Set<string>();
  const sanitized = text.toLowerCase().replace(/[()]/g, " ");
  const directTokens = [
    { match: /\b(chinese|chin)\b/, subject: "Chinese Language" },
    { match: /\b(english|eng)\b/, subject: "English Language" },
    { match: /\b(mathematics|math)\b/, subject: "Mathematics Compulsory Part" },
    { match: /\bcombined science\b/, subject: "Chemistry" },
    { match: /\bintegrated science\b/, subject: "Chemistry" },
    { match: /\bchemistry\b/, subject: "Chemistry" },
    { match: /\bbiology\b/, subject: "Biology" },
    { match: /\bphysics\b/, subject: "Physics" },
    { match: /\bgeography\b/, subject: "Geography" },
    { match: /\bbusiness,?\s+accounting\s+and\s+financial\s+studies\b/, subject: "Business, Accounting and Financial Studies" },
    { match: /\binformation and communication technology\b/, subject: "ICT" },
    { match: /\beconomics\b/, subject: "Economics" },
    { match: /\bcitizenship\b/, subject: "Citizenship and Social Development" },
    { match: /\bm1\s*\/\s*m2\b/, subject: "M1/M2" },
    { match: /\bm1\b/, subject: "M1" },
    { match: /\bm2\b/, subject: "M2" },
    { match: /\bmaths\b/, subject: "Mathematics Compulsory Part" },
    { match: /\bdat\b/, subject: "Design and Applied Technology" },
    { match: /\bdesign and applied technology\b/, subject: "Design and Applied Technology" },
  ];

  const hasM1M2 = /\bm1\s*\/\s*m2\b/.test(sanitized) || /\bm1\s+or\s+m2\b/.test(sanitized) || /\bm2\s+or\s+m1\b/.test(sanitized);
  if (hasM1M2) {
    subjectSet.add("M1");
    subjectSet.add("M2");
  }

  for (const entry of directTokens) {
    if (entry.match.test(sanitized)) {
      if (entry.subject === "M1/M2") continue;
      subjectSet.add(entry.subject);
    }
  }
  return Array.from(subjectSet);
}

function extractInferredGroups(text: string, regex: RegExp, minSubjects: number): string[][] {
  const results: string[][] = [];
  for (const match of text.matchAll(regex)) {
    const subjects = parseSubjectList(match[1]);
    if (subjects.length >= minSubjects) {
      results.push(subjects);
    }
  }
  return results;
}

function inferMinGrade(text: string): string {
  const levelMatch = text.match(/level\s*([1-7])/i);
  return levelMatch ? levelMatch[1] : "3";
}

function hasM1M2Requirement(text: string): boolean {
  return /\bm1\s*\/\s*m2\b/i.test(text) || /\bm1\s+or\s+m2\b/i.test(text) || /\bm2\s+or\s+m1\b/i.test(text);
}

function formatOneOfRequirement(subjects: string[], minGrade: string): string {
  return `One of (${subjects.join(" / ")}) ${minGrade}+`;
}
