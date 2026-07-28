import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { Stamp } from "@/components/ui/Stamp";
import { routes } from "@/lib/routes";
import type { MergedLot } from "@/lib/public-commodities";
import { cn } from "@/lib/utils";

const SPEC_LABELS = ["GRADES", "SEASON", "SOLD AS"] as const;

/**
 * The lot rows — one full-width document per commodity, photo and paper
 * alternating sides, a cropped ghost stencil behind each, and the stock stamp
 * ("IN STOCK" solid leaf / "ON ORDER" dashed soil) following the board.
 */
export function LotFiles({ lots }: { lots: MergedLot[] }) {
  return (
    <div className="overflow-hidden py-14 lg:py-[88px]">
      {lots.map((lot, i) => {
        const flipped = i % 2 === 1;
        const inStock = lot.inStock;
        const specs = [lot.grades, lot.season, lot.soldAs];
        return (
          <div key={lot.id}>
            {i > 0 ? (
              <div
                aria-hidden="true"
                className="ledger-rule mx-auto mb-12 max-w-[1312px] px-5 lg:mb-[72px] lg:px-8"
              />
            ) : null}
            <Reveal
              className={cn(
                "relative mx-auto grid max-w-[1312px] items-center gap-8 px-5 pb-12 last:pb-0 lg:gap-14 lg:px-8 lg:pb-[72px]",
                lot.photo ? "lg:grid-cols-2" : "lg:max-w-[880px]",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "stencil absolute -top-6 z-0 select-none whitespace-nowrap text-[90px] leading-none tracking-[0.02em] text-soil/14 lg:-top-9 lg:text-[190px]",
                  flipped ? "-right-20 lg:-right-40" : "-left-16 lg:-left-32",
                )}
              >
                {lot.ghost}
              </span>

              <div
                className={cn(
                  "shadow-doc relative border border-soil/35 bg-surface-alt p-6 sm:p-9 lg:p-10",
                  flipped && "lg:order-2",
                )}
              >
                {/* flex-wrap: a long grain name wraps and the lot number
                    drops onto the following line rather than squeezing it. */}
                <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-[1.5px] border-soil/50 pb-3.5">
                  <h2 className="stencil min-w-0 break-words text-[26px] leading-[1.05] tracking-[0.06em] text-forest sm:text-[34px] lg:text-[44px]">
                    {lot.name.toUpperCase()}
                  </h2>
                  <span className="stencil text-[12px] tracking-[0.16em] text-harvest-deep lg:text-[13px]">
                    {lot.lotNo}
                  </span>
                </div>
                {/* Phones: label above its description; sm+ returns to the
                    label-left ledger columns. */}
                <dl className="mb-6 flex flex-col gap-3 sm:gap-2">
                  {specs.map((value, s) => (
                    <div
                      key={SPEC_LABELS[s]}
                      className="flex flex-col gap-1 sm:grid sm:grid-cols-[130px_1fr] sm:gap-x-5"
                    >
                      <dt className="stencil text-[10px] tracking-[0.14em] text-harvest-deep sm:pt-[3px] lg:text-[11px]">
                        {SPEC_LABELS[s]}
                      </dt>
                      <dd className="m-0 border-b border-dotted border-soil/40 pb-1.5 text-[13.5px] leading-[1.6] text-ink lg:text-[14px]">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <Link
                  href={`${routes.contact}?subject=${encodeURIComponent(lot.subject)}`}
                  className={cn(
                    "inline-block rounded-[2px] text-[14px] font-bold transition-[transform,box-shadow] duration-100 hover:translate-x-px hover:translate-y-px",
                    inStock
                      ? "shadow-block bg-harvest px-[26px] py-3.5 text-ink hover:shadow-[2px_2px_0_#1F211C]"
                      : "shadow-doc-sm border-2 border-forest px-6 py-3 text-forest hover:shadow-[2px_2px_0_rgb(89_82_59/0.4)]",
                  )}
                >
                  Enquire about {lot.name.toLowerCase()}
                </Link>
                {/* Half over the card's top edge, clear of the LOT number. */}
                <Stamp
                  tone="leaf"
                  className={cn(
                    "absolute -top-5 right-3 text-[13px] tracking-[0.14em] lg:-top-6 lg:right-8 lg:rotate-[4deg] lg:text-[14px]",
                    !inStock &&
                      "border-dashed border-soil text-soil [text-shadow:0_0_1px_rgb(89_82_59/0.5)]",
                  )}
                >
                  {inStock ? "In stock" : "On order"}
                </Stamp>
              </div>

              {lot.photo ? (
                <div
                  className={cn(
                    "relative h-[220px] border border-soil/30 sm:h-[300px] lg:h-[380px]",
                    flipped
                      ? "shadow-[-6px_6px_0_rgb(31_33_28/0.18)] lg:order-1"
                      : "shadow-[6px_6px_0_rgb(31_33_28/0.18)]",
                  )}
                >
                  <Image
                    src={lot.photo}
                    alt={lot.photoAlt}
                    fill
                    sizes="(min-width: 1024px) 560px, 100vw"
                    className="object-cover"
                  />
                </div>
              ) : null}
            </Reveal>
          </div>
        );
      })}
    </div>
  );
}
