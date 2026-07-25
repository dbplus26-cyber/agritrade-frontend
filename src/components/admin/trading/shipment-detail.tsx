"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  DetailRow,
  Mono,
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/ui";
import { BackButton } from "@/components/ui/BackButton";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/hooks/use-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { formatKg } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { useGetExpenseCategoriesQuery } from "@/redux/expense-categories/expense-categories-api";
import {
  useAddShipmentExpenseMutation,
  useArriveShipmentMutation,
  useCancelShipmentMutation,
  useCloseShipmentMutation,
  useDeleteShipmentExpenseMutation,
  useDispatchShipmentMutation,
  useGetAvailableLotsQuery,
  useGetShipmentQuery,
  useSetAllocationsMutation,
} from "@/redux/shipments/shipments-api";
import type { IShipment } from "@/types/admin-shipment.types";
import {
  cancelShipmentSchema,
  shipmentExpenseSchema,
  type CancelShipmentValues,
  type ShipmentExpenseValues,
} from "@/validations/shipment-schema";
import { Money } from "./sale-bits";
import {
  CostBasisBadge,
  ShipmentStatusBadge,
  formatShipmentDate,
} from "./shipment-bits";

const LIST = "/admin/shipments";

/** Pick lots to load. Available lots come from the shipment's origin warehouse. */
function AllocateDialog({
  shipment,
  onClose,
}: {
  shipment: IShipment;
  onClose: () => void;
}) {
  const { data, isLoading } = useGetAvailableLotsQuery(shipment.id);
  const [save, { isLoading: saving }] = useSetAllocationsMutation();
  const [weights, setWeights] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      shipment.allocations.map((a) => [a.lotId, String(a.weightKg)]),
    ),
  );
  const lots = data?.data.lots ?? [];

  const submit = async () => {
    const allocations = lots
      .map((l) => ({ lotId: l.id, weightKg: Number(weights[l.id] ?? 0) }))
      .filter((a) => a.weightKg > 0);
    try {
      await save({ allocations, id: shipment.id }).unwrap();
      notify.success("Allocations saved");
      onClose();
    } catch (err) {
      notify.error("Couldn't save allocations", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Allocate lots</DialogTitle>
          <DialogDescription>
            Choose how much to load from each lot. Leave a lot at zero to skip
            it. Stock only leaves the warehouse when you dispatch.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <DataTableSkeleton />
        ) : lots.length === 0 ? (
          <p className="py-3 text-[13px] text-soil">
            No stock available in this warehouse for the sale&apos;s commodities.
          </p>
        ) : (
          <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
            {lots.map((l) => (
              <div
                key={l.id}
                className="grid grid-cols-[1fr_120px] items-center gap-2 border-b border-soil/10 pb-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-medium text-ink">
                    {l.commodity.name}
                  </div>
                  <div className="text-[12px] text-soil">
                    {formatKg(l.remainingKg)} available ·{" "}
                    <Money value={l.unitCostGhs} />
                    /kg
                  </div>
                </div>
                <Input
                  inputMode="decimal"
                  placeholder="kg"
                  className={adminInputClass}
                  value={weights[l.id] ?? ""}
                  onChange={(e) =>
                    setWeights((w) => ({ ...w, [l.id]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
        )}
        <DialogFooter className="gap-2">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExpenseDialog({
  shipment,
  onClose,
}: {
  shipment: IShipment;
  onClose: () => void;
}) {
  const categories = useGetExpenseCategoriesQuery({
    isActive: true,
    limit: 100,
  });
  const [add, { isLoading }] = useAddShipmentExpenseMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ShipmentExpenseValues>({
    resolver: zodResolver(shipmentExpenseSchema),
    defaultValues: { amountGhs: "", categoryId: "", description: "" },
  });

  const onSubmit = async (values: ShipmentExpenseValues) => {
    try {
      await add({
        body: {
          amountGhs: Number(values.amountGhs),
          categoryId: values.categoryId,
          ...(values.description?.trim()
            ? { description: values.description.trim() }
            : {}),
        },
        id: shipment.id,
      }).unwrap();
      notify.success("Expense added");
      onClose();
    } catch (err) {
      notify.error("Couldn't add the expense", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Add a shipment expense</DialogTitle>
          <DialogDescription>
            Transport, loading and the like - it feeds this shipment&apos;s
            profit.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-3"
        >
          <AdminField label="Category" error={errors.categoryId?.message}>
            <select
              className={cn(adminSelectClass, "w-full")}
              {...register("categoryId")}
            >
              <option value="">Choose a category</option>
              {(categories.data?.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Amount (GHS)" error={errors.amountGhs?.message}>
            <Input
              inputMode="decimal"
              className={cn(adminInputClass, errors.amountGhs && "border-error")}
              {...register("amountGhs")}
            />
          </AdminField>
          <AdminField label="Description" optional>
            <Input className={adminInputClass} {...register("description")} />
          </AdminField>
          <DialogFooter className="gap-2">
            <AdminButton
              type="button"
              variant="outline"
              className="h-9 px-3.5"
              onClick={onClose}
            >
              Cancel
            </AdminButton>
            <AdminButton type="submit" disabled={isLoading} className="h-9 px-4">
              {isLoading ? "Adding…" : "Add expense"}
            </AdminButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CancelDialog({
  shipment,
  onClose,
}: {
  shipment: IShipment;
  onClose: () => void;
}) {
  const [cancel, { isLoading }] = useCancelShipmentMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CancelShipmentValues>({
    resolver: zodResolver(cancelShipmentSchema),
    defaultValues: { reason: "" },
  });
  const onSubmit = async (values: CancelShipmentValues) => {
    try {
      await cancel({ id: shipment.id, reason: values.reason }).unwrap();
      notify.success("Shipment cancelled");
      onClose();
    } catch (err) {
      notify.error("Couldn't cancel the shipment", {
        description: extractApiError(err).message,
      });
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Cancel this shipment?</DialogTitle>
          <DialogDescription>
            Only possible before dispatch, while no stock has moved.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-3"
        >
          <AdminField label="Reason" error={errors.reason?.message}>
            <Input
              className={cn(adminInputClass, errors.reason && "border-error")}
              {...register("reason")}
            />
          </AdminField>
          <DialogFooter className="gap-2">
            <AdminButton
              type="button"
              variant="outline"
              className="h-9 px-3.5"
              onClick={onClose}
            >
              Keep it
            </AdminButton>
            <AdminButton
              type="submit"
              variant="danger"
              disabled={isLoading}
              className="h-9 px-4"
            >
              {isLoading ? "Cancelling…" : "Cancel shipment"}
            </AdminButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ShipmentDetail({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetShipmentQuery(id);
  const [dispatchShipment, dispatchState] = useDispatchShipmentMutation();
  const [arrive, arriveState] = useArriveShipmentMutation();
  const [close, closeState] = useCloseShipmentMutation();
  const [deleteExpense] = useDeleteShipmentExpenseMutation();
  const { confirm, confirmationDialog } = useConfirm();
  const [allocOpen, setAllocOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (isLoading) return <DataTableSkeleton />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const s = data.data.shipment;
  const beforeDispatch = s.status === "PLANNED" || s.status === "LOADING";

  const onDispatch = async () => {
    const ok = await confirm({
      title: "Dispatch this shipment?",
      description:
        "Stock leaves the warehouse now. If loading is below the payment milestone, the owner must approve it first.",
      confirmText: "Dispatch",
    });
    if (!ok) return;
    try {
      await dispatchShipment(s.id).unwrap();
      notify.success("Shipment dispatched - stock has left the warehouse");
    } catch (err) {
      // The milestone gate returns a clear message here.
      notify.error("Couldn't dispatch", {
        description: extractApiError(err).message,
      });
    }
  };

  const onArrive = async () => {
    try {
      await arrive(s.id).unwrap();
      notify.success("Marked arrived");
    } catch (err) {
      notify.error("Couldn't update", {
        description: extractApiError(err).message,
      });
    }
  };

  const onClose = async () => {
    try {
      await close(s.id).unwrap();
      notify.success("Shipment closed");
    } catch (err) {
      notify.error("Couldn't close", {
        description: extractApiError(err).message,
      });
    }
  };

  const onRemoveExpense = async (expenseId: string) => {
    try {
      await deleteExpense({ expenseId, id: s.id }).unwrap();
      notify.success("Expense removed");
    } catch (err) {
      notify.error("Couldn't remove the expense", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <div className="max-w-[760px]">
      <BackButton href={LIST} label="All shipments" className="mb-2" />
      <AdminPageHeader
        title={`${s.truckReg} · ${s.destination}`}
        sub={`For ${s.sale.buyer.name} · from ${s.originWarehouse.name}`}
        actions={
          <span className="flex flex-wrap items-center gap-1.5">
            <ShipmentStatusBadge status={s.status} />
            <CostBasisBadge basis={s.costBasis} />
          </span>
        }
      />

      {/* Actions */}
      <div className="mb-4 flex flex-wrap gap-2">
        {beforeDispatch ? (
          <>
            <AdminButton className="h-9 px-4" onClick={() => setAllocOpen(true)}>
              Allocate lots
            </AdminButton>
            <AdminButton
              className="h-9 px-4"
              disabled={dispatchState.isLoading}
              onClick={() => void onDispatch()}
            >
              {dispatchState.isLoading ? "Dispatching…" : "Dispatch"}
            </AdminButton>
            <AdminButton
              variant="outline"
              className="h-9 px-4"
              onClick={() => setCancelOpen(true)}
            >
              Cancel
            </AdminButton>
          </>
        ) : null}
        {s.status === "DISPATCHED" ? (
          <AdminButton
            className="h-9 px-4"
            disabled={arriveState.isLoading}
            onClick={() => void onArrive()}
          >
            {arriveState.isLoading ? "Updating…" : "Mark arrived"}
          </AdminButton>
        ) : null}
        {s.status === "ARRIVED" ? (
          <AdminButton
            className="h-9 px-4"
            disabled={closeState.isLoading}
            onClick={() => void onClose()}
          >
            {closeState.isLoading ? "Closing…" : "Close shipment"}
          </AdminButton>
        ) : null}
        {s.totalWeightKg > 0 ? (
          <AdminButton variant="outline" className="h-9 px-4" asChild>
            <Link href={`${LIST}/${s.id}/waybill`}>Waybill</Link>
          </AdminButton>
        ) : null}
      </div>

      {s.status === "CANCELLED" && s.cancelReason ? (
        <AdminCard className="mb-4 border-error/40 bg-error/[0.04] px-4 py-3 text-[13px] text-ink">
          Cancelled: {s.cancelReason}
        </AdminCard>
      ) : null}

      {/* Logistics + profit */}
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <AdminCard className="px-5 py-3">
          <DetailRow label="Truck">{s.truckReg}</DetailRow>
          <div className="border-t border-soil/12">
            <DetailRow label="Driver">
              {s.driverName}
              {s.driverPhone ? ` · ${s.driverPhone}` : ""}
            </DetailRow>
          </div>
          <div className="border-t border-soil/12">
            <DetailRow label="Route">
              {s.originWarehouse.name} → {s.destination}
            </DetailRow>
          </div>
          <div className="border-t border-soil/12">
            <DetailRow label="Total weight">{formatKg(s.totalWeightKg)}</DetailRow>
          </div>
          {s.departedAt ? (
            <div className="border-t border-soil/12">
              <DetailRow label="Departed">{formatShipmentDate(s.departedAt)}</DetailRow>
            </div>
          ) : null}
          {s.arrivedAt ? (
            <div className="border-t border-soil/12">
              <DetailRow label="Arrived">{formatShipmentDate(s.arrivedAt)}</DetailRow>
            </div>
          ) : null}
        </AdminCard>

        <AdminCard className="px-5 py-3">
          <div className="mb-1 flex items-center gap-2 text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
            Profit <CostBasisBadge basis={s.profit.costBasis} />
          </div>
          <DetailRow label="Revenue">
            <Money value={s.profit.revenueGhs} />
          </DetailRow>
          <div className="border-t border-soil/12">
            <DetailRow label="Lot cost">
              <Money value={s.profit.costGhs} />
            </DetailRow>
          </div>
          <div className="border-t border-soil/12">
            <DetailRow label="Expenses">
              <Money value={s.profit.expensesGhs} />
            </DetailRow>
          </div>
          <div className="border-t border-soil/12">
            <DetailRow label="Profit">
              <Mono className="font-bold text-ink">
                <Money value={s.profit.profitGhs} />
              </Mono>
            </DetailRow>
          </div>
        </AdminCard>
      </div>

      {/* Allocations */}
      <AdminCard className="mb-4 px-5 py-3">
        <div className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
          Loaded lots
        </div>
        {s.allocations.length === 0 ? (
          <p className="py-2 text-[13px] text-soil">
            No lots allocated yet. Dispatching without allocations auto-fills
            from the oldest stock (flagged estimated).
          </p>
        ) : (
          s.allocations.map((a) => (
            <div
              key={a.id}
              className="flex items-baseline justify-between gap-3 border-b border-soil/10 py-2 last:border-b-0"
            >
              <div className="min-w-0">
                <span className="font-medium text-ink">{a.commodity.name}</span>
                <Mono className="ml-2 text-[12px] text-soil">
                  {formatKg(a.weightKg)} @{" "}
                  <Money value={a.unitCostSnapshotGhs} />
                </Mono>
              </div>
              <Mono className="whitespace-nowrap text-[13px] text-ink">
                <Money value={a.lineCostGhs} />
              </Mono>
            </div>
          ))
        )}
      </AdminCard>

      {/* Expenses */}
      <AdminCard className="px-5 py-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
            Expenses
          </span>
          <AdminButton
            variant="outline"
            className="h-7 px-2.5 text-[12px]"
            onClick={() => setExpenseOpen(true)}
          >
            + Add
          </AdminButton>
        </div>
        {s.expenses.length === 0 ? (
          <p className="py-2 text-[13px] text-soil">No expenses recorded.</p>
        ) : (
          s.expenses.map((e) => (
            <div
              key={e.id}
              className="flex items-baseline justify-between gap-3 border-b border-soil/10 py-2 last:border-b-0"
            >
              <div className="min-w-0">
                <span className="text-ink">{e.category.name}</span>
                {e.description ? (
                  <span className="ml-2 text-[12px] text-soil">
                    {e.description}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <Mono className="whitespace-nowrap text-[13px] text-ink">
                  <Money value={e.amountGhs} />
                </Mono>
                <button
                  type="button"
                  onClick={() => void onRemoveExpense(e.id)}
                  className="text-[12px] text-console-red"
                  aria-label="Remove expense"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </AdminCard>

      {allocOpen ? (
        <AllocateDialog shipment={s} onClose={() => setAllocOpen(false)} />
      ) : null}
      {expenseOpen ? (
        <ExpenseDialog shipment={s} onClose={() => setExpenseOpen(false)} />
      ) : null}
      {cancelOpen ? (
        <CancelDialog shipment={s} onClose={() => setCancelOpen(false)} />
      ) : null}
      {confirmationDialog}
    </div>
  );
}
