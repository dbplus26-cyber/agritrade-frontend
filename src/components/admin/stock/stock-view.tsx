"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AdminButton, AdminCard, AdminField, adminInputClass } from "@/components/admin/ui";
import {
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import { HelpTip } from "@/components/admin/help-tip";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { RegisterEmpty } from "@/components/admin/register-empty";
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
  /**
   * How many of the rows on screen are cleared lines - a warehouse/commodity
   * pair emptied to zero. Only ever above zero while the toggle is on, since
   * the API omits them otherwise.
   *
   * Counted so the toggle can SAY when it found none. It is wired end to end
   * and always was, but a filter whose effect is invisible is indistinguishable
   * from one that is broken: you tick it, nothing moves, and you conclude the
   * control is dead rather than that the warehouse has never been emptied.
   */
  const clearedCount = useMemo(
    () => balances.filter((row) => row.balanceKg === 0).length,
    [balances],
  );
  const totals = useMemo(() => data?.summary.totals ?? [], [data]);

  const balancesFiltered =
    warehouseId !== "all" || commodityId !== "all" || includeZero;

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

  // Nothing on hand and nothing narrowing the view: the empty state alone -
  // a filter bar over an empty register filters nothing.
  const balancesPristine =
    !isLoading &&
    !isError &&
    matrix.warehouses.length === 0 &&
    !balancesFiltered;

  return (
    <div>
      <div className="mb-3.5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.01em] text-adm-ink">
            Stock
          </h1>
          <p className="mt-0.5 text-[13px] text-adm-muted">
            On hand by warehouse - always the sum of the ledger, never a
            stored number
          </p>
        </div>
        <AdminButton onClick={() => setAdjustOpen(true)}>
          + Request adjustment
        </AdminButton>
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
              "cursor-pointer rounded-[6px] border px-3.5 py-[7px] text-[13px] font-semibold transition-colors",
              section === key
                ? "border-console bg-console text-white"
                : "border-adm-line bg-adm-card text-adm-muted hover:border-console/60",
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
                        className="min-w-0 [overflow-wrap:anywhere] md:truncate text-[10.5px] font-bold uppercase tracking-[0.09em] text-adm-muted"
                        title={t.commodityName}
                      >
                        {t.commodityName}
                      </span>
                      <span
                        className="font-adminmono flex-none text-[10.5px] font-semibold tabular-nums text-adm-faint"
                        title="Share of total stock on hand"
                      >
                        {shareLabel}
                      </span>
                    </div>
                    <Kg
                      kg={t.totalKg}
                      className="mt-0.5 block text-[16px] font-bold text-adm-ink"
                    />
                    <div
                      aria-hidden="true"
                      className="mt-1.5 h-[3px] w-full bg-adm-sunken"
                    >
                      <div
                        className="h-full bg-console-gold"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </AdminCard>
                );
              })}
            </div>
          ) : null}

          {balancesPristine ? null : (
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
            />
            <ConsoleLabeledSelect
              label="Commodity"
              value={commodityId}
              onChange={setCommodityId}
              options={commodityOptions}
              active={commodityId !== "all"}
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
                "flex h-8 cursor-pointer items-center gap-2 rounded-[6px] border bg-adm-card px-2.5 text-[13px] whitespace-nowrap transition-colors select-none",
                includeZero
                  ? "border-console/60 text-adm-ink"
                  : "border-adm-line text-adm-muted",
              )}
            >
              <input
                type="checkbox"
                checked={includeZero}
                onChange={(e) => setIncludeZero(e.target.checked)}
                className="h-3.5 w-3.5 accent-[var(--color-forest)]"
              />
              Show cleared lines
              {/* The count is the whole point of showing it. Ticked with
                  nothing to show, the toggle looked broken; now it says so. */}
              {includeZero ? (
                <span className="text-adm-faint">
                  {clearedCount === 0 ? "none" : clearedCount}
                </span>
              ) : null}
            </label>
          </ConsoleFilterBar>
          )}

          {isLoading ? (
            <ConsoleTableSkeleton columns={5} />
          ) : isError ? (
            <ErrorMessage
              description={extractApiError(error).message}
              onRetry={() => void refetch()}
            />
          ) : matrix.warehouses.length === 0 ? (
            <RegisterEmpty
              filtered={balancesFiltered}
              noun="stock lines"
              title="Nothing on hand"
              description="Stock appears here the moment a purchase is received into a warehouse."
              filteredDescription="No stock lines match this warehouse and commodity combination."
              onClear={() => {
                setWarehouseId("all");
                setCommodityId("all");
                setIncludeZero(false);
              }}
            />
          ) : (
            <AdminCard className="overflow-hidden">
              {/* Warehouses STACK, they do not become columns.
                  This was a matrix - commodities down, one column per
                  warehouse across - which cannot hold: warehouses are a CRUD
                  register, so the table grew a column every time the office
                  opened a store, and the only way to read the tenth one was a
                  long horizontal scroll that took the commodity names off
                  screen with it. Capping the headings just truncated the names
                  instead; letting them through made the scroll worse. A
                  column per row of data is the wrong axis for a list that
                  grows.

                  Sections stack instead, so a hundred warehouses cost height
                  rather than width and nothing ever scrolls sideways. Each one
                  carries its own subtotal, and the commodity list inside runs
                  two-up once there is room - which is how a wide console
                  earns its width here, rather than by adding columns. */}
              <WarehouseSections
                warehouses={matrix.warehouses}
                commodities={matrix.commodities}
              />
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

function WarehouseSections({
  warehouses,
  commodities,
}: {
  warehouses: MatrixWarehouse[];
  commodities: MatrixCommodity[];
}) {
  return (
    // Sections tile on a wide console rather than running one-per-row down a
    // long page; each keeps its own frame so the grid reads as a set of
    // stores rather than one continuous ledger.
    <div className="grid gap-px bg-adm-hairline @4xl/main:grid-cols-2">
      {warehouses.map((w) => (
        <section key={w.id} className="bg-adm-card">
          {/* THREE LEVELS, and they have to look like three.
              The warehouse was set in the same 11px micro-caps the console
              uses for section labels, while the commodities under it were
              13px - so the parent read smaller than its children and the eye
              had nothing to climb. The place is a heading now, the goods are
              rows, and every quantity lands in one right-hand column where
              they can be compared down the page. */}
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-adm-hairline bg-adm-sunken px-4 py-3">
            <div className="min-w-0">
              <Link
                href={`/admin/warehouses/${w.id}`}
                className="block truncate text-[14px] font-semibold text-adm-ink underline-offset-2 hover:text-console hover:underline"
                title={w.name}
              >
                {w.name}
              </Link>
              <span className="text-[11.5px] text-adm-muted">
                {w.byCommodity.size}{" "}
                {w.byCommodity.size === 1 ? "commodity" : "commodities"}
              </span>
            </div>
            <div className="flex-none text-right">
              <Kg
                kg={w.subtotalKg}
                className="block text-[15px] font-semibold text-adm-ink"
              />
              <span className="flex items-center justify-end gap-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
                <span className="min-w-0">On hand</span>
                <HelpTip
                  label="What does On hand count?"
                  text="Everything this store is holding right now, added up across all its commodities."
                />
              </span>
            </div>
          </div>
          {/* One column, read straight down. This was a CSS multi-column
              list, and CSS columns flow top-to-bottom and THEN wrap to the
              next column - so a reader looking for a commodity had no single
              direction to scan, which is what made the panel feel scattered.
              Width is spent on showing more warehouses side by side instead
              (see the grid on the section list), where each one stays a plain
              vertical list. */}
          <div className="px-4 py-1">
            {commodities
              .filter((c) => w.byCommodity.has(c.id))
              .map((c) => {
                const kg = w.byCommodity.get(c.id) ?? 0;
                return (
                  <div
                    key={c.id}
                    className="flex break-inside-avoid items-baseline justify-between gap-4 border-b border-adm-hairline py-2 last:border-b-0"
                  >
                    <span
                      className="min-w-0 [overflow-wrap:anywhere] md:truncate text-[13px] text-adm-body"
                      title={c.name}
                    >
                      {c.name}
                    </span>
                    <Kg
                      kg={kg}
                      className={cn(
                        "flex-none text-[13px] font-semibold",
                        kg === 0 ? "text-adm-faint" : "text-adm-ink",
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
    <ResponsiveDialog open={open} onOpenChange={(o) => !o && close()}>
      <ResponsiveDialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-[440px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Request a stock adjustment</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Nothing moves yet - the adjustment applies only once it is
            approved from the approvals inbox.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
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
              <span className="mb-1 block text-[11.5px] font-semibold uppercase tracking-[0.08em] text-adm-muted">
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
                      "cursor-pointer rounded-[6px] border px-3.5 py-[7px] text-[13px] font-semibold transition-colors",
                      direction === value
                        ? value === "REMOVE"
                          ? "border-console-red bg-console-red text-white"
                          : "border-console bg-console text-white"
                        : "border-adm-line bg-adm-card text-adm-muted",
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
              rows={4}
              placeholder="Why is this stock moving? e.g. moisture loss after re-drying"
              className={cn(adminInputClass, "h-auto py-2 leading-[1.5]")}
              {...register("reason")}
            />
          </AdminField>
          <ResponsiveDialogFooter className="gap-2">
            <AdminButton variant="outline" size="lg" onClick={close}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" size="lg" disabled={isLoading}>
              {isLoading ? "Filing…" : "File for approval"}
            </AdminButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
