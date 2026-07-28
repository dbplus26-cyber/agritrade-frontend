import Link from "next/link";
import { Phone } from "lucide-react";
import { StencilLabel } from "@/components/ui/StencilLabel";
import { routes } from "@/lib/routes";
import { getSiteContact } from "@/lib/public-contact";

/**
 * The closing CTA - one short line of copy and one obvious action.
 *
 * From tablet up it runs as two columns: the copy holds a readable measure on
 * the left and the action sits at the right edge of the band. A single capped
 * column looked deliberate on a phone and left half the row empty on anything
 * wider, which is the failure this layout exists to avoid. Stacked below `md`,
 * where the full width IS the measure.
 *
 * When no number is published the written enquiry becomes the primary action
 * rather than printing an empty label or a tel: link to nobody.
 */
export async function CtaCall() {
  const contact = await getSiteContact();
  return (
    <section className="texture-grain bg-surface">
      <div className="mx-auto grid max-w-[1312px] gap-8 px-5 py-16 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:gap-12 lg:gap-20 lg:px-8 lg:py-24">
        <div className="min-w-0">
          <StencilLabel className="text-[11px] tracking-[0.3em] lg:text-[12px]">
            HAVE A REQUIREMENT?
          </StencilLabel>
          <h2 className="mb-3.5 mt-4 font-display text-[30px] font-bold leading-[1.08] tracking-[-0.015em] text-forest lg:mb-4 lg:mt-5 lg:text-[46px]">
            Tell us what you need moved.
          </h2>
          {/* Only the prose is capped. Capping the whole column made the
              headline wrap early and left the band half empty. */}
          <p className="max-w-[52ch] text-[15px] leading-[1.65] text-soil lg:text-[16px]">
            Commodity, tonnage, destination - we come back the same day.
          </p>
        </div>

        {/* The action column. `md:items-end` on the grid bottom-aligns it with
            the copy, so the button sits on the baseline of the paragraph
            rather than floating in the middle of the band. */}
        <div className="md:text-right">
          {contact.hasPhone ? (
            <>
              <a
                href={contact.phoneHref}
                className="shadow-block flex w-full items-center justify-center gap-2.5 rounded-[2px] bg-harvest px-7 py-4 text-[16px] font-bold tracking-[0.02em] text-ink transition-[transform,box-shadow] duration-100 hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_#1F211C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest md:inline-flex md:w-auto lg:px-8 lg:py-[18px] lg:text-[18px]"
              >
                <Phone aria-hidden="true" className="size-[18px]" strokeWidth={2.3} />
                Call {contact.phone}
              </a>
              <p className="mt-5 text-[14px] leading-[1.6] text-soil">
                Prefer it in writing?{" "}
                <Link
                  href={routes.contact}
                  className="font-bold text-forest underline decoration-harvest decoration-2 underline-offset-4 transition-colors hover:text-harvest-deep"
                >
                  Send a written enquiry
                </Link>
                .
              </p>
            </>
          ) : (
            <Link
              href={routes.contact}
              className="shadow-block flex w-full items-center justify-center rounded-[2px] bg-harvest px-7 py-4 text-[16px] font-bold tracking-[0.02em] text-ink transition-[transform,box-shadow] duration-100 hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_#1F211C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest md:inline-flex md:w-auto lg:px-8 lg:py-[18px] lg:text-[18px]"
            >
              Send a written enquiry
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
