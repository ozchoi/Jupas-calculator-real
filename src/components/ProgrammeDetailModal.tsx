import { X } from "lucide-react";
import type { CalculationConfidence, CalculationResult, Programme } from "../types/programme";
import type { StudentResult } from "../types/student";
import type { ChanceCategory } from "../utils/recommendationClassifier";
import type { RequirementCheck } from "../utils/requirementChecker";

type Props = {
  programme: Programme;
  calculation: CalculationResult;
  results: StudentResult[];
  chance: ChanceCategory;
  requirement: RequirementCheck;
  onClose: () => void;
};

export default function ProgrammeDetailModal({
  programme,
  calculation,
  results,
  chance,
  requirement,
  onClose,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-md bg-white shadow-2xl">
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-ink/10 bg-white px-5 py-4">
          <div>
            <div className="mb-2 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-md bg-ink px-2 py-1 text-white">{programme.jupasCode}</span>
              <span className="rounded-md bg-teal/10 px-2 py-1 text-teal">{programme.institution}</span>
              <span className="rounded-md bg-moss/10 px-2 py-1 text-moss">{programme.scoreScale.replace("SCALE_", "")} scale</span>
            </div>
            <h2 className="text-xl font-semibold text-ink">{programme.titleEn}</h2>
            {programme.titleZh && <p className="mt-1 text-ink/60">{programme.titleZh}</p>}
          </div>
          <button type="button" className="rounded-md p-2 hover:bg-ink/5" onClick={onClose} aria-label="Close details">
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-5 p-5">
          <div className="grid gap-3 md:grid-cols-4">
            <Info label="Calculated score" value={calculation.totalScore.toString()} />
            <Info label="Risk" value={chance} />
            <Info label="Calculation" value={confidenceLabel(calculation.confidence)} />
            <Info label="Formula" value={programme.formulaRaw} />
            <Info label="Faculty" value={programme.faculty ?? "Not specified"} />
          </div>
          {calculation.warning ? (
            <section className="rounded-md border border-orange-300 bg-orange-50 p-4 text-sm font-medium text-ink/75">
              {calculation.warning}
            </section>
          ) : null}

          <section>
            <h3 className="mb-2 font-semibold text-ink">Formula and Weighting</h3>
            <div className="rounded-md border border-ink/10 bg-paper p-4 text-sm text-ink/75">
              <p className="mb-3 font-semibold text-ink">{programme.formulaRaw}</p>
              {programme.weightingRaw && <p className="mb-3">{programme.weightingRaw}</p>}
              {programme.weightingRules?.length ? (
                <ul className="grid gap-1">
                  {programme.weightingRules.map((rule) => (
                    <li key={`${rule.note}-${rule.multiplier}`}>
                      {rule.note ?? rule.subjects.join(", ")}: {rule.subjects.join(", ")} x{rule.multiplier}
                    </li>
                  ))}
                </ul>
              ) : (
                "No extra weighting rules in the local dataset."
              )}
            </div>
          </section>

          <section>
            <h3 className="mb-2 font-semibold text-ink">Minimum Requirements</h3>
            <div className={`rounded-md border p-4 text-sm ${requirement.meetsRequirements ? "border-teal/25 bg-teal/10 text-teal" : "border-coral/25 bg-coral/10 text-coral"}`}>
              {programme.requiredSubjects?.map(formatRequirement).join("; ") || "Not specified"}
              {!requirement.meetsRequirements && <div className="mt-2 font-semibold">Missing: {requirement.missing.join(", ")}</div>}
            </div>
          </section>

          <section>
            <h3 className="mb-2 font-semibold text-ink">Calculation Breakdown</h3>
            <div className="overflow-hidden rounded-md border border-ink/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-paper text-xs uppercase text-ink/55">
                  <tr>
                    <th className="px-3 py-2">Subject</th>
                    <th className="px-3 py-2">Grade</th>
                    <th className="px-3 py-2">Base</th>
                    <th className="px-3 py-2">Multiplier</th>
                    <th className="px-3 py-2">Weighted</th>
                  </tr>
                </thead>
                <tbody>
                  {calculation.usedSubjects.map((item) => (
                    <tr key={`${item.subject}-${item.note}`} className="border-t border-ink/10">
                      <td className="px-3 py-2">{item.subject}</td>
                      <td className="px-3 py-2">{item.grade}</td>
                      <td className="px-3 py-2">{item.baseScore}</td>
                      <td className="px-3 py-2">{item.multiplier}</td>
                      <td className="px-3 py-2 font-semibold">{item.weightedScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-sm font-semibold text-ink">Total = {calculation.totalScore}</p>
          </section>

          <section>
            <h3 className="mb-2 font-semibold text-ink">Student Results Used</h3>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {results
                .filter((result) => result.grade !== "Not taken")
                .map((result) => (
                  <div key={result.subject} className="rounded-md bg-paper px-3 py-2 text-sm">
                    <span className="font-medium">{result.subject}</span>: {result.grade}
                  </div>
                ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 font-semibold text-ink">Admission Statistics</h3>
            <div className="grid gap-3 md:grid-cols-6">
              <Info label="LQ" value={programme.lowerQuartile?.toString() ?? "-"} />
              <Info label="Median" value={programme.median?.toString() ?? "-"} />
              <Info label="UQ" value={programme.upperQuartile?.toString() ?? "-"} />
              <Info label="Mean" value={programme.mean?.toString() ?? "-"} />
              <Info label="Highest" value={programme.highestAttainable?.toString() ?? "-"} />
              <Info label="Quality" value={programme.dataQuality} />
            </div>
            {(programme.medianProfile || programme.lowerQuartileProfile) && (
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <Info label="Median profile" value={programme.medianProfile ?? "-"} />
                <Info label="LQ profile" value={programme.lowerQuartileProfile ?? "-"} />
              </div>
            )}
            {programme.notes && <p className="mt-2 text-sm text-ink/60">{programme.notes}</p>}
          </section>

          <section className="rounded-md bg-paper p-4 text-sm text-ink/65">
            Source: {programme.source?.name ?? "Not specified"}
            {programme.sourcePage ? `, page ${programme.sourcePage}` : ""}
            {programme.source?.retrievedDate ? `, retrieved ${programme.source.retrievedDate}` : ""}
          </section>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-paper px-3 py-2">
      <div className="text-xs font-semibold uppercase text-ink/45">{label}</div>
      <div className="mt-1 break-words font-semibold text-ink">{value}</div>
    </div>
  );
}

function formatRequirement(item: { subject: string; minGrade: string }): string {
  if (item.subject === "Citizenship and Social Development") return `${item.subject}: ${item.minGrade}`;
  return `${item.subject}: ${item.minGrade}+`;
}

function confidenceLabel(confidence: CalculationConfidence): string {
  return {
    "official-structured": "Official structured",
    "generic-formula": "Generic formula",
    "reference-estimate": "Reference estimate",
  }[confidence];
}
