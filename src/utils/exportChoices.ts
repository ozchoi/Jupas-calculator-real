import type { Programme } from "../types/programme";

export function getBand(rank: number): string {
  if (rank <= 3) return "Band A";
  if (rank <= 6) return "Band B";
  if (rank <= 10) return "Band C";
  if (rank <= 15) return "Band D";
  return "Band E";
}

export function choicesToCsv(programmes: Programme[]): string {
  const rows = [
    ["Rank", "Band", "JUPAS Code", "University", "Programme", "Chinese Title"].join(","),
    ...programmes.map((programme, index) =>
      [
        index + 1,
        getBand(index + 1),
        programme.jupasCode,
        programme.institution,
        `"${programme.titleEn.replaceAll('"', '""')}"`,
        `"${(programme.titleZh ?? "").replaceAll('"', '""')}"`,
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
