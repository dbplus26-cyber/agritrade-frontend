"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DateTimeCell } from "@/components/admin/date-cell";
import { DetailSkeleton } from "@/components/admin/skeletons";
import {
  AdminButton,
  AdminField,
  DetailHeader,
  DetailRow,
  DetailShell,
  Mono,
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/ui";
import { DASHBOARD_CRUMB, DetailNav } from "@/components/admin/detail-nav";
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
  TitledCard,
  recipientLine,
} from "./disbursement-bits";

const LIST = "/admin/disbursements";

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

  return (
    <div className="space-y-5">
      <DetailNav
        crumbs={[DASHBOARD_CRUMB, { label: "Money sent", href: LIST }]}
        current="Payout details"
      />
      <DetailHeader
        title="Payout details"
        hint="One transfer sent out: where it went and whether it arrived."
        sub={
          <>
            <span>{RAIL_LABEL[d.rail]}</span>
            <Mono>{d.transactionNo}</Mono>
          </>
        }
        actions={
          settled ? null : (
            <>
              <AdminButton
                disabled={checkState.isLoading}
                onClick={() => void onCheck()}
                type="button"
                variant="ghost"
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

      {d.needsAttention ? (
        <div className="rounded-none border border-console-red/40 bg-console-red/5 px-4 py-3 text-[13px] text-console-red">
          Hubtel has not given a final answer for this payout after several
          checks. It has NOT been marked failed, because the money may well
          have gone out - confirm on the Hubtel dashboard, then record the real
          outcome with &ldquo;Resolve manually&rdquo;.
        </div>
      ) : null}

      <DetailShell
        main={
          <div className="space-y-5">
            <TitledCard title="The payout">
              <DetailRow label="Amount">
                <Money className="text-[15px] font-bold" value={d.amountGhs} />
              </DetailRow>
              <DetailRow label="Status">
                <DisbursementStatusBadge
                  needsAttention={d.needsAttention}
                  status={d.status}
                />
              </DetailRow>
              <DetailRow label="Recipient">{d.recipientName}</DetailRow>
              <DetailRow label="Sent to">
                <Mono>{recipientLine(d)}</Mono>
              </DetailRow>
              <DetailRow label="Description">{d.description}</DetailRow>
              {/* Charges and the true debit only exist once Hubtel has told
                  us what it actually took - before that they are honestly
                  absent rather than shown as zero. */}
              {d.chargesGhs !== null ? (
                <DetailRow
                  hint="What the payment provider took on top of the amount, for moving the money."
                  label="Hubtel charges"
                >
                  <Money value={d.chargesGhs} />
                </DetailRow>
              ) : null}
              {d.amountDebitedGhs !== null ? (
                <DetailRow
                  hint="What actually left your account: the amount sent plus the provider\u2019s charges."
                  label="Total debited"
                >
                  <Money value={d.amountDebitedGhs} />
                </DetailRow>
              ) : null}
              {d.failureReason ? (
                <DetailRow label="Why it failed">
                  <span className="text-console-red">{d.failureReason}</span>
                </DetailRow>
              ) : null}
            </TitledCard>

            <TitledCard title="What Hubtel said">
              <DetailRow
                hint="The code this console put on the payment, for tracing it back here."
                label="Our reference"
              >
                <Mono>{d.clientReference}</Mono>
              </DetailRow>
              <DetailRow
                hint="The payment provider\u2019s own code for this payout: quote it when you call them."
                label="Hubtel transaction"
              >
                {d.hubtelTransactionId ? (
                  <Mono>{d.hubtelTransactionId}</Mono>
                ) : (
                  <span className="text-adm-faint">Not given</span>
                )}
              </DetailRow>
              <DetailRow
                hint="The mobile network or bank\u2019s own code for the transfer, deeper than the provider\u2019s."
                label="Network reference"
              >
                {d.externalTransactionId ? (
                  <Mono>{d.externalTransactionId}</Mono>
                ) : (
                  <span className="text-adm-faint">Not given</span>
                )}
              </DetailRow>
              <DetailRow
                hint="The provider\u2019s short answer for what happened, useful when a payment is queried."
                label="Response code"
              >
                {d.responseCode ? (
                  <Mono>{d.responseCode}</Mono>
                ) : (
                  <span className="text-adm-faint">None yet</span>
                )}
              </DetailRow>
            </TitledCard>
          </div>
        }
        aside={
          <TitledCard title="Trail">
            <DetailRow
              hint="Whose money this came out of: one person\u2019s float, or the company account directly."
              label="Paid from"
            >
              {d.holder
                ? `${d.holder.name}'s float`
                : "The company account directly"}
            </DetailRow>
            <DetailRow label="Requested by">
              {d.requestedByName ?? "Unknown"}
            </DetailRow>
            <DetailRow label="Recorded">
              <DateTimeCell value={d.createdAt} />
            </DetailRow>
            <DetailRow label="Sent to Hubtel">
              {d.submittedAt ? (
                <DateTimeCell value={d.submittedAt} />
              ) : (
                <span className="text-adm-faint">Not yet</span>
              )}
            </DetailRow>
            <DetailRow
              hint="When the provider gave a final answer on this payment, one way or the other."
              label="Settled"
            >
              {d.settledAt ? (
                <DateTimeCell value={d.settledAt} />
              ) : (
                <span className="text-adm-faint">Not yet</span>
              )}
            </DetailRow>
          </TitledCard>
        }
      />

      <ResolveDialog
        amountGhs={d.amountGhs}
        id={d.id}
        onClose={() => setResolving(false)}
        open={resolving}
      />
    </div>
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
