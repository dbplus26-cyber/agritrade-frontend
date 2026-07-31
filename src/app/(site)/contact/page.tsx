import { ContactCards } from "@/components/contact/contact-cards";
import { EnquiryForm } from "@/components/contact/enquiry-form";
import { StencilLabel } from "@/components/ui/StencilLabel";
import { pageMetadata } from "@/lib/seo";
import { getSiteContact } from "@/lib/public-contact";
import { ENQUIRY_SUBJECTS, type EnquirySubject } from "@/types/enquiry.types";

export const metadata = pageMetadata({
  title: "Contact the dispatch office",
  description:
    "Commodity, tonnage, destination - or a plot, or the farming scheme. Call the Tamale dispatch line or send a written enquiry; we reply within one working day.",
  path: "/contact",
  keywords: ["contact DB Plus", "Tamale dispatch office", "grain enquiry Ghana"],
});

const first = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Service pages deep-link with ?subject=<enum value>&about=<what it's for>
  // (e.g. a plot reference). Anything off-enum falls back to the default.
  const contact = await getSiteContact();
  const params = await searchParams;
  const rawSubject = first(params.subject);
  const subject = ENQUIRY_SUBJECTS.includes(rawSubject as EnquirySubject)
    ? (rawSubject as EnquirySubject)
    : undefined;
  const about = first(params.about)?.slice(0, 150);

  return (
    <div className="texture-grain relative overflow-hidden bg-surface">
      <span
        aria-hidden="true"
        className="stencil absolute -right-14 top-16 z-0 select-none whitespace-nowrap text-[96px] leading-none tracking-[0.02em] text-soil/12 lg:-right-40 lg:top-3 lg:text-[220px]"
      >
        ENQUIRY
      </span>
      {/* Heading sits above the two columns so the form and the cards start
          level with each other. */}
      <div className="relative z-[2] mx-auto max-w-[1312px] px-5 pt-9 lg:px-8 lg:pt-[76px]">
        <div className="mb-4 flex items-center gap-2.5">
          <StencilLabel className="text-[11px] tracking-[0.3em] lg:text-[12px]">
            CONTACT · THE DISPATCH OFFICE
          </StencilLabel>
        </div>
        <h1 className="mb-3 font-display text-[30px] font-bold leading-[1.1] tracking-[-0.015em] text-forest lg:mb-3.5 lg:text-[52px] lg:leading-[1.05]">
          Tell us what you need.
        </h1>
        <p className="mb-6 max-w-[52ch] text-[14px] leading-[1.6] text-soil lg:mb-9 lg:text-[16px] lg:leading-[1.65]">
          Commodity, tonnage, destination - or a plot, or the farming scheme.
          Calling is always fastest; the form goes straight to the office.
        </p>

        {/* Mobile gets the quick call/WhatsApp pair above the form. */}
        <div className="mb-7 grid grid-cols-2 gap-3 lg:hidden">
          <a
            href={contact.phoneHref}
            className="flex items-center justify-center rounded-[2px] bg-forest py-4 text-[15px] font-bold text-surface shadow-[3px_3px_0_rgb(31_33_28/0.3)]"
          >
            Call
          </a>
          <a
            href={contact.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center rounded-[2px] bg-leaf py-4 text-[15px] font-bold text-surface shadow-[3px_3px_0_rgb(31_33_28/0.3)]"
          >
            WhatsApp
          </a>
        </div>
      </div>

      <div className="relative z-[2] mx-auto grid max-w-[1312px] items-start gap-10 px-5 pb-16 lg:grid-cols-[1.05fr_420px] lg:gap-16 lg:px-8 lg:pb-24">
        <EnquiryForm defaultSubject={subject} defaultAbout={about} />
        <ContactCards />
      </div>
    </div>
  );
}
