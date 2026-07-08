import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(programmes.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const visibleProgrammes = useMemo(() => programmes.slice(pageStart, pageStart + pageSize), [pageSize, pageStart, programmes]);

  useEffect(() => {
    setPage((current) => Math.min(Math.max(1, current), totalPages));
  }, [totalPages]);

  function updatePage(nextPage: number) {
    setPage(Math.min(Math.max(1, nextPage), totalPages));
  }

  function updatePageSize(nextPageSize: number) {
    setPageSize(nextPageSize);
    setPage(1);
  }

  return (
    <section className="scrollbar-thin grid gap-3 overflow-auto p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">Programmes</h2>
        <span className="text-sm font-medium text-ink/55">{programmes.length} shown</span>
      </div>
      <PaginationControls
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={programmes.length}
        onPageChange={updatePage}
        onPageSizeChange={updatePageSize}
      />
      {visibleProgrammes.map((view) => (
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
      {programmes.length > 0 && (
        <PaginationControls
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={programmes.length}
          onPageChange={updatePage}
          onPageSizeChange={updatePageSize}
        />
      )}
    </section>
  );
}

function PaginationControls({
  page,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const pageOptions = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-ink/10 bg-white px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 font-medium text-ink/70">
          Show
          <select
            className="h-9 rounded-md border border-ink/15 bg-paper px-2 text-ink outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
          </select>
        </label>
        <span className="text-ink/55">programmes per page</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1 rounded-md border border-ink/15 px-2 font-semibold text-ink hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft size={16} /> Prev
        </button>
        <label className="flex items-center gap-2 font-medium text-ink/70">
          Page
          <select
            className="h-9 rounded-md border border-ink/15 bg-paper px-2 text-ink outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
            value={page}
            onChange={(event) => onPageChange(Number(event.target.value))}
          >
            {pageOptions.map((pageNumber) => (
              <option key={pageNumber} value={pageNumber}>
                {pageNumber}
              </option>
            ))}
          </select>
        </label>
        <span className="min-w-20 text-ink/55">
          of {totalPages} ({totalItems})
        </span>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1 rounded-md border border-ink/15 px-2 font-semibold text-ink hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
