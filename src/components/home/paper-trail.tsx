import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Stamp } from "@/components/ui/Stamp";

interface PaperDoc {
  title: string;
  fileNo: string;
  rows: { label: string; value: string }[];
  stamp: string;
  stampTone: "error" | "leaf";
}

const DOCS: PaperDoc[] = [
  {
    title: "WAYBILL",
    fileNo: "N° WB-____",
    rows: [
      { label: "CONSIGNEE", value: "Your company, Accra" },
      { label: "LOT", value: "Maize · white · 30 t" },
      { label: "ROUTE", value: "Tamale → Tema" },
    ],
    stamp: "Every load",
    stampTone: "leaf",
  },
  {
    title: "WEIGHBRIDGE TICKET",
    fileNo: "N° WT-____",
    rows: [
      { label: "GROSS", value: "42,180 kg" },
      { label: "TARE", value: "12,140 kg" },
      { label: "NET", value: "30,040 kg - certified" },
    ],
    stamp: "Certified",
    stampTone: "leaf",
  },
  {
    title: "PAYMENT RECEIPT",
    fileNo: "SALE DB-____",
    rows: [
      { label: "REFERENCE", value: "Quoted on your invoice" },
      { label: "PAYMENT", value: "MoMo, card or transfer" },
      { label: "CONFIRMED", value: "SMS & email, instantly" },
    ],
    stamp: "Paid in full",
    stampTone: "leaf",
  },
];

/**
 * The paper trail — the brand's whole argument made visible: facsimiles of
 * the three documents that travel with every transaction. Values are
 * illustrative; the point is that the paperwork always exists.
 */
export function PaperTrail() {
  return (
    <section className="texture-grain-dark bg-board px-5 py-14 lg:px-0 lg:py-[88px]">
      <div className="mx-auto max-w-[1312px] lg:px-8">
        <Reveal>
          <SectionHeading
            tone="dark"
            eyebrow="THE PAPER TRAIL"
            title="What travels with every load."
            lede="Ask for any of these at any time - buyers always can. Figures below are illustrative; the documents are not."
            className="mb-9 lg:mb-12"
          />
        </Reveal>
        <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {DOCS.map((doc, i) => (
            <Reveal key={doc.title} delay={i * 120}>
              <article className="relative border border-soil/35 bg-paper shadow-[5px_5px_0_rgb(0_0_0/0.35)]">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b-[1.5px] border-soil/50 px-5 pb-3 pt-4">
                  <h3 className="stencil text-[12px] tracking-[0.18em] text-ink">
                    {doc.title}
                  </h3>
                  <span className="stencil text-[10px] tracking-[0.12em] text-harvest-deep">
                    {doc.fileNo}
                  </span>
                </div>
                <div className="px-5 pb-6 pt-2">
                  {doc.rows.map((row, r) => (
                    <div
                      key={row.label}
                      className={`flex items-baseline justify-between gap-3 py-2.5 ${
                        r < doc.rows.length - 1
                          ? "border-b border-dotted border-soil/40"
                          : ""
                      }`}
                    >
                      <span className="stencil text-[9px] tracking-[0.16em] text-harvest-deep">
                        {row.label}
                      </span>
                      <span className="text-right text-[12.5px] font-medium text-ink">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
                <Stamp
                  tone={doc.stampTone}
                  className="absolute -bottom-4 right-4 rotate-[-4deg] px-3 py-2 text-[12px] tracking-[0.14em]"
                >
                  {doc.stamp}
                </Stamp>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
