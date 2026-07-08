import type { CalculationResult, Programme } from "../types/programme";
import { admissionStatus, admissionStatusLabel } from "./recommendationClassifier";
import type { RequirementCheck } from "./requirementChecker";

type ChoiceExportView = {
  programme: Programme;
  calculation: CalculationResult;
  requirement: RequirementCheck;
};

export function getBand(rank: number): string {
  if (rank <= 3) return "Band A";
  if (rank <= 6) return "Band B";
  if (rank <= 10) return "Band C";
  if (rank <= 15) return "Band D";
  return "Band E";
}

export function getChoiceRankLabel(rank: number): string {
  if (rank <= 3) return `A${rank}`;
  if (rank <= 6) return `B${rank - 3}`;
  if (rank <= 10) return `C${rank - 6}`;
  if (rank <= 15) return `D${rank - 10}`;
  return `E${rank - 15}`;
}

export function choicesToCsv(choices: ChoiceExportView[]): string {
  const rows = [
    ["Rank", "Band", "JUPAS Code", "University", "Programme", "Score and Comparison"].join(","),
    ...choices.map(({ programme, calculation, requirement }, index) =>
      [
        index + 1,
        getBand(index + 1),
        programme.jupasCode,
        programme.institution,
        csvCell(programme.titleEn),
        csvCell(comparisonText(programme, calculation, requirement)),
      ].join(","),
    ),
  ];
  return rows.join("\n");
}

export function choicesToText(programmes: Programme[]): string {
  return programmes
    .map(
      (programme, index) =>
        `${index + 1}. ${getBand(index + 1)} - ${programme.jupasCode} ${programme.institution} ${programme.titleEn}`,
    )
    .join("\n");
}

function comparisonText(programme: Programme, calculation: CalculationResult, requirement: RequirementCheck): string {
  const status = admissionStatus(programme, calculation.totalScore, requirement.meetsRequirements);
  return `Your Score ${calculation.totalScore} · ${statsText(programme)} · ${admissionStatusLabel(status)}`;
}

function statsText(programme: Programme): string {
  const missing = [
    typeof programme.lowerQuartile !== "number" && "LQ",
    typeof programme.median !== "number" && "median",
    typeof programme.upperQuartile !== "number" && "UQ",
  ].filter(Boolean);

  const average = typeof programme.averageScore === "number" ? ` · Average ${programme.averageScore}` : "";
  return `LQ ${programme.lowerQuartile ?? "-"} · M ${programme.median ?? "-"} · UQ ${programme.upperQuartile ?? "-"}${average}${
    missing.length ? ` (${missing.join(", ")} not available)` : ""
  }`;
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
