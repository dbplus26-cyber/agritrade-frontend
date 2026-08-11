"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Warehouse as WarehouseIcon } from "lucide-react";
import {
  AdminButton,
  AdminCard,
  AdminPageHeader,
  Mono,
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/ui";
import { BackButton } from "@/components/ui/BackButton";
import { AllocateSkeleton, LotRowsSkeleton } from "@/components/admin/skeletons";
import { HelpTip } from "@/components/admin/help-tip";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { extractApiError } from "@/lib/extract-api-error";
import { formatKg } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useGetAvailableLotsQuery,
  useGetShipmentQuery,
  useSetAllocationsMutation,
} from "@/redux/shipments/shipments-api";
import type {
  IAvailableLot,
  IShipment,
  IShipmentSale,
} from "@/types/admin-shipment.types";
import {
  autoAllocate,
  type AllocationRows,
  type AutoAllocateStrategy,
} from "./auto-allocate";
import { LoadMeter } from "./load-meter";
import { Money } from "./sale-bits";

const LIST = "/admin/shipments";

/** Which sales an auto-allocate run fills. */
type FillScope = "ACTIVE" | "ALL";

const sumWeights = (byLot: Record<string, string> | undefined): number =>
  Object.values(byLot ?? {}).reduce((sum, w) => {
    const n = Number(w);
    return sum + (Number.isFinite(n) && n > 0 ? n : 0);
  }, 0);

/** A weight input's usable value; anything else counts as nothing keyed. */
const keyedKg = (raw: string | undefined): number => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Weights are decimals, and the fill maths (take the smallest of the need, the
 * lot's remainder and the capacity, then subtract) leaves float dust behind: a
 * sale that is exactly full reads as 0.0000001 kg short. Every DECISION on
 * this screen - is this sale short, does the balance button appear, how much
 * does it place - is taken at 2dp, finer than any scale the goods will ever
 * cross, so dust can never hold a "still short" button on screen forever.
 */
const round2 = (kg: number): number => Math.round(kg * 100) / 100;

/** Below this a line is filled, not short: it is under the last kept decimal. */
const KG_EPSILON = 0.005;

/** kg keyed for one sale, per commodity, across every lot on the screen. */
const commodityKgOf = (
  saleRows: Record<string, string> | undefined,
  lots: IAvailableLot[],
): Record<string, number> => {
  const byCommodity: Record<string, number> = {};
  for (const lot of lots) {
    const kg = keyedKg(saleRows?.[lot.id]);
    if (kg > 0) {
      byCommodity[lot.commodity.id] = (byCommodity[lot.commodity.id] ?? 0) + kg;
    }
  }
  return byCommodity;
};

/**
 * What a sale ordered, per commodity. Summed across lines because one sale can
 * carry the same commodity on two lines, and the weight keyed against it is
 * per commodity (a lot IS one commodity) - so the target it gets measured
 * against has to be per commodity too, or both lines read as over-keyed.
 */
const agreedKgOf = (sale: IShipmentSale): Record<string, number> => {
  const byCommodity: Record<string, number> = {};
  for (const line of sale.lines) {
    byCommodity[line.commodityId] =
      (byCommodity[line.commodityId] ?? 0) + line.agreedKg;
  }
  return byCommodity;
};

/**
 * What a sale is still short, per commodity, given the weights keyed for it.
 * Commodities that are covered are left out, so a sale with nothing short is
 * an empty object.
 *
 * The target is the line's FULL agreed weight, not `outstandingKg`. Saving is
 * a wholesale replacement of this shipment's allocations (PUT deletes them and
 * re-creates from these inputs), and the inputs are SEEDED from exactly those
 * saved allocations - so netting `allocatedKg` off as well counts the same
 * kilos twice, and a sale that is perfectly allocated reads as over-keyed by
 * every kilo it already carries.
 */
const shortKgOf = (
  sale: IShipmentSale,
  keyedByCommodity: Record<string, number>,
): Record<string, number> => {
  const short: Record<string, number> = {};
  for (const [commodityId, agreed] of Object.entries(agreedKgOf(sale))) {
    const gap = round2(agreed - (keyedByCommodity[commodityId] ?? 0));
    if (gap >= KG_EPSILON) short[commodityId] = gap;
  }
  return short;
};

/**
 * Lots grouped per commodity and ordered by the chosen end of the price scale.
 * Mirrors auto-allocate.ts deliberately: Array#sort is stable so equal-cost
 * lots keep the API's oldest-first order, and a redacted cost (null, a caller
 * without financial visibility) cannot be ranked at all, so it sorts last
 * under either end rather than being guessed into the cheap pile.
 */
const lotsByCommodity = (
  lots: IAvailableLot[],
  strategy: AutoAllocateStrategy,
): Map<string, IAvailableLot[]> => {
  const byCommodity = new Map<string, IAvailableLot[]>();
  for (const lot of lots) {
    const list = byCommodity.get(lot.commodity.id);
    if (list) list.push(lot);
    else byCommodity.set(lot.commodity.id, [lot]);
  }
  for (const list of byCommodity.values()) {
    list.sort((a, b) => {
      if (a.unitCostGhs === null || b.unitCostGhs === null) {
        return (a.unitCostGhs === null ? 1 : 0) - (b.unitCostGhs === null ? 1 : 0);
      }
      return strategy === "CHEAPEST"
        ? a.unitCostGhs - b.unitCostGhs
        : b.unitCostGhs - a.unitCostGhs;
    });
  }
  return byCommodity;
};

/** One lot's share of a balance, and the total the whole top-up would place. */
interface BalancePlan {
  add: { kg: number; lotId: string; saleId: string }[];
  totalKg: number;
}

/**
 * Plans the top-up behind "Balance from …": for each sale in scope, ONLY the
 * weight it is still short, drawn from the far end of the price order.
 *
 * It is a second pass rather than another `autoAllocate` call because the two
 * do opposite things. Auto-allocate REPLACES a sale's weights, which is what
 * lets a second strategy click undo the first; a balance has to ADD to what is
 * on the screen, so every kilo already keyed - this sale's own, and every
 * other sale's - is a claim it must work around instead of overwrite.
 *
 * It returns the plan instead of applying it so the same call can decide
 * whether the button belongs on screen at all: an empty plan is a button that
 * would do nothing, and this screen moves real stock, so it does not offer
 * actions that quietly no-op.
 */
const planBalance = ({
  capacityKg,
  fill,
  lots,
  rows,
  sales,
  strategy,
}: {
  capacityKg: null | number;
  fill: string[];
  lots: IAvailableLot[];
  rows: AllocationRows;
  sales: IShipmentSale[];
  strategy: AutoAllocateStrategy;
}): BalancePlan => {
  // Every kilo keyed anywhere on this screen is already spoken for. Counting
  // only the sales being topped up is the classic double-spend: two sales on
  // one truck each "get" the same 500 kg out of one lot.
  const claimedByLot = new Map<string, number>();
  let keyedTotalKg = 0;
  for (const sale of sales) {
    for (const [lotId, raw] of Object.entries(rows[sale.id] ?? {})) {
      const kg = keyedKg(raw);
      if (kg <= 0) continue;
      claimedByLot.set(lotId, (claimedByLot.get(lotId) ?? 0) + kg);
      keyedTotalKg += kg;
    }
  }

  let capacityLeft =
    typeof capacityKg === "number" && capacityKg > 0
      ? round2(capacityKg - keyedTotalKg)
      : Number.POSITIVE_INFINITY;

  const byCommodity = lotsByCommodity(lots, strategy);
  const saleById = new Map(sales.map((s) => [s.id, s]));
  const add: BalancePlan["add"] = [];
  let totalKg = 0;

  for (const saleId of fill) {
    const sale = saleById.get(saleId);
    if (!sale) continue;
    const short = shortKgOf(sale, commodityKgOf(rows[saleId], lots));
    for (const [commodityId, shortKg] of Object.entries(short)) {
      let need = shortKg;
      for (const lot of byCommodity.get(commodityId) ?? []) {
        if (need < KG_EPSILON || capacityLeft < KG_EPSILON) break;
        const free = round2(lot.remainingKg - (claimedByLot.get(lot.id) ?? 0));
        if (free < KG_EPSILON) continue;
        const take = round2(Math.min(need, free, capacityLeft));
        if (take < KG_EPSILON) continue;
        add.push({ kg: take, lotId: lot.id, saleId });
        claimedByLot.set(lot.id, (claimedByLot.get(lot.id) ?? 0) + take);
        need = round2(need - take);
        capacityLeft = round2(capacityLeft - take);
        totalKg = round2(totalKg + take);
      }
    }
  }

  return { add, totalKg };
};

/**
 * Allocate lots to the sales on a truck - a full PAGE, not a dialog. It used
 * to be a dialog with its own inner scroll inside the scrolling shipment page,
 * which on a phone meant two scrollbars fighting over one thumb and lot rows
 * that could not be reached. On save it returns to the shipment.
 */
export function ShipmentAllocate({ id }: { id: string }) {
  const { data, error, isError, isLoading, refetch } = useGetShipmentQuery(id);

  if (isLoading) return <AllocateSkeleton />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  // Keyed by id so switching shipments re-seeds the weights from scratch.
  return <AllocateBoard key={id} shipment={data.data.shipment} />;
}

function AllocateBoard({ shipment }: { shipment: IShipment }) {
  const router = useRouter();
  const { data, isLoading } = useGetAvailableLotsQuery(shipment.id);
  const [save, { isLoading: saving }] = useSetAllocationsMutation();
  const [search, setSearch] = useState("");
  const [activeSaleId, setActiveSaleId] = useState(shipment.sales[0]?.id ?? "");
  const [scope, setScope] = useState<FillScope>("ACTIVE");
  /** The last auto-allocate run's outcome, shown so a short fill is stated
   * outright rather than discovered at dispatch. */
  const [fillNote, setFillNote] = useState<null | string>(null);
  /** Which end of the price order was filled from last. It survives manual
   * edits on purpose: an admin who fills from the cheapest, then hand-corrects
   * one lot, still wants the balance offered from the other end. */
  const [lastStrategy, setLastStrategy] = useState<AutoAllocateStrategy | null>(
    null,
  );
  /** The backend's refusal (OVER_SHIP, COMMODITY_NOT_ON_SALE…), kept inline
   * so the admin can fix the weights without losing them. */
  const [serverError, setServerError] = useState<null | string>(null);

  // Seed each sale's weights from what is already allocated to it.
  const [rows, setRows] = useState<AllocationRows>(() => {
    const seeded: AllocationRows = {};
    for (const a of shipment.allocations) {
      const bySale = (seeded[a.sale.id] ??= {});
      // Two allocations of one lot to one sale can't exist server-side; sum
      // defensively rather than drop one.
      bySale[a.lotId] = String(Number(bySale[a.lotId] ?? 0) + a.weightKg);
    }
    return seeded;
  });

  const setWeight = (saleId: string, lotId: string, weight: string) => {
    setServerError(null);
    setFillNote(null);
    setRows((r) => ({
      ...r,
      [saleId]: { ...(r[saleId] ?? {}), [lotId]: weight },
    }));
  };

  const lots = useMemo(() => data?.data.lots ?? [], [data]);
  const visibleLots = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lots;
    return lots.filter(
      (l) =>
        l.commodity.name.toLowerCase().includes(q) ||
        l.warehouse.name.toLowerCase().includes(q),
    );
  }, [lots, search]);
  const filtering = search.trim().length > 0;

  // The lots grouped under the shed holding them: the trip's planned sheds
  // first, in route order, then any other warehouse with a usable lot - the
  // backend deliberately offers those too, for when the plan falls short.
  const lotGroups = useMemo(() => {
    const groups = new Map<
      string,
      { lots: IAvailableLot[]; name: string; planned: boolean }
    >();
    for (const w of shipment.loadingWarehouses)
      groups.set(w.id, { lots: [], name: w.name, planned: true });
    for (const l of visibleLots) {
      const existing = groups.get(l.warehouse.id);
      if (existing) existing.lots.push(l);
      else
        groups.set(l.warehouse.id, {
          lots: [l],
          name: l.warehouse.name,
          planned: false,
        });
    }
    return [...groups.entries()]
      .filter(([, g]) => g.lots.length > 0)
      .map(([id, g]) => ({ id, ...g }));
  }, [visibleLots, shipment.loadingWarehouses]);

  const activeRows = rows[activeSaleId];
  const activeSale = shipment.sales.find((s) => s.id === activeSaleId);
  /** kg already weighted per commodity for the ACTIVE sale (across lots) -
   * the flag that tells the admin "this sale already has maize on board". */
  const activeCommodityKg = useMemo(
    () => commodityKgOf(activeRows, lots),
    [lots, activeRows],
  );

  const totalKg = useMemo(
    () => shipment.sales.reduce((sum, s) => sum + sumWeights(rows[s.id]), 0),
    [rows, shipment.sales],
  );

  const beforeDispatch =
    shipment.status === "PLANNED" || shipment.status === "LOADING";

  /** Commodity display names across every sale on the truck, for the notes. */
  const commodityNames = useMemo(() => {
    const names: Record<string, string> = {};
    for (const s of shipment.sales) {
      for (const line of s.lines) names[line.commodityId] = line.commodityName;
    }
    return names;
  }, [shipment.sales]);

  /**
   * What the ACTIVE sale needs, one row per COMMODITY rather than per line.
   * Weights are keyed per commodity (a lot IS one commodity), so a sale that
   * lists the same commodity on two lines has to show one merged requirement -
   * two rows would each measure the whole keyed weight against half the order
   * and both would read as over-keyed.
   */
  const activeNeeds = activeSale
    ? Object.entries(agreedKgOf(activeSale)).map(([commodityId, agreedKg]) => ({
        agreedKg,
        commodityId,
        commodityName: commodityNames[commodityId] ?? "",
      }))
    : [];

  /** The sales an auto-allocate or a balance fills, per the scope selector. */
  const fillScopeIds = useMemo(
    () =>
      scope === "ALL"
        ? shipment.sales.map((s) => s.id)
        : activeSaleId
          ? [activeSaleId]
          : [],
    [activeSaleId, scope, shipment.sales],
  );

  /**
   * The most weight any fill on this screen may key in. Two totals bound it
   * and the tighter one wins:
   *
   * - `truckCapacityKg`, what the booked truck can carry.
   * - `plannedWeightKg`, what the sales on it are actually still due to move.
   *   A sale's `agreedKg` is its weight across ALL trucks, so on a part-shipped
   *   sale filling every line to its agreed weight loads goods that already
   *   left on an earlier truck - the backend refuses exactly that with
   *   OVER_SHIP. The payload carries no per-line "already shipped" figure, so
   *   this can only bound the TOTAL; the per-commodity split of a part-shipped
   *   sale still needs the admin's eye (or a remaining-per-line field here).
   */
  const fillCapKg = useMemo(() => {
    const caps = [shipment.truckCapacityKg, shipment.plannedWeightKg].filter(
      (c): c is number => typeof c === "number" && c > 0,
    );
    return caps.length > 0 ? Math.min(...caps) : null;
  }, [shipment.plannedWeightKg, shipment.truckCapacityKg]);
  /** Which of the two caps is doing the work, so a short fill says why. */
  const truckIsTheCap =
    shipment.truckCapacityKg !== null && fillCapKg === shipment.truckCapacityKg;

  const runAutoAllocate = (strategy: AutoAllocateStrategy) => {
    const result = autoAllocate({
      capacityKg: fillCapKg,
      current: rows,
      fill: fillScopeIds,
      lots,
      sales: shipment.sales,
      strategy,
    });
    setRows(result.rows);
    setServerError(null);
    setLastStrategy(strategy);
    const shortText = result.shortfalls
      .map((sf) => {
        const ref =
          shipment.sales.find((s) => s.id === sf.saleId)?.transactionNo ?? "";
        const reason =
          sf.reason !== "CAPACITY"
            ? "no stock left"
            : truckIsTheCap
              ? "the truck is full"
              : "these sales have no more weight left to ship";
        return `${ref} ${commodityNames[sf.commodityId] ?? ""} short ${formatKg(sf.shortKg)} - ${reason}`;
      })
      .join("; ");
    setFillNote(
      `Filled ${formatKg(result.filledKg)} from the ${
        strategy === "CHEAPEST" ? "cheapest" : "costliest"
      } lots${shortText ? `. Still short: ${shortText}` : ""}. Adjust anything before saving.`,
    );
  };

  /**
   * The end a balance draws from: the OPPOSITE of the last auto-allocate.
   * Topping a cheapest fill up from the cheapest again is just the same run
   * twice - the point of the button is the other end of the price order, the
   * dear stock worth clearing while a buyer is paying for it, or the cheap
   * stock still sitting there after a costliest fill.
   */
  const balanceStrategy: AutoAllocateStrategy | null =
    lastStrategy === null
      ? null
      : lastStrategy === "CHEAPEST"
        ? "COSTLIEST"
        : "CHEAPEST";

  /**
   * Planned every render, not on click: the plan is what decides whether the
   * button is offered at all, so a sale that is covered - or one that is short
   * with nothing left to draw on - never gets a button that does nothing.
   */
  const balancePlan = useMemo(() => {
    if (!balanceStrategy) return null;
    const plan = planBalance({
      capacityKg: fillCapKg,
      fill: fillScopeIds,
      lots,
      rows,
      sales: shipment.sales,
      strategy: balanceStrategy,
    });
    return plan.totalKg >= KG_EPSILON ? plan : null;
  }, [balanceStrategy, fillCapKg, fillScopeIds, lots, rows, shipment.sales]);

  const applyBalance = () => {
    if (!balancePlan || !balanceStrategy) return;
    const end = balanceStrategy === "CHEAPEST" ? "cheapest" : "costliest";
    setServerError(null);
    // Added to what is keyed, never assigned over it: a balance is a top-up of
    // the remainder, and the weights it does not touch are the admin's.
    setRows((r) => {
      const next: AllocationRows = { ...r };
      for (const a of balancePlan.add) {
        const bySale = { ...(next[a.saleId] ?? {}) };
        bySale[a.lotId] = String(round2(keyedKg(bySale[a.lotId]) + a.kg));
        next[a.saleId] = bySale;
      }
      return next;
    });
    setFillNote(
      `Balanced ${formatKg(balancePlan.totalKg)} from the ${end} lots - only what was still needed. Adjust anything before saving.`,
    );
  };

  const clearActiveSale = () => {
    if (!activeSaleId) return;
    setServerError(null);
    setFillNote(null);
    setRows((r) => ({ ...r, [activeSaleId]: {} }));
  };

  const submit = async () => {
    const allocations = shipment.sales.flatMap((s) =>
      lots
        .map((l) => ({
          lotId: l.id,
          saleId: s.id,
          weightKg: keyedKg(rows[s.id]?.[l.id]),
        }))
        .filter((a) => a.weightKg > 0),
    );
    try {
      await save({ allocations, id: shipment.id }).unwrap();
      notify.success("Allocations saved");
      router.push(`${LIST}/${shipment.id}`);
    } catch (err) {
      // OVER_SHIP names the sale and COMMODITY_NOT_ON_SALE the commodity -
      // keep the exact message in view while the weights get fixed.
      setServerError(extractApiError(err).message);
    }
  };

  return (
    <div className="max-w-[760px]">
      <BackButton
        href={`${LIST}/${shipment.id}`}
        label="Back to shipment"
        className="mb-2"
      />
      <AdminPageHeader
        title="Allocate lots"
        hint="Choose which stock goes on this truck. Cost is taken from the lots you pick."
        sub={`Which warehouse lots fill each sale on ${shipment.truckReg} · ${shipment.originWarehouse.name} → ${shipment.destination}`}
      />

      {!beforeDispatch ? (
        <AdminCard className="px-5 py-4 text-[13px] text-adm-ink">
          This shipment has already {shipment.status.toLowerCase()} - its lot
          allocations are part of the record and can no longer be changed.
        </AdminCard>
      ) : isLoading ? (
        <LotRowsSkeleton />
      ) : lots.length === 0 ? (
        <AdminCard className="px-5 py-4 text-[13px] text-adm-muted">
          No stock is available in {shipment.originWarehouse.name} for these
          sales&apos; commodities. Receive a purchase into this warehouse, or
          dispatch and let the oldest-stock fallback fill the truck (it will be
          flagged estimated).
        </AdminCard>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-[12.5px] text-adm-muted">
            Pick a sale, then weight the lots that fulfil it. Dispatch needs
            every sale fully allocated; stock only leaves the warehouse when you
            dispatch.
          </p>

          {/* Sale tabs - the sale being loaded comes FIRST. */}
          <div
            role="tablist"
            aria-label="Sales on this shipment"
            className="flex gap-1.5 overflow-x-auto pb-0.5"
          >
            {shipment.sales.map((s) => {
              const active = s.id === activeSaleId;
              const subtotal = sumWeights(rows[s.id]);
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveSaleId(s.id)}
                  className={cn(
                    "flex-none rounded-[6px] border px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-console/40",
                    active
                      ? "border-console bg-console text-white"
                      : "border-adm-line bg-[#FBFCF7] text-adm-ink hover:bg-adm-sunken",
                  )}
                >
                  {/* The BUYER leads. Three near-identical 11px lines with
                      the document number on top made every tab look the same
                      until you read it; the name is what tells them apart. */}
                  <span
                    className={cn(
                      "block max-w-[150px] min-w-0 text-[12.5px] font-semibold line-clamp-1 whitespace-normal [overflow-wrap:anywhere]",
                      active ? "text-white" : "text-adm-ink",
                    )}
                  >
                    {s.buyer.name}
                  </span>
                  <Mono
                    className={cn(
                      "mt-0.5 block text-[11px]",
                      active ? "text-white/70" : "text-adm-muted/80",
                    )}
                  >
                    {s.transactionNo}
                  </Mono>
                  <Mono
                    className={cn(
                      "mt-1 block text-[11.5px] font-semibold",
                      active ? "text-white/90" : "text-adm-body",
                    )}
                  >
                    {subtotal > 0 ? formatKg(subtotal) : "Nothing yet"}
                  </Mono>
                </button>
              );
            })}
          </div>

          {/* What the ACTIVE sale actually ordered. Without it the loader is
              weighing lots against a document number from memory. Each row
              counts what is already keyed in below, so "still to load" walks
              to zero as the truck fills. */}
          {activeNeeds.length > 0 ? (
            <AdminCard className="px-4 py-2.5">
              <div className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
                This sale needs
              </div>
              <ul className="flex flex-col divide-y divide-adm-hairline">
                {activeNeeds.map((line) => {
                  const onSale = activeCommodityKg[line.commodityId] ?? 0;
                  // The full agreed weight, NOT `agreedKg - allocatedKg`: the
                  // inputs replace this shipment's allocations wholesale and
                  // are seeded from them, so netting the saved weight off here
                  // too would count it twice and read a fully allocated sale
                  // as short by nothing and over-keyed by everything.
                  const needed = line.agreedKg;
                  const stillToLoad = Math.max(round2(needed - onSale), 0);
                  // Keyed past what the sale ordered: the backend refuses this
                  // with OVER_SHIP, so it is flagged before the round trip.
                  const overKeyed = round2(onSale - needed);
                  return (
                    <li
                      key={line.commodityId}
                      className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2 text-[12.5px]"
                    >
                      <span className="min-w-0 text-adm-ink [overflow-wrap:anywhere]">
                        {line.commodityName}
                      </span>
                      <Mono
                        className={cn(
                          "text-[12px]",
                          overKeyed >= KG_EPSILON
                            ? "font-semibold text-console-red"
                            : stillToLoad < KG_EPSILON
                              ? "text-console"
                              : "text-adm-muted",
                        )}
                      >
                        {overKeyed >= KG_EPSILON
                          ? `${formatKg(overKeyed)} more than this sale ordered`
                          : stillToLoad < KG_EPSILON
                            ? `${formatKg(needed)} · covered`
                            : `${formatKg(stillToLoad)} of ${formatKg(needed)} still to load`}
                      </Mono>
                    </li>
                  );
                })}
              </ul>
            </AdminCard>
          ) : null}

          {/* Auto-allocate. It only fills the INPUTS - nothing is saved until
              the admin reviews the weights and presses save. */}
          <AdminCard className="px-4 py-3">
            <div className="mb-1.5 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
              Auto-allocate
            </div>
            <p className="mb-2 text-[12.5px] text-adm-muted">
              Fills the weights from the lots you choose to favour. Which lot is
              picked changes this trip&apos;s profit, so review before saving -
              every weight stays editable.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <AdminButton
                type="button"
                variant="outline"
                onClick={() => runAutoAllocate("CHEAPEST")}
              >
                Cheapest lots first
              </AdminButton>
              <AdminButton
                type="button"
                variant="outline"
                onClick={() => runAutoAllocate("COSTLIEST")}
              >
                Costliest lots first
              </AdminButton>
              <label className="flex items-center gap-1.5 text-[12.5px] text-adm-muted">
                <span className="sr-only sm:not-sr-only">Apply to</span>
                <SimpleSelect
                  ariaLabel="Which sales to auto-allocate"
                  className={cn(adminSelectClass, "h-9 w-auto")}
                  value={scope}
                  onChange={(v) => setScope(v as FillScope)}
                  options={[
                    { value: "ACTIVE", label: "This sale" },
                    { value: "ALL", label: "Every sale on the truck" },
                  ]}
                />
              </label>
              {sumWeights(activeRows) > 0 ? (
                <AdminButton
                  type="button"
                  variant="outline"
                  onClick={clearActiveSale}
                >
                  Clear this sale
                </AdminButton>
              ) : null}
            </div>
            {/* The top-up, offered only when there is a real remainder AND
                stock (and room) to cover some of it - `balancePlan` is null
                otherwise. Its own row so the pill and its tip stay together as
                one block on a narrow phone instead of being pulled apart by
                the wrapping row above. */}
            {balancePlan && balanceStrategy ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5">
                  <AdminButton
                    type="button"
                    variant="ghost"
                    className="whitespace-nowrap"
                    onClick={applyBalance}
                  >
                    Balance from{" "}
                    {balanceStrategy === "CHEAPEST" ? "cheapest" : "costliest"}
                  </AdminButton>
                  <HelpTip
                    text={`Adds the ${formatKg(balancePlan.totalKg)} still needed here, taken from the ${
                      balanceStrategy === "CHEAPEST" ? "cheapest" : "costliest"
                    } lots left - nothing more.`}
                  />
                </span>
              </div>
            ) : null}
            {fillNote ? (
              <p
                role="status"
                className="mt-2 rounded-[6px] border border-adm-line bg-adm-sunken px-3 py-2 text-[12.5px] text-adm-ink"
              >
                {fillNote}
              </p>
            ) : null}
          </AdminCard>

          <div>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search commodity or warehouse…"
              aria-label="Search lots by commodity or warehouse"
              className={cn(adminInputClass, "h-10")}
            />
            {filtering ? (
              <p className="mt-1 text-[12px] text-adm-muted">
                {visibleLots.length} of {lots.length} lots
              </p>
            ) : null}
          </div>

          {visibleLots.length === 0 ? (
            <p className="py-3 text-[13px] text-adm-muted">
              No lots match this search.
            </p>
          ) : (
            /* No inner scroller: the page scrolls, so a phone has one thumb
               target and every lot is reachable. Lots sit under the shed
               holding them, so "load these at Shed B" is readable as a list,
               not deduced lot by lot. */
            <AdminCard className="flex flex-col gap-3 px-4 py-3">
              {lotGroups.map((g) => (
              <div key={g.id} className="flex flex-col gap-2">
              {/* A filled band, not a hairline: the shed boundary is the fact
                  this list is organised by, so it has to read from across the
                  room. Full-bleed against the card's padding so it reads as a
                  section divider rather than another row. */}
              <div className="-mx-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 border-y border-adm-line bg-[#EFF3E7] px-4 py-2">
                <span className="flex min-w-0 items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.09em] text-console">
                  <WarehouseIcon className="h-3.5 w-3.5 flex-none" />
                  <span className="min-w-0 [overflow-wrap:anywhere]">
                    {g.name}
                  </span>
                </span>
                <span className="flex-none text-[11px] font-medium text-adm-muted">
                  {g.planned
                    ? `${g.lots.length} ${g.lots.length === 1 ? "lot" : "lots"}`
                    : "not on this trip's plan"}
                </span>
              </div>
              {g.lots.map((l) => {
                const weight = activeRows?.[l.id] ?? "";
                const onThisSaleKg = activeCommodityKg[l.commodity.id] ?? 0;
                // Weight this lot carries for the OTHER sales on the truck.
                const otherSalesKg = shipment.sales.reduce((sum, s) => {
                  if (s.id === activeSaleId) return sum;
                  return sum + keyedKg(rows[s.id]?.[l.id]);
                }, 0);
                const lotTotalKg = otherSalesKg + keyedKg(weight);
                const overLot = lotTotalKg > l.remainingKg;
                return (
                  <div
                    key={l.id}
                    className="flex flex-col gap-1 border-b border-adm-hairline pb-2 last:border-b-0 last:pb-0"
                  >
                    <div className="grid grid-cols-[1fr_110px] items-center gap-2">
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                          <span className="min-w-0 text-[13.5px] font-medium text-adm-ink [overflow-wrap:anywhere]">
                            {l.commodity.name}
                          </span>
                          {onThisSaleKg > 0 ? (
                            <span className="flex-none rounded-full bg-[#E3EBDD] px-1.5 py-px text-[10.5px] font-semibold whitespace-nowrap text-[#2F5E3D]">
                              {formatKg(onThisSaleKg)} on this sale
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[12px] text-adm-muted">
                          {formatKg(l.remainingKg)} available ·{" "}
                          <Money value={l.unitCostGhs} />
                          /kg
                        </div>
                        {otherSalesKg > 0 ? (
                          <div className="text-[11.5px] text-adm-muted/80">
                            {formatKg(otherSalesKg)} weighted for other sales
                          </div>
                        ) : null}
                      </div>
                      <Input
                        inputMode="decimal"
                        placeholder="kg"
                        aria-label={`Kilograms of ${l.commodity.name} for this sale`}
                        className={cn(adminInputClass, overLot && "border-console-red")}
                        value={weight}
                        onChange={(e) =>
                          setWeight(activeSaleId, l.id, e.target.value)
                        }
                      />
                    </div>
                    {overLot ? (
                      <p
                        role="alert"
                        className="text-[12px] font-medium text-console-red"
                      >
                        This lot carries {formatKg(lotTotalKg)} across the sales
                        but only {formatKg(l.remainingKg)} is available.
                      </p>
                    ) : null}
                  </div>
                );
              })}
              </div>
              ))}
            </AdminCard>
          )}

          {serverError ? (
            <p
              role="alert"
              className="rounded-[6px] border border-console-red/50 bg-console-red/[0.06] px-3 py-2 text-[12.5px] font-medium text-console-red"
            >
              {serverError}
            </p>
          ) : null}

          {/* Sticky so the running total and Save stay reachable on a phone
              without scrolling back past every lot. Lifted clear of the
              shell's fixed bottom tab bar (62px, mobile only). */}
          <div className="sticky bottom-[62px] z-20 -mx-4 border-t-[1.5px] border-adm-line bg-adm-card/95 px-4 py-3 backdrop-blur-sm md:bottom-0 md:mx-0 md:px-0">
            <LoadMeter
              loadedKg={totalKg}
              capacityKg={shipment.truckCapacityKg}
              loadedLabel="Allocated"
            />
            <div className="mt-2.5 flex flex-wrap justify-end gap-2">
              <AdminButton
                type="button"
                variant="outline"
                size="lg"
                onClick={() => router.push(`${LIST}/${shipment.id}`)}
              >
                Cancel
              </AdminButton>
              <AdminButton
                type="button"
                disabled={saving}
                size="lg"
                onClick={() => void submit()}
              >
                {saving ? "Saving…" : "Save allocations"}
              </AdminButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
