import { Check } from "lucide-react";
import { AvailabilityBoard } from "@/components/home/availability-board";
import { availabilityBoard } from "@/static-data/availability";
import { InteractiveDemos } from "@/components/style-guide/interactive-demos";
import { Button } from "@/components/ui/button";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
import { DocCard, DocRow } from "@/components/ui/DocCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { FormSkeleton } from "@/components/ui/FormSkeleton";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Stamp } from "@/components/ui/Stamp";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StencilLabel } from "@/components/ui/StencilLabel";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Design system",
  description:
    "The DB Plus component sheet - Pale Husk v2.1 tokens, type scale, tags, the availability board, cards, form states and system states.",
  path: "/style-guide",
  index: false,
});

const PALETTE = [
  { token: "--color-surface", hex: "#EFF1E8", note: "Pale husk background · ink text 14.2:1", border: true },
  { token: "--color-surface-alt", hex: "#E6EAE0", note: "Alternating section / document tint", border: true },
  { token: "--color-paper", hex: "#FBFCF7", note: "Bright document sheets (forms, files)", border: true },
  { token: "--color-forest", hex: "#155744", note: "Viridian dark bands · surface text 7.4:1" },
  { token: "--color-board", hex: "#0C332A", note: "Plank board / deepest band · gold tags 5.7:1" },
  { token: "--color-footer", hex: "#0B2D25", note: "Footer band · surface text 13.0:1" },
  { token: "--color-harvest", hex: "#D89C2E", note: "Ochre gold, tags + CTAs · ink on gold 6.7:1. Never large fills." },
  { token: "--color-harvest-deep", hex: "#7A611C", note: "AA text gold on surface · 5.2:1 - eyebrows, links, labels" },
  { token: "--color-soil", hex: "#59523B", note: "Olive-brown secondary text · borders @ .16–.5 alpha" },
  { token: "--color-leaf", hex: "#3E7D62", note: "Stamps, WhatsApp, focus rings" },
  { token: "--color-ink", hex: "#1F211C", note: "Body text · text on harvest buttons" },
  { token: "--color-error", hex: "#9B3A22", note: "Validation errors and failed states only" },
];

const SPACING_RULES = [
  "Scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 px",
  "Max content width 1312px shell · 20px margins on mobile",
  "Section padding: 88–104px desktop · 40–56px mobile",
  "Dark bands: max 2–3 per page (board, values/why band, footer)",
  "Radii: 2px tags/buttons/inputs · 3–5px stamps & plates - nothing rounder",
  "Shadows are hard offsets (3–6px, no blur); photos get the forest→soil overlay",
];

function Sheet({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <StencilLabel className="mb-4 block text-[11px] tracking-[0.24em]">
        {label}
      </StencilLabel>
      {children}
    </section>
  );
}

export default function StyleGuidePage() {
  return (
    <div className="texture-grain bg-surface pb-20">
      <div className="mx-auto max-w-[1312px] px-5 pt-10 lg:px-8 lg:pt-14">
        <SectionHeading
          eyebrow="INTERNAL · COMPONENT SHEET"
          title="The DB Plus design system."
          lede="Pale Husk v2.1 - every token and component the site is built from, rendered live. This page is noindexed and linked from nowhere."
          className="mb-12"
        />

        <div className="flex flex-col gap-14">
          {/* Palette */}
          <Sheet label="PALETTE - PALE HUSK v2.1">
            <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
              {PALETTE.map((swatch) => (
                <div
                  key={swatch.token}
                  className="grid grid-cols-[76px_140px_1fr] items-center gap-4"
                >
                  <span
                    className={`h-[52px] rounded-[4px] ${swatch.border ? "border border-soil/30" : ""}`}
                    style={{ background: swatch.hex }}
                  />
                  <code className="text-[12px] font-bold leading-[1.5] text-ink">
                    {swatch.token.replace("--color-", "--")}
                    <br />
                    {swatch.hex}
                  </code>
                  <span className="text-[12.5px] leading-[1.5] text-soil">
                    {swatch.note}
                  </span>
                </div>
              ))}
            </div>
          </Sheet>

          {/* Type + spacing */}
          <div className="grid gap-12 lg:grid-cols-2">
            <Sheet label="TYPE SCALE">
              <div className="flex flex-col gap-4">
                <div className="font-display text-[clamp(34px,4vw,52px)] font-bold leading-[1.05] text-forest">
                  Display - Bricolage 700
                  <span className="ml-3 align-middle text-[12px] font-medium tracking-normal text-soil">
                    hero H1
                  </span>
                </div>
                <div className="font-display text-[clamp(26px,3vw,36px)] font-bold leading-[1.15] text-forest">
                  Heading - Bricolage 700
                  <span className="ml-3 align-middle text-[12px] font-medium text-soil">
                    section H2
                  </span>
                </div>
                <div className="font-display text-[22px] font-semibold text-forest">
                  Subhead 22 - Bricolage 600 · card titles
                </div>
                <p className="text-[16px] leading-[1.65] text-ink">
                  Body 16 - Public Sans 400, line-height 1.65.
                </p>
                <p className="text-[14px] leading-[1.6] text-soil">
                  Small 14 - Public Sans 400, soil for secondary copy.
                </p>
                <StencilLabel className="text-[11px] tracking-[0.28em]">
                  STENCIL UTILITY 11 · STARDOS · +.28EM TRACKING
                </StencilLabel>
              </div>
            </Sheet>
            <Sheet label="SPACING & LAYOUT RULES">
              <ul className="m-0 flex list-disc flex-col gap-2 pl-[18px] text-[14px] leading-[1.7] text-soil">
                {SPACING_RULES.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </Sheet>
          </div>

          {/* Buttons */}
          <Sheet label="BUTTONS">
            <div className="flex flex-wrap items-center gap-5">
              <a
                href="#buttons"
                className="shadow-block inline-block rounded-[2px] bg-harvest px-7 py-[15px] text-[15px] font-bold text-ink transition-[transform,box-shadow] duration-100 hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_#1F211C]"
              >
                Primary - harvest
              </a>
              <a
                href="#buttons"
                className="shadow-doc-sm inline-block rounded-[2px] border-[2.5px] border-forest px-[26px] py-3 text-[15px] font-bold text-forest transition-[transform,box-shadow] duration-100 hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_rgb(89_82_59/0.4)]"
              >
                Secondary - outline forest
              </a>
              <a
                href="#buttons"
                className="inline-flex items-center gap-2 rounded-[2px] bg-leaf px-[26px] py-[15px] text-[15px] font-bold text-surface shadow-[3px_3px_0_rgb(31_33_28/0.3)] transition-colors hover:bg-[#356a53]"
              >
                <WhatsAppIcon aria-hidden="true" className="size-[17px]" />
                WhatsApp variant
              </a>
              <Button>shadcn default (forest)</Button>
              <Button variant="outline">shadcn outline</Button>
            </div>
            <p className="mt-3.5 text-[13px] leading-[1.6] text-soil">
              Min height 48px · hover translates into its own shadow · 3px leaf
              focus ring · full-width on mobile.
            </p>
          </Sheet>

          {/* Tags + section header */}
          <div className="grid gap-12 lg:grid-cols-2">
            <Sheet label="AVAILABILITY & STATUS TAGS">
              <div className="texture-grain-dark flex flex-wrap items-center gap-3.5 rounded-[2px] bg-board p-5">
                <StatusBadge variant="gold">AVAILABLE NOW</StatusBadge>
                <StatusBadge variant="dashed">ASK US</StatusBadge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3.5">
                <StatusBadge variant="leaf" nailed={false}>AVAILABLE</StatusBadge>
                <StatusBadge variant="soil" nailed={false}>RESERVED</StatusBadge>
                <StatusBadge variant="error" nailed={false}>FAILED</StatusBadge>
                <Stamp className="ml-2">On record</Stamp>
                <Stamp tone="error">Not processed</Stamp>
              </div>
              <p className="mt-3.5 text-[13px] leading-[1.6] text-soil">
                Gold tag = live from warehouse records (with the nail head).
                Dashed = a commodity never disappears, it degrades to ASK US.
                Stamps close documents.
              </p>
            </Sheet>
            <Sheet label="STENCIL EYEBROW + SECTION HEADER">
              <div className="rounded-[2px] border border-dashed border-soil/30 p-6">
                <SectionHeading
                  eyebrow="HOW WE WORK"
                  title="From farm gate to your gate."
                  lede="Short lede, max ~60ch. Eyebrow → headline → lede → content, everywhere."
                />
              </div>
            </Sheet>
          </div>

          {/* The signature board, live */}
          <Sheet label="LIVE AVAILABILITY BOARD (SIGNATURE ELEMENT)" className="[&>span]:mb-0">
            <div className="mt-4 overflow-hidden rounded-[2px]">
              <AvailabilityBoard updatedOn="today" lines={availabilityBoard} />
            </div>
            <p className="mt-3.5 text-[13px] leading-[1.6] text-soil">
              Forest-deep board, wood-grained planks, stencil commodity names;
              tags settle in staggered on load (disabled under reduced motion).
              Nothing else on a page may compete with it.
            </p>
          </Sheet>

          {/* Document cards */}
          <Sheet label="DOCUMENT CARDS - FILE + LEDGER ROWS">
            <div className="grid gap-8 lg:grid-cols-2">
              <DocCard title="COMPANY FILE" fileNo="N° CF-001">
                <DocRow label="TRADES">Maize, soya beans and groundnuts - by the truckload</DocRow>
                <DocRow label="BUYS FROM">Eight districts of the Northern Region</DocRow>
                <DocRow label="DELIVERS TO" last>Accra, Tema and Kumasi - waybill with every load</DocRow>
                <Stamp className="absolute -top-5 right-5 rotate-[4deg] text-[13px]">On record</Stamp>
              </DocCard>
              <DocCard title="PLOT FILE - TML" fileNo="N° 02" tint="paper" className="h-fit">
                <div className="px-6 py-5 sm:px-8">
                  <h3 className="mb-1 font-display text-[20px] font-bold text-forest">
                    Kumbungu Road, Plot 14
                  </h3>
                  <p className="mb-1.5 text-[13px] font-medium text-soil">
                    100 × 100 ft · Residential
                  </p>
                  <p className="mb-4 font-display text-[15px] font-bold text-harvest-deep">
                    GH₵ 45,000{" "}
                    <span className="font-sans text-[11px] font-normal text-soil">
                      ← optional line, per-plot opt-in
                    </span>
                  </p>
                  <span className="block rounded-[2px] border-[1.5px] border-forest py-[11px] text-center text-[13px] font-bold text-forest">
                    Enquire about this plot
                  </span>
                </div>
              </DocCard>
            </div>
          </Sheet>

          {/* Form states */}
          <Sheet label="FORM FIELDS + VALIDATION STATES">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <span className="stencil text-[11px] tracking-[0.14em] text-harvest-deep">DEFAULT</span>
                <span className="rounded-[2px] border-[1.5px] border-soil/35 bg-paper px-3.5 py-[13px] text-[15px] text-soil/55">
                  Placeholder text
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="stencil text-[11px] tracking-[0.14em] text-harvest-deep">FOCUS</span>
                <span className="rounded-[2px] border-[1.5px] border-leaf bg-paper px-3.5 py-[13px] text-[15px] text-ink shadow-[0_0_0_3px_rgb(62_125_98/0.18)]">
                  Typing…
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="stencil text-[11px] tracking-[0.14em] text-harvest-deep">ERROR</span>
                <span className="rounded-[2px] border-[1.5px] border-error bg-paper px-3.5 py-[13px] text-[15px]">
                  &nbsp;
                </span>
                <span className="text-[12px] font-medium text-error">
                  Please enter your name.
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="stencil text-[11px] tracking-[0.14em] text-harvest-deep">VALID</span>
                <span className="flex items-center justify-between rounded-[2px] border-[1.5px] border-leaf/60 bg-paper px-3.5 py-[13px] text-[15px] text-ink">
                  024 123 4567 <Check className="h-3.5 w-3.5 text-leaf" aria-hidden="true" />
                </span>
              </div>
            </div>
            <p className="mt-3.5 text-[13px] leading-[1.6] text-soil">
              Validate on submit, then live per-field. Error text sits under the
              field, never as a toast. 16px input text on mobile (prevents iOS
              zoom).
            </p>
          </Sheet>

          {/* System states */}
          <Sheet label="SYSTEM STATES - EMPTY · ERROR · SKELETONS">
            <div className="grid gap-8 lg:grid-cols-2">
              <EmptyState
                title="No plots on the register"
                description="When a documented plot is listed it will be filed here - ask the office what's coming."
              />
              <ErrorMessage description="Couldn't reach the server. Check your connection and try again." />
            </div>
            <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
              <DataTableSkeleton columns={4} rows={5} />
              <FormSkeleton fields={3} />
            </div>
          </Sheet>

          {/* Interactive: toasts, confirm, loader */}
          <Sheet label="TOASTS · CONFIRMATION · GENERAL LOADER (INTERACTIVE)">
            <InteractiveDemos />
          </Sheet>
        </div>
      </div>
    </div>
  );
}
