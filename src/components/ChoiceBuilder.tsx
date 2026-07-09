import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Clipboard, Download, ExternalLink, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import programmesData from "../data/programmes.json";
import subjects from "../data/subjects.json";
import AdmissionLegend from "./AdmissionLegend";
import Disclaimer from "./Disclaimer";
import FeedbackButton from "./FeedbackButton";
import FilterBar, { type Filters } from "./FilterBar";
import ChoiceItem from "./ChoiceItem";
import type { ProgrammeView } from "./ProgrammeCard";
import ProgrammeDetailModal from "./ProgrammeDetailModal";
import ProgrammeList from "./ProgrammeList";
import ResultInputPanel from "./ResultInputPanel";
import type { Programme } from "../types/programme";
import type { StudentResult } from "../types/student";
import { choicesToCsv, choicesToText, getChoiceRankLabel } from "../utils/exportChoices";
import { chanceRank, classifyRecommendation } from "../utils/recommendationClassifier";
import { checkRequirements } from "../utils/requirementChecker";
import { calculateProgrammeScore } from "../utils/scoreCalculator";
import { programmeMeetsInclusiveThreshold } from "../utils/thresholds";

const programmes = programmesData as unknown as Programme[];
const resultStorageKey = "jupas-choice-builder-results-v2";
const choiceStorageKey = "jupas-choice-builder-choices";
const choiceSlotCount = 20;

type ChoiceSlotCode = string | null;

const defaultFilters: Filters = {
  query: "",
  institutions: [],
  faculties: [],
  weightedSubjects: [],
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
  const [choiceCodes, setChoiceCodes] = useState<ChoiceSlotCode[]>(() => normalizeChoiceSlots(readStored(choiceStorageKey, [])));
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
      if (filters.institutions.length && !filters.institutions.includes(programme.institution)) return false;
      if (filters.faculties.length && (!programme.faculty || !filters.faculties.includes(programme.faculty))) return false;
      if (filters.weightedSubjects.length && !hasSelectedHighWeighting(programme, filters.weightedSubjects)) return false;
      if (filters.category !== "All" && programme.category !== filters.category) return false;
      if (filters.formulaType !== "All" && programme.formulaType !== filters.formulaType) return false;
      if (filters.meetsRequirements && !requirement.meetsRequirements) return false;
      if (filters.scoreAtLeastLq && !programmeMeetsInclusiveThreshold(programme, calculation.totalScore, "lowerQuartile")) return false;
      if (filters.scoreAtLeastMedian && !programmeMeetsInclusiveThreshold(programme, calculation.totalScore, "median")) return false;
      if (filters.scoreAtLeastUq && !programmeMeetsInclusiveThreshold(programme, calculation.totalScore, "upperQuartile")) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      const pinDelta = Number(pinnedCodes.includes(b.programme.jupasCode)) - Number(pinnedCodes.includes(a.programme.jupasCode));
      if (pinDelta) return pinDelta;
      const hideDelta = Number(hiddenCodes.includes(a.programme.jupasCode)) - Number(hiddenCodes.includes(b.programme.jupasCode));
      if (hideDelta) return hideDelta;
      if (filters.weightedSubjects.length) {
        const weightingDelta = maxSelectedWeighting(b.programme, filters.weightedSubjects) - maxSelectedWeighting(a.programme, filters.weightedSubjects);
        if (weightingDelta) return weightingDelta;
      }

      if (filters.sortBy === "Highest chance") return chanceRank(b.chance) - chanceRank(a.chance);
      if (filters.sortBy === "Highest score difference above LQ") {
        return diffFrom(b, "lowerQuartile") - diffFrom(a, "lowerQuartile");
      }
      if (filters.sortBy === "Highest score difference above Median") {
        return diffFrom(b, "median") - diffFrom(a, "median");
      }
      if (filters.sortBy === "JUPAS code") return a.programme.jupasCode.localeCompare(b.programme.jupasCode);
      return chanceRank(b.chance) - chanceRank(a.chance) || b.calculation.totalScore - a.calculation.totalScore;
    });
  }, [filters, hiddenCodes, pinnedCodes, programmeViews]);

  const choices = choiceCodes.map((code) => (code ? programmeViews.find((view) => view.programme.jupasCode === code) : undefined));
  const selectedChoiceCount = choiceCodes.filter(Boolean).length;
  const selectedChoiceCodes = choiceCodes.filter((code): code is string => Boolean(code));

  useEffect(() => {
    const validCodes = new Set(programmes.map((programme) => programme.jupasCode));
    setChoiceCodes((current) => {
      const seen = new Set<string>();
      return normalizeChoiceSlots(current).map((code) => {
        if (!code || !validCodes.has(code) || seen.has(code)) return null;
        seen.add(code);
        return code;
      });
    });
  }, []);

  const selectedView = selectedCode ? programmeViews.find((view) => view.programme.jupasCode === selectedCode) : undefined;

  function addChoice(code: string, targetIndex?: number) {
    if (choiceCodes.includes(code)) return setNotice("That programme is already in your choices.");
    const slotIndex = typeof targetIndex === "number" ? targetIndex : choiceCodes.findIndex((item) => !item);
    if (slotIndex < 0) return setNotice("The JUPAS choice list is full.");
    if (choiceCodes[slotIndex]) return setNotice(`${getChoiceRankLabel(slotIndex + 1)} already has a programme.`);
    setChoiceCodes((current) => current.map((item, index) => (index === slotIndex ? code : item)));
    setNotice(`${code} added to ${getChoiceRankLabel(slotIndex + 1)}.`);
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeType = event.active.data.current?.type;
    const activeCode = event.active.data.current?.jupasCode as string | undefined;
    const overId = event.over?.id?.toString();
    const overType = event.over?.data.current?.type;
    const activeIndex = event.active.data.current?.index as number | undefined;
    const overIndex = event.over?.data.current?.index as number | undefined;

    if (!activeCode || !overId) return;

    if (activeType === "programme" && (overId === "choices-drop" || overType === "choice-slot")) {
      addChoice(activeCode, typeof overIndex === "number" ? overIndex : undefined);
      return;
    }

    if (activeType === "choice" && overType === "choice-slot" && typeof activeIndex === "number" && typeof overIndex === "number" && activeIndex !== overIndex) {
      setChoiceCodes((current) => {
        const next = normalizeChoiceSlots(current);
        [next[activeIndex], next[overIndex]] = [next[overIndex], next[activeIndex]];
        return next;
      });
      setNotice(`${activeCode} moved to ${getChoiceRankLabel(overIndex + 1)}.`);
    }
  }

  function exportCsv() {
    const blob = new Blob([choicesToCsv(choices)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "jupas-choices.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copyChoices() {
    await navigator.clipboard.writeText(choicesToText(choices.map((view) => view?.programme)));
    setNotice("Choices copied as plain text.");
  }

  const institutions = unique(programmes.map((programme) => programme.institution));
  const facultyGroups = institutions
    .map((institution) => ({
      institution,
      faculties: unique(
        programmes
          .filter((programme) => programme.institution === institution)
          .map((programme) => programme.faculty)
          .filter(Boolean) as string[],
      ),
    }))
    .filter((group) => group.faculties.length);
  const categories = unique(programmes.map((programme) => programme.category).filter(Boolean) as string[]);
  const formulaTypes = unique(programmes.map((programme) => programme.formulaType));
  const weightedSubjectOptions = unique(
    programmes
      .flatMap((programme) => programme.weightingRules?.filter((rule) => rule.multiplier > 1).flatMap((rule) => rule.subjects.map(weightingFilterSubject)) ?? [])
      .filter((subject) => subject && subject !== "Other elective subjects"),
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-paper text-ink">
        <header className="border-b border-ink/10 bg-white px-4 py-5">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="max-w-5xl text-2xl font-bold tracking-normal text-ink md:text-3xl">
                2026 JUPAS Admission Score Calculator and Choice Builder
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-ink/65">
                Calculate programme-specific HKDSE scores, compare options, and build a ranked list of up to 20 choices.
                This calculator references 2026 admission weightings and 2025 admission scores published by JUPAS and universities.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 lg:items-end">
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <a
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-teal/25 bg-white px-3 py-1.5 text-left shadow-sm hover:bg-teal/10"
                  href="https://www.blisseducationhk.com/en/services-9"
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={16} className="shrink-0 text-teal" />
                  <span className="grid leading-tight">
                    <span className="text-sm font-semibold text-teal">Admissions Consultation</span>
                    <span className="text-xs font-medium text-ink/55">by Bliss Education Consultancy</span>
                  </span>
                </a>
                <FeedbackButton />
              </div>
              <div className="min-h-5 text-sm font-semibold text-teal">{notice}</div>
            </div>
          </div>
        </header>

        <JumpNav />

        <main className="mx-auto grid max-w-[1600px] lg:grid-cols-[340px_minmax(0,1fr)_420px]">
          <div id="hkdse-results" className="scroll-mt-24">
            <ResultInputPanel results={results} onChange={setResults} />
          </div>

          <div id="programmes-overview" className="min-h-0 scroll-mt-24">
            <FilterBar
              filters={filters}
              onChange={setFilters}
              institutions={institutions}
              facultyGroups={facultyGroups}
              weightedSubjectOptions={weightedSubjectOptions}
              categories={categories}
              formulaTypes={formulaTypes}
              onReset={() => setFilters(defaultFilters)}
            />
            <div className="p-4 pb-0">
              <AdmissionLegend />
            </div>
            <ProgrammeList
              programmes={filteredViews}
              pinnedCodes={pinnedCodes}
              hiddenCodes={hiddenCodes}
              choiceCodes={selectedChoiceCodes}
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
            selectedCount={selectedChoiceCount}
            onRemove={(index) => setChoiceCodes((current) => current.map((item, itemIndex) => (itemIndex === index ? null : item)))}
            onClear={() => setChoiceCodes(emptyChoiceSlots())}
            onExport={exportCsv}
            onCopy={copyChoices}
          />
        </main>

        <footer className="border-t border-ink/10 bg-white px-4 py-5">
          <div className="mx-auto grid max-w-[1600px] gap-4">
            <Disclaimer />
            <p className="text-sm text-ink/60">© 2026 Chun Yin Oz Choi</p>
          </div>
        </footer>

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

function JumpNav() {
  return (
    <nav className="sticky top-0 z-40 border-b border-ink/10 bg-white/95 px-4 py-2 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] gap-2 overflow-x-auto">
        <JumpButton targetId="hkdse-results">Input HKDSE Results</JumpButton>
        <JumpButton targetId="programmes-overview">Programmes Overview</JumpButton>
        <JumpButton targetId="jupas-choices">My 20 JUPAS Choices</JumpButton>
      </div>
    </nav>
  );
}

function JumpButton({ targetId, children }: { targetId: string; children: React.ReactNode }) {
  function jumpToSection() {
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <button
      type="button"
      className="h-9 shrink-0 rounded-md border border-ink/15 bg-paper px-3 text-sm font-semibold text-ink hover:bg-teal/10 hover:text-teal"
      onClick={jumpToSection}
    >
      {children}
    </button>
  );
}

function ChoicePanel({
  choices,
  selectedCount,
  onRemove,
  onClear,
  onExport,
  onCopy,
}: {
  choices: Array<ProgrammeView | undefined>;
  selectedCount: number;
  onRemove: (index: number) => void;
  onClear: () => void;
  onExport: () => void;
  onCopy: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "choices-drop" });

  return (
    <aside
      id="jupas-choices"
      ref={setNodeRef}
      className={`scroll-mt-24 border-t border-ink/10 bg-white px-4 py-4 lg:min-h-[calc(100vh-85px)] lg:border-l lg:border-t-0 ${
        isOver ? "bg-teal/5" : ""
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">My 20 JUPAS Choices</h2>
          <p className="text-sm text-ink/60">{selectedCount}/20 selected</p>
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
      <div className="grid gap-3">
        {Array.from({ length: choiceSlotCount }, (_, index) => (
          <ChoiceSlot key={`choice-slot-${index}`} index={index} view={choices[index]} onRemove={() => onRemove(index)} />
        ))}
      </div>
    </aside>
  );
}

function ChoiceSlot({
  index,
  view,
  onRemove,
}: {
  index: number;
  view: ProgrammeView | undefined;
  onRemove: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `choice-slot-${index}`,
    data: { type: "choice-slot", index },
  });
  const rank = index + 1;

  return (
    <div ref={setNodeRef} className={`rounded-md ${isOver ? "ring-2 ring-teal ring-offset-2" : ""}`}>
      {view ? <ChoiceItem {...view} rank={rank} onRemove={onRemove} /> : <EmptyChoiceSlot rank={rank} />}
    </div>
  );
}

function EmptyChoiceSlot({ rank }: { rank: number }) {
  return (
    <div className={`rounded-md border border-dashed p-3 text-sm ${emptySlotClass(rank)}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-md px-3 py-1.5 text-sm font-bold ${bandBadgeClass(rank)}`}>{getChoiceRankLabel(rank)}</span>
        <span>Drag programme cards here or use Add to Choices.</span>
      </div>
    </div>
  );
}

function bandBadgeClass(rank: number): string {
  if (rank <= 3) return "bg-teal text-white";
  if (rank <= 6) return "bg-coral text-white";
  if (rank <= 10) return "bg-moss text-white";
  if (rank <= 15) return "bg-ink text-white";
  return "bg-yellow-500 text-ink";
}

function emptySlotClass(rank: number): string {
  if (rank <= 3) return "border-teal/25 bg-teal/5 text-teal/75";
  if (rank <= 6) return "border-coral/25 bg-coral/5 text-coral/75";
  if (rank <= 10) return "border-moss/25 bg-moss/5 text-moss/75";
  if (rank <= 15) return "border-ink/20 bg-ink/5 text-ink/55";
  return "border-yellow-400/35 bg-yellow-50 text-yellow-700";
}

function defaultResults(): StudentResult[] {
  return [
    { subject: "Chinese Language", grade: "Not taken" },
    { subject: "English Language", grade: "Not taken" },
    { subject: "Mathematics Compulsory Part", grade: "Not taken" },
    { subject: "Citizenship and Social Development", grade: "Unattained" },
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

function emptyChoiceSlots(): ChoiceSlotCode[] {
  return Array.from({ length: choiceSlotCount }, () => null);
}

function normalizeChoiceSlots(value: unknown): ChoiceSlotCode[] {
  const slots = emptyChoiceSlots();
  if (!Array.isArray(value)) return slots;

  value.slice(0, choiceSlotCount).forEach((item, index) => {
    slots[index] = typeof item === "string" && item ? item : null;
  });
  return slots;
}

function unique<T extends string>(items: T[]): T[] {
  return [...new Set(items)].sort();
}

function diffFrom(view: ProgrammeView, key: "lowerQuartile" | "median"): number {
  return view.calculation.totalScore - (view.programme[key] ?? Number.POSITIVE_INFINITY);
}

function hasSelectedHighWeighting(programme: Programme, subjects: string[]): boolean {
  return maxSelectedWeighting(programme, subjects) > 1;
}

function maxSelectedWeighting(programme: Programme, subjects: string[]): number {
  const aliases = subjects.flatMap(subjectAliases);
  const ruleWeight = Math.max(
    0,
    ...(programme.weightingRules ?? [])
      .filter((rule) => rule.multiplier > 1 && rule.subjects.some((subject) => aliases.includes(normalizeSubject(weightingFilterSubject(subject)))))
      .map((rule) => rule.multiplier),
  );
  const rawText = `${programme.formulaRaw} ${programme.weightingRaw ?? ""}`;
  const textWeight = Math.max(0, ...aliases.map((subject) => directTextWeight(rawText, subject)));
  return Math.max(ruleWeight, textWeight);
}

function directTextWeight(text: string, subject: string): number {
  const escaped = subject.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*x\\s*${escaped}\\b|${escaped}[^;,.]*?\\(x\\s*(\\d+(?:\\.\\d+)?)\\)`, "i"));
  return match ? Number(match[1] ?? match[2]) : 0;
}

function subjectAliases(subject: string): string[] {
  const normalized = normalizeSubject(subject);
  const aliases: Record<string, string[]> = {
    "English Language": ["English Language", "English", "Eng"],
    "Chinese Language": ["Chinese Language", "Chinese", "Chin"],
    "Mathematics Compulsory Part": ["Mathematics Compulsory Part", "Mathematics", "Math"],
    ICT: ["ICT", "Information and Communication Technology"],
    BAFS: ["BAFS", "Business, Accounting and Financial Studies"],
    M1: ["M1", "Mathematics Extended Part Module 1"],
    M2: ["M2", "Mathematics Extended Part Module 2"],
  };
  return (aliases[normalized] ?? [normalized]).map(normalizeSubject);
}

function normalizeSubject(subject: string): string {
  return subject.trim();
}

function weightingFilterSubject(subject: string): string {
  const cleaned = subject
    .replace(/\s+in\s+(?:1st|2nd|first|second)\s+elective\b/gi, "")
    .replace(/^The best one subject of\s+/i, "")
    .replace(/^Best one subject of\s+/i, "")
    .replace(/^Best\s+/i, "")
    .replace(/\s*\([^)]*$/, "")
    .replace(/\)+$/g, "")
    .trim();

  const aliases: Record<string, string> = {
    "BAFS": "BAFS",
    "BAFS Accounting": "BAFS",
    "Business Management": "BAFS",
    "Business, Accounting": "BAFS",
    "Business, Accounting and Financial Studies": "BAFS",
    "Design  Applied Technology": "Design and Applied Technology",
    "Information and Communication Technology": "ICT",
    "English Literature Language": "English Literature",
    "Health Management": "Health Management and Social Care",
    "Mathematics Extended Part Module 1": "M1",
    "Mathematics Extended Part Module 2": "M2",
    "Technology": "Technology and Living",
    "Living": "Technology and Living",
    "Tourism": "Tourism and Hospitality Studies",
    "Hospitality Studies": "Tourism and Hospitality Studies",
  };

  return aliases[cleaned] ?? cleaned;
}
