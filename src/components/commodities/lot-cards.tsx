import Link from "next/link";
import { DocCard } from "@/components/ui/DocCard";
import { RegisterPager } from "@/components/ui/RegisterPager";
import { CommodityPlaceholder } from "@/components/ui/CommodityPlaceholder";
import { Photo } from "@/components/ui/Photo";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { routes } from "@/lib/routes";
import type { PublicLot } from "@/lib/public-commodities";

/** Rows per server page of the register - the page.tsx fetch and the backend
 * meta both speak this number. */
export const LOT_PAGE_SIZE = 9;

/**
 * The slot a thumbnail lives in, used for the photo AND for both no-photo
 * paths (never filed, or filed but no longer resolving), so the card keeps one
 * height whatever the records hold.
 *
 * The frame is a RATIO, not a minimum. It used to be `min-h-[150px]` in a
 * row the text below it sized, which meant the picture absorbed whatever
 * height the description left over: a lot with two lines of copy printed a
 * tall photograph and the lot beside it a short one, off the same grid. A
 * 4:3 box crops a portrait and a landscape original to the same shape, so
 * every thumbnail in the row is the same picture size.
 */
function ThumbFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-soil/30">
      {children}
    </div>
  );
}



/**
 * One lot in the register, as a SUMMARY that opens its page.
 *
 * The card used to print the whole record - variety, grade and the full
 * description - because there was nowhere else for that text to live. Now
 * there is: everything past the identifying facts moves to the lot's own page,
 * and the card carries what a reader needs to choose between lots. The
 * description is clamped here, so a long one cannot set the height of the row
 * it sits in.
 *
 * h-full + flex-col is what lines a row of these up: the grid stretches every
 * card to the tallest in its row, the column layout lets the stock/READ MORE
 * bar take mt-auto and sit on the bottom edge of all of them, and each text
 * line reserves its space so a lot with no variety on file does not print its
 * description a line higher than the lot beside it.
 */
function LotCard({ lot }: { lot: PublicLot }) {
  const spec = [lot.variety, lot.qualityGrade].filter(Boolean).join(" · ");
  return (
    <DocCard
      tint="paper"
      className="group flex h-full min-w-0 flex-col transition-[transform,box-shadow] duration-150 focus-within:shadow-[3px_3px_0_rgb(31_33_28/0.18)] hover:-translate-y-px hover:shadow-[3px_3px_0_rgb(31_33_28/0.18)]"
    >
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
      <div className="flex min-w-0 flex-1 flex-col p-5">
        <span className="stencil mb-2.5 block whitespace-nowrap text-[10px] leading-none tracking-[0.16em] text-harvest-deep">
          {lot.lotNo}
        </span>
        {/* Two lines are reserved whether the name takes one or two, so the
            spec line under it starts at the same height on every card. */}
        <h3 className="min-h-[2.6em] min-w-0 line-clamp-2 font-display text-[16px] font-bold leading-[1.2] tracking-[0.01em] text-forest [overflow-wrap:anywhere]">
          {/* The whole card is the target: the overlay covers it, so the row
              is one honest link rather than a card with a small link on it. */}
          <Link href={routes.commodity(lot.slug)} className="focus-visible:outline-none">
            <span aria-hidden="true" className="absolute inset-0 z-[1]" />
            {lot.name}
          </Link>
        </h3>
        {/* Both lines print even when the record is empty. Dropping the line
            for a lot that files no variety or no description pulled the rest
            of that card up out of step with the row. */}
        <p className="mt-1.5 min-h-[1.5em] min-w-0 line-clamp-1 text-[12.5px] leading-[1.5] text-harvest-deep [overflow-wrap:anywhere]">
          {spec}
        </p>
        <p className="mb-4 mt-2 min-h-[3.2em] min-w-0 line-clamp-2 text-[13px] leading-[1.6] text-soil [overflow-wrap:anywhere]">
          {lot.description}
        </p>
        {/* Stacked at fold widths: side by side, the longer ON ORDER tag and
            READ MORE overrun a 280px card, and a tag that wrapped on some
            cards and not others put the bar at two different heights. */}
        <div className="mt-auto flex flex-col items-start gap-2 border-t border-dotted border-soil/40 pt-3.5 min-[340px]:flex-row min-[340px]:items-center min-[340px]:justify-between min-[340px]:gap-3">
          {lot.inStock ? (
            <span className="stencil whitespace-nowrap rounded-[2px] border border-leaf/55 px-2 py-1 text-[9px] leading-none tracking-[0.14em] text-forest">
              IN STOCK
            </span>
          ) : (
            <span className="stencil whitespace-nowrap rounded-[2px] border border-dashed border-soil/50 px-2 py-1 text-[9px] leading-none tracking-[0.14em] text-soil">
              ON ORDER · ASK US
            </span>
          )}
          <span className="stencil whitespace-nowrap text-[10px] tracking-[0.14em] text-forest transition-transform group-hover:translate-x-0.5">
            READ MORE →
          </span>
        </div>
      </div>
    </DocCard>
  );
}

/**
 * The compact tail of the commodities register. The first lots keep the rich
 * full-bleed file treatment in `LotFiles`; everything after them files here
 * as DocCard thumbnails in a 1/2/3-column grid, server-paginated once the
 * register grows past a page (stencilled PAGE X OF Y between square PREV/NEXT
 * blocks, in the site's ledger idiom): `lots` is ONE server page, and the
 * pager's links carry `?page=N` back to the route.
 */
export function LotCards({
  basePath,
  lots,
  page,
  totalPages,
}: {
  /** The route the pager links back into, e.g. routes.commodities. */
  basePath: string;
  lots: PublicLot[];
  page: number;
  totalPages: number;
}) {
  return (
    <section
      aria-label="The register"
      className="mx-auto max-w-[1312px] scroll-mt-24 px-5 pb-14 lg:px-8 lg:pb-[88px]"
    >
      <div aria-hidden="true" className="ledger-rule mb-10 lg:mb-14" />
      <SectionHeading
        eyebrow="THE REGISTER"
        title="Every lot on file."
        lede="Same grading, same certified scale. Open a lot to read what the office keeps on it, or call with tonnage and destination for a same-day quote."
        className="mb-8 lg:mb-10"
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {lots.map((lot) => (
          <LotCard key={lot.id} lot={lot} />
        ))}
      </div>
      <RegisterPager
        basePath={basePath}
        className="mt-8 lg:mt-10"
        page={page}
        totalPages={totalPages}
      />
    </section>
  );
}
