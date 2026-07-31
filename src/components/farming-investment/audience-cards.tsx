import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

const ENQUIRY_HREF = `${routes.contact}?subject=${encodeURIComponent("Farming investment")}`;

const AUDIENCES = [
  {
    tag: "FOR FARMERS",
    tagClass: "bg-leaf text-surface",
    topBorder: "border-t-leaf",
    tickClass: "text-leaf",
    title: "Get inputs now, pay with your harvest.",
    body: "Registered farmers receive fertiliser and certified seed before planting. After harvest, you deliver the agreed quantity of produce to our warehouse - weighed in front of you - and keep the rest to sell however you choose.",
    points: [
      "Terms agreed and written down before inputs are given",
      "Repayment weighed on a certified scale, with your copy of the ticket",
      "A bad season is talked through, not punished - we work with you",
    ],
    cta: "Apply for the programme",
    href: routes.farmingApply,
  },
  {
    tag: "FOR PARTNERS",
    tagClass: "bg-harvest text-ink",
    topBorder: "border-t-harvest-deep",
    tickClass: "text-harvest-deep",
    title: "Fund a season, share the returns.",
    body: "Partners put money into inputs at the start of the season. When the repaid produce is sold - usually to the same buyers we already trade with - returns are shared on the terms agreed up front.",
    points: [
      "Your money buys inputs, not promises - receipts available",
      "Records of every farmer, input issued and repayment received",
      "Farming carries risk - we explain it plainly before you commit",
    ],
    cta: "Talk to us about partnering",
    href: ENQUIRY_HREF,
  },
];

/** The two-audience split: farmers (leaf) and partners (harvest). */
export function AudienceCards() {
  return (
    <section className="mx-auto grid max-w-[1312px] gap-5 px-5 pb-14 lg:grid-cols-2 lg:gap-7 lg:px-8 lg:pb-[72px]">
      {AUDIENCES.map((audience, a) => (
        <Reveal key={audience.tag} delay={a * 120}>
        <article
          className={cn(
            "shadow-doc h-full rounded-[2px] border border-t-4 border-soil/18 bg-paper p-6 sm:p-8 lg:p-10",
            audience.topBorder,
          )}
        >
          <span
            className={cn(
              "mb-4 inline-block rounded-[2px] px-3 py-[7px] text-[10px] font-bold leading-none tracking-[0.24em] lg:mb-5",
              audience.tagClass,
            )}
          >
            {audience.tag}
          </span>
          <h2 className="mb-3 font-display text-[22px] font-semibold leading-[1.2] text-forest lg:mb-3.5 lg:text-[28px]">
            {audience.title}
          </h2>
          <p className="mb-5 text-[14px] leading-[1.7] text-soil lg:mb-[22px] lg:text-[15px]">
            {audience.body}
          </p>
          <ul className="mb-6 flex list-none flex-col gap-3 p-0 lg:mb-[26px]">
            {audience.points.map((point) => (
              <li
                key={point}
                className="flex gap-3 text-[14px] leading-[1.55] text-ink"
              >
                <span
                  aria-hidden="true"
                  className={cn("font-bold", audience.tickClass)}
                >
                  ✓
                </span>
                {point}
              </li>
            ))}
          </ul>
          <Link
            href={audience.href}
            className="shadow-doc-sm inline-block rounded-[2px] border-2 border-forest px-6 py-3 text-center text-[14px] font-bold text-forest transition-[transform,box-shadow] duration-100 hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_rgb(89_82_59/0.4)] max-lg:block"
          >
            {audience.cta}
          </Link>
        </article>
        </Reveal>
      ))}
    </section>
  );
}
