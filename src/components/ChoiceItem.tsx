import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import type { ProgrammeView } from "./ProgrammeCard";
import { getBand } from "../utils/exportChoices";
import { scoreTier } from "../utils/recommendationClassifier";

type Props = ProgrammeView & {
  rank: number;
  onRemove: () => void;
};

export default function ChoiceItem({ programme, calculation, chance, rank, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: programme.jupasCode,
    data: { type: "choice", jupasCode: programme.jupasCode },
  });
  const tier = scoreTier(programme, calculation.totalScore);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-md border border-ink/12 bg-white p-3 shadow-sm ${isDragging ? "opacity-70 shadow-xl" : ""}`}
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
            <span className="rounded-md bg-ink px-2 py-1 text-xs font-semibold text-white">#{rank}</span>
            <span className="rounded-md bg-teal/10 px-2 py-1 text-xs font-semibold text-teal">{getBand(rank)}</span>
            <span className="text-xs font-semibold text-ink/60">{programme.jupasCode} · {programme.institution}</span>
          </div>
          <h3 className="mt-2 text-sm font-semibold leading-snug text-ink">{programme.titleEn}</h3>
          {programme.titleZh && <p className="mt-1 text-xs text-ink/55">{programme.titleZh}</p>}
          <p className={`mt-2 text-xs font-semibold ${tierClass(tier)}`}>
            Score {calculation.totalScore} · LQ {programme.lowerQuartile ?? "-"} · M{" "}
            {programme.median ?? "-"} · UQ {programme.upperQuartile ?? "-"} ·{" "}
            {chance}
          </p>
        </div>
        <button type="button" className="self-start rounded-md p-2 text-coral hover:bg-coral/10" onClick={onRemove} aria-label="Remove choice">
          <Trash2 size={17} />
        </button>
      </div>
    </div>
  );
}

function tierClass(tier: ReturnType<typeof scoreTier>): string {
  return {
    uq: "text-emerald-700",
    median: "text-amber-600",
    lq: "text-orange-600",
    below: "text-coral",
    na: "text-ink/65",
  }[tier];
}
