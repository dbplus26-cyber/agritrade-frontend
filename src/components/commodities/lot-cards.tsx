"use client";

import { useRef, useState } from "react";
import { DocCard } from "@/components/ui/DocCard";
import { CommodityPlaceholder } from "@/components/ui/CommodityPlaceholder";
import { Photo } from "@/components/ui/Photo";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { PublicLot } from "@/lib/public-commodities";

const PAGE_SIZE = 9;

/**
 * The slot a thumbnail lives in, used for the photo AND for both no-photo
 * paths (never filed, or filed but no longer resolving), so the card keeps one
 * height whatever the records hold.
 */
function ThumbFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[150px] w-full overflow-hidden border-b border-soil/30">
      {children}
    </div>
  );
}



/** One filed lot in the compact register: photo thumb (when the records hold
 * one), lot number, name, grades and the availability chip. Informational -
 * there is no per-commodity page to link to. Heights stay uniform via
 * reserved line-clamp space so mixed rows never stagger. */
function LotCard({ lot }: { lot: PublicLot }) {
  const spec = [lot.variety, lot.qualityGrade].filter(Boolean).join(" · ");
  return (
    // Two 1fr rows, so the picture and the paper under it are ALWAYS the same
    // height: the text is shown in full here (these cards have no detail page
    // to go to), and a card whose copy ran three times the depth of its own
    // photograph read as broken.
    <DocCard tint="paper" className="grid h-full min-w-0 grid-rows-[1fr_1fr]">
      {/* No photo on file - or one whose URL no longer resolves - falls back
          to the cropped ghost stencil (the lot-files idiom), so mixed rows
          keep one even card rhythm either way. */}
      <ThumbFrame>
        {lot.photo ? (
          <Photo
            src={lot.photo}
            alt={lot.photoAlt}
            fill
            sizes="(min-width: 1024px) 416px, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
            fallback={<CommodityPlaceholder />}
          />
        ) : (
          <CommodityPlaceholder />
        )}
      </ThumbFrame>
      <div className="flex min-w-0 flex-col p-5">
        <span className="stencil mb-2.5 block whitespace-nowrap text-[10px] leading-none tracking-[0.16em] text-harvest-deep">
          {lot.lotNo}
        </span>
        {/* Everything renders IN FULL, with no clamp and no title tooltip:
            there is no per-commodity page behind these cards, so the card is
            the only place the text exists, and a tooltip is unopenable on the
            phones most of these readers are holding. The fields are the
            office's own - variety, grade, description - and each is dropped
            when the record does not carry it. */}
        <h3 className="min-w-0 font-display text-[16px] font-bold leading-[1.2] tracking-[0.01em] text-forest [overflow-wrap:anywhere]">
          {lot.name}
        </h3>
        {spec ? (
          <p className="mt-1.5 min-w-0 text-[12.5px] leading-[1.5] text-harvest-deep [overflow-wrap:anywhere]">
            {spec}
          </p>
        ) : null}
        {lot.description ? (
          <p className="mt-2 min-w-0 text-[13px] leading-[1.6] text-soil [overflow-wrap:anywhere]">
            {lot.description}
          </p>
        ) : null}
        {/* The availability line - same vocabulary as the board planks. */}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-dotted border-soil/40 pt-3.5">
          {lot.inStock ? (
            <span className="stencil rounded-[2px] border border-leaf/55 px-2 py-1 text-[9px] leading-none tracking-[0.14em] text-forest">
              IN STOCK
            </span>
          ) : (
            <span className="stencil rounded-[2px] border border-dashed border-soil/50 px-2 py-1 text-[9px] leading-none tracking-[0.14em] text-soil">
              ON ORDER · ASK US
            </span>
          )}
          <span className="whitespace-nowrap text-[11px] text-soil/70">
            Call for a quote
          </span>
        </div>
      </div>
    </DocCard>
  );
}

/**
 * The compact tail of the commodities register. The first lots keep the rich
 * full-bleed file treatment in `LotFiles`; everything after them files here
 * as DocCard thumbnails in a 1/2/3-column grid, client-side paginated once
 * the register grows past 9 (stencilled PAGE X OF Y between square PREV/NEXT
 * blocks, in the site's ledger idiom).
 */
export function LotCards({ lots }: { lots: PublicLot[] }) {
  const [page, setPage] = useState(1);
  const topRef = useRef<HTMLElement>(null);
  const totalPages = Math.max(1, Math.ceil(lots.length / PAGE_SIZE));
  const pageLots = lots.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const goTo = (next: number) => {
    const clamped = Math.min(totalPages, Math.max(1, next));
    if (clamped === page) return;
    setPage(clamped);
    // The pager sits under the grid - bring the new page's first cards back
    // into view instead of leaving the reader staring at the pager.
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const pagerButton =
    "stencil cursor-pointer whitespace-nowrap rounded-[2px] border-[1.5px] border-forest/45 px-3 py-2.5 text-[12px] leading-none tracking-[0.16em] text-forest transition-colors hover:bg-forest/5 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent sm:px-4";

  return (
    <section
      ref={topRef}
      aria-label="The rest of the register"
      className="mx-auto max-w-[1312px] scroll-mt-24 px-5 pb-14 lg:px-8 lg:pb-[88px]"
    >
      <div aria-hidden="true" className="ledger-rule mb-10 lg:mb-14" />
      <SectionHeading
        eyebrow="THE REST OF THE REGISTER"
        title="Also on file."
        lede="Every other lot in the records - same grading, same certified scale. Call with tonnage and destination for a same-day quote."
        className="mb-8 lg:mb-10"
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {pageLots.map((lot) => (
          <LotCard key={lot.id} lot={lot} />
        ))}
      </div>
      {totalPages > 1 ? (
        <nav
          aria-label="Register pages"
          className="mt-8 flex items-center justify-between gap-2 sm:gap-3 lg:mt-10"
        >
          <button
            type="button"
            onClick={() => {
              goTo(page - 1);
            }}
            disabled={page <= 1}
            className={pagerButton}
          >
            {/* Arrow glyphs are sm+ decoration - at fold widths they cost the
                row the space the PAGE label needs. */}
            <span aria-hidden="true" className="hidden sm:inline">
              ←{" "}
            </span>
            PREV
          </button>
          <span
            aria-live="polite"
            className="stencil text-center text-[11px] leading-[1.5] tracking-[0.12em] text-soil sm:tracking-[0.2em]"
          >
            PAGE {page} OF {totalPages}
          </span>
          <button
            type="button"
            onClick={() => {
              goTo(page + 1);
            }}
            disabled={page >= totalPages}
            className={pagerButton}
          >
            NEXT
            <span aria-hidden="true" className="hidden sm:inline">
              {" "}
              →
            </span>
          </button>
        </nav>
      ) : null}
    </section>
  );
}
