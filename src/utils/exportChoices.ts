import type { CalculationResult, Programme } from "../types/programme";
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

export function choicesToCsv(choices: Array<ChoiceExportView | undefined>): string {
  const rows = [
    ["Rank", "Band", "JUPAS Code", "University", "Programme", "Your Score", "LQ score", "M score", "UQ score"].join(","),
    ...choices.flatMap((choice, index) => {
      if (!choice) return [];
      const { programme, calculation } = choice;
      return [
        [
          index + 1,
          getBand(index + 1),
          programme.jupasCode,
          programme.institution,
          csvCell(programme.titleEn),
          calculation.totalScore,
          scoreCell(programme.lowerQuartile),
          scoreCell(programme.median),
          scoreCell(programme.upperQuartile),
        ].join(","),
      ];
    }),
  ];
  return rows.join("\n");
}

export function choicesToText(programmes: Array<Programme | undefined>): string {
  return programmes
    .flatMap((programme, index) =>
      programme ? [`${index + 1}. ${getBand(index + 1)} - ${programme.jupasCode} ${programme.institution} ${programme.titleEn}`] : [],
    )
    .join("\n");
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function scoreCell(value: number | undefined): string {
  return typeof value === "number" ? String(value) : "-";
}
