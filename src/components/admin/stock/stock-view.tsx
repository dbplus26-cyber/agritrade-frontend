"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import {
  AdminButton,
  AdminCard,
  AdminField,
  adminInputClass,
  AdminPageHeader,
} from "@/components/admin/ui";
import {
  ConsoleFilterBar,
  ConsoleLabeledSelect,
  FilterChip,
  labelOf,
} from "@/components/admin/filter-bar";
import { ConsoleTabs, type ConsoleTab } from "@/components/admin/console-tabs";
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
import { SimpleSelect } from "@/components/ui/simple-select";
import { useGetCommoditiesQuery } from "@/redux/commodities/commodities-api";
import { useGetWarehousesQuery } from "@/redux/warehouses/warehouses-api";
import {
  useGetStockBalancesQuery,
  useRequestStockAdjustmentMutation,
} from "@/redux/stock/stock-api";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";
import {
  adjustmentFormSchema,
  type AdjustmentFormValues,
} from "@/validations/stock-schema";
import { Kg } from "./stock-bits";
import { StockMovements } from "./stock-movements";
import { SupplierHoldings } from "./supplier-holdings";

type Section = "at-suppliers" | "balances" | "movements";

const SECTION_TABS: readonly ConsoleTab<Section>[] = [
  { value: "balances", label: "Balances" },
  { value: "at-suppliers", label: "At suppliers" },
  { value: "movements", label: "Movements" },
];

const CLEARED_LINES_OPTIONS = [
  { value: "hidden", label: "Hidden" },
  { value: "shown", label: "Shown" },
] as const;

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
 * /admin/stock - the derived stock position. Balances render as stacked
 * per-warehouse sections, each a ruled table of its commodities, under a
 * per-commodity totals strip; the movements ledger lives behind a section
 * toggle that shares the toolbar row. Corrections are
 * REQUESTS: the adjustment dialog files an approval and nothing moves until
 * it is decided.
 */
export function StockView() {
  const [section, setSection] = useState<Section>("balances");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const { has } = usePermissions();
  const canAdjust = has("STOCK_MANAGE");
  const [warehouseId, setWarehouseId] = useState("all");
  const [commodityId, setCommodityId] = useState("all");
  const [includeZero, setIncludeZero] = useState(false);
  // The balances call returns the whole matrix (it is small: commodities by
  // warehouses), so search narrows it here rather than on the server.
  const [search, setSearch] = useState("");
  const searchTerm = search.trim().toLowerCase();

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

  const allBalances = useMemo(() => data?.data ?? [], [data]);
  const balances = useMemo(
    () =>
      searchTerm
        ? allBalances.filter(
            (row) =>
              row.commodityName.toLowerCase().includes(searchTerm) ||
              row.warehouseName.toLowerCase().includes(searchTerm),
          )
        : allBalances,
    [allBalances, searchTerm],
  );
  /**
   * How many of the rows on screen are cleared lines - a warehouse/commodity
   * pair emptied to zero. Only ever above zero while the toggle is on, since
   * the API omits them otherwise.
   *
   * Counted so the toggle can SAY when it found none: a filter whose effect is
   * invisible is indistinguishable from one that is broken - it is ticked,
   * nothing moves, and the reader concludes the control is dead rather than
   * that the warehouse has never been emptied.
   */
  const clearedCount = useMemo(
    () => balances.filter((row) => row.balanceKg === 0).length,
    [balances],
  );
  const totals = useMemo(() => data?.summary.totals ?? [], [data]);

  const balancesFiltered =
    Boolean(searchTerm) ||
    warehouseId !== "all" ||
    commodityId !== "all" ||
    includeZero;
  const clearBalancesFilters = () => {
    setSearch("");
    setWarehouseId("all");
    setCommodityId("all");
    setIncludeZero(false);
  };

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

  // The page's one action. It lives in the toolbar of whichever section is
  // showing, on the same row as the section tabs.
  const adjustButton = canAdjust ? (
    <AdminButton
      onClick={() => setAdjustOpen(true)}
      aria-label="Request adjustment"
    >
      <Plus className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">Request adjustment</span>
    </AdminButton>
  ) : null;

  // Section toggle - balances / movements - opens the toolbar row, so tabs,
  // search, filters and the action share one line on a desktop.
  const sectionTabs = (
    <ConsoleTabs
      variant="solid"
      label="Stock sections"
      tabs={SECTION_TABS}
      value={section}
      onChange={setSection}
    />
  );

  return (
    <div>
      <AdminPageHeader
        title="Stock"
        sub="On hand by warehouse - always the sum of the ledger, never a stored number"
      />

      {section === "movements" ? (
        <StockMovements
          warehouseOptions={warehouseOptions}
          commodityOptions={commodityOptions}
          action={adjustButton}
          leading={sectionTabs}
        />
      ) : section === "at-suppliers" ? (
        <SupplierHoldings action={adjustButton} leading={sectionTabs} />
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
                      countUp
                      kg={t.totalKg}
                      className="mt-0.5 block text-[13px] font-bold text-adm-ink"
                    />
                    <div
                      aria-hidden="true"
                      className="mt-1.5 h-[3px] w-full bg-adm-sunken"
                    >
                      <div
                        className="h-full bg-console-gold transition-[width] duration-500 ease-out"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </AdminCard>
                );
              })}
            </div>
          ) : null}

          {balancesPristine ? (
            <ConsoleFilterBar
              hideSearch
              leading={sectionTabs}
              action={adjustButton}
            />
          ) : (
          <ConsoleFilterBar
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Search commodity or warehouse…"
            activeCount={
              (warehouseId !== "all" ? 1 : 0) +
              (commodityId !== "all" ? 1 : 0) +
              (includeZero ? 1 : 0)
            }
            onClear={clearBalancesFilters}
            totalCount={balances.length}
            noun="stock lines"
            action={adjustButton}
            leading={sectionTabs}
            chips={
              <>
                {warehouseId !== "all" ? (
                  <FilterChip onRemove={() => setWarehouseId("all")}>
                    Warehouse: {labelOf(warehouseOptions, warehouseId)}
                  </FilterChip>
                ) : null}
                {commodityId !== "all" ? (
                  <FilterChip onRemove={() => setCommodityId("all")}>
                    Commodity: {labelOf(commodityOptions, commodityId)}
                  </FilterChip>
                ) : null}
                {includeZero ? (
                  <FilterChip onRemove={() => setIncludeZero(false)}>
                    Cleared lines: Shown
                    {clearedCount === 0 ? " (none)" : ` (${clearedCount})`}
                  </FilterChip>
                ) : null}
              </>
            }
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
            {/* A warehouse/commodity pair that has been fully loaded out
                drops to a zero balance and the API omits it, so an emptied
                warehouse reads as "nothing on hand" - indistinguishable from
                one that never held the goods. Showing cleared lines brings
                them back, which is how the office proves a store was emptied
                rather than mislaid. */}
            <ConsoleLabeledSelect
              label="Cleared lines"
              hint="Show warehouse/commodity lines that have been emptied to a zero balance"
              value={includeZero ? "shown" : "hidden"}
              onChange={(v) => setIncludeZero(v === "shown")}
              options={CLEARED_LINES_OPTIONS}
              active={includeZero}
            />
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
              filteredDescription="No stock lines match this search and filter combination."
              onClear={clearBalancesFilters}
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
  const headCell =
    "h-[34px] px-4 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase";
  return (
    // Warehouses STACK, one ruled section each, so every quantity lands in
    // the same right-hand column down the whole page and a hundred stores
    // cost height rather than width. Inside, the goods are table rows:
    // commodity, what is on hand, and its share of that store as a bar, so
    // a long list still reads top to bottom with nothing to hunt for.
    <div className="divide-y divide-adm-line">
      {warehouses.map((w) => {
        const rows = commodities
          .filter((c) => w.byCommodity.has(c.id))
          .map((c) => ({ ...c, kg: w.byCommodity.get(c.id) ?? 0 }));
        // A commodity is named in two or three words against a six-character
        // weight, so one full-page row leaves a hand's width of nothing
        // between them. Past a point the list runs in two columns instead:
        // each name sits near its own figure, the width is spent on rows
        // rather than on gap, and a long name still has room to wrap.
        const half = Math.ceil(rows.length / 2);
        const groups =
          rows.length >= 4 ? [rows.slice(0, half), rows.slice(half)] : [rows];
        const split = groups.length > 1;
        return (
          <section key={w.id} aria-labelledby={`warehouse-${w.id}`}>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-adm-hairline bg-adm-sunken px-4 py-3">
              <div className="min-w-0">
                <Link
                  id={`warehouse-${w.id}`}
                  href={`/admin/warehouses/${w.id}`}
                  className="block truncate text-[12px] font-semibold text-adm-ink underline-offset-2 hover:text-console hover:underline"
                  title={w.name}
                >
                  {w.name}
                </Link>
                <span className="text-[10.5px] text-adm-muted">
                  {rows.length} {rows.length === 1 ? "commodity" : "commodities"}
                </span>
              </div>
              <div className="flex-none text-right">
                <Kg
                  countUp
                  kg={w.subtotalKg}
                  className="block text-[12.5px] font-semibold text-adm-ink"
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

            <div
              className={cn("grid", split && "@5xl/main:grid-cols-2")}
            >
              {groups.map((group, gi) => (
                <table
                  className={cn(
                    "w-full table-fixed",
                    gi > 0 && "@5xl/main:border-l @5xl/main:border-adm-hairline",
                  )}
                  key={gi}
                >
                  <colgroup>
                    <col />
                    <col className={split ? "w-28 sm:w-32" : "w-32 sm:w-40"} />
                    <col
                      className={cn(
                        "hidden sm:table-column",
                        split ? "w-32 lg:w-40" : "w-44 lg:w-56",
                      )}
                    />
                  </colgroup>
                  {/* The second column repeats the headings only once it is
                      actually beside the first. Stacked, it is the same list
                      continuing, and a second set of headings mid-list reads
                      as a second table. */}
                  <thead
                    className={cn(gi > 0 && "hidden @5xl/main:table-header-group")}
                  >
                    <tr className="border-b border-adm-hairline">
                      <th scope="col" className={cn(headCell, "text-left")}>
                        Commodity
                      </th>
                      <th scope="col" className={cn(headCell, "text-right")}>
                        On hand
                      </th>
                      <th
                        scope="col"
                        className={cn(headCell, "hidden text-right sm:table-cell")}
                      >
                        Share of store
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.map((r) => {
                      const share =
                        w.subtotalKg > 0
                          ? Math.min(100, Math.max(0, (r.kg / w.subtotalKg) * 100))
                          : 0;
                      const shareLabel =
                        share > 0 && share < 1 ? "<1%" : `${Math.round(share)}%`;
                      return (
                        <tr
                          key={r.id}
                          className={cn(
                            "border-b border-adm-hairline transition-colors hover:bg-adm-hover",
                            gi === groups.length - 1 && "last:border-b-0",
                          )}
                        >
                          <td
                            className="px-4 py-2.5 text-[11.5px] text-adm-body [overflow-wrap:anywhere]"
                            title={r.name}
                          >
                            {r.name}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Kg
                              kg={r.kg}
                              className={cn(
                                "text-[11.5px] font-semibold",
                                r.kg === 0 ? "text-adm-faint" : "text-adm-ink",
                              )}
                            />
                          </td>
                          <td className="hidden px-4 py-2.5 sm:table-cell">
                            <div className="flex items-center justify-end gap-2.5">
                              <span
                                aria-hidden="true"
                                className={cn(
                                  "block h-1 overflow-hidden bg-adm-sunken",
                                  split ? "w-12 lg:w-16" : "w-20 lg:w-28",
                                )}
                              >
                                <span
                                  className="block h-full bg-console-gold transition-[width] duration-500 ease-out"
                                  style={{ width: `${String(share)}%` }}
                                />
                              </span>
                              <span className="font-adminmono w-9 text-right text-[10.5px] tabular-nums text-adm-muted">
                                {shareLabel}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ))}
            </div>
          </section>
        );
      })}
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
    control,
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
            <Controller
              control={control}
              name="warehouseId"
              render={({ field }) => (
                <SimpleSelect
                  className={cn(adminInputClass, "cursor-pointer")}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Choose a warehouse…"
                  options={warehouses.map((w) => ({
                    value: w.id,
                    label: w.name,
                  }))}
                />
              )}
            />
          </AdminField>
          <AdminField label="Commodity" error={errors.commodityId?.message}>
            <Controller
              control={control}
              name="commodityId"
              render={({ field }) => (
                <SimpleSelect
                  className={cn(adminInputClass, "cursor-pointer")}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Choose a commodity…"
                  options={commodities.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                />
              )}
            />
          </AdminField>

          <div className="grid grid-cols-[auto_1fr] items-end gap-2.5">
            <div>
              <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-adm-muted">
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
                      "cursor-pointer rounded-none border px-3.5 py-[7px] text-[11.5px] font-semibold transition-colors",
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
            <AdminButton type="submit" size="lg" disabled={isLoading} loading={isLoading}>
              {isLoading ? "Filing…" : "File for approval"}
            </AdminButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
