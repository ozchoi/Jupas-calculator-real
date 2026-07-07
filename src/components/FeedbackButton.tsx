import { MessageSquareWarning, Send, X } from "lucide-react";
import { useMemo, useState } from "react";

const spreadsheetUrl = "https://docs.google.com/spreadsheets/d/1vxzcc2zmXm5pLzVjpN5uvDN3hRdJBZDjWK8I2kR0eq8/edit?usp=sharing";
const feedbackEndpoint =
  (import.meta as ImportMeta & { env?: { VITE_FEEDBACK_ENDPOINT?: string } }).env?.VITE_FEEDBACK_ENDPOINT ?? "";

export default function FeedbackButton() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState(today);
  const [problem, setProblem] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitFeedback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedProblem = problem.trim();
    if (!trimmedProblem) {
      setStatus("Please describe the problem first.");
      return;
    }

    if (!feedbackEndpoint) {
      setStatus("Feedback form is ready. Add the Google Apps Script Web App URL to enable spreadsheet submission.");
      return;
    }

    setIsSubmitting(true);
    setStatus("");

    try {
      await fetch(feedbackEndpoint, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ date, problem: trimmedProblem }),
      });
      setProblem("");
      setStatus("Feedback submitted. Thank you.");
    } catch {
      setStatus("Could not submit feedback. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-teal/25 bg-teal px-3 text-sm font-semibold text-white shadow-sm hover:bg-teal/90"
        onClick={() => setIsOpen(true)}
      >
        <MessageSquareWarning size={16} /> Report feedback
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4 py-6">
          <div className="w-full max-w-md rounded-md border border-ink/10 bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ink">Report feedback</h2>
                <p className="mt-1 text-sm text-ink/60">Date and problem will be saved for review.</p>
              </div>
              <button
                type="button"
                className="rounded-md p-2 text-ink/55 hover:bg-ink/5"
                onClick={() => setIsOpen(false)}
                aria-label="Close feedback form"
              >
                <X size={18} />
              </button>
            </div>

            <form className="grid gap-3" onSubmit={submitFeedback}>
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-ink/55">
                Date
                <input
                  type="date"
                  className="h-10 rounded-md border border-ink/15 bg-white px-3 text-sm font-normal normal-case tracking-normal text-ink outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </label>

              <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-ink/55">
                Problem
                <textarea
                  className="min-h-32 rounded-md border border-ink/15 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-ink outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                  value={problem}
                  onChange={(event) => setProblem(event.target.value)}
                  placeholder="Tell us what is wrong or what should be improved."
                />
              </label>

              {status && <p className="rounded-md bg-ink/5 px-3 py-2 text-sm text-ink/70">{status}</p>}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <a className="text-sm font-semibold text-teal hover:underline" href={spreadsheetUrl} target="_blank" rel="noreferrer">
                  View feedback sheet
                </a>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal px-4 text-sm font-semibold text-white hover:bg-teal/90 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                >
                  <Send size={16} /> {isSubmitting ? "Sending" : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
