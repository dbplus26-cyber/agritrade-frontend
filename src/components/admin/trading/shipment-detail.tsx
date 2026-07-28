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
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
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
  useArriveShipmentMutation,
  useCancelShipmentMutation,
  useCloseShipmentMutation,
  useDeleteShipmentExpenseMutation,
  useDispatchShipmentMutation,
  useGetShipmentQuery,
  useRemoveShipmentDocumentMutation,
} from "@/redux/shipments/shipments-api";
import type { IShipment } from "@/types/admin-shipment.types";
import {
  cancelShipmentSchema,
  shipmentExpenseSchema,
  type CancelShipmentValues,
  type ShipmentExpenseValues,
} from "@/validations/shipment-schema";
import { AllocateDialog } from "./allocate-dialog";
import { Money, SaleStatusBadge } from "./sale-bits";
import {
  CostBasisBadge,
  ShipmentStatusBadge,
  formatShipmentDate,
} from "./shipment-bits";

const LIST = "/admin/shipments";

const Absent = () => <span className="text-soil/50">Not provided</span>;

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
  const [addDocument, addDocState] = useAddShipmentDocumentMutation();
  const [removeDocument] = useRemoveShipmentDocumentMutation();
  const { confirm, confirmationDialog } = useConfirm();
  const [allocOpen, setAllocOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [docName, setDocName] = useState("Signed waybill");
  const [signing, setSigning] = useState(false);

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
  const saleSummary =
    s.sales.length === 1
      ? (s.sales[0]?.buyer.name ?? "")
      : `${String(s.salesCount)} sales`;
  const anyDriverExtra = Boolean(
    s.driverEmail ?? s.driverCity ?? s.driverLicenseNo ?? s.driverIdNumber,
  );

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
        <div className="mb-2 text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
          Sales on this trip · {s.salesCount} sale
          {s.salesCount === 1 ? "" : "s"}
        </div>
        <div className="grid gap-2.5 pb-2 md:grid-cols-2">
          {s.sales.map((sale, index) => (
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
                <span className="ml-auto">
                  <SaleStatusBadge status={sale.status} />
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
          ))}
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
          {s.expectedArrivalAt ? (
            <DetailItem label="Expected arrival">
              {formatShipmentDate(s.expectedArrivalAt)}
            </DetailItem>
          ) : null}
          {s.departedAt ? (
            <DetailItem label="Departed">
              {formatShipmentDate(s.departedAt)}
            </DetailItem>
          ) : null}
          {s.arrivedAt ? (
            <DetailItem label="Arrived">
              {formatShipmentDate(s.arrivedAt)}
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
                <Mono className="text-[12px] text-soil">
                  {formatShipmentDate(doc.createdAt)}
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
