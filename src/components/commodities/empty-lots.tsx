import Link from "next/link";
import { routes } from "@/lib/routes";
import { getSiteContact } from "@/lib/public-contact";

/**
 * The empty stock register - shown when nothing is published to the board
 * (and when the feed is briefly unreachable). Mirrors the land register's
 * empty ledger page so "nothing on file" reads as a deliberate document,
 * never a broken grid.
 */
export async function EmptyLots() {
  const contact = await getSiteContact();
  return (
    <section className="mx-auto max-w-[1312px] px-5 py-14 lg:px-8 lg:py-[88px]">
      <article className="shadow-doc relative grid max-w-[860px] grid-cols-[26px_1fr] border border-soil/35 bg-paper">
        <div
          aria-hidden="true"
          className="border-r-[1.5px] border-dashed border-soil/45 bg-[radial-gradient(circle_at_13px_18px,#D9DECE_4px,transparent_4.5px)] bg-[length:26px_36px] bg-repeat-y"
        />
        <div className="px-6 pb-10 pt-8 sm:px-12 lg:px-14 lg:pb-[60px] lg:pt-12">
          <div className="mb-7 flex items-baseline justify-between border-b-[1.5px] border-soil/50 pb-3">
            <span className="stencil text-[13px] tracking-[0.2em] text-ink">
              STOCK REGISTER
            </span>
            <span className="stencil text-[11px] tracking-[0.12em] text-harvest-deep">
              PAGE 01
            </span>
          </div>
          <div
            aria-hidden="true"
            className="relative mb-7 h-[170px] bg-[repeating-linear-gradient(180deg,transparent_0px,transparent_35px,rgb(89_82_59/0.28)_35px,rgb(89_82_59/0.28)_36px)] lg:h-[200px]"
          >
            <span className="stencil absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-5deg] whitespace-nowrap rounded-[5px] border-[3px] border-harvest-deep bg-surface/90 px-4 py-2.5 text-[15px] tracking-[0.16em] text-harvest-deep [text-shadow:0_0_1px_rgb(138_98_32/0.6)] lg:px-[22px] lg:py-3 lg:text-[22px]">
              NOTHING ON FILE
            </span>
          </div>
          <p className="mb-6 max-w-[52ch] text-[14px] leading-[1.65] text-soil lg:text-[15px]">
            Nothing is listed at the moment - the register updates as stock
            arrives at the warehouse. We source against firm orders too: tell
            us the grain, tonnage and destination and we&rsquo;ll come back
            with a same-day position.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href={`${routes.contact}?subject=${encodeURIComponent("Commodity enquiry")}`}
              className="shadow-block inline-block rounded-[2px] bg-harvest px-[26px] py-3.5 text-[14px] font-bold text-ink transition-[transform,box-shadow] duration-100 hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_#1F211C]"
            >
              Tell us what you need
            </Link>
            <a
              href={contact.phoneHref}
              className="shadow-doc-sm inline-block rounded-[2px] border-2 border-forest px-6 py-3 text-[14px] font-bold text-forest transition-[transform,box-shadow] duration-100 hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_rgb(89_82_59/0.4)]"
            >
              Call us
            </a>
          </div>
        </div>
      </article>
    </section>
  );
}
