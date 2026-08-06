"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ConsoleDataTable } from "@/components/admin/data-table";
import {
  ConsoleDateRange,
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import { Absent, columnMeta } from "@/components/admin/registry/registry-bits";
import { TextCell } from "@/components/admin/table-cells";
import { DateOnlyCell, DateTimeCell } from "@/components/admin/date-cell";
import {
  AdminCard,
  AdminField,
  adminInputClass,
  Mono,
} from "@/components/admin/ui";
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
      className="block max-w-[90%] truncate text-[13px] text-adm-ink md:min-w-[11rem]"
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
        header: "Transfer #",
        accessorFn: (t) => t.transactionNo,
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <Mono className="whitespace-nowrap text-[12.5px] text-adm-ink">
            {row.original.transactionNo}
          </Mono>
        ),
      },
      {
        id: "route",
        header: "Route",
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
            className="text-[12.5px] font-semibold text-adm-ink"
          />
        ),
      },
      {
        id: "moved",
        header: "Moved",
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
      <div className="mb-4">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-adm-ink">
          Transfers
        </h1>
        <p className="mt-0.5 text-[13px] text-adm-muted">
          Stock moved between warehouses - each posts an out and an in on the
          ledger
        </p>
      </div>

      {pristine ? null : (
        <ConsoleFilterBar
          search=""
          onSearch={() => undefined}
          hideSearch
          activeCount={activeFilterCount}
          onClear={resetFilters}
          action={
            isSuperAdmin ? (
              <Button
                variant="default"
                className="h-[34px] rounded-[6px] bg-console px-3.5 text-[13px] font-semibold text-white shadow-none hover:translate-x-0 hover:translate-y-0 hover:bg-console-hover hover:shadow-none"
                onClick={() => setDialogOpen(true)}
              >
                + New transfer
              </Button>
            ) : undefined
          }
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
        <AdminCard className="overflow-hidden">
          <EmptyState
            variant="plain"
            title={
              activeFilterCount > 0
                ? "No matching transfers"
                : "No transfers yet"
            }
            description={
              activeFilterCount > 0
                ? "Nothing matches this filter."
                : "Stock moved between warehouses is recorded here."
            }
            actionLabel={
              activeFilterCount === 0 && isSuperAdmin
                ? "+ New transfer"
                : undefined
            }
            onAction={
              activeFilterCount === 0 && isSuperAdmin
                ? () => setDialogOpen(true)
                : undefined
            }
          />
        </AdminCard>
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
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>New warehouse transfer</DialogTitle>
          <DialogDescription>
            Posts immediately: an out at the source, an in at the destination.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => void onSubmit(e)}
          className="@container grid gap-3.5"
        >
          <AdminField
            label="From warehouse"
            error={errors.fromWarehouseId?.message}
          >
            <select
              className={cn(adminInputClass, "cursor-pointer")}
              {...register("fromWarehouseId")}
            >
              <option value="">Choose the source…</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField
            label="To warehouse"
            error={errors.toWarehouseId?.message}
          >
            <select
              className={cn(adminInputClass, "cursor-pointer")}
              {...register("toWarehouseId")}
            >
              <option value="">Choose the destination…</option>
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
          <div className="grid grid-cols-1 gap-3.5 @[300px]:grid-cols-2">
            <AdminField label="Weight (kg)" error={errors.weightKg?.message}>
              <Input
                inputMode="decimal"
                placeholder="0.00"
                className={adminInputClass}
                {...register("weightKg")}
              />
            </AdminField>
            <AdminField
              label="Moved on"
              optional
              error={errors.occurredAt?.message}
            >
              <Input
                type="date"
                className={adminInputClass}
                {...register("occurredAt")}
              />
            </AdminField>
          </div>
          <AdminField label="Notes" optional error={errors.notes?.message}>
            <Input
              placeholder="e.g. consolidating for loading"
              className={adminInputClass}
              {...register("notes")}
            />
          </AdminField>

          {serverError ? (
            <p
              role="alert"
              className="rounded-[6px] border border-console-red/40 bg-console-red/5 px-3 py-2 text-[12.5px] font-medium text-console-red"
            >
              {serverError}
            </p>
          ) : null}

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
              {isLoading ? "Posting…" : "Post transfer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
