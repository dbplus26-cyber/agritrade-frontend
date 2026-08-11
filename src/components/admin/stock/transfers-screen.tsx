"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { columnHelp, ConsoleDataTable } from "@/components/admin/data-table";
import {
  ConsoleDateRange,
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import { Absent, columnMeta } from "@/components/admin/registry/registry-bits";
import { TextCell } from "@/components/admin/table-cells";
import { DateOnlyCell, DateTimeCell } from "@/components/admin/date-cell";
import {
  AdminButton,
  AdminCard,
  AdminField,
  adminInputClass,
  Mono,
  SectionHeading,
} from "@/components/admin/ui";
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
import { useAuthRole } from "@/hooks/use-auth-role";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { useGetCommoditiesQuery } from "@/redux/commodities/commodities-api";
import {
  useCreateTransferMutation,
  useGetTransfersQuery,
} from "@/redux/transfers/transfers-api";
import { useGetWarehousesQuery } from "@/redux/warehouses/warehouses-api";
import type { ITransfer, ITransferListQuery } from "@/types/ops.types";
import {
  transferFormSchema,
  type TransferFormValues,
} from "@/validations/ops-schema";
import { Kg } from "./stock-bits";

const FILTER_DEFAULTS = {
  fromWh: "all",
  toWh: "all",
  commodity: "all",
  from: "",
  to: "",
  size: "20",
};

/**
 * "WH A -> WH B" on one line, with the full route on hover.
 *
 * Uses `truncate`, NOT `line-clamp-1`. The two cannot be combined with
 * `block`: line-clamp works by setting `display: -webkit-box`, which the
 * `block` utility then overrides, so the clamp silently does nothing. That is
 * what produced this register's worst bug - the route column, starved of
 * width by an unbounded commodity column beside it, wrapped one character per
 * line and pushed rows past 700px tall.
 */
function Route({ from, to }: { from: string; to: string }) {
  return (
    // The accessible reading lives on the span itself, NOT in an `sr-only`
    // child. `sr-only` is `position: absolute`, and this span is not a
    // positioned ancestor, so the child's containing block was the page
    // shell: it escaped the truncation clip entirely and sat at the
    // x-position of the UNTRUNCATED text, dragging the page's scroll width
    // out to 723px on a phone. An invisible element should never be able to
    // widen the page.
    <span
      aria-label={`${from} to ${to}`}
      className="block @2xl/table:max-w-[90%] min-w-0 [overflow-wrap:anywhere] @2xl/table:truncate text-adm-ink"
      title={`${from} -> ${to}`}
    >
      <span aria-hidden="true">
        {from}
        <span className="mx-1.5 text-adm-muted">→</span>
        {to}
      </span>
    </span>
  );
}

/** /admin/transfers - the posted warehouse-to-warehouse movements register. */
export function TransfersScreen() {
  const { isSuperAdmin } = useAuthRole();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { page, filters, setFilter, setPage, resetFilters } = useTableQuery({
    defaults: FILTER_DEFAULTS,
  });
  const pageSize = Number(filters.size) || 20;

  const { data: warehousesData } = useGetWarehousesQuery({
    isActive: true,
    limit: 100,
  });
  const { data: commoditiesData } = useGetCommoditiesQuery({
    isActive: true,
    limit: 100,
  });
  const warehouses = useMemo(
    () => warehousesData?.data ?? [],
    [warehousesData],
  );
  const commodities = useMemo(
    () => commoditiesData?.data ?? [],
    [commoditiesData],
  );

  const queryArgs = useMemo<ITransferListQuery>(
    () => ({
      page,
      limit: pageSize,
      ...(filters.fromWh !== "all" ? { fromWarehouseId: filters.fromWh } : {}),
      ...(filters.toWh !== "all" ? { toWarehouseId: filters.toWh } : {}),
      ...(filters.commodity !== "all"
        ? { commodityId: filters.commodity }
        : {}),
      ...(filters.from ? { from: filters.from } : {}),
      ...(filters.to ? { to: filters.to } : {}),
    }),
    [page, pageSize, filters],
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetTransfersQuery(queryArgs);
  const transfers = data?.data ?? [];
  const totalCount = data?.meta.total ?? 0;
  const activeFilterCount =
    (filters.fromWh !== "all" ? 1 : 0) +
    (filters.toWh !== "all" ? 1 : 0) +
    (filters.commodity !== "all" ? 1 : 0) +
    (filters.from ? 1 : 0) +
    (filters.to ? 1 : 0);
  // A register with nothing on file and no filters narrowing it shows ONLY
  // the empty state (with its create action) - a filter bar filters nothing.
  const pristine =
    !isLoading && !isError && transfers.length === 0 && activeFilterCount === 0;

  const fromOptions = useMemo(
    () => [
      { value: "all", label: "From: any" },
      ...warehouses.map((w) => ({ value: w.id, label: w.name })),
    ],
    [warehouses],
  );
  const toOptions = useMemo(
    () => [
      { value: "all", label: "To: any" },
      ...warehouses.map((w) => ({ value: w.id, label: w.name })),
    ],
    [warehouses],
  );
  const commodityOptions = useMemo(
    () => [
      { value: "all", label: "All commodities" },
      ...commodities.map((c) => ({ value: c.id, label: c.name })),
    ],
    [commodities],
  );

  const columns = useMemo<ColumnDef<ITransfer, unknown>[]>(
    () => [
      {
        id: "transactionNo",
        header: columnHelp(
          "Transfer #",
          "The reference this move was filed under, for quoting it later.",
        ),
        accessorFn: (t) => t.transactionNo,
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <Mono className="whitespace-nowrap text-adm-ink">
            {row.original.transactionNo}
          </Mono>
        ),
      },
      {
        id: "route",
        header: columnHelp(
          "Route",
          "Which of your warehouses the stock left, and which one it went into.",
        ),
        accessorFn: (t) => `${t.fromWarehouse.name} → ${t.toWarehouse.name}`,
        enableSorting: false,
        meta: columnMeta({ stretch: true }),
        cell: ({ row }) => (
          <Route
            from={row.original.fromWarehouse.name}
            to={row.original.toWarehouse.name}
          />
        ),
      },
      {
        id: "commodity",
        header: "Commodity",
        accessorFn: (t) => t.commodity.name,
        enableSorting: false,
        meta: columnMeta(),
        // Bounded: an unbounded commodity name is what starved the route
        // column in the first place.
        cell: ({ row }) => (
          <TextCell value={row.original.commodity.name} width="label" />
        ),
      },
      {
        id: "weight",
        header: "Weight",
        accessorFn: (t) => t.weightKg,
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <Kg
            kg={row.original.weightKg}
            className="font-semibold text-adm-ink"
          />
        ),
      },
      {
        id: "moved",
        header: columnHelp(
          "Moved",
          "The day the stock actually left one warehouse, which can differ from the day it was typed in.",
        ),
        accessorFn: (t) => t.occurredAt,
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => <DateOnlyCell value={row.original.occurredAt} />,
      },
      {
        id: "recorded",
        header: "Recorded",
        accessorFn: (t) => t.createdAt,
        enableSorting: false,
        meta: columnMeta({ at: "xl" }),
        cell: ({ row }) => (
          <DateTimeCell value={row.original.createdAt} muted />
        ),
      },
      {
        id: "notes",
        header: "Notes",
        accessorFn: (t) => t.notes ?? "",
        enableSorting: false,
        // Last in, last shown: a note is the one thing here a reader can do
        // without, so it waits for a screen with room to spare.
        meta: columnMeta({ at: "2xl" }),
        cell: ({ row }) =>
          row.original.notes ? (
            <TextCell
              className="text-adm-muted"
              value={row.original.notes}
              width="prose"
            />
          ) : (
            <Absent />
          ),
      },
    ],
    [],
  );

  return (
    // min-w-0: the console shell lays pages out with flex, and a flex item
    // defaults to `min-width: auto` - it refuses to shrink below its content.
    // Without this the widest table stretched the PAGE instead of scrolling
    // inside its own box, so a phone got a sideways-scrolling page.
    <div className="min-w-0">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.01em] text-adm-ink">
            Transfers
          </h1>
          <p className="mt-0.5 text-[13px] text-adm-muted">
            Stock moved between warehouses - each posts an out and an in on the
            ledger
          </p>
        </div>
        {isSuperAdmin ? (
              <AdminButton onClick={() => setDialogOpen(true)}>
                + New transfer
              </AdminButton>
            ) : undefined}
      </div>

      {pristine ? null : (
        <ConsoleFilterBar
          search=""
          onSearch={() => undefined}
          hideSearch
          activeCount={activeFilterCount}
          onClear={resetFilters}
        >
          <ConsoleLabeledSelect
            label="From warehouse"
            value={filters.fromWh}
            onChange={(v) => setFilter("fromWh", v)}
            options={fromOptions}
            active={filters.fromWh !== "all"}
            className="lg:w-[170px]"
          />
          <ConsoleLabeledSelect
            label="To warehouse"
            value={filters.toWh}
            onChange={(v) => setFilter("toWh", v)}
            options={toOptions}
            active={filters.toWh !== "all"}
            className="lg:w-[170px]"
          />
          <ConsoleLabeledSelect
            label="Commodity"
            value={filters.commodity}
            onChange={(v) => setFilter("commodity", v)}
            options={commodityOptions}
            active={filters.commodity !== "all"}
            className="lg:w-[170px]"
          />
          <ConsoleDateRange
            from={filters.from}
            to={filters.to}
            onFromChange={(v) => setFilter("from", v)}
            onToChange={(v) => setFilter("to", v)}
            fieldClassName="lg:w-[150px]"
          />
        </ConsoleFilterBar>
      )}

      {isLoading ? (
        <ConsoleTableSkeleton columns={6} />
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : transfers.length === 0 ? (
        <RegisterEmpty
          filtered={activeFilterCount > 0}
          noun="transfers"
          description="Stock moved between warehouses is recorded here."
          filteredDescription="Nothing matches this filter."
          actionLabel={isSuperAdmin ? "+ New transfer" : undefined}
          onAction={isSuperAdmin ? () => setDialogOpen(true) : undefined}
          onClear={resetFilters}
        />
      ) : (
        <AdminCard className="overflow-hidden">
          <ConsoleDataTable<ITransfer>
            columns={columns}
            data={transfers}
            itemNoun="transfers"
            isFetching={isFetching}
            rowHref={(t) => `/admin/transfers/${t.id}`}
            rowClassName={() => "h-12 hover:bg-adm-sunken"}
            serverPagination={{
              totalCount,
              page,
              pageSize,
              onPageChange: setPage,
              onPageSizeChange: (size) => setFilter("size", String(size)),
            }}
          />
        </AdminCard>
      )}

      <TransferDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
        commodities={commodities.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}

/**
 * Posts a transfer (super-admin). Same-warehouse routes are caught by the
 * schema before the request; backend refusals (INSUFFICIENT_STOCK,
 * TRANSFER_SAME_WAREHOUSE, INACTIVE_WAREHOUSE) surface inline in the dialog
 * so the operator can fix and retry without losing the form.
 */
function TransferDialog({
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
  const [createTransfer, { isLoading }] = useCreateTransferMutation();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      fromWarehouseId: "",
      toWarehouseId: "",
      commodityId: "",
      weightKg: "",
      occurredAt: "",
      notes: "",
    },
  });

  const close = () => {
    reset();
    setServerError(null);
    onClose();
  };

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await createTransfer({
        fromWarehouseId: values.fromWarehouseId,
        toWarehouseId: values.toWarehouseId,
        commodityId: values.commodityId,
        weightKg: Number(values.weightKg),
        ...(values.occurredAt ? { occurredAt: values.occurredAt } : {}),
        ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
      }).unwrap();
      notify.success("Transfer posted");
      close();
    } catch (err) {
      // INSUFFICIENT_STOCK / TRANSFER_SAME_WAREHOUSE / INACTIVE_WAREHOUSE all
      // carry a human message - keep it inline so the form stays editable.
      setServerError(extractApiError(err).message);
    }
  });

  return (
    <ResponsiveDialog open={open} onOpenChange={(o) => !o && close()}>
      <ResponsiveDialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-[440px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>New warehouse transfer</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Posts immediately: an out at the source, an in at the destination.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form
          onSubmit={(e) => void onSubmit(e)}
          className="@container grid gap-5"
        >
          <section className="grid gap-3.5">
            <SectionHeading className="mb-0">Where it moves</SectionHeading>
            <AdminField
              label="From warehouse"
              error={errors.fromWarehouseId?.message}
            >
              <Controller
                control={control}
                name="fromWarehouseId"
                render={({ field }) => (
                  <SimpleSelect
                    className={cn(adminInputClass, "cursor-pointer")}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Choose the source…"
                    options={warehouses.map((w) => ({
                      value: w.id,
                      label: w.name,
                    }))}
                  />
                )}
              />
            </AdminField>
            <AdminField
              label="To warehouse"
              error={errors.toWarehouseId?.message}
            >
              <Controller
                control={control}
                name="toWarehouseId"
                render={({ field }) => (
                  <SimpleSelect
                    className={cn(adminInputClass, "cursor-pointer")}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Choose the destination…"
                    options={warehouses.map((w) => ({
                      value: w.id,
                      label: w.name,
                    }))}
                  />
                )}
              />
            </AdminField>
          </section>

          <section className="grid gap-3.5 pt-3 sm:pt-6">
            <SectionHeading className="mb-0">What, and how much</SectionHeading>
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
            <div className="grid grid-cols-1 gap-3.5 @[300px]:grid-cols-2">
              <AdminField label="Weight (kg)" error={errors.weightKg?.message}>
                <Input
                  inputMode="decimal"
                  placeholder="e.g. 1200"
                  className={adminInputClass}
                  {...register("weightKg")}
                />
              </AdminField>
              <AdminField
                label="Moved on"
                optional
                hint="The day the stock physically left, if that was not today."
                error={errors.occurredAt?.message}
              >
                <Input
                  type="date"
                  className={adminInputClass}
                  {...register("occurredAt")}
                />
              </AdminField>
            </div>
          </section>

          <section className="grid gap-3.5 pt-3 sm:pt-6">
            <SectionHeading className="mb-0">Anything else</SectionHeading>
            <AdminField label="Notes" optional error={errors.notes?.message}>
              <Input
                placeholder="e.g. Consolidating for loading"
                className={adminInputClass}
                {...register("notes")}
              />
            </AdminField>
          </section>

          {serverError ? (
            <p
              role="alert"
              className="min-w-0 rounded-none border border-console-red/40 bg-console-red/5 px-3 py-2 text-[12.5px] font-medium text-console-red [overflow-wrap:anywhere]"
            >
              {serverError}
            </p>
          ) : null}

          <ResponsiveDialogFooter className="gap-2">
            <AdminButton variant="outline" size="lg" onClick={close}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" size="lg" disabled={isLoading}>
              {isLoading ? "Posting…" : "Post transfer"}
            </AdminButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
