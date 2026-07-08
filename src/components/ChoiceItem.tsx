import { useDraggable } from "@dnd-kit/core";
import { GripVertical, Trash2 } from "lucide-react";
import type { ProgrammeView } from "./ProgrammeCard";
import { getChoiceRankLabel } from "../utils/exportChoices";
import { jupasProgrammeUrl } from "../utils/jupasLinks";
import { admissionStatus, admissionStatusLabel, type AdmissionStatus } from "../utils/recommendationClassifier";

type Props = ProgrammeView & {
  rank: number;
  onRemove: () => void;
};

export default function ChoiceItem({ programme, calculation, requirement, rank, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `choice-${rank}`,
    data: { type: "choice", jupasCode: programme.jupasCode, index: rank - 1 },
  });
  const status = admissionStatus(programme, calculation.totalScore, requirement.meetsRequirements);
  const statusLabel = admissionStatusLabel(status);
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-md border p-3 shadow-sm ${statusBoxClass(status)} ${isDragging ? "opacity-70 shadow-xl" : ""}`}
    >
      <div className="flex gap-3">
        <button
          type="button"
          className="rounded-md p-1 text-ink/45 hover:bg-ink/5"
          aria-label="Reorder choice"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={17} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-md px-3 py-1.5 text-sm font-bold ${bandBadgeClass(rank)}`}>{getChoiceRankLabel(rank)}</span>
            <span className="text-xs font-semibold text-ink/60">
              <a className="hover:text-teal hover:underline" href={jupasProgrammeUrl(programme)} target="_blank" rel="noreferrer">
                {programme.jupasCode}
              </a>{" "}
              · {programme.institution}
            </span>
          </div>
          <h3 className="mt-2 text-sm font-semibold leading-snug text-ink">{programme.titleEn}</h3>
          {programme.titleZh && <p className="mt-1 text-xs text-ink/55">{programme.titleZh}</p>}
          <p className="mt-2 text-xs font-semibold text-ink/70">
            Your Score {calculation.totalScore} · {statsText(programme)} · {statusLabel}
          </p>
        </div>
        <button type="button" className="self-start rounded-md p-2 text-coral hover:bg-coral/10" onClick={onRemove} aria-label="Remove choice">
          <Trash2 size={17} />
        </button>
      </div>
    </div>
  );
}

function statusBoxClass(status: AdmissionStatus): string {
  return {
    uq: "border-blue-300 bg-blue-50",
    medianMean: "border-emerald-300 bg-emerald-50",
    lq: "border-yellow-300 bg-yellow-50",
    minimumOnly: "border-orange-300 bg-orange-50",
    notQualified: "border-coral/40 bg-coral/10",
  }[status];
}

function bandBadgeClass(rank: number): string {
  if (rank <= 3) return "bg-teal text-white";
  if (rank <= 6) return "bg-coral text-white";
  if (rank <= 10) return "bg-moss text-white";
  if (rank <= 15) return "bg-ink text-white";
  return "bg-yellow-500 text-ink";
}

function statsText(programme: ProgrammeView["programme"]): string {
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
