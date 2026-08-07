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
  DetailRow,
  DetailShell,
  Mono,
  SectionHeading,
  adminInputClass,
  adminLinkClass,
  adminSelectClass,
} from "@/components/admin/ui";
import { BackButton } from "@/components/ui/BackButton";
import {
  AttachmentEmpty,
  AttachmentList,
  AttachmentTile,
} from "@/components/admin/attachments";
import { HelpTip, HelpWrap } from "@/components/admin/help-tip";
import { DateOnlyCell, DateTimeCell } from "@/components/admin/date-cell";
import { DetailSkeleton } from "@/components/admin/skeletons";
import { DriverSettlementCard } from "@/components/admin/drivers/driver-settlement-card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { FilePicker } from "@/components/ui/FilePicker";
import { SignaturePad } from "@/components/ui/SignaturePad";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Input } from "@/components/ui/input";
import { useAuthRole } from "@/hooks/use-auth-role";
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
  useDispatchShipmentMutation,
  useGetEligibleSalesQuery,
  useGetShipmentQuery,
  useRemoveShipmentDocumentMutation,
  useRemoveShipmentSaleMutation,
  useVoidShipmentExpenseMutation,
} from "@/redux/shipments/shipments-api";
import type {
  IShipment,
  IShipmentExpense,
} from "@/types/admin-shipment.types";
import {
  voidExpenseSchema,
  type VoidExpenseValues,
} from "@/validations/expense-schema";
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

const Absent = () => <span className="text-adm-faint">Not provided</span>;

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
    <ResponsiveDialog open onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="sm:max-w-[420px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Add a shipment expense</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Transport, loading and the like - it feeds this shipment&apos;s
            profit.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
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
              className={cn(adminInputClass, errors.amountGhs && "border-console-red")}
              {...register("amountGhs")}
            />
          </AdminField>
          <AdminField label="Description" optional>
            <Input className={adminInputClass} {...register("description")} />
          </AdminField>
          <ResponsiveDialogFooter className="gap-2">
            <AdminButton
              type="button"
              variant="outline"
              size="lg"
              onClick={onClose}
            >
              Cancel
            </AdminButton>
            <AdminButton type="submit" disabled={isLoading} size="lg">
              {isLoading ? "Adding…" : "Add expense"}
            </AdminButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
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
          <p className="py-3 text-[13px] text-adm-muted">Loading shippable sales…</p>
        ) : eligible.isError ? (
          <p className="py-3 text-[13px] text-console-red">
            Couldn&apos;t load the shippable sales. Reload and try again.
          </p>
        ) : sales.length === 0 ? (
          <p className="py-3 text-[13px] text-adm-muted">
            No other sale is ready to ship right now.
          </p>
        ) : (
          <div className="max-h-[46dvh] overflow-y-auto rounded-[6px] border border-adm-line">
            {sales.map((s) => (
              <label
                key={s.id}
                className="flex cursor-pointer items-start gap-2.5 border-b border-adm-hairline px-3 py-2 last:border-b-0 hover:bg-adm-sunken"
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
                    <Mono className="flex-none text-[12.5px] font-bold text-adm-ink">
                      {formatKg(s.totalRemainingKg)}
                    </Mono>
                  </span>
                  <span className="block min-w-0 text-[13px] text-adm-ink [overflow-wrap:anywhere]">
                    {s.buyer.name}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-adm-muted">
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
            className="rounded-[6px] border border-console-red/50 bg-console-red/[0.06] px-3 py-2 text-[12.5px] font-medium text-console-red"
          >
            {serverError}
          </p>
        ) : null}

        <ResponsiveDialogFooter className="gap-2">
          <AdminButton
            type="button"
            variant="outline"
            size="lg"
            onClick={onClose}
          >
            Cancel
          </AdminButton>
          <AdminButton
            type="button"
            disabled={isLoading || picked.length === 0}
            size="lg"
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
    <ResponsiveDialog open onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="sm:max-w-[420px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Cancel this shipment?</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Only possible before dispatch, while no stock has moved.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-3"
        >
          <AdminField label="Reason" error={errors.reason?.message}>
            <Input
              className={cn(adminInputClass, errors.reason && "border-console-red")}
              {...register("reason")}
            />
          </AdminField>
          <ResponsiveDialogFooter className="gap-2">
            <AdminButton
              type="button"
              variant="outline"
              size="lg"
              onClick={onClose}
            >
              Keep it
            </AdminButton>
            <AdminButton
              type="submit"
              variant="danger"
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? "Cancelling…" : "Cancel shipment"}
            </AdminButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

/**
 * Void a shipment expense. Owner-only, and never a hard delete: the voucher
 * keeps its number and amount, struck from the trip's profit with a written
 * reason - mirroring the general expense void.
 */
function VoidExpenseDialog({
  shipment,
  expense,
  onClose,
}: {
  shipment: IShipment;
  expense: IShipmentExpense;
  onClose: () => void;
}) {
  const [voidExpense, { isLoading }] = useVoidShipmentExpenseMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VoidExpenseValues>({
    resolver: zodResolver(voidExpenseSchema),
    defaultValues: { reason: "" },
  });
  const onSubmit = async (values: VoidExpenseValues) => {
    try {
      await voidExpense({
        id: shipment.id,
        expenseId: expense.id,
        reason: values.reason,
      }).unwrap();
      notify.success("Expense voided");
      onClose();
    } catch (err) {
      notify.error("Couldn't void the expense", {
        description: extractApiError(err).message,
      });
    }
  };
  return (
    <ResponsiveDialog open onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="sm:max-w-[420px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Void this expense?</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {expense.category.name}
            {expense.amountGhs !== null ? " · " : ""}
            {expense.amountGhs !== null ? (
              <Mono>
                <Money value={expense.amountGhs} />
              </Mono>
            ) : null}
            . The voucher is struck out with your reason, never erased, and the
            trip&apos;s profit moves accordingly.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-3"
        >
          <AdminField label="Reason" error={errors.reason?.message}>
            <Input
              className={cn(adminInputClass, errors.reason && "border-console-red")}
              {...register("reason")}
            />
          </AdminField>
          <ResponsiveDialogFooter className="gap-2">
            <AdminButton
              type="button"
              variant="outline"
              size="lg"
              onClick={onClose}
            >
              Keep it
            </AdminButton>
            <AdminButton
              type="submit"
              variant="danger"
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? "Voiding…" : "Void expense"}
            </AdminButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

export function ShipmentDetail({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetShipmentQuery(id);
  const [dispatchShipment, dispatchState] = useDispatchShipmentMutation();
  const [arrive, arriveState] = useArriveShipmentMutation();
  const [close, closeState] = useCloseShipmentMutation();
  const [addDocument, addDocState] = useAddShipmentDocumentMutation();
  const [removeDocument] = useRemoveShipmentDocumentMutation();
  const [removeSale] = useRemoveShipmentSaleMutation();
  const { confirm, confirmationDialog } = useConfirm();
  const { isSuperAdmin } = useAuthRole();
  const [addSalesOpen, setAddSalesOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  /** The expense the void dialog is open for, if any. */
  const [voidingExpense, setVoidingExpense] = useState<IShipmentExpense | null>(
    null,
  );
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
      description: `"${name}" will be deleted from the shipment's file. Removal is only possible before dispatch. Type the document's name to confirm.`,
      confirmText: "Remove",
      isDestructive: true,
      requireExactMatch: name,
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

  /* Every action here says on hover what it DOES and what it commits you to.
     These buttons move stock and money, and the label alone ("Close", "Mark
     arrived") cannot carry that. HelpWrap rather than a HelpTip icon: the
     button label is already on screen, and half of these render as links -
     a HelpTip's own <button> inside an <a> is invalid HTML.
     The wrapper is `inline-flex` and the buttons keep `xl:w-full` so the
     rail's column layout still gives every pill the same width; without it
     the wrapping span would stretch and the pill inside it would not. */
  const actions = (
    <div className="flex flex-wrap gap-2 xl:flex-col">
      {beforeDispatch ? (
        <>
          {/* Exactly ONE primary action per state. Allocating and dispatching
              were both filled amber, so the rail offered two equally loud
              answers to "what do I do next" - and dispatch is the one that
              moves stock, which makes it the one that should look decisive.
              A page, not a dialog, for allocation: the lot list is long, and a
              dialog's inner scroll inside the scrolling page was unusable on a
              phone. */}
          <HelpWrap
            className="inline-flex flex-none xl:w-full"
            text="Pick which stock lots fill each sale, so the trip is costed on the goods you actually load."
          >
            <AdminButton
              className="xl:w-full"
              variant="secondary"
              asChild
            >
              <Link href={`${LIST}/${s.id}/allocate`}>Allocate lots</Link>
            </AdminButton>
          </HelpWrap>
          <HelpWrap
            className="inline-flex flex-none xl:w-full"
            text="Change the truck, driver, destination or the warehouses this trip loads at - possible until it dispatches."
          >
            <AdminButton className="xl:w-full" variant="secondary" asChild>
              <Link href={`${LIST}/${s.id}/edit`}>Edit plan</Link>
            </AdminButton>
          </HelpWrap>
          <HelpWrap
            className="inline-flex flex-none xl:w-full"
            text="Sends the truck: stock comes out of the warehouse on the record, and dispatch cannot be undone."
          >
            <AdminButton
              className="xl:w-full"
              disabled={dispatchState.isLoading}
              onClick={() => void onDispatch()}
            >
              {dispatchState.isLoading ? "Dispatching…" : "Dispatch"}
            </AdminButton>
          </HelpWrap>
          {/* Cancel ends the trip. It read as just another quiet bordered
              pill beside Allocate lots, which is the wrong promise for the
              one button here that throws the shipment away. */}
          <HelpWrap
            className="inline-flex flex-none xl:w-full"
            text="Calls this trip off with a reason on file. The sales go back to the pool and can ride another truck."
          >
            <AdminButton
              variant="danger"
              className="xl:w-full"
              onClick={() => setCancelOpen(true)}
            >
              Cancel
            </AdminButton>
          </HelpWrap>
        </>
      ) : null}
      {s.status === "DISPATCHED" ? (
        <HelpWrap
          className="inline-flex flex-none xl:w-full"
          text="Records that the truck reached the buyer, so the signed delivery note can be filed against the trip."
        >
          <AdminButton
            className="xl:w-full"
            disabled={arriveState.isLoading}
            onClick={() => void onArrive()}
          >
            {arriveState.isLoading ? "Updating…" : "Mark arrived"}
          </AdminButton>
        </HelpWrap>
      ) : null}
      {s.status === "ARRIVED" ? (
        <HelpWrap
          className="inline-flex flex-none xl:w-full"
          text="Marks the trip finished now that it is delivered and settled, leaving its profit as the final figure."
        >
          <AdminButton
            className="xl:w-full"
            disabled={closeState.isLoading}
            onClick={() => void onClose()}
          >
            {closeState.isLoading ? "Closing…" : "Close shipment"}
          </AdminButton>
        </HelpWrap>
      ) : null}
      {/* The waybill leads the paper trail: print it FIRST, the driver and an
          admin sign it, the signed copy is uploaded, THEN dispatch - so the
          buttons live on every non-cancelled shipment, not just loaded ones. */}
      {s.status !== "CANCELLED" ? (
        <>
          <HelpWrap
            className="inline-flex flex-none xl:w-full"
            text="Opens the waybill for this truck to print, for the driver and an admin to sign before it leaves."
          >
            <AdminButton
              variant="secondary"
              className="xl:w-full"
              asChild
            >
              <Link href={`${LIST}/${s.id}/waybill`}>Waybill</Link>
            </AdminButton>
          </HelpWrap>
          {/* The same document in another wrapper, so it is the quietest
              thing in the rail rather than a second Waybill button. */}
          <HelpWrap
            className="inline-flex flex-none xl:w-full"
            text="Opens that same waybill as a PDF in a new tab, ready to print or send to the driver."
          >
            <AdminButton variant="ghost" className="xl:w-full" asChild>
              <a
                href={shipmentWaybillPdfUrl(s.id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                PDF
              </a>
            </AdminButton>
          </HelpWrap>
        </>
      ) : null}
    </div>
  );

  const main = (
    <div className="flex flex-col gap-4">
      {/* HOW FULL THE TRUCK IS, first and on its own.
          This lived inside the sales card and only rendered before dispatch,
          which is backwards: it is the one thing about a shipment that reads
          at a glance, and it is just as worth seeing after the truck has gone
          as before. No card around it - it is a figure, not a section, and a
          sixth bordered sheet was part of what made this page hard to scan. */}
      {s.truckCapacityKg !== null || plannedKg > 0 ? (
        <div>
          <LoadMeter
            loadedKg={plannedKg}
            capacityKg={s.truckCapacityKg}
            loadedLabel={beforeDispatch ? "Planned" : "Loaded"}
          />
          {beforeDispatch && underFilled ? (
            <p className="mt-1.5 text-[12.5px] text-adm-muted">
              This truck has {formatKg(roomLeftKg)} of room left. Add another
              sale before it rolls, or send it part-loaded if that is the plan.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Sales on this trip. Payment terms are settled BEFORE a sale can
          board a truck, so there is nothing to pay here - the sale page owns
          later payments. Each sale is its own bordered sub-card so a
          multi-sale trip reads as distinct orders, not one run-on list. */}
      <AdminCard className="p-5">
        <SectionHeading
          actions={
            <span className="flex items-center gap-2">
              <Mono className="text-[11px] text-adm-faint">
                {s.salesCount} {s.salesCount === 1 ? "sale" : "sales"}
              </Mono>
              {beforeDispatch ? (
                <HelpWrap
                  className="inline-flex"
                  text="Puts another paid, unshipped sale on this truck so it does not travel half empty."
                >
                  <AdminButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setAddSalesOpen(true)}
                  >
                    + Add sales
                  </AdminButton>
                </HelpWrap>
              ) : null}
            </span>
          }
          hint="The orders this truck is carrying, and the weight each of them puts on it."
        >
          Sales on this trip
        </SectionHeading>
        <div className="grid gap-2.5 pb-2 @3xl/main:grid-cols-2">
          {s.sales.map((sale) => {
            // Removal only where nothing would be silently thrown away: a sale
            // carrying allocated lots has costing decisions on it, so those get
            // cleared deliberately in Allocate lots first (the backend refuses
            // it either way).
            const hasAllocations = s.allocations.some(
              (a) => a.sale.id === sale.id,
            );
            const removable =
              beforeDispatch && s.sales.length > 1 && !hasAllocations;
            // WHAT THIS SALE WEIGHS, AND WHAT IS ON THE TRUCK SO FAR. Money
            // has no business on this card - the sale page owns payments;
            // this screen is loading. `agreedKg` is the order's own weight
            // (across trucks, should one ever be split); `allocatedKg` is
            // what has been keyed onto THIS truck.
            const saleNeedsKg = sale.lines.reduce(
              (sum, l) => sum + l.agreedKg,
              0,
            );
            const saleLoadedKg = sale.lines.reduce(
              (sum, l) => sum + l.allocatedKg,
              0,
            );
            return (
              <div
                key={sale.id}
                className="flex h-full flex-col rounded-[6px] border border-adm-line bg-adm-card p-3.5"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <Link
                    href={`/admin/sales/${sale.id}`}
                    className={cn(
                      adminLinkClass,
                      "font-adminmono min-w-0 text-[12.5px] font-semibold tabular-nums",
                    )}
                  >
                    {sale.transactionNo}
                  </Link>
                  <span className="flex flex-none items-center gap-2">
                    <SaleStatusBadge status={sale.status} />
                    {removable ? (
                      <HelpWrap
                        className="inline-flex"
                        text="Takes this sale off the truck and back into the shippable pool. The sale itself is unchanged."
                      >
                        <button
                          type="button"
                          onClick={() =>
                            void onRemoveSale(sale.id, sale.transactionNo)
                          }
                          className="cursor-pointer text-[12px] text-console-red hover:underline"
                          aria-label={`Remove ${sale.transactionNo} from this shipment`}
                        >
                          ✕
                        </button>
                      </HelpWrap>
                    ) : null}
                  </span>
                </div>

                <Link
                  className={cn(
                    adminLinkClass,
                    "mt-2 block min-w-0 text-[14px] leading-[1.35] font-semibold [overflow-wrap:anywhere]",
                  )}
                  href={`/admin/buyers/${sale.buyer.id}`}
                >
                  {sale.buyer.name}
                </Link>
                {sale.buyer.phone ? (
                  <Mono className="mt-0.5 block text-[12px] text-adm-muted">
                    {sale.buyer.phone}
                  </Mono>
                ) : null}

                {/* The loading picture leads the foot of the card: what the
                    order needs on the truck, and what has been put on so
                    far. It never depends on financial visibility - weight is
                    not money, and a loader who cannot see prices still has
                    to know what is going on the truck. */}
                <div className="mt-auto border-t border-dotted border-adm-line pt-3">
                  <dl className="grid grid-cols-2 gap-x-3">
                    <div className="min-w-0">
                      <dt className="min-w-0 text-[10px] font-bold tracking-[0.08em] text-adm-muted uppercase">
                        <HelpWrap text="The weight this whole order is due to move - what decides whether it fits on the truck.">
                          Load needed
                        </HelpWrap>
                      </dt>
                      <dd className="mt-0.5">
                        <Mono className="text-[17px] leading-none font-semibold tabular-nums text-adm-ink">
                          {formatKg(saleNeedsKg)}
                        </Mono>
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="min-w-0 text-[10px] font-bold tracking-[0.08em] text-adm-muted uppercase">
                        <HelpWrap text="What has been allocated onto this truck for the order so far. Green once the order is fully covered.">
                          Loaded now
                        </HelpWrap>
                      </dt>
                      <dd className="mt-0.5">
                        <Mono
                          className={cn(
                            "text-[17px] leading-none font-semibold tabular-nums",
                            saleLoadedKg >= saleNeedsKg && saleNeedsKg > 0
                              ? "text-console"
                              : "text-adm-ink",
                          )}
                        >
                          {formatKg(saleLoadedKg)}
                        </Mono>
                      </dd>
                    </div>
                  </dl>
                  {/* What the load actually IS: one aligned row per
                      commodity, loaded over needed, so a mixed order reads
                      as a checklist rather than a run-on sentence. Only on a
                      mixed order - on a single-commodity sale it would
                      restate the totals above it. */}
                  {sale.lines.length > 1 ? (
                    <ul className="mt-2 flex flex-col gap-1 border-t border-dotted border-adm-line pt-2">
                      {sale.lines.map((l) => {
                        const covered = l.allocatedKg >= l.agreedKg;
                        return (
                          <li
                            key={l.commodityId}
                            className="flex items-baseline justify-between gap-2 text-[11.5px]"
                          >
                            <span className="min-w-0 text-adm-muted [overflow-wrap:anywhere]">
                              {l.commodityName}
                            </span>
                            <Mono
                              className={cn(
                                "flex-none tabular-nums",
                                covered ? "text-console" : "text-adm-ink",
                              )}
                            >
                              {formatKg(l.allocatedKg)} / {formatKg(l.agreedKg)}
                            </Mono>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </AdminCard>

      {/* Logistics */}
      {/* ONE card for the trip and the person driving it, not two.
          Logistics and Driver were separate sheets of four short facts each,
          which put two headings and two borders around what a reader treats
          as a single question: what is this truck, and who has it. They keep
          their own labels inside, so the grouping survives without the second
          frame.

          The truck and the route live here now. They were dropped when the
          page header carried them; the header says what KIND of page this is,
          so the record has to say which shipment. */}
      <AdminCard className="p-5">
        <SectionHeading hint="Which truck this is, where it is going and when it moved.">
          Trip
        </SectionHeading>
        <DetailGrid>
          <DetailItem label="Waybill no" mono>
            {s.transactionNo}
          </DetailItem>
          <DetailItem label="Truck" strong>
            {s.truckReg}
          </DetailItem>
          <DetailItem full label="Route">
            {/* Every shed the truck calls at, in loading order, then the
                drop. One stop is the common case and reads as before. */}
            {s.loadingWarehouses.map((w, i) => (
              <span key={w.id}>
                {i > 0 ? " → " : ""}
                <Link
                  className={adminLinkClass}
                  href={`/admin/warehouses/${w.id}`}
                >
                  {w.name}
                </Link>
              </span>
            ))}{" "}
            → {s.destination}
          </DetailItem>
          <DetailItem label="Total weight" mono>
            {formatKg(s.totalWeightKg)}
          </DetailItem>
          {s.truckCapacityKg !== null ? (
            <DetailItem label="Truck capacity" mono>
              {formatKg(s.truckCapacityKg)}
            </DetailItem>
          ) : null}
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
            <DetailItem full label="Notes">
              {s.notes}
            </DetailItem>
          ) : null}
        </DetailGrid>

        {/* The rule that split the trip from the driver sat ON the old
            eyebrow. SectionHeading owns its bottom margin, so the divider
            moves out to this wrapper to keep the two blocks apart. */}
        <div className="mt-4 border-t border-adm-hairline pt-4">
          <SectionHeading hint="Who has the truck, as recorded when this trip was booked.">
            Driver
          </SectionHeading>
          <DetailGrid>
            {/* The driver block is a SNAPSHOT taken when the trip was booked -
                name, phone, licence and the rest are copied onto the shipment
                and editable here without touching the directory. Linking the
                name would promise the reader that the record they land on says
                what this page says, and on an old trip it will not. */}
            <DetailItem label="Name">{s.driverName}</DetailItem>
            {s.driverPhone ? (
              <DetailItem label="Phone" mono>
                {s.driverPhone}
              </DetailItem>
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
            {s.driverEmail ? (
              <DetailItem full label="Email">
                {s.driverEmail}
              </DetailItem>
            ) : null}
          </DetailGrid>
        </div>
      </AdminCard>

      {/* What the driver is owed.
          Its own card rather than another block inside Trip: this is money,
          it has its own actions, and it is the one thing on this page an
          owner comes back to after the truck has gone. A cancelled trip owes
          nobody, so the card refuses to price or pay against one. */}
      <DriverSettlementCard
        canManage={s.status !== "CANCELLED"}
        shipmentId={s.id}
      />

      {/* Allocations */}
      <AdminCard className="p-5">
        <SectionHeading
          className="mb-2"
          hint="The exact stock this truck carries, lot by lot, and what that stock cost you."
        >
          Loaded lots
        </SectionHeading>
        {s.allocations.length === 0 ? (
          <p className="py-2 text-[13px] text-adm-muted">
            No lots allocated yet. Dispatching without allocations auto-fills
            from the oldest stock (flagged estimated).
          </p>
        ) : (
          s.allocations.map((a) => (
            <div
              key={a.id}
              className="flex items-baseline justify-between gap-3 border-b border-adm-hairline py-2 last:border-b-0"
            >
              <div className="min-w-0">
                <Link
                  className={cn(adminLinkClass, "font-medium")}
                  href={`/admin/commodities/${a.commodity.id}`}
                >
                  {a.commodity.name}
                </Link>
                <Mono className="ml-2 text-[12px] text-adm-muted">
                  {formatKg(a.weightKg)} @{" "}
                  <Money value={a.unitCostSnapshotGhs} />
                </Mono>
                <Link
                  className={cn(
                    adminLinkClass,
                    "font-adminmono ml-2 text-[11.5px] tabular-nums",
                  )}
                  href={`/admin/sales/${a.sale.id}`}
                >
                  {a.sale.transactionNo}
                </Link>
              </div>
              <Mono className="whitespace-nowrap text-[13px] text-adm-ink">
                <Money value={a.lineCostGhs} />
              </Mono>
            </div>
          ))
        )}
      </AdminCard>

      {/* Documents */}
      <AdminCard className="p-5">
        <SectionHeading
          className="mb-1.5"
          hint="Paperwork filed against this trip alone, for staff only - a buyer never sees what is kept here."
        >
          Documents (private)
        </SectionHeading>
        <p className="mb-2 text-[12px] text-adm-muted">
          Download the waybill, sign it with the driver, then upload the signed
          copy before dispatch. Downloads are logged.
        </p>
        {s.documents.length === 0 ? (
          <AttachmentEmpty text="No documents on file." />
        ) : (
          <AttachmentList>
            {s.documents.map((doc) => (
              <AttachmentTile
                key={doc.id}
                createdAt={doc.createdAt}
                href={shipmentDocumentUrl(s.id, doc.id)}
                name={doc.name}
                onRemove={
                  beforeDispatch
                    ? () => void onRemoveDocument(doc.id, doc.name)
                    : undefined
                }
              />
            ))}
          </AttachmentList>
        )}
        {s.status !== "CANCELLED" && s.status !== "CLOSED" ? (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Input
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="Document name"
                aria-label="Document name"
                className="h-8 min-w-[160px] flex-1 rounded-[6px] border border-adm-line bg-adm-card px-2.5 text-[13px] outline-none transition-colors placeholder:text-adm-faint focus:border-console"
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
              {/* An icon rather than HelpWrap here: the picker renders a block
                  of its own, and a tooltip trigger cannot wrap it without
                  putting a <div> inside a <span>. */}
              <HelpTip
                label="About adding a document"
                text="Files a copy of this paperwork against the trip - you see the file before anything is uploaded."
              />
            </div>
            <div className="mt-3 border-t border-adm-hairline pt-3">
              <HelpWrap
                className="inline-flex"
                text="Opens a pad so the driver can sign on this phone, and files that signature as a document here."
              >
                <button
                  type="button"
                  onClick={() => setSigning((v) => !v)}
                  className={cn(adminLinkClass, "cursor-pointer text-[12.5px] font-semibold")}
                  aria-expanded={signing}
                >
                  {signing ? "Hide signature pad" : "Or sign on this screen"}
                </button>
              </HelpWrap>
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
                  <p className="mt-1 text-[11.5px] text-adm-faint">
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
      <AdminCard className="p-5">
        <SectionHeading
          className="mb-2"
          actions={
            <HelpWrap
              className="inline-flex"
              text="Records a cost for this trip, such as transport or loading, and takes it off the trip's profit."
            >
              <AdminButton
                variant="ghost"
                size="sm"
                onClick={() => setExpenseOpen(true)}
              >
                + Add
              </AdminButton>
            </HelpWrap>
          }
          hint="What this trip cost to run, on top of the stock itself - it comes straight off the profit."
        >
          Expenses
        </SectionHeading>
        {s.expenses.length === 0 ? (
          <p className="py-2 text-[13px] text-adm-muted">No expenses recorded.</p>
        ) : (
          s.expenses.map((e) => (
            <div
              key={e.id}
              className="flex items-baseline justify-between gap-3 border-b border-adm-hairline py-2 last:border-b-0"
            >
              {/* The category leads; its note follows on a quieter second
                  line, clamped to two. Run inline and unclamped, a full-length
                  voucher note turned every row into a six-line paragraph and
                  buried the amounts the list exists to show. The full text
                  stays one hover away. */}
              <div className="min-w-0">
                <Link
                  className={cn(adminLinkClass, "block truncate")}
                  href={`/admin/expense-categories/${e.category.id}`}
                >
                  {e.category.name}
                </Link>
                {e.description ? (
                  <span
                    className="mt-0.5 line-clamp-2 text-[12px] text-adm-muted"
                    title={e.description}
                  >
                    {e.description}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <Mono className="whitespace-nowrap text-[13px] text-adm-ink">
                  <Money value={e.amountGhs} />
                </Mono>
                {/* Voiding is owner-only (like the general expense void):
                    striking out a cost moves the trip's profit. */}
                {isSuperAdmin ? (
                  <HelpWrap
                    className="inline-flex flex-none"
                    text="Strikes this cost off the trip's profit with a reason. The voucher stays on record, never erased."
                  >
                    <AdminButton
                      type="button"
                      variant="danger"
                      size="sm"
                      className="flex-none"
                      onClick={() => setVoidingExpense(e)}
                    >
                      Void
                    </AdminButton>
                  </HelpWrap>
                ) : null}
              </div>
            </div>
          ))
        )}
      </AdminCard>
    </div>
  );

  // The ANSWER first, its workings under it. This was a 2x2 grid where profit
  // sat in the fourth cell carrying the same weight as the three figures it is
  // derived from - so the one number the owner opened the page for had to be
  // found among its own inputs. Profit leads at display size now; revenue,
  // cost and expenses follow as the quiet lines that explain it.
  const aside = (
    <AdminCard className="p-5">
      <div className="flex items-center gap-2 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
        Profit <CostBasisBadge basis={s.profit.costBasis} />
      </div>
      <Mono className="mt-1 block text-[26px] leading-[1.15] font-semibold tabular-nums text-adm-ink">
        <Money value={s.profit.profitGhs} />
      </Mono>
      <div className="mt-3 border-t border-adm-hairline pt-1">
        <DetailRow label="Revenue" mono>
          <Money value={s.profit.revenueGhs} />
        </DetailRow>
        <DetailRow label="Lot cost" mono>
          <Money value={s.profit.costGhs} />
        </DetailRow>
        <DetailRow label="Expenses" mono>
          <Money value={s.profit.expensesGhs} />
        </DetailRow>
      </div>
      <div className="mt-3 border-t border-adm-hairline pt-3.5">{actions}</div>
    </AdminCard>
  );

  return (
    <div className="max-w-[1120px]">
      <BackButton href={LIST} label="All shipments" className="mb-2" />
      <AdminPageHeader
        title="Shipment details"
        hint="One truck: its load, its trip, its costs and what the driver is owed."
        actions={
          <span className="flex flex-wrap items-center gap-1.5">
            <ShipmentStatusBadge status={s.status} />
            <CostBasisBadge basis={s.costBasis} />
          </span>
        }
      />

      {s.status === "CANCELLED" && s.cancelReason ? (
        <AdminCard className="mb-4 border-console-red/40 bg-console-red/[0.04] px-4 py-3 text-[13px] text-adm-ink">
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
      {voidingExpense ? (
        <VoidExpenseDialog
          shipment={s}
          expense={voidingExpense}
          onClose={() => setVoidingExpense(null)}
        />
      ) : null}
      {confirmationDialog}
    </div>
  );
}
