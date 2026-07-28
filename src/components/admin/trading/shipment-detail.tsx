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
  DetailGrid,
  DetailItem,
  DetailShell,
  Mono,
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/ui";
import { BackButton } from "@/components/ui/BackButton";
import { DateOnlyCell, DateTimeCell } from "@/components/admin/date-cell";
import { DetailSkeleton } from "@/components/admin/skeletons";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { FilePicker } from "@/components/ui/FilePicker";
import { SignaturePad } from "@/components/ui/SignaturePad";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/hooks/use-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { formatKg } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { useGetExpenseCategoriesQuery } from "@/redux/expense-categories/expense-categories-api";
import {
  shipmentDocumentUrl,
  shipmentWaybillPdfUrl,
  useAddShipmentDocumentMutation,
  useAddShipmentExpenseMutation,
  useAddShipmentSalesMutation,
  useArriveShipmentMutation,
  useCancelShipmentMutation,
  useCloseShipmentMutation,
  useDeleteShipmentExpenseMutation,
  useDispatchShipmentMutation,
  useGetEligibleSalesQuery,
  useGetShipmentQuery,
  useRemoveShipmentDocumentMutation,
  useRemoveShipmentSaleMutation,
} from "@/redux/shipments/shipments-api";
import type { IShipment } from "@/types/admin-shipment.types";
import {
  cancelShipmentSchema,
  shipmentExpenseSchema,
  type CancelShipmentValues,
  type ShipmentExpenseValues,
} from "@/validations/shipment-schema";
import { LoadMeter } from "./load-meter";
import { Money, SaleStatusBadge } from "./sale-bits";
import { CostBasisBadge, ShipmentStatusBadge } from "./shipment-bits";

const LIST = "/admin/shipments";

/** Spare room below this share of capacity is a rounding gap, not a half-empty
 * truck worth nagging about. */
const UNDER_FILL_SHARE = 0.05;

const Absent = () => <span className="text-soil/50">Not provided</span>;

/**
 * What this truck is due to carry, straight from the server. `totalWeightKg`
 * counts allocated lots only, so a planned-but-unallocated truck would read as
 * empty against its capacity. Reconstructing it from `lines[]` is the trap:
 * `agreedKg` is a sale's weight across ALL trucks, so the moment one sale
 * spreads over two trips (design doc 5.4 allows it; only today's
 * full-coverage dispatch rule holds it back) the meter would show a truck over
 * capacity on a load the backend accepts - the UI contradicting the very rule
 * it exists to explain. `plannedWeightKg` IS the figure OVER_CAPACITY is
 * judged on, so meter and refusal cannot drift apart.
 */
const plannedWeightOf = (shipment: IShipment): number =>
  shipment.plannedWeightKg ?? 0;

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

/**
 * Add more confirmed sales to a truck that has not dispatched. The owner's
 * case: a sale is planned, the truck is half empty, and sending it that way
 * burns the trip's margin. The list is the SAME eligible pool the planner
 * uses (confirmed, payment terms met, unshipped, not on another truck), and
 * each row shows what the sale still needs so it can be fitted to the room
 * left.
 */
function AddSalesDialog({
  shipment,
  onClose,
}: {
  shipment: IShipment;
  onClose: () => void;
}) {
  const eligible = useGetEligibleSalesQuery();
  const [addSales, { isLoading }] = useAddShipmentSalesMutation();
  const [picked, setPicked] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  const sales = eligible.data?.data.sales ?? [];
  const plannedKg = plannedWeightOf(shipment);
  const pickedKg = sales
    .filter((s) => picked.includes(s.id))
    .reduce((sum, s) => sum + s.totalRemainingKg, 0);

  const toggle = (id: string) => {
    setServerError(null);
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const onSubmit = async () => {
    try {
      await addSales({ id: shipment.id, saleIds: picked }).unwrap();
      notify.success(
        picked.length === 1 ? "Sale added to the truck" : "Sales added to the truck",
      );
      onClose();
    } catch (err) {
      // OVER_CAPACITY and the eligibility refusals name the exact sale - keep
      // them in view so the pick can be corrected without reopening.
      setServerError(extractApiError(err).message);
    }
  };

  return (
    <ResponsiveDialog open onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="sm:max-w-[520px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Add sales to this truck</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Only sales that are confirmed, have met their payment terms and are
            not already on a truck can be added.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <LoadMeter
          loadedKg={plannedKg + pickedKg}
          capacityKg={shipment.truckCapacityKg}
          loadedLabel="Planned"
        />

        {eligible.isLoading ? (
          <p className="py-3 text-[13px] text-soil">Loading shippable sales…</p>
        ) : eligible.isError ? (
          <p className="py-3 text-[13px] text-error">
            Couldn&apos;t load the shippable sales. Reload and try again.
          </p>
        ) : sales.length === 0 ? (
          <p className="py-3 text-[13px] text-soil">
            No other sale is ready to ship right now.
          </p>
        ) : (
          <div className="max-h-[46dvh] overflow-y-auto rounded-[2px] border-[1.5px] border-soil/25">
            {sales.map((s) => (
              <label
                key={s.id}
                className="flex cursor-pointer items-start gap-2.5 border-b border-soil/10 px-3 py-2 last:border-b-0 hover:bg-soil/5"
              >
                <input
                  type="checkbox"
                  checked={picked.includes(s.id)}
                  onChange={() => toggle(s.id)}
                  className="mt-1 h-4 w-4 flex-none accent-[#155744]"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <Mono className="block text-[12.5px] text-console">
                      {s.transactionNo}
                    </Mono>
                    <Mono className="flex-none text-[12.5px] font-bold text-ink">
                      {formatKg(s.totalRemainingKg)}
                    </Mono>
                  </span>
                  <span className="block min-w-0 text-[13px] text-ink [overflow-wrap:anywhere]">
                    {s.buyer.name}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-soil">
                    {s.lines.map((l) => (
                      <span
                        key={l.commodityId}
                        className="mr-2 inline-block whitespace-nowrap"
                      >
                        {l.commodityName} <Mono>{formatKg(l.remainingKg)}</Mono>
                      </span>
                    ))}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}

        {serverError ? (
          <p
            role="alert"
            className="rounded-[2px] border-[1.5px] border-error/50 bg-error/[0.06] px-3 py-2 text-[12.5px] font-medium text-error"
          >
            {serverError}
          </p>
        ) : null}

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
            disabled={isLoading || picked.length === 0}
            className="h-9 px-4"
            onClick={() => void onSubmit()}
          >
            {isLoading
              ? "Adding…"
              : picked.length > 1
                ? `Add ${String(picked.length)} sales`
                : "Add sale"}
          </AdminButton>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
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
  const [addDocument, addDocState] = useAddShipmentDocumentMutation();
  const [removeDocument] = useRemoveShipmentDocumentMutation();
  const [removeSale] = useRemoveShipmentSaleMutation();
  const { confirm, confirmationDialog } = useConfirm();
  const [addSalesOpen, setAddSalesOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [docName, setDocName] = useState("Signed waybill");
  const [signing, setSigning] = useState(false);

  if (isLoading) return <DetailSkeleton facts={8} cards={3} />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const s = data.data.shipment;
  const beforeDispatch = s.status === "PLANNED" || s.status === "LOADING";
  const saleSummary =
    s.sales.length === 1
      ? (s.sales[0]?.buyer.name ?? "")
      : `${String(s.salesCount)} sales`;
  const anyDriverExtra = Boolean(
    s.driverEmail ?? s.driverCity ?? s.driverLicenseNo ?? s.driverIdNumber,
  );
  // The half-empty-truck warning the owner asked for: a stated capacity the
  // planned sales don't come close to filling means another order should ride
  // along. It warns, never blocks - the admin may know the truck is going
  // regardless.
  const plannedKg = plannedWeightOf(s);
  const roomLeftKg =
    s.truckCapacityKg !== null ? s.truckCapacityKg - plannedKg : 0;
  const underFilled =
    beforeDispatch &&
    s.truckCapacityKg !== null &&
    // Never nag off a missing figure: without plannedWeightKg the room left
    // computes as the whole truck and every shipment would look half empty.
    s.plannedWeightKg !== null &&
    roomLeftKg > s.truckCapacityKg * UNDER_FILL_SHARE;

  const onDispatch = async () => {
    const ok = await confirm({
      title: "Dispatch this shipment?",
      description:
        "Stock leaves the warehouse now. If loading is below a payment milestone, the owner must approve it first.",
      confirmText: "Dispatch",
    });
    if (!ok) return;
    try {
      await dispatchShipment({ id: s.id }).unwrap();
      notify.success("Shipment dispatched - stock has left the warehouse");
    } catch (err) {
      const apiError = extractApiError(err);
      if (apiError.code !== "WAYBILL_REQUIRED") {
        // The milestone gate returns a clear message here.
        notify.error("Couldn't dispatch", { description: apiError.message });
        return;
      }
      // The signed-waybill gate: offer an explicit, logged override.
      const proceed = await confirm({
        title: "No signed waybill on file",
        description:
          "The driver and an admin should sign the waybill and the signed copy be uploaded to this shipment before it leaves. You can dispatch without it, but the trip will have no signed paper trail.",
        confirmText: "Dispatch anyway",
        isDestructive: true,
      });
      if (!proceed) return;
      try {
        await dispatchShipment({
          id: s.id,
          overrideMissingWaybill: true,
        }).unwrap();
        notify.success("Shipment dispatched - stock has left the warehouse");
      } catch (retryErr) {
        notify.error("Couldn't dispatch", {
          description: extractApiError(retryErr).message,
        });
      }
    }
  };

  const onArrive = async () => {
    try {
      await arrive(s.id).unwrap();
      // Arrival is when the buyer signs for the goods - steer the admin
      // straight into filing that evidence.
      setDocName("Signed delivery note");
      notify.success("Marked arrived", {
        description:
          "Upload the buyer-signed delivery note under Documents so the delivery is on the record.",
      });
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

  const onUploadDocument = async (file: File | null) => {
    if (!file) return;
    try {
      await addDocument({
        file,
        id: s.id,
        name: docName.trim() || "Signed waybill",
      }).unwrap();
      notify.success("Document uploaded");
      setDocName("Signed waybill");
    } catch (err) {
      notify.error("Couldn't upload the document", {
        description: extractApiError(err).message,
      });
      throw err; // Keeps the FilePicker preview for a retry.
    }
  };

  const onRemoveSale = async (saleId: string, transactionNo: string) => {
    const ok = await confirm({
      title: `Take ${transactionNo} off this truck?`,
      description:
        "The sale returns to the shippable pool and can be planned onto another truck. Nothing about the sale itself changes.",
      confirmText: "Remove",
      isDestructive: true,
    });
    if (!ok) return;
    try {
      await removeSale({ id: s.id, saleId }).unwrap();
      notify.success(`${transactionNo} removed from this truck`);
    } catch (err) {
      notify.error("Couldn't remove the sale", {
        description: extractApiError(err).message,
      });
    }
  };

  const onRemoveDocument = async (documentId: string, name: string) => {
    const ok = await confirm({
      title: "Remove this document?",
      description: `"${name}" will be deleted from the shipment's file. Removal is only possible before dispatch.`,
      confirmText: "Remove",
      isDestructive: true,
    });
    if (!ok) return;
    try {
      await removeDocument({ documentId, id: s.id }).unwrap();
      notify.success("Document removed");
    } catch (err) {
      notify.error("Couldn't remove the document", {
        description: extractApiError(err).message,
      });
    }
  };

  const actions = (
    <div className="flex flex-wrap gap-2 xl:flex-col">
      {beforeDispatch ? (
        <>
          {/* A page, not a dialog: the lot list is long and a dialog's inner
              scroll inside the scrolling page was unusable on a phone. */}
          <AdminButton className="h-9 px-4" asChild>
            <Link href={`${LIST}/${s.id}/allocate`}>Allocate lots</Link>
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
      {/* The waybill leads the paper trail: print it FIRST, the driver and an
          admin sign it, the signed copy is uploaded, THEN dispatch - so the
          buttons live on every non-cancelled shipment, not just loaded ones. */}
      {s.status !== "CANCELLED" ? (
        <>
          <AdminButton variant="outline" className="h-9 px-4" asChild>
            <Link href={`${LIST}/${s.id}/waybill`}>Waybill</Link>
          </AdminButton>
          <AdminButton variant="outline" className="h-9 px-4" asChild>
            <a
              href={shipmentWaybillPdfUrl(s.id)}
              target="_blank"
              rel="noopener noreferrer"
            >
              PDF
            </a>
          </AdminButton>
        </>
      ) : null}
    </div>
  );

  const main = (
    <div className="flex flex-col gap-4">
      {/* Sales on this trip. Payment terms are settled BEFORE a sale can
          board a truck, so there is nothing to pay here - the sale page owns
          later payments. Each sale is its own bordered sub-card so a
          multi-sale trip reads as distinct orders, not one run-on list. */}
      <AdminCard className="px-5 py-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
            Sales on this trip · {s.salesCount} sale
            {s.salesCount === 1 ? "" : "s"}
          </span>
          {beforeDispatch ? (
            <AdminButton
              variant="outline"
              className="h-7 px-2.5 text-[12px]"
              onClick={() => setAddSalesOpen(true)}
            >
              + Add sales
            </AdminButton>
          ) : null}
        </div>
        {/* How full the truck actually is against the capacity that was
            booked - allocated lots alone would read empty on a truck that is
            planned but not yet loaded. */}
        {beforeDispatch && (s.truckCapacityKg !== null || plannedKg > 0) ? (
          <div className="mb-2.5">
            <LoadMeter
              loadedKg={plannedKg}
              capacityKg={s.truckCapacityKg}
              loadedLabel="Planned"
            />
            {underFilled ? (
              <p className="mt-1.5 text-[12.5px] font-medium text-harvest-deep">
                This truck has {formatKg(roomLeftKg)} of room left. Add another
                sale before it rolls, or send it part-loaded if that is the
                plan.
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="grid gap-2.5 pb-2 md:grid-cols-2">
          {s.sales.map((sale, index) => {
            // Removal only where nothing would be silently thrown away: a sale
            // carrying allocated lots has costing decisions on it, so those get
            // cleared deliberately in Allocate lots first (the backend refuses
            // it either way).
            const hasAllocations = s.allocations.some(
              (a) => a.sale.id === sale.id,
            );
            const removable =
              beforeDispatch && s.sales.length > 1 && !hasAllocations;
            return (
              <div
                key={sale.id}
                className="rounded-[2px] border-[1.5px] border-soil/25 bg-surface-alt/40 px-3.5 py-2.5"
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-adminmono text-[11px] text-soil/70 tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <Link
                    href={`/admin/sales/${sale.id}`}
                    className="font-adminmono text-[13px] font-semibold text-console tabular-nums hover:underline"
                  >
                    {sale.transactionNo}
                  </Link>
                  <span className="ml-auto flex items-center gap-2">
                    <SaleStatusBadge status={sale.status} />
                    {removable ? (
                      <button
                        type="button"
                        onClick={() =>
                          void onRemoveSale(sale.id, sale.transactionNo)
                        }
                        className="text-[12px] text-console-red"
                        aria-label={`Remove ${sale.transactionNo} from this shipment`}
                      >
                        ✕
                      </button>
                    ) : null}
                  </span>
                </div>
                <div className="mt-1 min-w-0 text-[13px] font-semibold text-ink [overflow-wrap:anywhere]">
                  {sale.buyer.name}
                  {sale.buyer.phone ? (
                    <span className="font-normal text-soil">
                      {" "}
                      · {sale.buyer.phone}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1.5 border-t border-soil/15 pt-1.5">
                  <Mono className="text-[12.5px] text-soil">
                    Agreed <Money compact value={sale.agreedTotalGhs} /> · Paid{" "}
                    <Money compact value={sale.paidGhs} /> · Balance{" "}
                    <span
                      className={cn(
                        sale.balanceGhs !== null &&
                          (sale.balanceGhs === 0
                            ? "text-leaf"
                            : "text-console-red"),
                      )}
                    >
                      <Money compact value={sale.balanceGhs} />
                    </span>
                  </Mono>
                </div>
              </div>
            );
          })}
        </div>
      </AdminCard>

      {/* Logistics */}
      <AdminCard className="px-5 py-3">
        <p className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
          Logistics
        </p>
        <DetailGrid>
          <DetailItem label="Waybill no" mono>
            {s.transactionNo}
          </DetailItem>
          <DetailItem label="Truck">{s.truckReg}</DetailItem>
          {s.truckCapacityKg !== null ? (
            <DetailItem label="Truck capacity" mono>
              {formatKg(s.truckCapacityKg)}
            </DetailItem>
          ) : null}
          <DetailItem label="Route">
            {s.originWarehouse.name} → {s.destination}
          </DetailItem>
          <DetailItem label="Total weight" mono>
            {formatKg(s.totalWeightKg)}
          </DetailItem>
          {/* Expected arrival is planned on a date picker - there is no time
              to show. Departure and arrival are stamped by the system at the
              moment they happen, and on a trip that runs overnight the hour
              is the whole point, so those stack date over time. */}
          {s.expectedArrivalAt ? (
            <DetailItem label="Expected arrival">
              <DateOnlyCell value={s.expectedArrivalAt} />
            </DetailItem>
          ) : null}
          {s.departedAt ? (
            <DetailItem label="Departed">
              <DateTimeCell value={s.departedAt} />
            </DetailItem>
          ) : null}
          {s.arrivedAt ? (
            <DetailItem label="Arrived">
              <DateTimeCell value={s.arrivedAt} />
            </DetailItem>
          ) : null}
          {s.notes ? (
            <DetailItem label="Notes" className="sm:col-span-2 xl:col-span-3">
              {s.notes}
            </DetailItem>
          ) : null}
        </DetailGrid>
      </AdminCard>

      {/* Driver */}
      <AdminCard className="px-5 py-3">
        <p className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
          Driver
        </p>
        <DetailGrid>
          <DetailItem label="Name">{s.driverName}</DetailItem>
          {s.driverPhone ? (
            <DetailItem label="Phone" mono>
              {s.driverPhone}
            </DetailItem>
          ) : null}
          {s.driverEmail ? (
            <DetailItem label="Email">{s.driverEmail}</DetailItem>
          ) : null}
          <DetailItem label="Company">
            {s.driverCompany ?? (anyDriverExtra ? "Solo operator" : <Absent />)}
          </DetailItem>
          {s.driverCity ? (
            <DetailItem label="City">{s.driverCity}</DetailItem>
          ) : null}
          {s.driverLicenseNo ? (
            <DetailItem label="Licence no" mono>
              {s.driverLicenseNo}
            </DetailItem>
          ) : null}
          {s.driverIdNumber ? (
            <DetailItem label="ID number" mono>
              {s.driverIdNumber}
            </DetailItem>
          ) : null}
        </DetailGrid>
      </AdminCard>

      {/* Allocations */}
      <AdminCard className="px-5 py-3">
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
                <Mono className="ml-2 text-[11.5px] text-console">
                  {a.sale.transactionNo}
                </Mono>
              </div>
              <Mono className="whitespace-nowrap text-[13px] text-ink">
                <Money value={a.lineCostGhs} />
              </Mono>
            </div>
          ))
        )}
      </AdminCard>

      {/* Documents */}
      <AdminCard className="px-5 py-3">
        <div className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
          Documents (private)
        </div>
        <p className="mb-2 text-[12px] text-soil">
          Download the waybill, sign it with the driver, then upload the signed
          copy before dispatch. Downloads are logged.
        </p>
        {s.documents.length === 0 ? (
          <p className="py-1 text-[13px] text-soil">No documents on file.</p>
        ) : (
          s.documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-3 border-b border-soil/10 py-2 text-[13px] last:border-b-0"
            >
              <a
                href={shipmentDocumentUrl(s.id, doc.id)}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 text-console [overflow-wrap:anywhere] hover:underline"
              >
                {doc.name}
              </a>
              <div className="flex flex-none items-center gap-3">
                <Mono className="text-right text-[12px] text-soil">
                  <DateTimeCell value={doc.createdAt} muted />
                </Mono>
                {beforeDispatch ? (
                  <button
                    type="button"
                    onClick={() => void onRemoveDocument(doc.id, doc.name)}
                    className="text-[12px] text-console-red"
                    aria-label={`Remove ${doc.name}`}
                  >
                    ✕
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
        {s.status !== "CANCELLED" && s.status !== "CLOSED" ? (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Input
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="Document name"
                aria-label="Document name"
                className="h-8 min-w-[160px] flex-1 rounded border border-soil/25 bg-paper px-2.5 text-[13px]"
              />
              <FilePicker
                accept="image/*,application/pdf"
                busy={addDocState.isLoading}
                confirmLabel="Upload"
                hint="PDF or a photo of the signed waybill"
                onConfirm={onUploadDocument}
                optimize={false}
                triggerLabel="Choose document"
              />
            </div>
            <div className="mt-3 border-t border-soil/12 pt-3">
              <button
                type="button"
                onClick={() => setSigning((v) => !v)}
                className="cursor-pointer text-[12px] font-semibold text-console underline-offset-2 hover:underline"
                aria-expanded={signing}
              >
                {signing ? "Hide signature pad" : "Or sign on this screen"}
              </button>
              {signing ? (
                <div className="mt-2">
                  <SignaturePad
                    fileName={`${(docName.trim() || "signature")
                      .toLowerCase()
                      .replace(/\s+/g, "-")}.png`}
                    onCapture={(file) => {
                      setSigning(false);
                      void onUploadDocument(file).catch(() => undefined);
                    }}
                  />
                  <p className="mt-1 text-[11.5px] text-soil/70">
                    Saves as &quot;{docName.trim() || "Signed waybill"}&quot; -
                    hand the phone to the driver to sign right here.
                  </p>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
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
    </div>
  );

  const aside = (
    <AdminCard className="px-5 py-3">
      <div className="mb-1 flex items-center gap-2 text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
        Profit <CostBasisBadge basis={s.profit.costBasis} />
      </div>
      <DetailGrid columns={2}>
        <DetailItem label="Revenue" mono>
          <Money value={s.profit.revenueGhs} />
        </DetailItem>
        <DetailItem label="Lot cost" mono>
          <Money value={s.profit.costGhs} />
        </DetailItem>
        <DetailItem label="Expenses" mono>
          <Money value={s.profit.expensesGhs} />
        </DetailItem>
        <DetailItem label="Profit" mono strong>
          <Money value={s.profit.profitGhs} />
        </DetailItem>
      </DetailGrid>
      <div className="mt-3 border-t border-soil/12 pt-3.5">{actions}</div>
    </AdminCard>
  );

  return (
    <div className="max-w-[1120px]">
      <BackButton href={LIST} label="All shipments" className="mb-2" />
      <AdminPageHeader
        title={`${s.truckReg} · ${s.destination}`}
        sub={`For ${saleSummary} · from ${s.originWarehouse.name}`}
        actions={
          <span className="flex flex-wrap items-center gap-1.5">
            <ShipmentStatusBadge status={s.status} />
            <CostBasisBadge basis={s.costBasis} />
          </span>
        }
      />

      {s.status === "CANCELLED" && s.cancelReason ? (
        <AdminCard className="mb-4 border-error/40 bg-error/[0.04] px-4 py-3 text-[13px] text-ink">
          Cancelled: {s.cancelReason}
        </AdminCard>
      ) : null}

      <DetailShell main={main} aside={aside} />

      {addSalesOpen ? (
        <AddSalesDialog shipment={s} onClose={() => setAddSalesOpen(false)} />
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
