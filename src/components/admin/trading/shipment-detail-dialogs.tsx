"use client";

import { useState } from "react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AdminButton,
  AdminField,
  Mono,
  adminInputClass,
  adminLinkClass,
  adminSelectClass,
} from "@/components/admin/ui";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { extractApiError } from "@/lib/extract-api-error";
import { formatKg } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { useGetExpenseCategoriesQuery } from "@/redux/expense-categories/expense-categories-api";
import {
  useAddShipmentExpenseMutation,
  useAddShipmentSalesMutation,
  useCancelShipmentMutation,
  useGetEligibleSalesQuery,
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
import { Money } from "./sale-bits";
import { saleBalanceGhs } from "./sale-payable";

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
export const plannedWeightOf = (shipment: IShipment): number =>
  shipment.plannedWeightKg ?? 0;

export function ExpenseDialog({
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
    control,
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
          className="flex flex-col gap-5"
        >
          <AdminField label="Category" error={errors.categoryId?.message}>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <SimpleSelect
                  className={cn(adminSelectClass, "w-full")}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Choose a category"
                  options={(categories.data?.data ?? []).map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                />
              )}
            />
          </AdminField>
          <AdminField label="Amount (GHS)" error={errors.amountGhs?.message}>
            <Input
              inputMode="decimal"
              className={cn(adminInputClass, errors.amountGhs && "border-console-red")}
              placeholder="0.00"
              {...register("amountGhs")}
            />
          </AdminField>
          <AdminField label="Description" optional>
            <Input
              className={adminInputClass}
              placeholder="e.g. Loading boys at Tamale"
              {...register("description")}
            />
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
            <AdminButton type="submit" disabled={isLoading} loading={isLoading} size="lg">
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
export function AddSalesDialog({
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
          <div className="max-h-[46dvh] overflow-y-auto rounded-none border border-adm-line">
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
            className="rounded-none border border-console-red/50 bg-console-red/[0.06] px-3 py-2 text-[12.5px] font-medium text-console-red"
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
            loading={isLoading}
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

/**
 * Why a trip refused to close: a buyer on it still owes money.
 *
 * A closed trip drops off the list anybody chases, so closing early is
 * precisely how a debt stops being followed up - which is why the API refuses
 * it (SALES_UNPAID). A toast would state the refusal and then take the words
 * away; what the admin needs is WHICH sale and HOW MUCH, with somewhere to go
 * and record the payment.
 *
 * The balances are measured against what each sale is payable at - the settled
 * figure once the load was re-weighed - so this list agrees with the guard that
 * produced it rather than restating the agreed price.
 */
export function SalesUnpaidDialog({
  message,
  shipment,
  onClose,
}: {
  /** The server's own words, kept above the list it explains. */
  message: string;
  shipment: IShipment;
  onClose: () => void;
}) {
  const owing = shipment.sales.filter(
    (s) => s.status !== "CANCELLED" && saleBalanceGhs(s) !== 0,
  );
  return (
    <ResponsiveDialog open onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-[460px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            Money is still owed on this trip
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{message}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {owing.length > 0 ? (
          <ul className="flex flex-col">
            {owing.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-adm-hairline py-2 last:border-b-0"
              >
                <Link
                  href={`/admin/sales/${s.id}`}
                  className={cn(adminLinkClass, "min-w-0 text-[13px]")}
                >
                  <Mono className="text-[12.5px] font-semibold">
                    {s.transactionNo}
                  </Mono>
                  <span className="ml-2 [overflow-wrap:anywhere]">
                    {s.buyer.name}
                  </span>
                </Link>
                <Mono className="flex-none text-[13.5px] font-bold text-console-red">
                  <Money value={saleBalanceGhs(s)} />
                </Mono>
              </li>
            ))}
          </ul>
        ) : null}

        <p className="text-[12.5px] text-adm-muted">
          Open each sale and record what the buyer has paid, then close the
          trip.
        </p>

        <ResponsiveDialogFooter className="gap-2">
          <AdminButton type="button" variant="outline" size="lg" onClick={onClose}>
            Leave it open
          </AdminButton>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

export function CancelDialog({
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
          className="flex flex-col gap-5"
        >
          <AdminField label="Reason" error={errors.reason?.message}>
            <Input
              className={cn(adminInputClass, errors.reason && "border-console-red")}
              placeholder="e.g. Buyer postponed collection"
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
              loading={isLoading}
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
export function VoidExpenseDialog({
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
          className="flex flex-col gap-5"
        >
          <AdminField label="Reason" error={errors.reason?.message}>
            <Input
              className={cn(adminInputClass, errors.reason && "border-console-red")}
              placeholder="e.g. Wrong amount keyed"
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
              loading={isLoading}
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
