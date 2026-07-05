const items = [
  { label: ">= UQ", className: "border-blue-300 bg-blue-50" },
  { label: ">= Median/Mean", className: "border-emerald-300 bg-emerald-50" },
  { label: ">= LQ", className: "border-yellow-300 bg-yellow-50" },
  { label: "Meets minimum only", className: "border-orange-300 bg-orange-50" },
  { label: "Does not meet requirement", className: "border-coral/40 bg-coral/10" },
];

export default function AdmissionLegend() {
  return (
    <section className="rounded-md border border-ink/10 bg-white px-4 py-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">Colour Legend</div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {items.map((item) => (
          <div key={item.label} className={`rounded-md border px-3 py-2 text-sm font-semibold text-ink ${item.className}`}>
            {item.label}
          </div>
        ))}
      </div>
    </section>
  );
}
