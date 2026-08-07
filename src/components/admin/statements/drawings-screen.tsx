"use client";

// The proprietor's drawings ledger: personal withdrawals, numbered like every
// other money record, feeding the capital account on the statements - never
// the P&L, which is the whole reason this is not an expense category.
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsoleDataTable } from "@/components/admin/data-table";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  adminInputClass,
  Mono,
} from "@/components/admin/ui";
import { columnMeta } from "@/components/admin/registry/registry-bits";
import { DateOnlyCell } from "@/components/admin/date-cell";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/input";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { useConfirm } from "@/hooks/use-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedis } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useCreateDrawingMutation,
  useDeleteDrawingMutation,
  useGetDrawingsQuery,
} from "@/redux/statements/statements-api";
import type { IDrawing } from "@/types/statement.types";
import {
  drawingSchema,
  type DrawingValues,
} from "@/validations/statement-schema";

function AddDrawingDialog({ onClose }: { onClose: () => void }) {
  const [create, createState] = useCreateDrawingMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DrawingValues>({
    resolver: zodResolver(drawingSchema),
    defaultValues: { amountGhs: "", notes: "", occurredAt: "" },
  });

  const onSubmit = async (values: DrawingValues) => {
    try {
      await create({
        amountGhs: Number(values.amountGhs),
        occurredAt: values.occurredAt,
        ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
      }).unwrap();
      notify.success("Drawing recorded");
      onClose();
    } catch (err) {
      notify.error("Couldn't record the drawing", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <ResponsiveDialog open onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="sm:max-w-[420px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Record a drawing</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Money the proprietor took for personal use. It reduces the capital
            account on the statements - it is not a business expense.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-[13px]"
        >
          <div className="grid gap-[13px] sm:grid-cols-2">
            <AdminField label="Amount (GHS)" error={errors.amountGhs?.message}>
              <Input
                autoFocus
                inputMode="decimal"
                className={cn(adminInputClass, errors.amountGhs && "border-console-red")}
                {...register("amountGhs")}
              />
            </AdminField>
            <AdminField label="Date" error={errors.occurredAt?.message}>
              <Input
                type="date"
                className={cn(adminInputClass, errors.occurredAt && "border-console-red")}
                {...register("occurredAt")}
              />
            </AdminField>
          </div>
          <AdminField label="Note" optional error={errors.notes?.message}>
            <Input
              placeholder="e.g. School fees"
              className={adminInputClass}
              {...register("notes")}
            />
          </AdminField>
          <ResponsiveDialogFooter className="gap-2">
            <AdminButton type="button" variant="outline" size="lg" onClick={onClose}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" size="lg" disabled={createState.isLoading}>
              {createState.isLoading ? "Saving…" : "Record drawing"}
            </AdminButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

export function DrawingsScreen() {
  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetDrawingsQuery();
  const [removeDrawing] = useDeleteDrawingMutation();
  const [adding, setAdding] = useState(false);
  const { confirm, confirmationDialog } = useConfirm();

  const drawings = data?.data.drawings ?? [];
  const totalGhs = drawings.reduce((sum, d) => sum + d.amountGhs, 0);

  const onRemove = async (drawing: IDrawing) => {
    const ok = await confirm({
      title: "Remove this drawing?",
      description: `${drawing.transactionNo} (${formatCedis(drawing.amountGhs)}) comes off the ledger and the capital account.`,
      confirmText: "Remove",
      isDestructive: true,
    });
    if (!ok) return;
    try {
      await removeDrawing(drawing.id).unwrap();
      notify.success("Drawing removed");
    } catch (err) {
      notify.error("Couldn't remove the drawing", {
        description: extractApiError(err).message,
      });
    }
  };

  const columns = useMemo<ColumnDef<IDrawing, unknown>[]>(
    () => [
      {
        id: "no",
        accessorFn: (d) => d.transactionNo,
        header: "No.",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <Mono className="tabular-nums">{row.original.transactionNo}</Mono>
        ),
      },
      {
        id: "note",
        accessorFn: (d) => d.notes ?? "",
        header: "Note",
        enableSorting: false,
        meta: columnMeta({ stretch: true }),
        cell: ({ row }) =>
          row.original.notes ? (
            <span className="block max-w-[90%] [overflow-wrap:anywhere] @2xl/table:truncate" title={row.original.notes}>
              {row.original.notes}
            </span>
          ) : (
            <span className="text-adm-faint">-</span>
          ),
      },
      {
        id: "date",
        accessorFn: (d) => d.occurredAt,
        header: "Date",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => <DateOnlyCell value={row.original.occurredAt} />,
      },
      {
        id: "amount",
        accessorFn: (d) => d.amountGhs,
        header: "Amount",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <Mono className="font-semibold tabular-nums">
            {formatCedis(row.original.amountGhs)}
          </Mono>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <span className="flex justify-end">
            <button
              type="button"
              onClick={() => void onRemove(row.original)}
              className="cursor-pointer text-[12.5px] font-semibold text-console-red underline-offset-2 hover:underline"
            >
              Remove
            </button>
          </span>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable handlers
    [],
  );

  return (
    <div>
      <AdminPageHeader
        title="Drawings"
        hint="The proprietor's personal withdrawals. They reduce the capital account on the statements and never touch the P&L."
        sub={`The proprietor's withdrawals ledger${drawings.length > 0 ? ` · ${formatCedis(totalGhs)} drawn to date` : ""}`}
        actions={
          <AdminButton onClick={() => { setAdding(true); }}>+ Record drawing</AdminButton>
        }
      />

      {isLoading ? (
        <ConsoleTableSkeleton columns={4} />
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : drawings.length === 0 ? (
        <AdminCard className="overflow-hidden">
          <EmptyState
            variant="plain"
            title="No drawings recorded"
            description="When the proprietor takes money for personal use, record it here so the capital account stays honest."
            actionLabel="Record the first drawing"
            onAction={() => { setAdding(true); }}
          />
        </AdminCard>
      ) : (
        <AdminCard className="overflow-hidden">
          <ConsoleDataTable<IDrawing>
            columns={columns}
            data={drawings}
            itemNoun="drawings"
            isFetching={isFetching}
            rowClassName={() => "h-12 hover:bg-adm-sunken"}
          />
        </AdminCard>
      )}

      {adding ? <AddDrawingDialog onClose={() => { setAdding(false); }} /> : null}
      {confirmationDialog}
    </div>
  );
}
