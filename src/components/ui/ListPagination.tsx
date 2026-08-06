"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Windowed page numbers: 1 … around-current … last. */
function pageWindow(page: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const around = [page - 1, page, page + 1].filter(
    (p) => p > 1 && p < totalPages,
  );
  const out: (number | "…")[] = [1];
  if ((around[0] ?? totalPages) > 2) out.push("…");
  out.push(...around);
  if ((around.at(-1) ?? 1) < totalPages - 1) out.push("…");
  out.push(totalPages);
  return out;
}

/**
 * Numbered pagination for plain lists (cards, grids - anything that isn't a
 * data table), in the DB Plus ledger idiom: mono page figures as underline
 * tabs (the current page carries the console rule) between round ghost
 * chevrons. Hides itself entirely for a single page.
 */
export function ListPagination({
  page,
  totalPages,
  onPageChange,
  className,
}: {
  /** 1-based current page. */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  const chevron =
    "flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full text-soil transition-colors hover:bg-console/10 hover:text-console disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-soil";

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex flex-wrap items-center justify-center gap-1", className)}
    >
      <button
        type="button"
        className={chevron}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      {pageWindow(page, totalPages).map((p, i) =>
        p === "…" ? (
          <span
            key={`gap-${String(i)}`}
            className="font-adminmono px-0.5 text-[12px] text-soil/45"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-current={p === page ? "page" : undefined}
            onClick={() => onPageChange(p)}
            className={cn(
              "font-adminmono flex h-8 min-w-7 cursor-pointer items-center justify-center border-b-2 px-1 text-[12.5px] font-bold transition-colors",
              p === page
                ? "border-console text-console"
                : "border-transparent text-soil hover:text-console",
            )}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        className={chevron}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
