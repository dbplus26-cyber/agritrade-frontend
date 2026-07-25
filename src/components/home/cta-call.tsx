import Link from "next/link";
import { StencilLabel } from "@/components/ui/StencilLabel";
import { routes } from "@/lib/routes";
import { getSiteContact } from "@/lib/public-contact";

/** The closing CTA — the phone number itself is the object. */
export async function CtaCall() {
  const contact = await getSiteContact();
  return (
    <section className="texture-grain bg-surface">
      <div className="mx-auto grid max-w-[1312px] items-center gap-8 border-b-[1.5px] border-soil/50 px-5 py-16 lg:grid-cols-[1fr_auto] lg:gap-12 lg:px-8 lg:py-24">
        <div>
          <StencilLabel className="text-[12px] tracking-[0.3em]">
            HAVE A REQUIREMENT?
          </StencilLabel>
          <p className="mb-2.5 mt-3.5 font-display text-[clamp(30px,5vw,64px)] font-bold leading-[1.05] tracking-[-0.01em] text-forest">
            Call{" "}
            <a
              href={contact.phoneHref}
              className="whitespace-nowrap text-harvest-deep shadow-[inset_0_-10px_0_rgb(216_156_46/0.4)] transition-colors hover:text-forest"
            >
              {contact.phone}
            </a>
          </p>
          <p className="text-[15px] leading-[1.6] text-soil">
            Commodity, tonnage, destination — we come back the same day.
          </p>
        </div>
        <Link
          href={routes.contact}
          className="shadow-doc-sm inline-block whitespace-nowrap rounded-[2px] border-2 border-forest px-[30px] py-4 text-center text-[15px] font-bold text-forest transition-[transform,box-shadow] duration-100 hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_rgb(89_82_59/0.4)]"
        >
          Send a written enquiry
        </Link>
      </div>
    </section>
  );
}
