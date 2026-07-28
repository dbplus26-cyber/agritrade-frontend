"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AdminCard, AdminField, adminInputClass } from "@/components/admin/ui";
import {
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/input";
import { useGetCommoditiesQuery } from "@/redux/commodities/commodities-api";
import { useGetWarehousesQuery } from "@/redux/warehouses/warehouses-api";
import {
  useGetStockBalancesQuery,
  useRequestStockAdjustmentMutation,
} from "@/redux/stock/stock-api";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  adjustmentFormSchema,
  type AdjustmentFormValues,
} from "@/validations/stock-schema";
import { Kg } from "./stock-bits";
import { StockMovements } from "./stock-movements";

type Section = "balances" | "movements";

/** One column group of the balances matrix - a warehouse and its balances. */
interface MatrixWarehouse {
  id: string;
  name: string;
  /** Client-side sum of the warehouse's rows (display only, never stored). */
  subtotalKg: number;
  byCommodity: Map<string, number>;
}

/** One row of the balances matrix, in first-appearance order. */
interface MatrixCommodity {
  id: string;
  name: string;
}

/**
 * /admin/stock - the derived stock position. Balances render as one ledger
 * matrix (commodities as rows, warehouses as column groups on wide consoles,
 * compact per-warehouse sections below) under a per-commodity totals strip;
 * the movements ledger lives behind a section toggle. Corrections are
 * REQUESTS: the adjustment dialog files an approval and nothing moves until
 * it is decided.
 */
export function StockView() {
  const [section, setSection] = useState<Section>("balances");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState("all");
  const [commodityId, setCommodityId] = useState("all");
  const [includeZero, setIncludeZero] = useState(false);

  const { data: warehousesData } = useGetWarehousesQuery({
    isActive: true,
    limit: 100,
  });
  const { data: commoditiesData } = useGetCommoditiesQuery({
    isActive: true,
    limit: 100,
  });
  const warehouses = warehousesData?.data ?? [];
  const commodities = commoditiesData?.data ?? [];

  const balancesArgs = useMemo(
    () => ({
      ...(warehouseId !== "all" ? { warehouseId } : {}),
      ...(commodityId !== "all" ? { commodityId } : {}),
      ...(includeZero ? { includeZero: true } : {}),
    }),
    [warehouseId, commodityId, includeZero],
  );
  const { data, isLoading, isError, error, refetch } =
    useGetStockBalancesQuery(balancesArgs);

  const balances = useMemo(() => data?.data ?? [], [data]);
  const totals = useMemo(() => data?.summary.totals ?? [], [data]);

  /**
   * The rows pivoted into a warehouse-by-commodity matrix, both axes in the
   * order the API returned them. Subtotals are summed client-side for
   * display; balances themselves stay server-derived.
   */
  const matrix = useMemo(() => {
    const warehouses: MatrixWarehouse[] = [];
    const commodities: MatrixCommodity[] = [];
    const warehouseIndex = new Map<string, number>();
    const seenCommodities = new Set<string>();
    for (const row of balances) {
      let index = warehouseIndex.get(row.warehouseId);
      if (index === undefined) {
        index = warehouses.length;
        warehouseIndex.set(row.warehouseId, index);
        warehouses.push({
          id: row.warehouseId,
          name: row.warehouseName,
          subtotalKg: 0,
          byCommodity: new Map(),
        });
      }
      const warehouse = warehouses[index];
      warehouse.subtotalKg += row.balanceKg;
      warehouse.byCommodity.set(row.commodityId, row.balanceKg);
      if (!seenCommodities.has(row.commodityId)) {
        seenCommodities.add(row.commodityId);
        commodities.push({ id: row.commodityId, name: row.commodityName });
      }
    }
    return { warehouses, commodities };
  }, [balances]);

  const grandTotalKg = useMemo(
    () => totals.reduce((sum, t) => sum + t.totalKg, 0),
    [totals],
  );

  const warehouseOptions = [
    { value: "all", label: "All warehouses" },
    ...warehouses.map((w) => ({ value: w.id, label: w.name })),
  ];
  const commodityOptions = [
    { value: "all", label: "All commodities" },
    ...commodities.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <div>
      <div className="mb-3.5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.01em] text-ink">
            Stock
          </h1>
          <p className="mt-0.5 text-[13px] text-soil">
            On hand by warehouse - always the sum of the ledger, never a
            stored number
          </p>
        </div>
        <Button
          variant="harvest"
          className="h-8 px-3.5 text-[13px]"
          onClick={() => setAdjustOpen(true)}
        >
          + Request adjustment
        </Button>
      </div>

      {/* Section toggle - balances / movements. */}
      <div className="mb-4 flex gap-1.5">
        {(
          [
            ["balances", "Balances"],
            ["movements", "Movements"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSection(key)}
            aria-pressed={section === key}
            className={cn(
              "cursor-pointer rounded-[2px] border-[1.5px] px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
              section === key
                ? "border-console bg-console text-white"
                : "border-soil/30 bg-paper text-soil hover:border-console/60",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {section === "movements" ? (
        <StockMovements
          warehouseOptions={warehouseOptions}
          commodityOptions={commodityOptions}
        />
      ) : (
        <>
          {/* Per-commodity grand totals with each commodity's share of the
              total on hand - the strip reads as data, not tiles. */}
          {totals.length > 0 ? (
            <div className="mb-4 grid grid-cols-2 gap-2 @lg/main:grid-cols-3 @3xl/main:grid-cols-5">
              {totals.map((t) => {
                const share =
                  grandTotalKg > 0
                    ? Math.min(100, Math.max(0, (t.totalKg / grandTotalKg) * 100))
                    : 0;
                const shareLabel =
                  share > 0 && share < 1 ? "<1%" : `${Math.round(share)}%`;
                return (
                  <AdminCard key={t.commodityId} className="px-3 py-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className="min-w-0 truncate text-[10.5px] font-bold uppercase tracking-[0.08em] text-soil"
                        title={t.commodityName}
                      >
                        {t.commodityName}
                      </span>
                      <span
                        className="font-adminmono flex-none text-[10.5px] font-semibold tabular-nums text-soil/70"
                        title="Share of total stock on hand"
                      >
                        {shareLabel}
                      </span>
                    </div>
                    <Kg
                      kg={t.totalKg}
                      className="mt-0.5 block text-[16px] font-bold text-ink"
                    />
                    <div
                      aria-hidden="true"
                      className="mt-1.5 h-[3px] w-full bg-soil/15"
                    >
                      <div
                        className="h-full bg-harvest"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </AdminCard>
                );
              })}
            </div>
          ) : null}

          <ConsoleFilterBar
            search=""
            onSearch={() => undefined}
            hideSearch
            activeCount={
              (warehouseId !== "all" ? 1 : 0) +
              (commodityId !== "all" ? 1 : 0) +
              (includeZero ? 1 : 0)
            }
            onClear={() => {
              setWarehouseId("all");
              setCommodityId("all");
              setIncludeZero(false);
            }}
          >
            <ConsoleLabeledSelect
              label="Warehouse"
              value={warehouseId}
              onChange={setWarehouseId}
              options={warehouseOptions}
              active={warehouseId !== "all"}
              className="lg:w-[190px]"
            />
            <ConsoleLabeledSelect
              label="Commodity"
              value={commodityId}
              onChange={setCommodityId}
              options={commodityOptions}
              active={commodityId !== "all"}
              className="lg:w-[190px]"
            />
            {/* Kept, but named for what it does. A warehouse/commodity pair
                that has been fully loaded out drops to a zero balance and the
                API omits it, so an emptied warehouse reads as "nothing on
                hand" - indistinguishable from one that never held the goods.
                Turning this on brings those cleared lines back, which is how
                the office proves a store was emptied rather than mislaid.
                "Include empty" said none of that. */}
            <label
              title="Show warehouse/commodity lines that have been emptied to a zero balance"
              className={cn(
                "flex h-8 cursor-pointer items-center gap-2 rounded-[2px] border-[1.5px] bg-paper px-2.5 text-[13px] whitespace-nowrap transition-colors select-none",
                includeZero
                  ? "border-console/60 text-ink"
                  : "border-soil/30 text-soil",
              )}
            >
              <input
                type="checkbox"
                checked={includeZero}
                onChange={(e) => setIncludeZero(e.target.checked)}
                className="h-3.5 w-3.5 accent-[var(--color-forest)]"
              />
              Show cleared lines
            </label>
          </ConsoleFilterBar>

          {isLoading ? (
            <ConsoleTableSkeleton columns={5} />
          ) : isError ? (
            <ErrorMessage
              description={extractApiError(error).message}
              onRetry={() => void refetch()}
            />
          ) : matrix.warehouses.length === 0 ? (
            <AdminCard className="overflow-hidden">
              <EmptyState
                title="Nothing on hand"
                description="Stock appears here the moment a purchase is received into a warehouse."
              />
            </AdminCard>
          ) : (
            <AdminCard className="overflow-hidden">
              {/* Dual render off the same matrix: a warehouse-by-commodity
                  table when the console is wide enough for column groups,
                  compact per-warehouse ledger sections below that. */}
              <div className="hidden @4xl/main:block">
                <BalancesMatrix
                  warehouses={matrix.warehouses}
                  commodities={matrix.commodities}
                />
              </div>
              <div className="@4xl/main:hidden">
                <WarehouseSections
                  warehouses={matrix.warehouses}
                  commodities={matrix.commodities}
                />
              </div>
            </AdminCard>
          )}
        </>
      )}

      <AdjustmentDialog
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
        commodities={commodities.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}

/** Dim marker for a (warehouse, commodity) cell holding nothing. */
function NoStock() {
  return (
    <>
      <span aria-hidden="true" className="text-soil/40">
        &middot;
      </span>
      <span className="sr-only">none</span>
    </>
  );
}

/**
 * Wide presentation: one ledger table, commodities as rows and warehouses as
 * column groups, kg in mono right-aligned, a rule-topped subtotal row at the
 * foot. Scrolls inside the card if the warehouses outgrow it.
 */
function BalancesMatrix({
  warehouses,
  commodities,
}: {
  warehouses: MatrixWarehouse[];
  commodities: MatrixCommodity[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b-[1.5px] border-soil/25 bg-surface-alt/70">
            <th
              scope="col"
              className="px-4 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-[0.09em] text-soil"
            >
              Commodity
            </th>
            {warehouses.map((w) => (
              <th
                key={w.id}
                scope="col"
                className="px-4 py-2.5 text-right text-[10.5px] font-bold uppercase tracking-[0.09em]"
              >
                <Link
                  href={`/admin/warehouses/${w.id}`}
                  className="ml-auto block max-w-[180px] truncate text-console underline-offset-2 hover:underline"
                  title={w.name}
                >
                  {w.name}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {commodities.map((c) => (
            <tr key={c.id} className="border-b border-soil/10">
              <th
                scope="row"
                className="px-4 py-1.5 text-left font-medium text-ink"
              >
                <span className="block max-w-[240px] truncate" title={c.name}>
                  {c.name}
                </span>
              </th>
              {warehouses.map((w) => {
                const kg = w.byCommodity.get(c.id);
                return (
                  <td
                    key={w.id}
                    className="whitespace-nowrap px-4 py-1.5 text-right"
                  >
                    {kg === undefined || kg === 0 ? (
                      <NoStock />
                    ) : (
                      <Kg kg={kg} className="font-semibold text-ink" />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-[1.5px] border-soil/30 bg-surface-alt/40">
            <th
              scope="row"
              className="px-4 py-2 text-left text-[10.5px] font-bold uppercase tracking-[0.09em] text-soil"
            >
              Warehouse total
            </th>
            {warehouses.map((w) => (
              <td
                key={w.id}
                className="whitespace-nowrap px-4 py-2 text-right"
              >
                <Kg kg={w.subtotalKg} className="font-bold text-ink" />
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/**
 * Narrow presentation: compact per-warehouse sections - subtotal in the
 * section head, dense commodity | kg rows joined by dotted ledger leaders,
 * two-up once the section has the room.
 */
function WarehouseSections({
  warehouses,
  commodities,
}: {
  warehouses: MatrixWarehouse[];
  commodities: MatrixCommodity[];
}) {
  return (
    <div>
      {warehouses.map((w, index) => (
        <section
          key={w.id}
          className={cn(index > 0 && "border-t-[1.5px] border-soil/20")}
        >
          <div className="flex items-baseline justify-between gap-3 bg-surface-alt/60 px-4 py-2">
            <Link
              href={`/admin/warehouses/${w.id}`}
              className="min-w-0 truncate text-[11px] font-bold uppercase tracking-[0.09em] text-console underline-offset-2 hover:underline"
              title={w.name}
            >
              {w.name}
            </Link>
            <Kg
              kg={w.subtotalKg}
              className="flex-none text-[12px] font-bold text-ink"
            />
          </div>
          <div className="px-4 py-1.5 @xl/main:columns-2 @xl/main:gap-8">
            {commodities
              .filter((c) => w.byCommodity.has(c.id))
              .map((c) => {
                const kg = w.byCommodity.get(c.id) ?? 0;
                return (
                  <div
                    key={c.id}
                    className="flex items-baseline gap-2 py-1.5 break-inside-avoid"
                  >
                    <span
                      className="min-w-0 truncate text-[13px] font-medium text-ink"
                      title={c.name}
                    >
                      {c.name}
                    </span>
                    <span
                      aria-hidden="true"
                      className="flex-1 border-b border-dotted border-soil/30"
                    />
                    <Kg
                      kg={kg}
                      className={cn(
                        "flex-none text-[13px] font-semibold",
                        kg === 0 ? "text-soil/45" : "text-ink",
                      )}
                    />
                  </div>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}

/**
 * Files a stock-adjustment approval. A +/- direction toggle plus a positive
 * quantity beats typing minus signs on a phone; the submit signs the delta.
 */
function AdjustmentDialog({
  open,
  onClose,
  warehouses,
  commodities,
}: {
  open: boolean;
  onClose: () => void;
  warehouses: { id: string; name: string }[];
  commodities: { id: string; name: string }[];
}) {
  const [requestAdjustment, { isLoading }] =
    useRequestStockAdjustmentMutation();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentFormSchema),
    defaultValues: {
      warehouseId: "",
      commodityId: "",
      direction: "ADD",
      quantityKg: "",
      reason: "",
    },
  });
  const direction = watch("direction");

  const close = () => {
    reset();
    onClose();
  };

  const onSubmit = handleSubmit(async (values) => {
    const quantity = Number(values.quantityKg);
    try {
      await requestAdjustment({
        warehouseId: values.warehouseId,
        commodityId: values.commodityId,
        deltaKg: values.direction === "REMOVE" ? -quantity : quantity,
        reason: values.reason,
      }).unwrap();
      notify.success("Adjustment requested - waiting for approval");
      close();
    } catch (err) {
      notify.error(extractApiError(err).message);
    }
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Request a stock adjustment</DialogTitle>
          <DialogDescription>
            Nothing moves yet - the adjustment applies only once it is
            approved from the approvals inbox.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void onSubmit(e)} className="grid gap-3.5">
          <AdminField label="Warehouse" error={errors.warehouseId?.message}>
            <select
              className={cn(adminInputClass, "cursor-pointer")}
              {...register("warehouseId")}
            >
              <option value="">Choose a warehouse…</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Commodity" error={errors.commodityId?.message}>
            <select
              className={cn(adminInputClass, "cursor-pointer")}
              {...register("commodityId")}
            >
              <option value="">Choose a commodity…</option>
              {commodities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </AdminField>

          <div className="grid grid-cols-[auto_1fr] items-end gap-2.5">
            <div>
              <span className="mb-1 block text-[11.5px] font-semibold uppercase tracking-[0.08em] text-soil">
                Direction
              </span>
              <div className="flex gap-1">
                {(
                  [
                    ["ADD", "+ Add"],
                    ["REMOVE", "- Remove"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={direction === value}
                    onClick={() =>
                      setValue("direction", value, { shouldValidate: true })
                    }
                    className={cn(
                      "cursor-pointer rounded-[2px] border-[1.5px] px-3 py-[7px] text-[13px] font-semibold transition-colors",
                      direction === value
                        ? value === "REMOVE"
                          ? "border-console-red bg-console-red text-white"
                          : "border-console bg-console text-white"
                        : "border-soil/30 bg-paper text-soil",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <AdminField label="Weight (kg)" error={errors.quantityKg?.message}>
              <Input
                inputMode="decimal"
                placeholder="0.00"
                className={adminInputClass}
                {...register("quantityKg")}
              />
            </AdminField>
          </div>

          <AdminField label="Reason" error={errors.reason?.message}>
            <textarea
              rows={3}
              placeholder="Why is this stock moving? e.g. moisture loss after re-drying"
              className={cn(adminInputClass, "h-auto py-2 leading-[1.5]")}
              {...register("reason")}
            />
          </AdminField>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9"
              onClick={close}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="harvest"
              className="h-9"
              disabled={isLoading}
            >
              {isLoading ? "Filing…" : "File for approval"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
