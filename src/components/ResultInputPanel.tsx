import subjectsData from "../data/subjects.json";
import type { StudentResult } from "../types/student";

const gradeOptions = ["5**", "5*", "5", "4", "3", "2", "1", "U", "Not taken"];
const csdGradeOptions = ["Attained", "Unattained", "Not taken"];
const maxElectives = 5;

type SubjectsData = {
  core: string[];
  electives: string[];
};

type Props = {
  results: StudentResult[];
  onChange: (results: StudentResult[]) => void;
};

const subjects = subjectsData as SubjectsData;

export default function ResultInputPanel({ results, onChange }: Props) {
  const coreResults = subjects.core.map((subject) => ({
    subject,
    grade: coreGradeFor(subject, results),
  }));
  const electiveResults = results.filter((result) => !subjects.core.includes(result.subject)).slice(0, maxElectives);
  const electiveSlots = Array.from({ length: maxElectives }, (_, index) => electiveResults[index] ?? { subject: "", grade: "Not taken" });

  function updateCore(subject: string, grade: string) {
    commit([
      ...coreResults.map((result) => (result.subject === subject ? { ...result, grade } : result)),
      ...electiveResults,
    ]);
  }

  function updateElective(index: number, field: "subject" | "grade", value: string) {
    const nextElectives = electiveSlots.map((slot, slotIndex) => (slotIndex === index ? { ...slot, [field]: value } : slot));
    commit([...coreResults, ...nextElectives.filter((slot) => slot.subject)]);
  }

  function commit(nextResults: StudentResult[]) {
    onChange(nextResults.map((result) => ({ ...result, grade: normalizeCsdGrade(result.grade) })));
  }

  function reset() {
    onChange([
      { subject: "Chinese Language", grade: "Not taken" },
      { subject: "English Language", grade: "Not taken" },
      { subject: "Mathematics Compulsory Part", grade: "Not taken" },
      { subject: "Citizenship and Social Development", grade: "Unattained" },
    ]);
  }

  return (
    <section className="border-b border-ink/10 bg-white/80 px-4 py-4 lg:border-b-0 lg:border-r lg:px-5">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">HKDSE Results</h2>
          <p className="text-sm text-ink/60">Four core subjects plus up to five electives.</p>
        </div>
        <button
          type="button"
          className="rounded-md border border-ink/15 px-3 py-2 text-sm font-medium text-ink hover:bg-ink/5"
          onClick={reset}
        >
          Reset
        </button>
      </div>

      <div className="grid gap-4">
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink/50">Core</h3>
          <div className="grid gap-3">
            {coreResults.map((result) => (
              <label key={result.subject} className="grid gap-1.5 text-sm">
                <span className="font-medium text-ink/80">{result.subject}</span>
                <select
                  className="h-10 rounded-md border border-ink/15 bg-paper px-3 text-ink outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                  value={result.grade}
                  onChange={(event) => updateCore(result.subject, event.target.value)}
                >
                  {(result.subject === "Citizenship and Social Development" ? csdGradeOptions : gradeOptions).map((grade) => (
                    <option key={grade}>{grade}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink/50">Electives</h3>
          <div className="grid gap-3">
            {electiveSlots.map((slot, index) => {
              const selectedElsewhere = electiveSlots
                .filter((_, slotIndex) => slotIndex !== index)
                .map((item) => item.subject);
              return (
                <div key={index} className="rounded-md border border-ink/10 bg-paper p-3">
                  <div className="mb-2 text-sm font-semibold text-ink/75">{ordinal(index + 1)} elective</div>
                  <div className="grid gap-2">
                    <select
                      className="h-10 rounded-md border border-ink/15 bg-white px-3 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                      value={slot.subject}
                      onChange={(event) => updateElective(index, "subject", event.target.value)}
                    >
                      <option value="">Not selected</option>
                      {subjects.electives
                        .filter((subject) => subject === slot.subject || !selectedElsewhere.includes(subject))
                        .map((subject) => (
                          <option key={subject}>{subject}</option>
                        ))}
                    </select>
                    <select
                      className="h-10 rounded-md border border-ink/15 bg-white px-3 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                      value={slot.grade}
                      disabled={!slot.subject}
                      onChange={(event) => updateElective(index, "grade", event.target.value)}
                    >
                      {gradeOptions.map((grade) => (
                        <option key={grade}>{grade}</option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function ordinal(value: number): string {
  return ["1st", "2nd", "3rd", "4th", "5th"][value - 1] ?? `${value}th`;
}

function normalizeCsdGrade(grade: string): string {
  return grade === "UnAttained" ? "Unattained" : grade;
}

function coreGradeFor(subject: string, results: StudentResult[]): string {
  const matches = results.filter((result) => result.subject === subject).map((result) => normalizeCsdGrade(result.grade));
  if (subject === "Citizenship and Social Development") {
    if (matches.includes("Attained")) return "Attained";
    return matches[0] ?? "Unattained";
  }
  return matches[0] ?? "Not taken";
}
