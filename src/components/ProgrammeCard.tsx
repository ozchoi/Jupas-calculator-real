import { useDraggable } from "@dnd-kit/core";
import { Eye, EyeOff, GripVertical, Pin, Plus } from "lucide-react";
import type { CalculationResult, Programme } from "../types/programme";
import type { ChanceCategory } from "../utils/recommendationClassifier";
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
            <span className="rounded-md bg-moss/10 px-2 py-1 text-xs font-medium text-moss">{programme.category}</span>
            {pinned && <span className="rounded-md bg-coral/10 px-2 py-1 text-xs font-semibold text-coral">Pinned</span>}
          </div>
          <h3 className="text-base font-semibold leading-snug text-ink">{programme.titleEn}</h3>
          {programme.titleZh && <p className="mt-1 text-sm text-ink/60">{programme.titleZh}</p>}
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <Metric label="Score" value={calculation.totalScore.toString()} />
            <Metric label="Chance" value={chance} />
            <Metric label="Formula" value={programme.formulaType.replaceAll("_", " ")} />
            <Metric
              label="Stats"
              value={[
                programme.admissionStats?.lowerQuartile && `LQ ${programme.admissionStats.lowerQuartile}`,
                programme.admissionStats?.median && `M ${programme.admissionStats.median}`,
                programme.admissionStats?.upperQuartile && `UQ ${programme.admissionStats.upperQuartile}`,
                programme.admissionStats?.mean && `Avg ${programme.admissionStats.mean}`,
              ]
                .filter(Boolean)
                .join(" / ") || "No data"}
            />
          </div>
          {programme.weightingRules?.length ? (
            <p className="mt-3 text-sm text-ink/65">{programme.weightingRules.map((rule) => rule.note).filter(Boolean).join("; ")}</p>
          ) : null}
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-paper px-3 py-2">
      <div className="text-xs font-semibold uppercase text-ink/45">{label}</div>
      <div className="mt-0.5 break-words font-medium text-ink">{value}</div>
    </div>
  );
}
