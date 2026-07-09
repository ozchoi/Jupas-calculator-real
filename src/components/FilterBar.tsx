import { RotateCcw } from "lucide-react";
import type { FundingCategory, Institution } from "../types/programme";

export type Filters = {
  query: string;
  institutions: Institution[];
  faculties: string[];
  weightedSubjects: string[];
  category: "All" | FundingCategory;
  meetsRequirements: boolean;
  scoreAtLeastLq: boolean;
  scoreAtLeastMedian: boolean;
  scoreAtLeastUq: boolean;
  sortBy:
    | "Best match"
    | "Highest chance"
    | "Highest score difference above LQ"
    | "Highest score difference above Median"
    | "JUPAS code";
};

type Props = {
  filters: Filters;
  onChange: (filters: Filters) => void;
  institutions: string[];
  facultyGroups: Array<{ institution: string; faculties: string[] }>;
  weightedSubjectOptions: string[];
  categories: string[];
  onReset: () => void;
};

const sorts: Filters["sortBy"][] = [
  "Best match",
  "Highest chance",
  "Highest score difference above LQ",
  "Highest score difference above Median",
  "JUPAS code",
];

export default function FilterBar({
  filters,
  onChange,
  institutions,
  facultyGroups,
  weightedSubjectOptions,
  categories,
  onReset,
}: Props) {
  const patch = <K extends keyof Filters>(key: K, value: Filters[K]) => onChange({ ...filters, [key]: value });
  const patchArray = <K extends "institutions" | "faculties" | "weightedSubjects">(key: K, value: string) => {
    const current = filters[key] as string[];
    patch(key, (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]) as Filters[K]);
  };

  return (
    <section className="border-b border-ink/10 bg-paper px-4 py-4">
      <div className="grid gap-x-4 gap-y-3 md:grid-cols-2 xl:grid-cols-3">
        <FilterCell label="Search">
          <input
            className="h-10 w-full min-w-0 rounded-md border border-ink/15 bg-white px-3 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
            placeholder="Search code, title, university"
            value={filters.query}
            onChange={(event) => patch("query", event.target.value)}
          />
        </FilterCell>
        <MultiSelect
          label="University"
          placeholder="All universities"
          values={filters.institutions}
          options={institutions}
          onToggle={(value) => patchArray("institutions", value)}
          onClear={() => patch("institutions", [])}
        />
        <GroupedMultiSelect
          label="Faculty"
          placeholder="All faculties"
          values={filters.faculties}
          groups={facultyGroups}
          onToggle={(value) => patchArray("faculties", value)}
          onClear={() => patch("faculties", [])}
        />
        <MultiSelect
          label="High weighting subject"
          placeholder="Any subject"
          values={filters.weightedSubjects}
          options={weightedSubjectOptions}
          onToggle={(value) => patchArray("weightedSubjects", value)}
          onClear={() => patch("weightedSubjects", [])}
        />
        <Select label="Funding" value={filters.category} options={["All", ...categories]} onChange={(value) => patch("category", value as Filters["category"])} />
        <Select label="Sort" value={filters.sortBy} options={sorts} onChange={(value) => patch("sortBy", value as Filters["sortBy"])} />
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[repeat(4,minmax(0,1fr))_minmax(180px,0.85fr)]">
        <Toggle label="Meet req." checked={filters.meetsRequirements} onChange={(value) => patch("meetsRequirements", value)} />
        <Toggle label=">= LQ" checked={filters.scoreAtLeastLq} onChange={(value) => patch("scoreAtLeastLq", value)} />
        <Toggle label=">= Median" checked={filters.scoreAtLeastMedian} onChange={(value) => patch("scoreAtLeastMedian", value)} />
        <Toggle label=">= UQ" checked={filters.scoreAtLeastUq} onChange={(value) => patch("scoreAtLeastUq", value)} />
        <button
          type="button"
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-ink/15 bg-white px-3 text-sm font-semibold text-ink hover:bg-ink/5"
          onClick={onReset}
        >
          <RotateCcw size={16} /> Reset filters
        </button>
      </div>
    </section>
  );
}

function FilterCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid min-w-0 gap-1 text-xs font-semibold uppercase tracking-wide text-ink/55">
      <span>{label}</span>
      {children}
    </label>
  );
}

function MultiSelect({
  label,
  placeholder,
  values,
  options,
  onToggle,
  onClear,
}: {
  label: string;
  placeholder: string;
  values: string[];
  options: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <details className="group relative">
      <summary className="grid cursor-pointer list-none gap-1 text-xs font-semibold uppercase tracking-wide text-ink/55 marker:hidden">
        {label}
        <span className="flex h-10 items-center justify-between rounded-md border border-ink/15 bg-white px-3 text-sm font-normal normal-case tracking-normal text-ink">
          <span className="truncate">{values.length ? `${values.length} selected` : placeholder}</span>
          <span className="text-ink/45">▾</span>
        </span>
      </summary>
      <div className="absolute z-40 mt-2 max-h-72 w-full min-w-64 overflow-auto rounded-md border border-ink/15 bg-white p-2 text-sm shadow-xl">
        <button type="button" className="mb-2 w-full rounded-md px-2 py-1 text-left font-semibold text-teal hover:bg-teal/10" onClick={onClear}>
          Clear selection
        </button>
        <div className="grid gap-1">
          {options.map((option) => (
            <CheckboxOption key={option} label={option} checked={values.includes(option)} onChange={() => onToggle(option)} />
          ))}
        </div>
      </div>
    </details>
  );
}

function GroupedMultiSelect({
  label,
  placeholder,
  values,
  groups,
  onToggle,
  onClear,
}: {
  label: string;
  placeholder: string;
  values: string[];
  groups: Array<{ institution: string; faculties: string[] }>;
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <details className="group relative">
      <summary className="grid cursor-pointer list-none gap-1 text-xs font-semibold uppercase tracking-wide text-ink/55 marker:hidden">
        {label}
        <span className="flex h-10 items-center justify-between rounded-md border border-ink/15 bg-white px-3 text-sm font-normal normal-case tracking-normal text-ink">
          <span className="truncate">{values.length ? `${values.length} selected` : placeholder}</span>
          <span className="text-ink/45">▾</span>
        </span>
      </summary>
      <div className="absolute z-40 mt-2 max-h-80 w-full min-w-80 overflow-auto rounded-md border border-ink/15 bg-white p-2 text-sm shadow-xl">
        <button type="button" className="mb-2 w-full rounded-md px-2 py-1 text-left font-semibold text-teal hover:bg-teal/10" onClick={onClear}>
          Clear selection
        </button>
        <div className="grid gap-3">
          {groups.map((group) => (
            <div key={group.institution}>
              <div className="mb-1 rounded bg-ink/5 px-2 py-1 text-xs font-bold uppercase tracking-wide text-ink/55">{group.institution}</div>
              <div className="grid gap-1">
                {group.faculties.map((faculty) => (
                  <CheckboxOption key={`${group.institution}-${faculty}`} label={faculty} checked={values.includes(faculty)} onChange={() => onToggle(faculty)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}

function CheckboxOption({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-ink hover:bg-ink/5">
      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-teal" checked={checked} onChange={onChange} />
      <span className="leading-snug">{label}</span>
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-ink/55">
      {label}
      <select
        className="h-10 rounded-md border border-ink/15 bg-white px-3 text-sm font-normal normal-case tracking-normal text-ink outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex h-10 min-w-0 items-center gap-2 rounded-md border border-ink/15 bg-white px-3 text-sm font-medium normal-case tracking-normal text-ink">
      <input
        type="checkbox"
        className="h-4 w-4 shrink-0 accent-teal"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
