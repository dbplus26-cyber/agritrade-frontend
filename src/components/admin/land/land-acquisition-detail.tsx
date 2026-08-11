"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PaymentAccountField } from "@/components/admin/payment-account-field";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  DetailRow,
  DetailShell,
  Mono,
  SectionHeading,
  adminInputClass,
  adminLinkClass,
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
import { SimpleSelect } from "@/components/ui/simple-select";
import { useAuthRole } from "@/hooks/use-auth-role";
import { useConfirm } from "@/hooks/use-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedis } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { receiptPdfUrl } from "@/lib/receipt-pdf-url";
import { cn } from "@/lib/utils";
import {
  useAgreeLandAcquisitionMutation,
  useCancelLandAcquisitionMutation,
  useCompleteLandAcquisitionMutation,
  useGetLandAcquisitionQuery,
  useRecordAcquisitionPaymentMutation,
  useReverseAcquisitionPaymentMutation,
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
  hint,
  strong = false,
}: {
  children: React.ReactNode;
  /** One sentence on what the figure IS, on hover beside its label. */
  hint?: string;
  label: string;
  strong?: boolean;
}) {
  return (
    <DetailRow hint={hint} label={label} mono strong={strong}>
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
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<LandPaymentValues>({
    resolver: zodResolver(landPaymentSchema),
    defaultValues: { method: "BANK", paidAt: todayInputValue() },
  });
  // Drives whether the company account is required (BANK/MOMO), and which
  // accounts can carry it - a method switch clears a stale choice.
  const method = watch("method");
  useEffect(() => {
    setValue("paymentAccountId", "");
  }, [method, setValue]);
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
          ...(values.paymentAccountId
            ? { paymentAccountId: values.paymentAccountId }
            : {}),
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
          className="flex flex-col gap-5"
        >
          <AdminField label="Amount (GHS)" error={errors.amountGhs?.message}>
            <Input
              inputMode="decimal"
              className={cn(adminInputClass, errors.amountGhs && "border-console-red")}
              {...register("amountGhs")}
            />
          </AdminField>
          <AdminField label="Method">
            <Controller
              control={control}
              name="method"
              render={({ field }) => (
                <SimpleSelect
                  className={cn(adminSelectClass, "w-full")}
                  value={field.value}
                  onChange={field.onChange}
                  options={PAYMENT_METHOD_OPTIONS}
                />
              )}
            />
          </AdminField>
          {/* Money goes OUT here: which company account the seller was paid
              from. Required for BANK/MOMO, optional for cash. */}
          <PaymentAccountField
            method={method}
            direction="out"
            error={errors.paymentAccountId?.message}
            onChange={(v) => setValue("paymentAccountId", v)}
            value={watch("paymentAccountId") ?? ""}
          />
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
              size="lg"
              onClick={onClose}
            >
              Cancel
            </AdminButton>
            <AdminButton type="submit" disabled={isLoading} size="lg">
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
          className="flex flex-col gap-5"
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
  const { isSuperAdmin } = useAuthRole();
  const [reversePayment] = useReverseAcquisitionPaymentMutation();
  const [payOpen, setPayOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  /**
   * The seller returning money is a real-world act; this records it as a
   * compensating entry. The reason is the whole audit trail, mirroring the
   * land-sale payment reversal.
   */
  const reverseOne = async (paymentId: string, amountGhs: null | number) => {
    const ok = await confirm({
      title: "Reverse this payment?",
      description: `${
        amountGhs === null ? "This payment" : formatCedis(amountGhs)
      } comes back off what has been paid to the seller as a compensating entry - nothing is deleted. Do this once the seller has actually returned the money.`,
      confirmText: "Reverse payment",
      isDestructive: true,
      requireExactMatch: a.transactionNo,
    });
    if (!ok) return;
    try {
      await reversePayment({
        id: a.id,
        paymentId,
        reason: `Refund received against ${a.transactionNo}`,
      }).unwrap();
      notify.success("Payment reversed");
    } catch (err) {
      notify.error("Couldn't reverse the payment", {
        description: extractApiError(err).message,
      });
    }
  };

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
      <div className="mt-3 border-t border-adm-hairline pt-3.5">
        <div className="flex flex-wrap gap-2 xl:flex-col">
          {a.status === "NEGOTIATING" ? (
            <AdminButton
              disabled={agreeState.isLoading}
              onClick={() => void onAgree()}
            >
              {agreeState.isLoading ? "Saving..." : "Mark agreed"}
            </AdminButton>
          ) : null}
          {canPay ? (
            <AdminButton onClick={() => setPayOpen(true)}>
              Record payment
            </AdminButton>
          ) : null}
          {a.status === "AGREED" ? (
            <AdminButton
              variant="outline"
              disabled={completeState.isLoading}
              onClick={() => void onComplete()}
            >
              {completeState.isLoading ? "Completing..." : "Complete"}
            </AdminButton>
          ) : null}
          {canCancel ? (
            <AdminButton
              variant="outline"
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
        title="Acquisition details"
        hint="One piece of land being bought: the seller, the agreed price and what has been paid."
        actions={
          <span className="flex flex-wrap items-center gap-1.5">
            <LandAcquisitionStatusBadge status={a.status} />
            {/* The whole record on paper: seller, plot facts and every
                payment made so far, PAID-stamped once settled. */}
            <AdminButton variant="outline" asChild>
              <a
                href={receiptPdfUrl("land-acquisition", a.id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                View PDF
              </a>
            </AdminButton>
          </span>
        }
      />

      {a.status === "COMPLETED" && a.plot ? (
        <AdminCard className="mb-4 border-console/40 bg-console/[0.05] px-4 py-3 text-[13px] text-adm-ink">
          This acquisition produced plot{" "}
          <Link
            href={`/admin/plots/${a.plot.id}`}
            className={cn(adminLinkClass, "font-semibold")}
          >
            {a.plot.reference}
          </Link>{" "}
          in the register.
        </AdminCard>
      ) : null}

      {a.status === "CANCELLED" && a.cancelReason ? (
        <AdminCard className="mb-4 border-console-red/40 bg-console-red/[0.04] px-4 py-3 text-[13px] text-adm-ink">
          Cancelled: {a.cancelReason}
        </AdminCard>
      ) : null}

      <DetailShell
        aside={
          <AdminCard className="px-5 py-3">
            {/* Which plot, from whom - what the heading used to carry. */}
            <Row label="Reference">{a.reference}</Row>
            <Row label="Seller">
              <Link
                className={adminLinkClass}
                href={`/admin/land-sellers/${a.seller.id}`}
              >
                {a.seller.name}
              </Link>
            </Row>
            <Row
              hint="What you agreed to pay the seller for this land, before anything is paid."
              label="Agreed cost"
              strong
            >
              <Money value={a.agreedCostGhs} />
            </Row>
            <div className="border-t border-adm-hairline">
              <Row
                hint="Everything handed to the seller against this land so far."
                label="Paid to seller"
              >
                <Money value={a.paidGhs} />
              </Row>
            </div>
            <div className="border-t border-adm-hairline">
              <Row
                hint="What you still owe the seller: the agreed cost less everything paid."
                label="Balance owed"
                strong
              >
                <span
                  className={cn(
                    a.balanceGhs === 0 ? "text-console" : "text-console-red",
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
            <div className="border-t border-adm-hairline">
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
            <SectionHeading className="mb-1">
              Payments to seller
            </SectionHeading>
            {a.payments.length === 0 ? (
              <p className="py-2 text-[13px] text-adm-muted">
                No payments recorded yet.
              </p>
            ) : (
              a.payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-baseline justify-between gap-3 border-b border-adm-hairline py-2 last:border-b-0"
                >
                  <div className="min-w-0">
                    <span className="text-adm-ink">{p.method}</span>
                    {/* Date only: `paidAt` comes from a date picker, so its
                        time is a midnight stamp nobody chose. */}
                    <span className="ml-2 text-[12px] text-adm-muted">
                      <DateOnlyCell value={p.paidAt} muted />
                      {p.reference ? ` · ${p.reference}` : ""}
                    </span>
                  </div>
                  <div className="flex flex-none items-center gap-2">
                    {/* Signed: a reversal (money returned by the seller) is
                        a negative row, shown red like the land-sale ledger. */}
                    <Mono
                      className={cn(
                        "whitespace-nowrap text-[13px] font-semibold",
                        p.amountGhs !== null && p.amountGhs < 0
                          ? "text-console-red"
                          : "text-console",
                      )}
                    >
                      <Money value={p.amountGhs} />
                    </Mono>
                    {/* Owner-only compensating entry for a mis-keyed payment
                        out to the seller. Never offered on a reversal row
                        itself - mirroring the land-sale payments ledger. */}
                    {isSuperAdmin &&
                    p.amountGhs !== null &&
                    p.amountGhs > 0 ? (
                      <AdminButton
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-none"
                        onClick={() => void reverseOne(p.id, p.amountGhs)}
                      >
                        Reverse
                      </AdminButton>
                    ) : null}
                  </div>
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
