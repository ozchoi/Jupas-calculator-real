import subjects from "../data/subjects.json";
import type { StudentResult } from "../types/student";

const gradeOptions = ["5**", "5*", "5", "4", "3", "2", "1", "U", "Not taken"];

type Props = {
  results: StudentResult[];
  onChange: (results: StudentResult[]) => void;
};

export default function ResultInputPanel({ results, onChange }: Props) {
  function updateSubject(subject: string, grade: string) {
    onChange(results.map((result) => (result.subject === subject ? { ...result, grade } : result)));
  }

  return (
    <section className="border-b border-ink/10 bg-white/80 px-4 py-4 lg:border-b-0 lg:border-r lg:px-5">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">HKDSE Results</h2>
          <p className="text-sm text-ink/60">Predicted or actual grades are saved locally.</p>
        </div>
        <button
          type="button"
          className="rounded-md border border-ink/15 px-3 py-2 text-sm font-medium text-ink hover:bg-ink/5"
          onClick={() => onChange(subjects.map((subject) => ({ subject, grade: "Not taken" })))}
        >
          Reset
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {subjects.map((subject) => {
          const result = results.find((item) => item.subject === subject);
          return (
            <label key={subject} className="grid gap-1.5 text-sm">
              <span className="font-medium text-ink/80">{subject}</span>
              <select
                className="h-10 rounded-md border border-ink/15 bg-paper px-3 text-ink outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                value={result?.grade ?? "Not taken"}
                onChange={(event) => updateSubject(subject, event.target.value)}
              >
                {gradeOptions.map((grade) => (
                  <option key={grade}>{grade}</option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
    </section>
  );
}
