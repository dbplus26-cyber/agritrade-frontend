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
  DetailShell,
  Mono,
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/ui";
import { BackButton } from "@/components/ui/BackButton";
import { DateOnlyCell } from "@/components/admin/date-cell";
import { DetailSkeleton } from "@/components/admin/skeletons";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
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
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useAgreeLandAcquisitionMutation,
  useCancelLandAcquisitionMutation,
  useCompleteLandAcquisitionMutation,
  useGetLandAcquisitionQuery,
  useRecordAcquisitionPaymentMutation,
} from "@/redux/land/land-acquisitions-api";
import type { ILandAcquisitionDetail } from "@/types/land.types";
import {
  cancelLandSaleSchema,
  landPaymentSchema,
  type CancelLandSaleValues,
  type LandPaymentValues,
} from "@/validations/land-schema";
import {
  Money,
  PAYMENT_METHOD_OPTIONS,
  todayInputValue,
} from "@/components/admin/trading/sale-bits";
import { LandAcquisitionStatusBadge } from "./land-acquisition-bits";

const LIST = "/admin/land-acquisitions";

function Row({
  label,
  children,
  strong = false,
}: {
  children: React.ReactNode;
  label: string;
  strong?: boolean;
}) {
  return (
    <DetailRow label={label} mono strong={strong}>
      {children}
    </DetailRow>
  );
}

function PaymentDialog({
  acquisition,
  onClose,
}: {
  acquisition: ILandAcquisitionDetail;
  onClose: () => void;
}) {
  const [record, { isLoading }] = useRecordAcquisitionPaymentMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LandPaymentValues>({
    resolver: zodResolver(landPaymentSchema),
    defaultValues: { method: "BANK", paidAt: todayInputValue() },
  });
  const onSubmit = async (values: LandPaymentValues) => {
    try {
      await record({
        id: acquisition.id,
        body: {
          amountGhs: Number(values.amountGhs),
          method: values.method,
          ...(values.reference?.trim()
            ? { reference: values.reference.trim() }
            : {}),
          ...(values.paidAt ? { paidAt: values.paidAt } : {}),
        },
      }).unwrap();
      notify.success("Payment recorded");
      onClose();
    } catch (err) {
      notify.error("Couldn't record the payment", {
        description: extractApiError(err).message,
      });
    }
  };
  return (
    <ResponsiveDialog open onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="sm:max-w-[420px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Record a payment to the seller</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Part-payments are fine. The balance owed updates as you pay.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-3"
        >
          <AdminField label="Amount (GHS)" error={errors.amountGhs?.message}>
            <Input
              inputMode="decimal"
              className={cn(adminInputClass, errors.amountGhs && "border-error")}
              {...register("amountGhs")}
            />
          </AdminField>
          <AdminField label="Method">
            <select
              className={cn(adminSelectClass, "w-full")}
              {...register("method")}
            >
              {PAYMENT_METHOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Reference" optional>
            <Input className={adminInputClass} {...register("reference")} />
          </AdminField>
          <AdminField label="Payment date" optional>
            <Input
              type="date"
              className={adminInputClass}
              {...register("paidAt")}
            />
          </AdminField>
          <ResponsiveDialogFooter className="gap-2">
            <AdminButton
              type="button"
              variant="outline"
              className="h-9 px-3.5"
              onClick={onClose}
            >
              Cancel
            </AdminButton>
            <AdminButton type="submit" disabled={isLoading} className="h-9 px-4">
              {isLoading ? "Recording..." : "Record payment"}
            </AdminButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function CancelDialog({
  acquisition,
  onClose,
}: {
  acquisition: ILandAcquisitionDetail;
  onClose: () => void;
}) {
  const [cancel, { isLoading }] = useCancelLandAcquisitionMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CancelLandSaleValues>({
    resolver: zodResolver(cancelLandSaleSchema),
    defaultValues: { reason: "" },
  });
  const onSubmit = async (values: CancelLandSaleValues) => {
    try {
      await cancel({ id: acquisition.id, reason: values.reason }).unwrap();
      notify.success("Acquisition cancelled");
      onClose();
    } catch (err) {
      notify.error("Couldn't cancel the acquisition", {
        description: extractApiError(err).message,
      });
    }
  };
  return (
    <ResponsiveDialog open onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="sm:max-w-[420px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Cancel this acquisition?</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Only possible while nothing has been paid. No plot is created.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
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
          <ResponsiveDialogFooter className="gap-2">
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
              {isLoading ? "Cancelling..." : "Cancel acquisition"}
            </AdminButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

export function LandAcquisitionDetail({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } =
    useGetLandAcquisitionQuery(id);
  const [agree, agreeState] = useAgreeLandAcquisitionMutation();
  const [complete, completeState] = useCompleteLandAcquisitionMutation();
  const { confirm, confirmationDialog } = useConfirm();
  const [payOpen, setPayOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (isLoading) return <DetailSkeleton main="ledger" />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const a = data.data.acquisition;
  const noPayments = (a.paidGhs ?? 0) === 0;
  const canCancel =
    (a.status === "NEGOTIATING" || a.status === "AGREED") && noPayments;
  const canPay =
    a.status === "AGREED" ||
    (a.status === "COMPLETED" && (a.balanceGhs ?? 0) > 0);

  const onAgree = async () => {
    const ok = await confirm({
      title: "Mark this acquisition agreed?",
      description: "Terms are set and part-payments to the seller can begin.",
      confirmText: "Mark agreed",
    });
    if (!ok) return;
    try {
      await agree(a.id).unwrap();
      notify.success("Acquisition agreed");
    } catch (err) {
      notify.error("Couldn't update", {
        description: extractApiError(err).message,
      });
    }
  };

  const onComplete = async () => {
    const ok = await confirm({
      title: "Complete this acquisition?",
      description: `Plot ${a.reference} enters the register as available. Any balance stays owed to the seller.`,
      confirmText: "Complete",
    });
    if (!ok) return;
    try {
      await complete(a.id).unwrap();
      notify.success("Acquisition completed - plot added to the register");
    } catch (err) {
      notify.error("Couldn't complete", {
        description: extractApiError(err).message,
      });
    }
  };

  const actions =
    a.status === "NEGOTIATING" || canPay || a.status === "AGREED" || canCancel ? (
      <div className="mt-3 border-t border-soil/12 pt-3.5">
        <div className="flex flex-wrap gap-2 xl:flex-col">
          {a.status === "NEGOTIATING" ? (
            <AdminButton
              className="h-9 px-4"
              disabled={agreeState.isLoading}
              onClick={() => void onAgree()}
            >
              {agreeState.isLoading ? "Saving..." : "Mark agreed"}
            </AdminButton>
          ) : null}
          {canPay ? (
            <AdminButton className="h-9 px-4" onClick={() => setPayOpen(true)}>
              Record payment
            </AdminButton>
          ) : null}
          {a.status === "AGREED" ? (
            <AdminButton
              variant="outline"
              className="h-9 px-4"
              disabled={completeState.isLoading}
              onClick={() => void onComplete()}
            >
              {completeState.isLoading ? "Completing..." : "Complete"}
            </AdminButton>
          ) : null}
          {canCancel ? (
            <AdminButton
              variant="outline"
              className="h-9 px-4"
              onClick={() => setCancelOpen(true)}
            >
              Cancel
            </AdminButton>
          ) : null}
        </div>
      </div>
    ) : null;

  return (
    <div className="max-w-[1120px]">
      <BackButton href={LIST} label="All acquisitions" className="mb-2" />
      <AdminPageHeader
        title={`${a.reference} · ${a.seller.name}`}
        sub={a.locationText}
        actions={<LandAcquisitionStatusBadge status={a.status} />}
      />

      {a.status === "COMPLETED" && a.plot ? (
        <AdminCard className="mb-4 border-leaf/40 bg-leaf/[0.05] px-4 py-3 text-[13px] text-ink">
          This acquisition produced plot{" "}
          <Link
            href={`/admin/plots/${a.plot.id}`}
            className="font-semibold text-console hover:underline"
          >
            {a.plot.reference}
          </Link>{" "}
          in the register.
        </AdminCard>
      ) : null}

      {a.status === "CANCELLED" && a.cancelReason ? (
        <AdminCard className="mb-4 border-error/40 bg-error/[0.04] px-4 py-3 text-[13px] text-ink">
          Cancelled: {a.cancelReason}
        </AdminCard>
      ) : null}

      <DetailShell
        aside={
          <AdminCard className="px-5 py-3">
            <Row label="Agreed cost" strong>
              <Money value={a.agreedCostGhs} />
            </Row>
            <div className="border-t border-soil/12">
              <Row label="Paid to seller">
                <Money value={a.paidGhs} />
              </Row>
            </div>
            <div className="border-t border-soil/12">
              <Row label="Balance owed" strong>
                <span
                  className={cn(
                    a.balanceGhs === 0 ? "text-leaf" : "text-console-red",
                  )}
                >
                  {a.balanceGhs === 0 ? (
                    "Paid in full"
                  ) : (
                    <Money value={a.balanceGhs} />
                  )}
                </span>
              </Row>
            </div>
            <div className="border-t border-soil/12">
              <Row label="Size">
                {a.sizeText}
                {a.sizeAcres ? ` · ${String(a.sizeAcres)} ac` : ""}
              </Row>
            </div>
            {actions}
          </AdminCard>
        }
        main={
          <AdminCard className="px-5 py-3">
            <div className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
              Payments to seller
            </div>
            {a.payments.length === 0 ? (
              <p className="py-2 text-[13px] text-soil">
                No payments recorded yet.
              </p>
            ) : (
              a.payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-baseline justify-between gap-3 border-b border-soil/10 py-2 last:border-b-0"
                >
                  <div className="min-w-0">
                    <span className="text-ink">{p.method}</span>
                    {/* Date only: `paidAt` comes from a date picker, so its
                        time is a midnight stamp nobody chose. */}
                    <span className="ml-2 text-[12px] text-soil">
                      <DateOnlyCell value={p.paidAt} muted />
                      {p.reference ? ` · ${p.reference}` : ""}
                    </span>
                  </div>
                  <Mono className="whitespace-nowrap text-[13px] font-semibold text-leaf">
                    <Money value={p.amountGhs} />
                  </Mono>
                </div>
              ))
            )}
          </AdminCard>
        }
      />

      {payOpen ? (
        <PaymentDialog acquisition={a} onClose={() => setPayOpen(false)} />
      ) : null}
      {cancelOpen ? (
        <CancelDialog acquisition={a} onClose={() => setCancelOpen(false)} />
      ) : null}
      {confirmationDialog}
    </div>
  );
}
