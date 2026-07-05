import { useDraggable } from "@dnd-kit/core";
import { Eye, EyeOff, GripVertical, Pin, Plus } from "lucide-react";
import type { CalculationResult, Programme } from "../types/programme";
import { scoreTier, type ChanceCategory } from "../utils/recommendationClassifier";
import type { RequirementCheck } from "../utils/requirementChecker";

export type ProgrammeView = {
  programme: Programme;
  calculation: CalculationResult;
  chance: ChanceCategory;
  requirement: RequirementCheck;
};

type Props = ProgrammeView & {
  pinned: boolean;
  hidden: boolean;
  inChoices: boolean;
  onAdd: () => void;
  onOpen: () => void;
  onPin: () => void;
  onHide: () => void;
};

export default function ProgrammeCard({
  programme,
  calculation,
  chance,
  requirement,
  pinned,
  hidden,
  inChoices,
  onAdd,
  onOpen,
  onPin,
  onHide,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `programme-${programme.jupasCode}`,
    data: { type: "programme", jupasCode: programme.jupasCode },
    disabled: hidden,
  });

  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const tier = scoreTier(programme, calculation.totalScore);
  const medianGap = numericGap(calculation.totalScore, programme.median);
  const lqGap = numericGap(calculation.totalScore, programme.lowerQuartile);

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`rounded-md border bg-white p-4 shadow-sm transition ${
        isDragging ? "z-30 opacity-70 shadow-xl" : ""
      } ${hidden ? "border-ink/10 opacity-50" : "border-ink/12 hover:border-teal/50"}`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-label="Drag programme"
          className="mt-1 rounded-md p-1 text-ink/45 hover:bg-ink/5 hover:text-ink"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-ink px-2 py-1 text-xs font-semibold text-white">{programme.jupasCode}</span>
            <span className="rounded-md bg-teal/10 px-2 py-1 text-xs font-semibold text-teal">{programme.institution}</span>
            <span className="rounded-md bg-moss/10 px-2 py-1 text-xs font-medium text-moss">{programme.scoreScale.replace("SCALE_", "")} scale</span>
            {pinned && <span className="rounded-md bg-coral/10 px-2 py-1 text-xs font-semibold text-coral">Pinned</span>}
          </div>
          <h3 className="text-base font-semibold leading-snug text-ink">{programme.titleEn}</h3>
          {programme.titleZh && <p className="mt-1 text-sm text-ink/60">{programme.titleZh}</p>}
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <Metric label="Score" value={calculation.totalScore.toString()} strongClass={tierClass(tier)} />
            <Metric label="Risk" value={chance} strongClass={tierClass(tier)} />
            <Metric label="Formula" value={programme.formulaRaw} />
            <Metric
              label="Stats"
              value={[
                typeof programme.lowerQuartile === "number" && `LQ ${programme.lowerQuartile}`,
                typeof programme.median === "number" && `M ${programme.median}`,
                typeof programme.upperQuartile === "number" && `UQ ${programme.upperQuartile}`,
                typeof programme.mean === "number" && `Mean ${programme.mean}`,
              ]
                .filter(Boolean)
                .join(" / ") || "No data"}
            />
          </div>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <Metric label="Diff from Median" value={medianGap} />
            <Metric label="Diff from LQ" value={lqGap} />
          </div>
          {programme.weightingRaw ? <p className="mt-3 text-sm text-ink/65">{programme.weightingRaw}</p> : null}
          {programme.notes ? <p className="mt-2 text-sm text-ink/55">{programme.notes}</p> : null}
          {!requirement.meetsRequirements && (
            <p className="mt-3 rounded-md bg-coral/10 px-3 py-2 text-sm font-medium text-coral">
              Requirement warning: {requirement.missing.join(", ")}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 pl-8">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-teal px-3 py-2 text-sm font-semibold text-white hover:bg-teal/90 disabled:cursor-not-allowed disabled:bg-ink/25"
          onClick={onAdd}
          disabled={inChoices || hidden}
        >
          <Plus size={16} /> {inChoices ? "Added" : "Add to Choices"}
        </button>
        <button type="button" className="inline-flex items-center gap-2 rounded-md border border-ink/15 px-3 py-2 text-sm font-semibold hover:bg-ink/5" onClick={onOpen}>
          <Eye size={16} /> View Details
        </button>
        <button type="button" className="inline-flex items-center gap-2 rounded-md border border-ink/15 px-3 py-2 text-sm font-semibold hover:bg-ink/5" onClick={onPin}>
          <Pin size={16} /> {pinned ? "Unpin" : "Pin"}
        </button>
        <button type="button" className="inline-flex items-center gap-2 rounded-md border border-ink/15 px-3 py-2 text-sm font-semibold hover:bg-ink/5" onClick={onHide}>
          <EyeOff size={16} /> {hidden ? "Show" : "Hide"}
        </button>
      </div>
    </article>
  );
}

function Metric({ label, value, strongClass = "text-ink" }: { label: string; value: string; strongClass?: string }) {
  return (
    <div className="rounded-md bg-paper px-3 py-2">
      <div className="text-xs font-semibold uppercase text-ink/45">{label}</div>
      <div className={`mt-0.5 break-words font-semibold ${strongClass}`}>{value}</div>
    </div>
  );
}

function numericGap(score: number, target?: number): string {
  if (typeof target !== "number") return "N/A";
  const gap = Number((score - target).toFixed(2));
  return gap > 0 ? `+${gap}` : gap.toString();
}

function tierClass(tier: ReturnType<typeof scoreTier>): string {
  return {
    uq: "text-emerald-700",
    median: "text-amber-600",
    lq: "text-orange-600",
    below: "text-coral",
    na: "text-ink",
  }[tier];
}
