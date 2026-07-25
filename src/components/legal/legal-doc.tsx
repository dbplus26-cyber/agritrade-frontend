import { StencilLabel } from "@/components/ui/StencilLabel";
import { getSiteContact } from "@/lib/public-contact";

export interface LegalSection {
  title: string;
  /** Each string renders as one paragraph. */
  paragraphs: string[];
  /** Optional bullet list rendered after the paragraphs. */
  points?: string[];
}

/**
 * A legal page as a filed document: eyebrow + title, the file header with its
 * "last updated" line, then numbered ledger sections. Shared by /terms and
 * /privacy so the two always read as siblings.
 */
export async function LegalDoc({
  eyebrow,
  title,
  fileNo,
  updated,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  fileNo: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  const contact = await getSiteContact();
  return (
    <div className="texture-grain bg-surface">
      <div className="mx-auto max-w-[860px] px-5 pb-16 pt-10 lg:px-8 lg:pb-24 lg:pt-16">
        <div className="mb-4 flex items-center gap-2.5">
          <span aria-hidden="true" className="h-0.5 w-[22px] bg-harvest" />
          <StencilLabel className="text-[11px] tracking-[0.3em] lg:text-[12px]">
            {eyebrow}
          </StencilLabel>
        </div>
        <h1 className="mb-4 font-display text-[30px] font-bold leading-[1.1] tracking-[-0.01em] text-forest lg:text-[44px]">
          {title}
        </h1>
        <p className="mb-8 max-w-[64ch] text-[14.5px] leading-[1.7] text-soil lg:mb-10 lg:text-[15.5px]">
          {intro}
        </p>

        <article className="shadow-doc border border-soil/35 bg-paper">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-[1.5px] border-soil/50 px-6 py-4 sm:px-9">
            <span className="stencil text-[12px] tracking-[0.2em] text-ink lg:text-[13px]">
              {fileNo}
            </span>
            <span className="stencil text-[10px] tracking-[0.14em] text-harvest-deep lg:text-[11px]">
              LAST UPDATED · {updated}
            </span>
          </div>

          {sections.map((section, i) => (
            <section
              key={section.title}
              className={`px-6 py-6 sm:px-9 lg:py-7 ${
                i < sections.length - 1
                  ? "border-b border-dotted border-soil/40"
                  : ""
              }`}
            >
              <h2 className="mb-3 flex items-baseline gap-3.5 font-display text-[17px] font-semibold text-forest lg:text-[19px]">
                <span className="stencil text-[12px] tracking-[0.1em] text-harvest-deep lg:text-[13px]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {section.title}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 40)}
                  className="mb-2.5 pl-[26px] text-[14px] leading-[1.7] text-ink last:mb-0 lg:pl-[30px]"
                >
                  {paragraph}
                </p>
              ))}
              {section.points ? (
                <ul className="mt-1 flex list-disc flex-col gap-1.5 pl-[44px] text-[14px] leading-[1.65] text-ink lg:pl-[48px]">
                  {section.points.map((point) => (
                    <li key={point.slice(0, 40)}>{point}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </article>

        <p className="mt-6 text-[13px] leading-[1.65] text-soil">
          Questions about this document? Call{" "}
          <a href={contact.phoneHref} className="font-bold text-forest">
            {contact.phone}
          </a>{" "}
          or write to{" "}
          <a href={`mailto:${contact.email}`} className="font-bold text-forest">
            {contact.email}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
