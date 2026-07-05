import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Clipboard, Download, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import programmesData from "../data/programmes.json";
import subjects from "../data/subjects.json";
import Disclaimer from "./Disclaimer";
import FilterBar, { type Filters } from "./FilterBar";
import ChoiceItem from "./ChoiceItem";
import type { ProgrammeView } from "./ProgrammeCard";
import ProgrammeDetailModal from "./ProgrammeDetailModal";
import ProgrammeList from "./ProgrammeList";
import ResultInputPanel from "./ResultInputPanel";
import type { Programme } from "../types/programme";
import type { StudentResult } from "../types/student";
import { choicesToCsv, choicesToText } from "../utils/exportChoices";
import { chanceRank, classifyRecommendation } from "../utils/recommendationClassifier";
import { checkRequirements } from "../utils/requirementChecker";
import { calculateProgrammeScore } from "../utils/scoreCalculator";

const programmes = programmesData as unknown as Programme[];
const resultStorageKey = "jupas-choice-builder-results-v2";
const choiceStorageKey = "jupas-choice-builder-choices";

const defaultFilters: Filters = {
  query: "",
  institution: "All",
  faculty: "All",
  category: "All",
  formulaType: "All",
  meetsRequirements: false,
  scoreAtLeastLq: false,
  scoreAtLeastMedian: false,
  scoreAtLeastUq: false,
  sortBy: "Best match",
};

export default function ChoiceBuilder() {
  const [results, setResults] = useState<StudentResult[]>(() => readStored(resultStorageKey, defaultResults()));
  const [choiceCodes, setChoiceCodes] = useState<string[]>(() => readStored(choiceStorageKey, []));
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [pinnedCodes, setPinnedCodes] = useState<string[]>([]);
  const [hiddenCodes, setHiddenCodes] = useState<string[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => localStorage.setItem(resultStorageKey, JSON.stringify(results)), [results]);
  useEffect(() => localStorage.setItem(choiceStorageKey, JSON.stringify(choiceCodes)), [choiceCodes]);

  const programmeViews = useMemo(
    () =>
      programmes.map((programme) => {
        const calculation = calculateProgrammeScore(programme, results);
        return {
          programme,
          calculation,
          chance: classifyRecommendation(programme, calculation.totalScore),
          requirement: checkRequirements(programme, results),
        };
      }),
    [results],
  );

  const filteredViews = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    const filtered = programmeViews.filter(({ programme, calculation, requirement }) => {
      const searchable = [programme.jupasCode, programme.institution, programme.titleEn, programme.titleZh, programme.faculty]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (query && !searchable.includes(query)) return false;
      if (filters.institution !== "All" && programme.institution !== filters.institution) return false;
      if (filters.faculty !== "All" && programme.faculty !== filters.faculty) return false;
      if (filters.category !== "All" && programme.category !== filters.category) return false;
      if (filters.formulaType !== "All" && programme.formulaType !== filters.formulaType) return false;
      if (filters.meetsRequirements && !requirement.meetsRequirements) return false;
      if (filters.scoreAtLeastLq && calculation.totalScore < (programme.lowerQuartile ?? Infinity)) return false;
      if (filters.scoreAtLeastMedian && calculation.totalScore < (programme.median ?? Infinity)) return false;
      if (filters.scoreAtLeastUq && calculation.totalScore < (programme.upperQuartile ?? Infinity)) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      const pinDelta = Number(pinnedCodes.includes(b.programme.jupasCode)) - Number(pinnedCodes.includes(a.programme.jupasCode));
      if (pinDelta) return pinDelta;
      const hideDelta = Number(hiddenCodes.includes(a.programme.jupasCode)) - Number(hiddenCodes.includes(b.programme.jupasCode));
      if (hideDelta) return hideDelta;

      if (filters.sortBy === "Highest chance") return chanceRank(b.chance) - chanceRank(a.chance);
      if (filters.sortBy === "Highest score difference above LQ") {
        return diffFrom(b, "lowerQuartile") - diffFrom(a, "lowerQuartile");
      }
      if (filters.sortBy === "Highest score difference above Median") {
        return diffFrom(b, "median") - diffFrom(a, "median");
      }
      if (filters.sortBy === "University") return a.programme.institution.localeCompare(b.programme.institution);
      if (filters.sortBy === "JUPAS code") return a.programme.jupasCode.localeCompare(b.programme.jupasCode);
      if (filters.sortBy === "Programme title") return a.programme.titleEn.localeCompare(b.programme.titleEn);
      return chanceRank(b.chance) - chanceRank(a.chance) || b.calculation.totalScore - a.calculation.totalScore;
    });
  }, [filters, hiddenCodes, pinnedCodes, programmeViews]);

  const choices = choiceCodes
    .map((code) => programmeViews.find((view) => view.programme.jupasCode === code))
    .filter((view): view is NonNullable<typeof view> => Boolean(view));

  const selectedView = selectedCode ? programmeViews.find((view) => view.programme.jupasCode === selectedCode) : undefined;

  function addChoice(code: string) {
    if (choiceCodes.includes(code)) return setNotice("That programme is already in your choices.");
    if (choiceCodes.length >= 20) return setNotice("The JUPAS choice list is full.");
    setChoiceCodes([...choiceCodes, code]);
    setNotice(`${code} added to choices.`);
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeType = event.active.data.current?.type;
    const activeCode = event.active.data.current?.jupasCode as string | undefined;
    const overId = event.over?.id?.toString();
    const overType = event.over?.data.current?.type;

    if (!activeCode || !overId) return;

    if (activeType === "programme" && (overId === "choices-drop" || overType === "choice")) {
      addChoice(activeCode);
      return;
    }

    if (activeType === "choice" && overType === "choice" && activeCode !== overId) {
      const oldIndex = choiceCodes.indexOf(activeCode);
      const newIndex = choiceCodes.indexOf(overId);
      if (oldIndex >= 0 && newIndex >= 0) setChoiceCodes(arrayMove(choiceCodes, oldIndex, newIndex));
    }
  }

  function exportCsv() {
    const blob = new Blob([choicesToCsv(choices.map((view) => view.programme))], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "jupas-choices.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copyChoices() {
    await navigator.clipboard.writeText(choicesToText(choices.map((view) => view.programme)));
    setNotice("Choices copied as plain text.");
  }

  const institutions = unique(programmes.map((programme) => programme.institution));
  const faculties = unique(programmes.map((programme) => programme.faculty).filter(Boolean) as string[]);
  const categories = unique(programmes.map((programme) => programme.category).filter(Boolean) as string[]);
  const formulaTypes = unique(programmes.map((programme) => programme.formulaType));

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-paper text-ink">
        <header className="border-b border-ink/10 bg-white px-4 py-5">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-normal text-ink md:text-3xl">JUPAS Choice Builder</h1>
              <p className="mt-1 max-w-3xl text-sm text-ink/65">
                Calculate programme-specific HKDSE scores, compare options, and build a ranked list of up to 20 choices.
              </p>
            </div>
            <div className="text-sm font-semibold text-teal">{notice}</div>
          </div>
        </header>

        <main className="mx-auto grid max-w-[1600px] lg:grid-cols-[340px_minmax(0,1fr)_420px]">
          <ResultInputPanel results={results} onChange={setResults} />

          <div className="min-h-0">
            <FilterBar
              filters={filters}
              onChange={setFilters}
              institutions={institutions}
              faculties={faculties}
              categories={categories}
              formulaTypes={formulaTypes}
            />
            <div className="p-4 pb-0">
              <Disclaimer />
            </div>
            <ProgrammeList
              programmes={filteredViews}
              pinnedCodes={pinnedCodes}
              hiddenCodes={hiddenCodes}
              choiceCodes={choiceCodes}
              onAdd={addChoice}
              onOpen={setSelectedCode}
              onPin={(code) =>
                setPinnedCodes((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]))
              }
              onHide={(code) =>
                setHiddenCodes((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]))
              }
            />
          </div>

          <ChoicePanel
            choices={choices}
            choiceCodes={choiceCodes}
            onRemove={(code) => setChoiceCodes(choiceCodes.filter((item) => item !== code))}
            onClear={() => setChoiceCodes([])}
            onExport={exportCsv}
            onCopy={copyChoices}
          />
        </main>

        {selectedView && (
          <ProgrammeDetailModal
            {...selectedView}
            results={results}
            onClose={() => setSelectedCode(null)}
          />
        )}
      </div>
    </DndContext>
  );
}

function ChoicePanel({
  choices,
  choiceCodes,
  onRemove,
  onClear,
  onExport,
  onCopy,
}: {
  choices: ProgrammeView[];
  choiceCodes: string[];
  onRemove: (code: string) => void;
  onClear: () => void;
  onExport: () => void;
  onCopy: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "choices-drop" });

  return (
    <aside
      ref={setNodeRef}
      className={`border-t border-ink/10 bg-white px-4 py-4 lg:min-h-[calc(100vh-85px)] lg:border-l lg:border-t-0 ${
        isOver ? "bg-teal/5" : ""
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">My 20 JUPAS Choices</h2>
          <p className="text-sm text-ink/60">{choiceCodes.length}/20 selected</p>
        </div>
        <button type="button" className="rounded-md p-2 text-coral hover:bg-coral/10" onClick={onClear} aria-label="Clear all choices">
          <Trash2 size={18} />
        </button>
      </div>
      <div className="mb-4 flex gap-2">
        <button type="button" className="inline-flex items-center gap-2 rounded-md border border-ink/15 px-3 py-2 text-sm font-semibold hover:bg-ink/5" onClick={onExport}>
          <Download size={16} /> CSV
        </button>
        <button type="button" className="inline-flex items-center gap-2 rounded-md border border-ink/15 px-3 py-2 text-sm font-semibold hover:bg-ink/5" onClick={onCopy}>
          <Clipboard size={16} /> Copy
        </button>
      </div>
      <SortableContext items={choiceCodes} strategy={verticalListSortingStrategy}>
        <div className="grid gap-3">
          {choices.map((view, index) => (
            <ChoiceItem
              key={view.programme.jupasCode}
              {...view}
              rank={index + 1}
              onRemove={() => onRemove(view.programme.jupasCode)}
            />
          ))}
        </div>
      </SortableContext>
      {!choices.length && (
        <div className="rounded-md border border-dashed border-ink/20 bg-paper p-6 text-center text-sm text-ink/60">
          Drag programme cards here or use Add to Choices.
        </div>
      )}
    </aside>
  );
}

function defaultResults(): StudentResult[] {
  return [
    { subject: "Chinese Language", grade: "Not taken" },
    { subject: "English Language", grade: "Not taken" },
    { subject: "Mathematics Compulsory Part", grade: "Not taken" },
    { subject: "Citizenship and Social Development", grade: "UnAttained" },
  ];
}

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function unique<T extends string>(items: T[]): T[] {
  return [...new Set(items)].sort();
}

function diffFrom(view: ProgrammeView, key: "lowerQuartile" | "median"): number {
  return view.calculation.totalScore - (view.programme[key] ?? Number.POSITIVE_INFINITY);
}
