import { useDraggable } from "@dnd-kit/core";
import { Eye, EyeOff, GripVertical, Pin, Plus } from "lucide-react";
import { useState } from "react";
import type { CalculationConfidence, CalculationResult, Programme } from "../types/programme";
import { admissionStatus, admissionStatusLabel, type AdmissionStatus, type ChanceCategory } from "../utils/recommendationClassifier";
import type { RequirementCheck } from "../utils/requirementChecker";
import { scoreDifference } from "../utils/thresholds";

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
  const [showDetails, setShowDetails] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `programme-${programme.jupasCode}`,
    data: { type: "programme", jupasCode: programme.jupasCode },
    disabled: hidden,
  });

  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const status = admissionStatus(programme, calculation.totalScore, requirement.meetsRequirements);
  const statusLabel = admissionStatusLabel(status);
  const medianGap = numericGap(calculation.totalScore, programme.median);
  const lqGap = numericGap(calculation.totalScore, programme.lowerQuartile);

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`rounded-md border p-4 shadow-sm transition ${
        isDragging ? "z-30 opacity-70 shadow-xl" : ""
      } ${hidden ? "border-ink/10 bg-white opacity-50" : statusBoxClass(status)}`}
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
            {pinned && <span className="rounded-md bg-coral/10 px-2 py-1 text-xs font-semibold text-coral">Pinned</span>}
          </div>
          <h3 className="text-base font-semibold leading-snug text-ink">{programme.titleEn}</h3>
          {programme.titleZh && <p className="mt-1 text-sm text-ink/60">{programme.titleZh}</p>}
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <Metric label="Your Score" value={calculation.totalScore.toString()} />
            <Metric label="Chance" value={statusLabel} />
            <Metric label="Calculation" value={confidenceLabel(calculation.confidence)} />
            <Metric label="Stats" value={statsText(programme)} />
          </div>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <Metric label="Diff from Median" value={medianGap} />
            <Metric label="Diff from LQ" value={lqGap} />
          </div>
          {showDetails ? (
            <div className="mt-3 grid gap-2 text-sm text-ink/65">
              <Metric label="Formula" value={programme.formulaRaw} />
              {calculation.warning ? (
                <p className="rounded-md bg-white/70 px-3 py-2 font-medium">{calculation.warning}</p>
              ) : null}
              {programme.weightingRaw ? <p className="rounded-md bg-white/70 px-3 py-2">{programme.weightingRaw}</p> : null}
              {programme.notes ? <p className="rounded-md bg-white/70 px-3 py-2 text-ink/55">{programme.notes}</p> : null}
            </div>
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
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-ink/15 px-3 py-2 text-sm font-semibold hover:bg-ink/5"
          onClick={() => setShowDetails((value) => !value)}
        >
          {showDetails ? "Hide details" : "Show details"}
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
    <div className="rounded-md bg-white/70 px-3 py-2">
      <div className="text-xs font-semibold uppercase text-ink/45">{label}</div>
      <div className="mt-0.5 break-words font-semibold text-ink">{value}</div>
    </div>
  );
}

function numericGap(score: number, target?: number): string {
  const gap = scoreDifference(score, target);
  if (gap === undefined) return "N/A";
  return gap > 0 ? `+${gap}` : gap.toString();
}

function statsText(programme: Programme): string {
  const values = [
    `LQ ${formatStat(programme.lowerQuartile)}`,
    `M ${formatStat(programme.median)}`,
    `UQ ${formatStat(programme.upperQuartile)}`,
    typeof programme.mean === "number" ? `Mean ${programme.mean}` : undefined,
    typeof programme.averageScore === "number" ? `Average ${programme.averageScore}` : undefined,
  ].filter(Boolean);
  const missing = [
    typeof programme.lowerQuartile !== "number" && "LQ",
    typeof programme.median !== "number" && "median",
    typeof programme.upperQuartile !== "number" && "UQ",
  ].filter(Boolean);

  return `${values.join(" / ")}${missing.length ? ` (${missing.join(", ")} not available)` : ""}`;
}

function formatStat(value?: number): string {
  return typeof value === "number" ? value.toString() : "-";
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

function confidenceLabel(confidence: CalculationConfidence): string {
  return {
    "official-structured": "Official structured",
    "generic-formula": "Generic formula",
    "reference-estimate": "Reference estimate",
  }[confidence];
}
