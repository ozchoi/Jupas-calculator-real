import type { FundingCategory, FormulaType, Institution } from "../types/programme";

export type Filters = {
  query: string;
  institution: "All" | Institution;
  faculty: "All" | string;
  category: "All" | FundingCategory;
  formulaType: "All" | FormulaType;
  hasChineseTitle: boolean;
  hasAdmissionData: boolean;
  meetsRequirements: boolean;
  scoreAtLeastLq: boolean;
  scoreAtLeastMedian: boolean;
  sortBy:
    | "Best match"
    | "Highest chance"
    | "Highest score difference above LQ"
    | "Highest score difference above Median"
    | "University"
    | "JUPAS code"
    | "Programme title";
};

type Props = {
  filters: Filters;
  onChange: (filters: Filters) => void;
  institutions: string[];
  faculties: string[];
  categories: string[];
  formulaTypes: string[];
};

const sorts: Filters["sortBy"][] = [
  "Best match",
  "Highest chance",
  "Highest score difference above LQ",
  "Highest score difference above Median",
  "University",
  "JUPAS code",
  "Programme title",
];

export default function FilterBar({
  filters,
  onChange,
  institutions,
  faculties,
  categories,
  formulaTypes,
}: Props) {
  const patch = <K extends keyof Filters>(key: K, value: Filters[K]) => onChange({ ...filters, [key]: value });

  return (
    <section className="grid gap-3 border-b border-ink/10 bg-paper px-4 py-4 md:grid-cols-2 xl:grid-cols-4">
      <input
        className="h-10 rounded-md border border-ink/15 bg-white px-3 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
        placeholder="Search code, title, university"
        value={filters.query}
        onChange={(event) => patch("query", event.target.value)}
      />
      <Select label="University" value={filters.institution} options={["All", ...institutions]} onChange={(value) => patch("institution", value as Filters["institution"])} />
      <Select label="Faculty" value={filters.faculty} options={["All", ...faculties]} onChange={(value) => patch("faculty", value)} />
      <Select label="Funding" value={filters.category} options={["All", ...categories]} onChange={(value) => patch("category", value as Filters["category"])} />
      <Select label="Formula" value={filters.formulaType} options={["All", ...formulaTypes]} onChange={(value) => patch("formulaType", value as Filters["formulaType"])} />
      <Select label="Sort" value={filters.sortBy} options={sorts} onChange={(value) => patch("sortBy", value as Filters["sortBy"])} />
      <Toggle label="Chinese title" checked={filters.hasChineseTitle} onChange={(value) => patch("hasChineseTitle", value)} />
      <Toggle label="Admission data" checked={filters.hasAdmissionData} onChange={(value) => patch("hasAdmissionData", value)} />
      <Toggle label="Meet requirements" checked={filters.meetsRequirements} onChange={(value) => patch("meetsRequirements", value)} />
      <Toggle label="Score >= LQ" checked={filters.scoreAtLeastLq} onChange={(value) => patch("scoreAtLeastLq", value)} />
      <Toggle label="Score >= Median" checked={filters.scoreAtLeastMedian} onChange={(value) => patch("scoreAtLeastMedian", value)} />
    </section>
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
    <label className="flex h-10 items-center gap-2 rounded-md border border-ink/15 bg-white px-3 text-sm font-medium text-ink">
      <input
        type="checkbox"
        className="h-4 w-4 accent-teal"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
