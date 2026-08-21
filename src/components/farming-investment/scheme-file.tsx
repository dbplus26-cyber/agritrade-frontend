import { DocCard, DocRow } from "@/components/ui/DocCard";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";
import { Stamp } from "@/components/ui/Stamp";

const SCHEME_PHOTO = "/images/farming-investment-cover.webp";

/**
 * The scheme, on paper: a treated field photo beside a sample season ledger -
 * what actually gets recorded for a farmer's package. Figures are
 * deliberately generic (stamped SAMPLE); real terms are always signed.
 */
export function SchemeFile() {
  return (
    <section className="mx-auto grid max-w-[1312px] items-center gap-9 px-5 pb-14 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:pb-[72px]">
      <Reveal>
        <div className="shadow-doc-dark relative h-[240px] border border-soil/30 sm:h-[320px] lg:h-[400px]">
          <Photo
            src={SCHEME_PHOTO}
            alt="A farmer walking between tall maize rows on a farm in northern Ghana"
            fill
            sizes="(min-width: 1024px) 600px, 100vw"
            className="object-cover"
            fallbackLabel="SCHEME FARM"
          />
          <div className="absolute -left-1.5 bottom-5 max-w-[260px] rotate-[-1.2deg] bg-forest px-3.5 py-2.5 text-[11.5px] font-semibold leading-[1.45] text-surface shadow-[2px_2px_0_rgb(31_33_28/0.3)] lg:-left-4 lg:px-[18px] lg:py-3 lg:text-[13px]">
            Input-credit maize - a scheme season in the ground.
          </div>
        </div>
      </Reveal>
      <Reveal delay={120}>
        <DocCard
          title="SEASON LEDGER - ONE FARMER"
          fileNo="SAMPLE"
          className="mt-2 lg:mt-0"
        >
          <DocRow label="INPUTS OUT">
            Fertiliser and certified seed, issued before planting and signed
            for - both copies kept
          </DocRow>
          <DocRow label="IN THE FIELD">
            Field-agent visits through the season, noted on the same file
          </DocRow>
          <DocRow label="REPAYMENT IN">
            The agreed share of produce, weighed over the certified scale -
            farmer keeps the ticket copy
          </DocRow>
          <DocRow label="SETTLEMENT" last>
            Produce sold with our trading volumes; partners&rsquo; returns
            settled on the signed terms
          </DocRow>
          <Stamp className="absolute -top-5 right-24 rotate-[3deg] text-[13px] lg:-top-6 lg:right-28">
            Sample
          </Stamp>
        </DocCard>
      </Reveal>
    </section>
  );
}
