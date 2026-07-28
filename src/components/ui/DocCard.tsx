import { cn } from "@/lib/utils";

/**
 * A filed document - bordered card with a hard offset shadow and an optional
 * ledger header row (title + file number). The design's workhorse container
 * (company file, waybill, enquiry form, plot files).
 */
export function DocCard({
  title,
  fileNo,
  tint = "alt",
  bleed = false,
  className,
  headerClassName,
  children,
}: {
  /**
   * On phones, run the sheet to the screen edges instead of sitting inside
   * the page gutter. A bordered card indented inside an already-padded page
   * is a container in a container: at 390px it costs about 44px of width and
   * squeezes form fields for no gain. The card returns from `sm` up, where
   * there is width to spare and the framing reads as intended.
   */
  bleed?: boolean;
  /** Ledger header label, e.g. "ENQUIRY FORM". Omit for a plain document. */
  title?: string;
  /** File reference shown right of the title, e.g. "N° CF-001". */
  fileNo?: string;
  /** alt = E6EAE0 document tint; paper = FBFCF7 bright sheet. */
  tint?: "alt" | "paper";
  className?: string;
  headerClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative border border-soil/35",
        tint === "alt" ? "bg-surface-alt" : "bg-paper",
        bleed
          ? "-mx-5 border-x-0 shadow-none sm:mx-0 sm:border-x sm:shadow-doc lg:-mx-0"
          : "shadow-doc",
        className,
      )}
    >
      {title ? (
        <div
          className={cn(
            "flex items-baseline justify-between gap-4 border-b-[1.5px] border-soil/50 pb-3 pt-5 sm:px-8",
            bleed ? "px-5" : "px-6",
            headerClassName,
          )}
        >
          <span className="stencil text-[13px] tracking-[0.22em] text-ink">
            {title}
          </span>
          {fileNo ? (
            // File numbers never break mid-token - on narrow screens the
            // title wraps instead.
            <span className="stencil whitespace-nowrap text-[11px] tracking-[0.14em] text-harvest-deep">
              {fileNo}
            </span>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

/** One dotted ledger row inside a DocCard: stencil label + value. On phones
 * the label sits ABOVE its value (side-by-side columns waste too much width);
 * from sm up it returns to the classic label-left / value-right ledger. */
export function DocRow({
  label,
  children,
  last = false,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 px-6 py-3 sm:grid sm:grid-cols-[120px_1fr] sm:gap-x-5 sm:gap-y-1.5 sm:px-8",
        !last && "border-b border-dotted border-soil/40",
      )}
    >
      <span className="stencil text-[10px] tracking-[0.14em] text-harvest-deep sm:pt-0.5 sm:text-[11px]">
        {label}
      </span>
      <span className="text-[13px] leading-[1.6] text-ink sm:text-[14px]">
        {children}
      </span>
    </div>
  );
}
