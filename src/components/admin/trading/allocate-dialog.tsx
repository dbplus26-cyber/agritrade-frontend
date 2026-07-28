"use client";

import { useMemo, useState } from "react";
import { AdminButton, Mono, adminInputClass } from "@/components/admin/ui";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Input } from "@/components/ui/input";
import { extractApiError } from "@/lib/extract-api-error";
import { formatKg } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useGetAvailableLotsQuery,
  useSetAllocationsMutation,
} from "@/redux/shipments/shipments-api";
import type { IShipment } from "@/types/admin-shipment.types";
import { LoadMeter } from "./load-meter";
import { Money } from "./sale-bits";

/** saleId -> lotId -> weight input (kept as the raw string while typing). */
type Rows = Record<string, Record<string, string>>;

const sumWeights = (byLot: Record<string, string> | undefined): number =>
  Object.values(byLot ?? {}).reduce((sum, w) => {
    const n = Number(w);
    return sum + (Number.isFinite(n) && n > 0 ? n : 0);
  }, 0);

/**
 * Pick lots to load, sale-first: choose the sale you are loading for, then
 * weight the lots that fulfil it. Available lots come from the shipment's
 * origin warehouse; the backend validates each slice per sale (over-shipping,
 * commodity-on-sale, truck capacity).
 */
export function AllocateDialog({
  shipment,
  onClose,
}: {
  shipment: IShipment;
  onClose: () => void;
}) {
  const { data, isLoading } = useGetAvailableLotsQuery(shipment.id);
  const [save, { isLoading: saving }] = useSetAllocationsMutation();
  const [search, setSearch] = useState("");
  const [activeSaleId, setActiveSaleId] = useState(
    shipment.sales[0]?.id ?? "",
  );
  /** The backend's refusal (OVER_SHIP, COMMODITY_NOT_ON_SALE…), kept inline
   * so the admin can fix the weights without losing the dialog. */
  const [serverError, setServerError] = useState<string | null>(null);

  // Seed each sale's weights from what is already allocated to it.
  const [rows, setRows] = useState<Rows>(() => {
    const seeded: Rows = {};
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
  /** kg already weighted per commodity for the ACTIVE sale (across lots) -
   * the flag that tells the admin "this sale already has maize on board". */
  const activeCommodityKg = useMemo(() => {
    const byCommodity: Record<string, number> = {};
    for (const l of lots) {
      const n = Number(activeRows?.[l.id]);
      if (Number.isFinite(n) && n > 0) {
        byCommodity[l.commodity.id] = (byCommodity[l.commodity.id] ?? 0) + n;
      }
    }
    return byCommodity;
  }, [lots, activeRows]);

  const totalKg = useMemo(
    () =>
      shipment.sales.reduce((sum, s) => sum + sumWeights(rows[s.id]), 0),
    [rows, shipment.sales],
  );

  const submit = async () => {
    const allocations = shipment.sales.flatMap((s) =>
      lots
        .map((l) => ({
          lotId: l.id,
          saleId: s.id,
          weightKg: Number(rows[s.id]?.[l.id] ?? 0),
        }))
        .filter((a) => Number.isFinite(a.weightKg) && a.weightKg > 0),
    );
    try {
      await save({ allocations, id: shipment.id }).unwrap();
      notify.success("Allocations saved");
      onClose();
    } catch (err) {
      // OVER_SHIP names the sale and COMMODITY_NOT_ON_SALE the commodity -
      // keep the exact message in view while the weights get fixed.
      setServerError(extractApiError(err).message);
    }
  };

  return (
    <ResponsiveDialog open onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-[560px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Allocate lots</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Pick a sale, then weight the lots that fulfil it. Dispatch needs
            every sale fully allocated; stock only leaves the warehouse when
            you dispatch.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        {isLoading ? (
          <DataTableSkeleton />
        ) : lots.length === 0 ? (
          <p className="py-3 text-[13px] text-soil">
            No stock available in this warehouse for the sales&apos;
            commodities.
          </p>
        ) : (
          <>
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
                      "flex-none rounded-[2px] border-[1.5px] px-2.5 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-console/40",
                      active
                        ? "border-forest bg-forest text-white"
                        : "border-soil/35 bg-[#FBFCF7] text-ink hover:bg-soil/5",
                    )}
                  >
                    <Mono className="block text-[11.5px]">
                      {s.transactionNo}
                    </Mono>
                    <span
                      className={cn(
                        "block max-w-[140px] text-[11px]",
                        active ? "text-white/80" : "text-soil/80",
                        "min-w-0 line-clamp-1 whitespace-normal [overflow-wrap:anywhere]",
                      )}
                    >
                      {s.buyer.name}
                    </span>
                    <Mono
                      className={cn(
                        "block text-[11px]",
                        active ? "text-white/90" : "text-soil",
                      )}
                    >
                      {subtotal > 0 ? formatKg(subtotal) : "Nothing yet"}
                    </Mono>
                  </button>
                );
              })}
            </div>

            <div>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search commodity…"
                className={cn(adminInputClass, "h-9")}
              />
              {filtering ? (
                <p className="mt-1 text-[12px] text-soil">
                  {visibleLots.length} of {lots.length} lots
                </p>
              ) : null}
            </div>

            {visibleLots.length === 0 ? (
              <p className="py-3 text-[13px] text-soil">
                No lots match this search.
              </p>
            ) : (
              <div className="flex max-h-[42vh] flex-col gap-2 overflow-y-auto">
                {visibleLots.map((l) => {
                  const weight = activeRows?.[l.id] ?? "";
                  const onThisSaleKg = activeCommodityKg[l.commodity.id] ?? 0;
                  // Weight this lot carries for the OTHER sales on the truck.
                  const otherSalesKg = shipment.sales.reduce((sum, s) => {
                    if (s.id === activeSaleId) return sum;
                    const n = Number(rows[s.id]?.[l.id]);
                    return sum + (Number.isFinite(n) && n > 0 ? n : 0);
                  }, 0);
                  const lotTotalKg =
                    otherSalesKg +
                    (Number.isFinite(Number(weight)) && Number(weight) > 0
                      ? Number(weight)
                      : 0);
                  const overLot = lotTotalKg > l.remainingKg;
                  return (
                    <div
                      key={l.id}
                      className="flex flex-col gap-1 border-b border-soil/10 pb-2"
                    >
                      <div className="grid grid-cols-[1fr_110px] items-center gap-2">
                        <div className="min-w-0">
                          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                            <span className="min-w-0 text-[13.5px] font-medium text-ink [overflow-wrap:anywhere]">
                              {l.commodity.name}
                            </span>
                            {onThisSaleKg > 0 ? (
                              <span className="flex-none rounded-full bg-[#E3EBDD] px-1.5 py-px text-[10.5px] font-semibold whitespace-nowrap text-[#2F5E3D]">
                                {formatKg(onThisSaleKg)} on this sale
                              </span>
                            ) : null}
                          </div>
                          <div className="text-[12px] text-soil">
                            {formatKg(l.remainingKg)} available ·{" "}
                            <Money value={l.unitCostGhs} />
                            /kg
                          </div>
                          {otherSalesKg > 0 ? (
                            <div className="text-[11.5px] text-soil/80">
                              {formatKg(otherSalesKg)} weighted for other sales
                            </div>
                          ) : null}
                        </div>
                        <Input
                          inputMode="decimal"
                          placeholder="kg"
                          aria-label={`Kilograms of ${l.commodity.name} for this sale`}
                          className={cn(
                            adminInputClass,
                            overLot && "border-error",
                          )}
                          value={weight}
                          onChange={(e) =>
                            setWeight(activeSaleId, l.id, e.target.value)
                          }
                        />
                      </div>
                      {overLot ? (
                        <p
                          role="alert"
                          className="text-[12px] font-medium text-error"
                        >
                          This lot carries {formatKg(lotTotalKg)} across the
                          sales but only {formatKg(l.remainingKg)} is
                          available.
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}

            <LoadMeter
              loadedKg={totalKg}
              capacityKg={shipment.truckCapacityKg}
              loadedLabel="Allocated"
            />

            {serverError ? (
              <p
                role="alert"
                className="rounded-[2px] border-[1.5px] border-error/50 bg-error/[0.06] px-3 py-2 text-[12.5px] font-medium text-error"
              >
                {serverError}
              </p>
            ) : null}
          </>
        )}
        <ResponsiveDialogFooter className="gap-2">
          <AdminButton
            type="button"
            variant="outline"
            className="h-9 px-3.5"
            onClick={onClose}
          >
            Cancel
          </AdminButton>
          <AdminButton
            type="button"
            disabled={saving || lots.length === 0}
            className="h-9 px-4"
            onClick={() => void submit()}
          >
            {saving ? "Saving…" : "Save allocations"}
          </AdminButton>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
