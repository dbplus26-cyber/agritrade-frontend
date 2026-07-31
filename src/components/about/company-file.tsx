import { DocCard, DocRow } from "@/components/ui/DocCard";
import { Reveal } from "@/components/ui/Reveal";
import { Stamp } from "@/components/ui/Stamp";
import { StencilLabel } from "@/components/ui/StencilLabel";
import { sourcingDistricts } from "@/static-data/availability";

/** Company file document + the sourcing-districts board, side by side. */
export function CompanyFile() {
  return (
    <section className="mx-auto grid max-w-[1312px] items-start gap-6 px-5 py-14 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:pb-24 lg:pt-[88px]">
      <Reveal>
      <DocCard title="COMPANY FILE" fileNo="N° CF-001" className="mt-4 lg:mt-0">
        <DocRow label="TRADES">
          Maize, soya beans and groundnuts - by the truckload, graded and
          bagged
        </DocRow>
        <DocRow label="BUYS FROM">
          Farmers and field agents across eight districts of the Northern
          Region
        </DocRow>
        <DocRow label="WAREHOUSES">
          Tamale - aggregation, cleaning, bagging over certified scales
        </DocRow>
        <DocRow label="DELIVERS TO">
          Accra, Tema and Kumasi, waybill and weighbridge ticket with every
          load
        </DocRow>
        <DocRow label="ALSO ON FILE" last>
          Documented land plots around Tamale · input-credit farming scheme
        </DocRow>
        {/* Offset left of the header's file number so both stay readable. */}
        <Stamp className="absolute -top-5 right-24 rotate-[4deg] text-[13px] lg:-top-6 lg:right-32 lg:text-[14px]">
          On record
        </Stamp>
      </DocCard>
      </Reveal>

      <Reveal delay={120} className="texture-grain-dark rounded-[2px] bg-board p-6 lg:p-9">
        <div className="mb-4 flex items-center gap-2.5">
          <StencilLabel className="text-[11px] tracking-[0.3em] text-harvest lg:text-[12px]">
            SOURCING DISTRICTS
          </StencilLabel>
        </div>
        <ul className="flex flex-wrap gap-2.5 border-t border-dashed border-surface/30 pt-5">
          {sourcingDistricts.map((district, i) => (
            <li
              key={district}
              className={
                i === 0
                  ? "rounded-[2px] border border-harvest/60 bg-harvest/15 px-3.5 py-2.5 text-[12px] font-semibold tracking-[0.06em] text-surface"
                  : "rounded-[2px] border border-surface/35 px-3.5 py-2.5 text-[12px] font-semibold tracking-[0.06em] text-surface"
              }
            >
              {district.toUpperCase()}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex items-center gap-3 border-t border-dashed border-surface/30 pt-[18px]">
          <span
            aria-hidden="true"
            className="h-2 w-2 flex-none rounded-full bg-harvest shadow-[0_0_0_4px_rgb(216_156_46/0.2)]"
          />
          <p className="text-[13px] font-medium text-surface/80 lg:text-[13.5px]">
            Everything comes back to Tamale before heading south to Accra
            &amp; Kumasi.
          </p>
        </div>
      </Reveal>
    </section>
  );
}
