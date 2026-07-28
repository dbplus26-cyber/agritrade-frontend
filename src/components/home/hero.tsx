import Image from "next/image";
import { StencilLabel } from "@/components/ui/StencilLabel";
import { getSiteContact } from "@/lib/public-contact";

const HERO_PHOTO =
  "https://commons.wikimedia.org/wiki/Special:FilePath/Truck%20and%20trike%2C%20Tamale%20(P1100339).jpg?width=1200";

/**
 * Home hero — asymmetric 7/5: dispatch eyebrow, the two-line drop-in
 * headline with the gold underline on "south.", CTAs, and the treated truck
 * photo that crosses down into the plank board below (negative margin pair).
 */
export async function Hero() {
  const contact = await getSiteContact();
  return (
    // overflow-x-clip (not hidden) crops the ghost word at the canvas edge
    // while still letting the photo cross down into the board section — and
    // z-[2] stacks the hero above the board (z-[1]) so the crossing photo
    // paints ON TOP of the dark band instead of sliding underneath it.
    <section className="texture-grain relative z-[2] overflow-x-clip bg-surface">
      <div className="mx-auto grid max-w-[1312px] grid-cols-1 items-start gap-x-0 px-5 pt-10 lg:grid-cols-[1fr_500px] lg:px-8 lg:pt-16">
        {/* Bottom padding clears the board's 70px pull; kept slightly shorter
            than the photo column so the photo always governs the crossing. */}
        <div className="relative z-[2] pb-4 lg:pb-24 lg:pr-10 lg:pt-6">
          <div
            className="mb-6 flex items-center gap-3.5 lg:mb-8"
            style={{ animation: "sack-drop .55s cubic-bezier(.2,.9,.3,1) .05s backwards" }}
          >
            <StencilLabel className="text-[11px] tracking-[0.32em] lg:text-[12px]">
              DISPATCH · TAMALE, NORTHERN REGION
            </StencilLabel>
            <span
              aria-hidden="true"
              className="max-w-[170px] flex-1 border-t border-dashed border-soil/50"
            />
          </div>
          <p
            className="mb-1.5 font-display text-[19px] font-semibold leading-[1.25] text-soil lg:text-[30px]"
            style={{ animation: "sack-drop .6s cubic-bezier(.2,.9,.3,1) .18s backwards" }}
          >
            Bulk agro commodities —
          </p>
          <h1 className="mb-7 font-display font-bold leading-[0.98] tracking-[-0.015em] text-forest lg:mb-8">
            <span
              className="block text-[44px] lg:text-[92px]"
              style={{ animation: "sack-drop .65s cubic-bezier(.2,.9,.3,1) .3s backwards" }}
            >
              weighed honestly,
            </span>
            <span
              className="block text-[44px] lg:text-[92px]"
              style={{ animation: "sack-drop .65s cubic-bezier(.2,.9,.3,1) .42s backwards" }}
            >
              trucked{" "}
              <span className="shadow-[inset_0_-14px_0_rgb(216_156_46/0.55)]">
                south.
              </span>
            </span>
          </h1>
          <p
            className="mb-7 max-w-[46ch] text-[15px] leading-[1.65] text-soil lg:mb-8 lg:text-[17px]"
            style={{ animation: "fade-up .5s ease 1s backwards" }}
          >
            Bought at the farm gate across the Northern Region, paid on the
            spot, aggregated in our Tamale warehouses — delivered by the
            truckload to Accra and Kumasi.
          </p>
          <div
            className="flex flex-wrap gap-4"
            style={{ animation: "fade-up .5s ease 1.15s backwards" }}
          >
            <a
              href={contact.phoneHref}
              className="shadow-block inline-block rounded-[2px] bg-harvest px-6 py-4 text-[15px] font-bold tracking-[0.03em] text-ink transition-[transform,box-shadow] duration-100 hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_#1F211C] lg:px-8 lg:py-[19px] lg:text-[17px]"
            >
              {contact.hasPhone ? `Call ${contact.phone}` : "Contact us"}
            </a>
            <a
              href={contact.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="shadow-doc-sm inline-block rounded-[2px] border-[2.5px] border-forest px-6 py-[13px] text-[15px] font-bold tracking-[0.03em] text-forest transition-[transform,box-shadow] duration-100 hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_rgb(89_82_59/0.4)] lg:px-8 lg:py-4 lg:text-[17px]"
            >
              WhatsApp us
            </a>
          </div>
        </div>

        {/* Mobile: the container fully contains the photo so it can't spill
            onto the board's text; the into-the-board crossing is lg-only. */}
        <div className="relative mt-10 h-[300px] sm:h-[400px] lg:mt-0 lg:h-[560px]">
          {/* Ghost stencil word, cropped by the frame edge. */}
          {/* Ghost word at full ghost scale, anchored to the photo's left edge
              so it only runs rightward — the section clips whatever falls off
              the canvas, and it can never reach the headline text. */}
          <span
            aria-hidden="true"
            className="stencil absolute -left-5 -top-9 z-0 select-none whitespace-nowrap text-[100px] leading-none tracking-[0.02em] text-soil/14 lg:-left-12 lg:top-4 lg:text-[240px]"
          >
            GRAINS
          </span>
          {/* The photo crosses into the board below. */}
          <div className="shadow-doc-dark absolute inset-x-0 top-5 z-[3] h-[280px] border border-soil/30 sm:h-[380px] lg:left-0 lg:right-16 lg:top-[110px] lg:h-[520px]">
            <Image
              src={HERO_PHOTO}
              alt="A loaded truck at the Tamale warehouse"
              fill
              priority
              sizes="(min-width: 1024px) 440px, 100vw"
              className="object-cover saturate-[0.72]"
            />
            <div aria-hidden="true" className="photo-treatment absolute inset-0" />
            <div className="absolute -left-1.5 bottom-5 max-w-[240px] rotate-[-1.2deg] bg-forest px-3.5 py-2.5 text-[11.5px] font-semibold leading-[1.45] text-surface shadow-[2px_2px_0_rgb(31_33_28/0.3)] lg:-left-4 lg:bottom-7 lg:max-w-[270px] lg:px-[18px] lg:py-3 lg:text-[13px]">
              Full loads southbound — Tamale depot.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
