import { HelpWrap } from "@/components/admin/help-tip";
import { ToneBadge, type Tone } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import { StockMoveType } from "@/types/stock.types";

/** Shared bits for the stock screens - movement tones, labels, kg rendering. */

export const MOVE_TYPE_LABEL: Record<StockMoveType, string> = {
  [StockMoveType.PURCHASE_RECEIPT]: "Purchase receipt",
  [StockMoveType.SHIPMENT_LOAD]: "Shipment load",
  [StockMoveType.ADJUSTMENT]: "Adjustment",
  [StockMoveType.TRANSFER_IN]: "Transfer in",
  [StockMoveType.TRANSFER_OUT]: "Transfer out",
  [StockMoveType.FARM_REPAYMENT_RECEIPT]: "Farm repayment",
};

export const MOVE_TYPE_TONE: Record<StockMoveType, Tone> = {
  [StockMoveType.PURCHASE_RECEIPT]: "leaf",
  [StockMoveType.SHIPMENT_LOAD]: "sky",
  [StockMoveType.ADJUSTMENT]: "harvest",
  [StockMoveType.TRANSFER_IN]: "leaf",
  [StockMoveType.TRANSFER_OUT]: "sky",
  [StockMoveType.FARM_REPAYMENT_RECEIPT]: "leaf",
};

/** Why this weight moved: every line in the ledger has exactly one reason. */
export const MOVE_TYPE_HELP: Record<StockMoveType, string> = {
  [StockMoveType.PURCHASE_RECEIPT]:
    "Grain bought from a supplier or agent arriving at the warehouse.",
  [StockMoveType.SHIPMENT_LOAD]:
    "Stock going out of the warehouse onto a truck for a buyer.",
  [StockMoveType.ADJUSTMENT]:
    "A correction to the books made by hand, usually after a count or a loss.",
  [StockMoveType.TRANSFER_IN]: "Stock arriving from another of your warehouses.",
  [StockMoveType.TRANSFER_OUT]: "Stock leaving for another of your warehouses.",
  [StockMoveType.FARM_REPAYMENT_RECEIPT]:
    "Produce a farmer brought back against the inputs they were advanced.",
};

export function MoveTypeBadge({ type }: { type: StockMoveType }) {
  return (
    <HelpWrap text={MOVE_TYPE_HELP[type]}>
      <ToneBadge tone={MOVE_TYPE_TONE[type]}>{MOVE_TYPE_LABEL[type]}</ToneBadge>
    </HelpWrap>
  );
}

/** Exact kg figure for `title` tooltips next to a compacted value. */
export function kgTitle(kg: number): string {
  return `${kg.toLocaleString("en-GH")} kg`;
}

/** kg figure for tiles and cells: compact from a million up (exact in title). */
export function formatKg(kg: number): string {
  if (Math.abs(kg) >= 1_000_000) {
    return `${(kg / 1_000_000).toLocaleString("en-GH", {
      maximumFractionDigits: 1,
    })}M kg`;
  }
  return `${kg.toLocaleString("en-GH", { maximumFractionDigits: 2 })} kg`;
}

/** Compact kg in the console's mono numerals, exact figure in the tooltip. */
export function Kg({ kg, className }: { kg: number; className?: string }) {
  return (
    <span
      className={cn("font-adminmono tabular-nums", className)}
      title={kgTitle(kg)}
    >
      {formatKg(kg)}
    </span>
  );
}

/** Signed kg for the movements ledger: green additions, red removals. */
export function SignedKg({ kg }: { kg: number }) {
  const formatted = `${kg > 0 ? "+" : ""}${kg.toLocaleString("en-GH", {
    maximumFractionDigits: 2,
  })} kg`;
  return (
    <span
      className={
        kg < 0
          ? "font-adminmono text-[13px] font-semibold text-console-red"
          : "font-adminmono text-[13px] font-semibold text-console"
      }
      title={`${kg.toLocaleString("en-GH")} kg`}
    >
      {formatted}
    </span>
  );
}

export const MOVE_TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All types" },
  { value: StockMoveType.PURCHASE_RECEIPT, label: "Purchase receipt" },
  { value: StockMoveType.ADJUSTMENT, label: "Adjustment" },
  { value: StockMoveType.SHIPMENT_LOAD, label: "Shipment load" },
  { value: StockMoveType.TRANSFER_IN, label: "Transfer in" },
  { value: StockMoveType.TRANSFER_OUT, label: "Transfer out" },
  { value: StockMoveType.FARM_REPAYMENT_RECEIPT, label: "Farm repayment" },
] as const;
