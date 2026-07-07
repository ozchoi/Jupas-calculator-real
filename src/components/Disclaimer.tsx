export default function Disclaimer() {
  return (
    <div className="rounded-md border border-coral/30 bg-coral/10 px-4 py-3 text-sm leading-relaxed text-ink">
      <p className="font-semibold">Reference only / 只供參考。</p>
      <p className="mt-1">
        This tool uses JUPAS and university admissions data for planning and counselling purposes only. Admissions scores vary by year,
        programme, score formula, subject weighting, interview performance, band choice, non-academic performance and other selection
        criteria. It should not be used to predict admission outcomes.
      </p>
      <p className="mt-2">
        We are not affiliated with JUPAS or any university. Although we try to keep the data and calculations accurate, errors, omissions
        or outdated information may exist. We do not accept responsibility or liability for any loss, decision, application result or
        consequence arising from the use of this tool. Always verify final requirements, scores and selection rules with the official JUPAS
        website and the respective university websites.
      </p>
    </div>
  );
}
