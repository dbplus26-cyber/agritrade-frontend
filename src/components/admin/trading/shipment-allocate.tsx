"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/input";
import { extractApiError } from "@/lib/extract-api-error";
import { formatKg } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useGetAvailableLotsQuery,
  useGetShipmentQuery,
  useSetAllocationsMutation,
} from "@/redux/shipments/shipments-api";
import type { IShipment } from "@/types/admin-shipment.types";
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
    return lots.filter((l) => l.commodity.name.toLowerCase().includes(q));
  }, [lots, search]);
  const filtering = search.trim().length > 0;

  const activeRows = rows[activeSaleId];
  const activeSale = shipment.sales.find((s) => s.id === activeSaleId);
  const activeSaleLines = activeSale?.lines ?? [];
  /** kg already weighted per commodity for the ACTIVE sale (across lots) -
   * the flag that tells the admin "this sale already has maize on board". */
  const activeCommodityKg = useMemo(() => {
    const byCommodity: Record<string, number> = {};
    for (const l of lots) {
      const n = keyedKg(activeRows?.[l.id]);
      if (n > 0) {
        byCommodity[l.commodity.id] = (byCommodity[l.commodity.id] ?? 0) + n;
      }
    }
    return byCommodity;
  }, [lots, activeRows]);

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

  const runAutoAllocate = (strategy: AutoAllocateStrategy) => {
    const fill =
      scope === "ALL"
        ? shipment.sales.map((s) => s.id)
        : activeSaleId
          ? [activeSaleId]
          : [];
    const result = autoAllocate({
      capacityKg: shipment.truckCapacityKg,
      current: rows,
      fill,
      lots,
      sales: shipment.sales,
      strategy,
    });
    setRows(result.rows);
    setServerError(null);
    const shortText = result.shortfalls
      .map((sf) => {
        const ref =
          shipment.sales.find((s) => s.id === sf.saleId)?.transactionNo ?? "";
        const reason =
          sf.reason === "CAPACITY" ? "the truck is full" : "no stock left";
        return `${ref} ${commodityNames[sf.commodityId] ?? ""} short ${formatKg(sf.shortKg)} - ${reason}`;
      })
      .join("; ");
    setFillNote(
      `Filled ${formatKg(result.filledKg)} from the ${
        strategy === "CHEAPEST" ? "cheapest" : "costliest"
      } lots${shortText ? `. Still short: ${shortText}` : ""}. Adjust anything before saving.`,
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
          {activeSaleLines.length > 0 ? (
            <AdminCard className="px-4 py-2.5">
              <div className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
                This sale needs
              </div>
              <ul className="flex flex-col divide-y divide-adm-hairline">
                {activeSaleLines.map((line) => {
                  const onSale = activeCommodityKg[line.commodityId] ?? 0;
                  const needed = line.agreedKg - line.allocatedKg;
                  const stillToLoad = Math.max(needed - onSale, 0);
                  // Keyed past what the sale ordered: the backend refuses this
                  // with OVER_SHIP, so it is flagged before the round trip.
                  const overKeyed = onSale - needed;
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
                          overKeyed > 0
                            ? "font-semibold text-console-red"
                            : stillToLoad === 0
                              ? "text-console"
                              : "text-adm-muted",
                        )}
                      >
                        {overKeyed > 0
                          ? `${formatKg(overKeyed)} more than this sale ordered`
                          : stillToLoad === 0
                            ? `${formatKg(line.agreedKg)} · covered`
                            : `${formatKg(stillToLoad)} of ${formatKg(line.agreedKg)} still to load`}
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
                className="h-9 px-3"
                onClick={() => runAutoAllocate("CHEAPEST")}
              >
                Cheapest lots first
              </AdminButton>
              <AdminButton
                type="button"
                variant="outline"
                className="h-9 px-3"
                onClick={() => runAutoAllocate("COSTLIEST")}
              >
                Costliest lots first
              </AdminButton>
              <label className="flex items-center gap-1.5 text-[12.5px] text-adm-muted">
                <span className="sr-only sm:not-sr-only">Apply to</span>
                <select
                  aria-label="Which sales to auto-allocate"
                  className={cn(adminSelectClass, "h-9 w-auto")}
                  value={scope}
                  onChange={(e) => setScope(e.target.value as FillScope)}
                >
                  <option value="ACTIVE">This sale</option>
                  <option value="ALL">Every sale on the truck</option>
                </select>
              </label>
              {sumWeights(activeRows) > 0 ? (
                <AdminButton
                  type="button"
                  variant="outline"
                  className="h-9 px-3"
                  onClick={clearActiveSale}
                >
                  Clear this sale
                </AdminButton>
              ) : null}
            </div>
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
              placeholder="Search commodity…"
              aria-label="Search lots by commodity"
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
               target and every lot is reachable. */
            <AdminCard className="flex flex-col gap-2 px-4 py-3">
              {visibleLots.map((l) => {
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
                className="h-10 px-4"
                onClick={() => router.push(`${LIST}/${shipment.id}`)}
              >
                Cancel
              </AdminButton>
              <AdminButton
                type="button"
                disabled={saving}
                className="h-10 px-5"
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
