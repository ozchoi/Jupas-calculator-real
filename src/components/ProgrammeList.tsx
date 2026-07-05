import ProgrammeCard, { type ProgrammeView } from "./ProgrammeCard";

type Props = {
  programmes: ProgrammeView[];
  pinnedCodes: string[];
  hiddenCodes: string[];
  choiceCodes: string[];
  onAdd: (code: string) => void;
  onOpen: (code: string) => void;
  onPin: (code: string) => void;
  onHide: (code: string) => void;
};

export default function ProgrammeList({
  programmes,
  pinnedCodes,
  hiddenCodes,
  choiceCodes,
  onAdd,
  onOpen,
  onPin,
  onHide,
}: Props) {
  return (
    <section className="scrollbar-thin grid gap-3 overflow-auto p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">Programmes</h2>
        <span className="text-sm font-medium text-ink/55">{programmes.length} shown</span>
      </div>
      {programmes.map((view) => (
        <ProgrammeCard
          key={view.programme.jupasCode}
          {...view}
          pinned={pinnedCodes.includes(view.programme.jupasCode)}
          hidden={hiddenCodes.includes(view.programme.jupasCode)}
          inChoices={choiceCodes.includes(view.programme.jupasCode)}
          onAdd={() => onAdd(view.programme.jupasCode)}
          onOpen={() => onOpen(view.programme.jupasCode)}
          onPin={() => onPin(view.programme.jupasCode)}
          onHide={() => onHide(view.programme.jupasCode)}
        />
      ))}
      {!programmes.length && (
        <div className="rounded-md border border-dashed border-ink/20 bg-white p-8 text-center text-ink/60">
          No programmes match the current filters.
        </div>
      )}
    </section>
  );
}
