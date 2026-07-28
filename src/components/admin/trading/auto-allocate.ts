// src/components/admin/trading/auto-allocate.ts
//
// The pure auto-allocate maths for the shipment lot picker. No React, no
// network - it takes the lots, the sales on the truck and the weights already
// keyed in, and returns the weights to key in. The screen then shows them for
// review; nothing is ever saved from here.
//
// Why "which lot" matters: lots carry `unitCostGhs` (specific-identification
// costing), so the lots a loader picks decide the profit on the trip. Filling
// a sale by hand across a dozen lots is exactly where that decision gets made
// carelessly, so the two obvious policies get a button each:
//
//   CHEAPEST  - lowest unit cost first. Maximises this trip's profit and
//               clears cheap old stock; ties break on the lot order the API
//               sends (oldest first), so with one cost it IS the FIFO fill the
//               dispatch fallback would have done.
//   COSTLIEST - highest unit cost first. For clearing expensive stock while a
//               buyer is paying a price that carries it, rather than leaving
//               it to age into a loss.
//
// Lots with a redacted cost (`unitCostGhs: null`, a caller without financial
// visibility) sort LAST under both strategies, keeping their oldest-first
// order - an unknown cost can't be ranked, and guessing would silently favour
// whichever lot happened to be first.
import type {
  IAvailableLot,
  IShipmentSale,
} from "@/types/admin-shipment.types";

export type AutoAllocateStrategy = "CHEAPEST" | "COSTLIEST";

/** saleId -> lotId -> the weight input's raw string (as typed). */
export type AllocationRows = Record<string, Record<string, string>>;

export interface AutoAllocateInput {
  /** The truck's capacity, or null when none was stated. */
  capacityKg: number | null;
  /** Weights currently keyed in, for every sale on the truck. */
  current: AllocationRows;
  /** Sale ids to refill. Any sale NOT listed keeps its weights untouched. */
  fill: string[];
  /** Available lots, in the order the API sent them (oldest first). */
  lots: AutoAllocateLot[];
  /** Sales on the truck, in link order - earlier sales get first pick. */
  sales: AutoAllocateSale[];
  strategy: AutoAllocateStrategy;
}

/** The lot fields the fill needs - a structural subset of `IAvailableLot`. */
export type AutoAllocateLot = Pick<
  IAvailableLot,
  "commodity" | "id" | "remainingKg" | "unitCostGhs"
>;

/** The sale fields the fill needs - a structural subset of `IShipmentSale`. */
export type AutoAllocateSale = Pick<IShipmentSale, "id" | "lines">;

export interface AutoAllocateResult {
  /** Total weight the fill keyed in across the refilled sales. */
  filledKg: number;
  /** `current` with every refilled sale's weights replaced. */
  rows: AllocationRows;
  /** What could not be covered, so the screen can say so instead of a
   * quietly-short truck the loader only discovers at dispatch. */
  shortfalls: AutoAllocateShortfall[];
}

export interface AutoAllocateShortfall {
  commodityId: string;
  /** STOCK: nothing left in the warehouse. CAPACITY: the truck is full. */
  reason: "CAPACITY" | "STOCK";
  saleId: string;
  shortKg: number;
}

/** Weights are decimals; a hair of float drift must not print as 999.9999996. */
const roundKg = (kg: number): number => Math.round(kg * 1000) / 1000;

/** Below this, a remainder is float noise rather than goods. */
const EPSILON = 1e-6;

/** A weight input's numeric value; anything unusable reads as zero. */
const toKg = (raw: string | undefined): number => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Fills the weight inputs for the chosen sales from the chosen strategy's
 * lots. It respects, in this order: what each sale still needs per commodity,
 * each lot's remaining weight, weight the OTHER sales on the truck have
 * already claimed from the same lot, and the truck's capacity.
 *
 * The refilled sales' weights are REPLACED, not topped up: a strategy the
 * admin picked second has to be able to undo the first one's choices, and a
 * top-up would leave the truck a silent mixture of both. Sales that are not
 * being refilled keep every kilo they hold and their stock stays reserved.
 */
export const autoAllocate = (input: AutoAllocateInput): AutoAllocateResult => {
  const { capacityKg, current, lots, sales, strategy } = input;
  const fillSet = new Set(input.fill);

  // Stock the sales we are NOT refilling already hold. Skipping this is the
  // classic double-spend: two sales on one truck each "get" the same 500 kg.
  const claimedByLot = new Map<string, number>();
  let untouchedKg = 0;
  for (const sale of sales) {
    if (fillSet.has(sale.id)) continue;
    for (const [lotId, raw] of Object.entries(current[sale.id] ?? {})) {
      const kg = toKg(raw);
      if (kg <= 0) continue;
      claimedByLot.set(lotId, (claimedByLot.get(lotId) ?? 0) + kg);
      untouchedKg += kg;
    }
  }

  const hasCapacity = typeof capacityKg === "number" && capacityKg > 0;
  let capacityLeft = hasCapacity
    ? roundKg(capacityKg - untouchedKg)
    : Number.POSITIVE_INFINITY;

  // Lots per commodity, pre-sorted once by the chosen strategy. Array#sort is
  // stable, so equal-cost lots keep the API's oldest-first order.
  const byCommodity = new Map<string, AutoAllocateLot[]>();
  for (const lot of lots) {
    const list = byCommodity.get(lot.commodity.id);
    if (list) list.push(lot);
    else byCommodity.set(lot.commodity.id, [lot]);
  }
  for (const list of byCommodity.values()) {
    list.sort((a, b) => {
      if (a.unitCostGhs === null || b.unitCostGhs === null) {
        // Unknown costs sink to the bottom without disturbing each other.
        return (a.unitCostGhs === null ? 1 : 0) - (b.unitCostGhs === null ? 1 : 0);
      }
      return strategy === "CHEAPEST"
        ? a.unitCostGhs - b.unitCostGhs
        : b.unitCostGhs - a.unitCostGhs;
    });
  }

  const rows: AllocationRows = { ...current };
  const shortfalls: AutoAllocateShortfall[] = [];
  let filledKg = 0;

  for (const sale of sales) {
    if (!fillSet.has(sale.id)) continue;
    // Accumulate numerically, then format once: a sale with two lines of the
    // same commodity must add up rather than have one line clobber the other.
    const taken = new Map<string, number>();

    for (const line of sale.lines) {
      // The inputs are a WHOLESALE replacement of this shipment's allocations
      // (that is what PUT /allocations does), so the target is the full agreed
      // weight - not the outstanding remainder, which already nets off the
      // saved allocations these very inputs are seeded from.
      let need = roundKg(line.agreedKg);
      if (need <= EPSILON) continue;

      for (const lot of byCommodity.get(line.commodityId) ?? []) {
        if (need <= EPSILON || capacityLeft <= EPSILON) break;
        const free = roundKg(lot.remainingKg - (claimedByLot.get(lot.id) ?? 0));
        if (free <= EPSILON) continue;
        const take = roundKg(Math.min(need, free, capacityLeft));
        if (take <= EPSILON) continue;
        taken.set(lot.id, (taken.get(lot.id) ?? 0) + take);
        claimedByLot.set(lot.id, (claimedByLot.get(lot.id) ?? 0) + take);
        need = roundKg(need - take);
        capacityLeft = roundKg(capacityLeft - take);
        filledKg = roundKg(filledKg + take);
      }

      if (need > EPSILON) {
        shortfalls.push({
          commodityId: line.commodityId,
          reason: capacityLeft <= EPSILON ? "CAPACITY" : "STOCK",
          saleId: sale.id,
          shortKg: need,
        });
      }
    }

    rows[sale.id] = Object.fromEntries(
      [...taken.entries()].map(([lotId, kg]) => [lotId, String(roundKg(kg))]),
    );
  }

  return { filledKg, rows, shortfalls };
};
