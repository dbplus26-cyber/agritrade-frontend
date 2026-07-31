import Link from "next/link";
import { routes } from "@/lib/routes";
import type { CommodityLine } from "@/static-data/availability";
import { cn } from "@/lib/utils";

/**
 * The availability board, filed as a document.
 *
 * This used to be a near-black band of tilted wooden planks with stencilled
 * names, gold tags nailed on at an angle and a vertical grain stripe running
 * through the text. It was the loudest thing on the site and the only heavy
 * dark block on an otherwise pale page, and the metaphor was carrying more
 * weight than the information: what a buyer wants from this section is what is
 * in the warehouse today, which is a register.
 *
 * So it is one now - a bordered sheet with a dotted rule between entries, the
 * commodity in the house display face, its variety and grade beneath, and the
 * availability chip on the right in the same vocabulary the lot cards on
 * /commodities already use. Same content, same words, read at a glance.
 */

/**
 * The availability chip, matching the IN STOCK / ASK US chips on lot cards.
 *
 * On a phone it is PINNED and SLANTED over the row's right edge instead of
 * taking a column of its own: sitting inline it ate close to a third of a
 * 390px row, which is a lot of width to spend on two words when the commodity
 * itself is what the reader came for. Pinned, the text keeps ~82% of the row
 * and the tag reads as something stuck onto the record. From sm up there is
 * width for both, so it returns to the flow, square.
 */
function AvailabilityChip({ available }: { available: boolean }) {
  return (
    <span
      className={cn(
        "stencil absolute right-1.5 top-1/2 flex -translate-y-1/2 -rotate-[7deg] items-center whitespace-nowrap rounded-[2px] border bg-paper px-1.5 py-1 text-[7.5px] leading-none tracking-normal shadow-doc-sm sm:static sm:translate-y-0 sm:gap-1.5 sm:rotate-0 sm:px-2.5 sm:py-1.5 sm:text-[10px] sm:tracking-[0.14em] sm:shadow-none",
        available
          ? "border-leaf/55 text-forest"
          : "border-dashed border-soil/50 text-soil",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          // Hidden on the pinned mobile tag: at that size the dot is a
          // smudge, and it costs width the two words need.
          "hidden size-[6px] rounded-full sm:block",
          available ? "bg-leaf" : "border border-soil/70",
        )}
      />
      {available ? "AVAILABLE NOW" : "ASK US"}
    </span>
  );
}

/** One filed line: what it is, how it is graded, whether it can be had today. */
function RegisterRow({
  first,
  meta,
  name,
  available,
  slug,
  wrap = false,
}: {
  available: boolean;
  first: boolean;
  meta: string;
  name: string;
  /** When present the whole row opens the commodity's page. */
  slug?: string;
  /**
   * Let both lines run onto as many lines as they need instead of clipping.
   * Used for the empty-register notice, which is a message rather than a
   * record: there is no lot file behind it and no FULL BOARD entry to read the
   * rest on, so a clipped one leaves the reader with nowhere to go.
   */
  wrap?: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative flex items-center justify-between gap-4 px-4 py-4 transition-colors sm:gap-6 sm:px-7 sm:py-[18px]",
        slug && "hover:bg-harvest/6",
        !first && "border-t border-dotted border-soil/40",
      )}
    >
      {/* The right gutter is exactly what the pinned mobile tag needs, so the
          record's own text ends in an ellipsis before it rather than running
          underneath. Spelled in full at a legible size the tag cannot go under
          ~75px, which is the floor on how much of a 390px row it can give
          back. */}
      <span className="min-w-0 basis-full pr-[80px] sm:basis-auto sm:pr-0">
        {/* The whole row is the target when the line has a page behind it -
            reading the board and opening a lot are the same gesture. */}
        {slug ? (
          <Link
            href={routes.commodity(slug)}
            className="absolute inset-0 z-[1] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-forest"
          >
            <span className="sr-only">{name}</span>
          </Link>
        ) : null}
        {/* Both lines are held to ONE line and clipped: the name and the
            grade text are owner-entered and can run to any length, and a
            register whose rows change height with the length of a variety
            note stops reading as a register. */}
        <span
          className={cn(
            "block font-display text-[16px] font-bold leading-[1.2] text-forest sm:text-[18px] lg:text-[20px]",
            wrap
              ? "[overflow-wrap:anywhere]"
              : "overflow-hidden text-ellipsis whitespace-nowrap sm:max-w-[60%]",
          )}
        >
          {name}
        </span>
        <span
          className={cn(
            "mt-1 block text-[12.5px] leading-[1.5] text-soil sm:text-[13.5px]",
            wrap
              ? "[overflow-wrap:anywhere]"
              : "overflow-hidden text-ellipsis whitespace-nowrap sm:max-w-[75%]",
          )}
        >
          {meta}
        </span>
      </span>
      <AvailabilityChip available={available} />
    </div>
  );
}

export function StockRegister({ lines }: { lines: CommodityLine[] }) {
  // An empty register - nothing published, or the feed briefly unreachable -
  // gets ONE honest line, never a stand-in list that makes the warehouse look
  // stocked when the records say otherwise.
  const isEmpty = lines.length === 0;
  const rows: CommodityLine[] =
    !isEmpty
      ? lines
      : [
          {
            available: false,
            meta: "The register is being updated - call for today's position",
            name: "Nothing on the board",
          },
        ];

  return (
    <div className="shadow-doc rounded-[2px] border border-soil/35 bg-paper">
      {rows.map((line, i) => (
        <RegisterRow
          key={line.name}
          available={line.available}
          first={i === 0}
          meta={line.meta}
          name={line.name}
          slug={line.slug}
          wrap={isEmpty}
        />
      ))}
    </div>
  );
}
