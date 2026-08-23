"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DateTimeCell } from "@/components/admin/date-cell";
import { DetailSkeleton } from "@/components/admin/skeletons";
import {
  AdminButton,
  AdminCard,
  AdminField,
  DetailHeader,
  Mono,
  SectionHeading,
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/ui";
import { HelpTip } from "@/components/admin/help-tip";
import { RailCard, RecordShell } from "@/components/admin/record-shell";
import { RecordFacts, type RecordFact } from "@/components/admin/record-facts";
import { DASHBOARD_CRUMB } from "@/components/admin/detail-nav";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedis } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  disbursementIsSettled,
  useCheckDisbursementStatusMutation,
  useGetDisbursementQuery,
  useResolveDisbursementMutation,
} from "@/redux/disbursements/disbursements-api";
import {
  resolveDisbursementSchema,
  type ResolveDisbursementValues,
} from "@/validations/disbursement-schema";
import {
  DisbursementStatusBadge,
  Money,
  RAIL_LABEL,
  recipientLine,
} from "./disbursement-bits";

const LIST = "/admin/disbursements";

/** One money fact beside the headline figure. */
function CostFact({
  hint,
  label,
  value,
}: {
  hint: string;
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-[10.5px] font-bold tracking-[0.08em] text-adm-muted uppercase">
        <span className="min-w-0">{label}</span>
        <HelpTip label={`What is ${label}?`} text={hint} />
      </div>
      <Money className="mt-0.5 block text-[12.5px] text-adm-ink" value={value} />
    </div>
  );
}

/**
 * One payout, and the two things the owner can do about a stuck one: ask
 * Hubtel again, or - when Hubtel simply will not say - attest the outcome
 * themselves.
 */
export function DisbursementDetail({ id }: { id: string }) {
  const { data, error, isLoading, refetch } = useGetDisbursementQuery(id);
  const [checkStatus, checkState] = useCheckDisbursementStatusMutation();
  const [resolving, setResolving] = useState(false);

  if (isLoading) return <DetailSkeleton />;
  if (error || !data) {
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );
  }

  const d = data.data.disbursement;
  const settled = disbursementIsSettled(d);

  const onCheck = async () => {
    try {
      const res = await checkStatus(d.id).unwrap();
      notify.success(res.message);
    } catch (err) {
      notify.error(extractApiError(err).message);
    }
  };

  const facts: RecordFact[] = [
    {
      hint: "The code this console put on the payment, for tracing it back here.",
      label: "Our reference",
      mono: true,
      value: d.clientReference,
    },
    {
      hint: "The payment provider's own code for this payout: quote it when you call them.",
      label: "Hubtel transaction",
      mono: true,
      value: d.hubtelTransactionId,
    },
    {
      hint: "The mobile network or bank's own code for the transfer, deeper than the provider's.",
      label: "Network reference",
      mono: true,
      value: d.externalTransactionId,
    },
    {
      hint: "The provider's short answer for what happened, useful when a payment is queried.",
      label: "Response code",
      mono: true,
      value: d.responseCode,
    },
  ];

  return (
    <RecordShell
      backHref={LIST}
      backLabel="Money sent"
      crumbs={[DASHBOARD_CRUMB, { label: "Money sent", href: LIST }]}
      current="Payout details"
      header={
        <DetailHeader
          title="Payout details"
          hint="One transfer sent out: where it went and whether it arrived."
          sub={
            <>
              <span>{RAIL_LABEL[d.rail]}</span>
              <Mono>{d.transactionNo}</Mono>
            </>
          }
          badges={
            <DisbursementStatusBadge
              needsAttention={d.needsAttention}
              status={d.status}
            />
          }
          actions={
            settled ? null : (
              <>
                <AdminButton
                  disabled={checkState.isLoading}
                  loading={checkState.isLoading}
                  onClick={() => void onCheck()}
                  type="button"
                  variant="secondary"
                >
                  {checkState.isLoading ? "Checking…" : "Check with Hubtel"}
                </AdminButton>
                <AdminButton onClick={() => setResolving(true)} type="button">
                  Resolve manually
                </AdminButton>
              </>
            )
          }
        />
      }
      aside={
        <>
          <RailCard title="Paid from">
            <p className="text-[11.5px] text-adm-ink">
              {d.holder
                ? `${d.holder.name}'s float`
                : "The company account directly"}
            </p>
            <p className="mt-1 text-[10.5px] text-adm-muted">
              Requested by {d.requestedByName ?? "an unknown user"}
            </p>
          </RailCard>
          <RailCard title="Trail">
            <div className="flex flex-col gap-2.5">
              <div>
                <div className="text-[10.5px] text-adm-muted">Recorded</div>
                <div className="mt-0.5 text-[11.5px] text-adm-ink">
                  <DateTimeCell value={d.createdAt} />
                </div>
              </div>
              <div>
                <div className="text-[10.5px] text-adm-muted">
                  Sent to Hubtel
                </div>
                <div className="mt-0.5 text-[11.5px] text-adm-ink">
                  {d.submittedAt ? (
                    <DateTimeCell value={d.submittedAt} />
                  ) : (
                    <span className="text-adm-faint">Not yet</span>
                  )}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-[10.5px] text-adm-muted">
                  <span>Settled</span>
                  <HelpTip
                    label="What is settled?"
                    text="When the provider gave a final answer on this payment, one way or the other."
                  />
                </div>
                <div className="mt-0.5 text-[11.5px] text-adm-ink">
                  {d.settledAt ? (
                    <DateTimeCell value={d.settledAt} />
                  ) : (
                    <span className="text-adm-faint">Not yet</span>
                  )}
                </div>
              </div>
            </div>
          </RailCard>
        </>
      }
    >
      {d.needsAttention ? (
        <AdminCard className="border-console-red/40 bg-console-red/[0.04] px-5 py-3.5 text-[11.5px] leading-[1.55] text-console-red">
          Hubtel has not given a final answer for this payout after several
          checks. It has NOT been marked failed, because the money may well
          have gone out - confirm on the Hubtel dashboard, then record the real
          outcome with &ldquo;Resolve manually&rdquo;.
        </AdminCard>
      ) : null}

      {/* The figure and where it went, together and alone. The four short
          facts underneath are the provider's codes, which nobody reads until
          a payment is queried. */}
      <AdminCard className="p-5">
        <Money
          className="block text-[21px] leading-[1.1] font-semibold text-adm-ink sm:text-[30px]"
          value={d.amountGhs}
        />
        <p className="mt-2 text-[12px] text-adm-body">
          To <span className="font-semibold text-adm-ink">{d.recipientName}</span>{" "}
          <span className="text-adm-faint">·</span>{" "}
          <Mono className="text-[11.5px]">{recipientLine(d)}</Mono>
        </p>
        <p className="mt-1 text-[11.5px] text-adm-muted [overflow-wrap:anywhere]">
          {d.description}
        </p>

        {d.failureReason ? (
          <p className="mt-3 border-t border-adm-hairline pt-3 text-[11.5px] text-console-red">
            {d.failureReason}
          </p>
        ) : null}

        {/* Charges and the true debit only exist once Hubtel has said what it
            actually took - before that they are honestly absent rather than
            shown as zero. */}
        {d.chargesGhs !== null || d.amountDebitedGhs !== null ? (
          <div className="mt-4 flex flex-wrap gap-x-10 gap-y-3 border-t border-adm-hairline pt-3.5">
            {d.chargesGhs !== null ? (
              <CostFact
                hint="What the payment provider took on top of the amount, for moving the money."
                label="Hubtel charges"
                value={d.chargesGhs}
              />
            ) : null}
            {d.amountDebitedGhs !== null ? (
              <CostFact
                hint="What actually left your account: the amount sent plus the provider's charges."
                label="Total debited"
                value={d.amountDebitedGhs}
              />
            ) : null}
          </div>
        ) : null}
      </AdminCard>

      <AdminCard className="p-5">
        <SectionHeading hint="The codes the provider and the network put on this transfer. They are what a query to Hubtel is traced by.">
          What Hubtel said
        </SectionHeading>
        <RecordFacts facts={facts} />
      </AdminCard>

      <ResolveDialog
        amountGhs={d.amountGhs}
        id={d.id}
        onClose={() => setResolving(false)}
        open={resolving}
      />
    </RecordShell>
  );
}

/**
 * The human override. Deliberately wordy about consequences: marking a payout
 * SUCCESS that actually failed loses the money silently, and marking one
 * FAILED that actually went out refunds a float that was rightly spent.
 */
function ResolveDialog({
  amountGhs,
  id,
  onClose,
  open,
}: {
  amountGhs: number;
  id: string;
  onClose: () => void;
  open: boolean;
}) {
  const [resolve, { isLoading }] = useResolveDisbursementMutation();
  const form = useForm<ResolveDisbursementValues>({
    defaultValues: { outcome: "SUCCESS", reason: "" },
    resolver: zodResolver(resolveDisbursementSchema),
  });

  const onSubmit = async (values: ResolveDisbursementValues) => {
    try {
      const res = await resolve({ id, ...values }).unwrap();
      notify.success(res.message);
      form.reset();
      onClose();
    } catch (err) {
      notify.error(extractApiError(err).message);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="sm:max-w-[520px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Record the real outcome</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Only after you have confirmed what happened to this{" "}
            {formatCedis(amountGhs)} on the Hubtel dashboard or with their
            support. The ledger will follow whatever you record here.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form
          className="space-y-5 px-4 pb-2 sm:px-0"
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
        >
          <AdminField label="What actually happened?">
            <Controller
              control={form.control}
              name="outcome"
              render={({ field }) => (
                <SimpleSelect
                  className={adminSelectClass}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Choose what happened to the money"
                  options={[
                    { value: "SUCCESS", label: "The money reached the recipient" },
                    { value: "FAILED", label: "It never went out (refund the float)" },
                  ]}
                />
              )}
            />
          </AdminField>
          <AdminField
            label="How did you confirm it?"
            error={form.formState.errors.reason?.message}
          >
            <Input
              className={cn(adminInputClass)}
              placeholder="e.g. Confirmed on the Hubtel dashboard, ref 88213"
              {...form.register("reason")}
            />
          </AdminField>
        </form>

        <ResponsiveDialogFooter>
          <AdminButton onClick={onClose} type="button" variant="ghost">
            Cancel
          </AdminButton>
          <AdminButton
            disabled={isLoading}
            loading={isLoading}
            onClick={() => void form.handleSubmit(onSubmit)()}
            type="button"
          >
            {isLoading ? "Recording…" : "Record outcome"}
          </AdminButton>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
