"use client";

import { useState } from "react";

import { HelpTip, HelpWrap } from "@/components/admin/help-tip";
import {
  AdminButton,
  AdminCard,
  Mono,
  SectionHeading,
  ToneBadge,
} from "@/components/admin/ui";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthRole } from "@/hooks/use-auth-role";
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedis } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useGetDriverSettlementQuery,
  useReverseDriverPaymentMutation,
} from "@/redux/driver-settlement/driver-settlement-api";
import type {
  IDriverPayment,
  IDriverSettlement,
} from "@/types/driver-settlement.types";

import {
  DriverFeeAdjustDialog,
  DriverFeeDialog,
  DriverPaymentDialog,
  ReverseReasonDialog,
} from "./driver-settlement-dialogs";
import {
  driverTriggerLabel,
  SEGMENT_TONES,
  SETTLEMENT_HINT,
  SETTLEMENT_TONE,
} from "./driver-policy-bits";

/**
 * What this trip owes its driver, and what has been paid.
 *
 * The reading order is the one the owner asked for and it is the whole design:
 * WHO drove, on WHAT terms, PAID how much, and what is LEFT. So the outstanding
 * balance leads at the largest size on the card - it is the only figure anyone
 * opens this to find - and everything else is subordinate to it.
 *
 * Money may be redacted to null for a caller without financial visibility. The
 * status badge is derived server-side precisely so that reader still learns
 * whether the driver has been paid without being shown by how much.
 */

/** A money figure, or the redaction placeholder. Never prints "null". */
function Figure({
  className,
  value,
}: {
  className?: string;
  value: null | number;
}) {
  if (value === null) {
    return <span className="text-adm-faint">Hidden</span>;
  }
  return (
    <Mono className={cn("tabular-nums", className)}>{formatCedis(value)}</Mono>
  );
}

function SettlementHeadline({ settlement }: { settlement: IDriverSettlement }) {
  const tone = SETTLEMENT_TONE[settlement.status];
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
            {settlement.hasFee ? "Still owed" : "Fee not agreed"}
          </span>
          <HelpTip
            label="What is still owed?"
            text="The agreed fee for this trip, less everything already paid to the driver."
          />
        </div>
        {/* The headline figure. 26px rather than the card's body size because
            this is the one number the card exists to show; a trip with no fee
            agreed shows a dash instead of a zero, which would read as settled. */}
        {settlement.hasFee ? (
          <Figure
            className="text-[26px] leading-[1.15] font-bold text-adm-ink"
            value={settlement.outstandingGhs}
          />
        ) : (
          <p className="text-[26px] leading-[1.15] font-bold text-adm-faint">
            &mdash;
          </p>
        )}
      </div>
      <HelpWrap text={SETTLEMENT_HINT[settlement.status]}>
        <ToneBadge tone={tone.tone}>{tone.label}</ToneBadge>
      </HelpWrap>
    </div>
  );
}

/** "04 Aug 2026", or nothing when the date was never set. */
const shortDate = (iso: null | string): null | string =>
  iso === null
    ? null
    : new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

/** Fee, paid and the terms, as a labelled trio that survives narrow columns. */
function SettlementFacts({
  departedAt,
  settlement,
}: {
  departedAt: null | string;
  settlement: IDriverSettlement;
}) {
  return (
    <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-adm-hairline pt-3.5 @min-[420px]/settle:grid-cols-3">
      <div className="min-w-0">
        <dt className="flex items-center gap-1.5 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
          Agreed fee
          <HelpTip
            label="What is the agreed fee?"
            text="The total this trip pays the driver, agreed before any money moves."
          />
        </dt>
        <dd className="mt-0.5 text-[14px] text-adm-ink">
          {settlement.hasFee ? (
            <>
              <Figure value={settlement.feeGhs} />
              {/* What was ORIGINALLY agreed, shown underneath whenever an
                  adjustment has moved the headline figure away from it. */}
              {settlement.adjustedByGhs !== null &&
              settlement.adjustedByGhs !== 0 &&
              settlement.agreedFeeGhs !== null ? (
                <span className="mt-0.5 block text-[11.5px] text-adm-faint">
                  agreed at {formatCedis(settlement.agreedFeeGhs)}
                </span>
              ) : null}
              {shortDate(settlement.agreedAt) ? (
                <span className="mt-0.5 block text-[11.5px] text-adm-faint">
                  on {shortDate(settlement.agreedAt)}
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-adm-faint">Not agreed</span>
          )}
        </dd>
      </div>
      <div className="min-w-0">
        <dt className="text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
          Paid so far
        </dt>
        <dd className="mt-0.5 text-[14px] text-adm-ink">
          <Figure value={settlement.paidGhs} />
        </dd>
      </div>
      <div className="min-w-0">
        <dt className="flex items-center gap-1.5 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
          Terms
          <HelpTip
            label="What are the terms?"
            text="The policy this trip was priced on. It is frozen here, so changing the policy later never rewrites this trip."
          />
        </dt>
        {/* [overflow-wrap:anywhere] and min-w-0: a policy name is free text
            and this sits in a third of a card that can be 280px wide. */}
        <dd className="mt-0.5 min-w-0 text-[14px] text-adm-ink [overflow-wrap:anywhere]">
          {settlement.policy?.name ?? (
            <span className="text-adm-faint">Not set</span>
          )}
          {/* The dispatch date belongs beside the terms: it is the moment the
              fee stopped being negotiable, so it is what any later argument
              about the figure is measured from. */}
          {shortDate(departedAt) ? (
            <span className="mt-0.5 block text-[11.5px] text-adm-faint">
              dispatched {shortDate(departedAt)}
            </span>
          ) : null}
        </dd>
      </div>
    </dl>
  );
}

/** The schedule, as the same split bar the policy cards use. */
function MilestoneSchedule({ settlement }: { settlement: IDriverSettlement }) {
  if (!settlement.snapshotValid || settlement.milestones.length === 0) {
    return null;
  }
  return (
    <div className="mt-4">
      <div
        aria-hidden="true"
        className="flex h-2 overflow-hidden rounded-full bg-adm-hairline"
      >
        {settlement.milestones.map((m, i) => (
          <div
            className={SEGMENT_TONES[i % SEGMENT_TONES.length]}
            key={`bar-${m.label}-${String(i)}`}
            style={{ width: `${String(m.percent)}%` }}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {settlement.milestones.map((m, i) => (
          <li
            className="flex items-baseline gap-3 text-[13px] leading-[1.4]"
            key={`${m.label}-${String(i)}`}
          >
            <span className="font-adminmono w-9 flex-none tabular-nums text-adm-muted">
              {m.percent}%
            </span>
            <span className="min-w-0 flex-1 text-adm-body [overflow-wrap:anywhere]">
              {m.label}
              <span className="text-adm-muted">
                {" "}
                · {driverTriggerLabel(m.trigger)}
              </span>
            </span>
            {/* flex-none: money never gives way, the label beside it does. */}
            <span className="flex-none text-adm-ink">
              <Figure value={m.amountGhs} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PaymentRow({
  onReverse,
  payment,
  reversible,
}: {
  onReverse: (p: IDriverPayment) => void;
  payment: IDriverPayment;
  reversible: boolean;
}) {
  const reversed = payment.reversedByPaymentId !== null;
  return (
    <li
      className={cn(
        "flex flex-col gap-1 py-2.5 @min-[520px]/settle:flex-row @min-[520px]/settle:items-baseline @min-[520px]/settle:gap-3",
        payment.isReversal && "opacity-80",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Mono className="text-[11.5px] text-adm-faint">
            {payment.transactionNo}
          </Mono>
          <span className="text-[11.5px] text-adm-faint">
            {new Date(payment.paidAt).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
          <span className="text-[11.5px] text-adm-faint">{payment.method}</span>
          {payment.isReversal ? (
            <HelpWrap text="This row cancels an earlier payment. Nothing is deleted, so the history still shows what happened.">
              <ToneBadge tone="slate">Reversal</ToneBadge>
            </HelpWrap>
          ) : null}
          {reversed ? (
            <HelpWrap text="This payment was cancelled by a later reversal row.">
              <ToneBadge tone="slate">Reversed</ToneBadge>
            </HelpWrap>
          ) : null}
        </div>
        {payment.reversalReason ? (
          <p className="mt-0.5 text-[12px] text-adm-muted [overflow-wrap:anywhere]">
            {payment.reversalReason}
          </p>
        ) : null}
        {payment.paymentAccount ? (
          <p className="mt-0.5 min-w-0 text-[12px] text-adm-faint [overflow-wrap:anywhere]">
            {payment.paymentAccount.label}
          </p>
        ) : null}
      </div>

      {/* The figure and its action sit on their own line below 520px: on a
          phone a reference, a date and a button sharing a row squeeze the
          money into a sliver. */}
      <div className="flex flex-none items-baseline justify-between gap-3 @min-[520px]/settle:justify-end">
        <Figure
          className={cn(
            "text-[14px] font-semibold",
            payment.isReversal ? "text-console-red" : "text-adm-ink",
          )}
          value={payment.amountGhs}
        />
        {reversible && !payment.isReversal && !reversed ? (
          <button
            className="cursor-pointer text-[12px] text-adm-muted transition-colors hover:text-console-red"
            onClick={() => {
              onReverse(payment);
            }}
            type="button"
          >
            Reverse
          </button>
        ) : null}
      </div>
    </li>
  );
}

export function DriverSettlementCard({
  canManage,
  shipmentId,
}: {
  /** False on a cancelled trip: nothing can be priced or paid against it. */
  canManage: boolean;
  shipmentId: string;
}) {
  const { isSuperAdmin } = useAuthRole();
  const [feeOpen, setFeeOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  // The row being reversed, held so the dialog can name it. Null when closed.
  const [reversing, setReversing] = useState<IDriverPayment | null>(null);
  const [reverse, reverseState] = useReverseDriverPaymentMutation();

  const { data, error, isError, isLoading, refetch } =
    useGetDriverSettlementQuery(shipmentId);

  const onReverse = async (reason: string) => {
    if (!reversing) return;
    try {
      await reverse({
        paymentId: reversing.id,
        reason,
        shipmentId,
      }).unwrap();
      notify.success("Payment reversed");
      setReversing(null);
    } catch (err) {
      // A reversal that would take the trip below zero is refused by name;
      // the dialog stays open so the reason typed is not lost.
      notify.error("Couldn't reverse the payment", {
        description: extractApiError(err).message,
      });
    }
  };

  if (isLoading) {
    return (
      <AdminCard className="p-5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-2 h-8 w-40" />
        <Skeleton className="mt-5 h-16 w-full" />
      </AdminCard>
    );
  }
  if (isError || !data) {
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );
  }

  const { adjustments, departedAt, driver, payments, settlement } = data.data;
  // Once the truck has gone the agreed fee is evidence, not a draft, so the
  // action changes from "edit it" to "record what changed". The server
  // enforces this too; the button just stops offering the wrong one.
  const dispatched = departedAt !== null;
  // Only the owner moves money. Staff read the card, which is why every figure
  // on it is redactable rather than the whole card being hidden.
  const manage = canManage && isSuperAdmin;

  return (
    // Its OWN container. This card sits in a detail column whose width the
    // viewport does not describe, so every breakpoint inside it measures the
    // card rather than the window.
    <AdminCard className="@container/settle p-5">
      <SectionHeading
        className="mb-4"
        hint="What this trip pays the haulier, and how much of it has actually gone out."
        actions={
          // The driver's name belongs here rather than in the headline: the
          // trip already names them, and repeating it larger would compete
          // with the figure the card exists to show.
          <p className="min-w-0 text-[12.5px] text-adm-muted [overflow-wrap:anywhere]">
            {driver.name}
          </p>
        }
      >
        Driver settlement
      </SectionHeading>

      <SettlementHeadline settlement={settlement} />
      <SettlementFacts departedAt={departedAt} settlement={settlement} />

      {/* A trip priced on terms nobody can read back is a real state and it
          says so, rather than silently showing an empty schedule - which
          would look like a policy with no milestones. */}
      {settlement.hasFee && !settlement.snapshotValid ? (
        <p className="mt-4 rounded-none bg-[#F8E9E7] px-3 py-2 text-[12.5px] text-[#8E2E24]">
          This trip&apos;s frozen terms could not be read. The fee and payments
          are still correct; re-agree the fee to restore the schedule.
        </p>
      ) : null}

      {/* The fee moved after dispatch, so both figures are on screen. Showing
          only the current one is exactly how a haulier ends up saying "we
          settled on X" against a record that no longer contains X. */}
      {adjustments.length > 0 ? (
        <div className="mt-4 rounded-none border border-adm-line bg-adm-sunken px-3.5 py-3">
          <p className="text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
            Changed after dispatch
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {adjustments.map((a) => {
              const up = (a.amountGhs ?? 0) > 0;
              return (
                <li className="flex items-baseline gap-3 text-[13px]" key={a.id}>
                  {/* flex-none: the figure and its date hold their width and
                      the reason gives way, never the other way round. */}
                  <span
                    className={cn(
                      "flex-none font-semibold",
                      up ? "text-adm-ink" : "text-console-red",
                    )}
                  >
                    {a.amountGhs === null ? (
                      <span className="text-adm-faint">Hidden</span>
                    ) : (
                      <>
                        {up ? "+" : "-"}
                        {formatCedis(Math.abs(a.amountGhs))}
                      </>
                    )}
                  </span>
                  <span className="min-w-0 flex-1 text-adm-body [overflow-wrap:anywhere]">
                    {a.reason}
                  </span>
                  <span className="flex-none text-[11.5px] text-adm-faint">
                    {new Date(a.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <MilestoneSchedule settlement={settlement} />

      {payments.length > 0 ? (
        <div className="mt-5 border-t border-adm-hairline pt-2">
          <p className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
            Payments
          </p>
          {/* divide-y, not a border per row: the hairline belongs BETWEEN
              rows, so the last has no rule running into the card's edge. */}
          <ul className="divide-y divide-adm-hairline">
            {payments.map((p) => (
              <PaymentRow
                key={p.id}
                onReverse={setReversing}
                payment={p}
                reversible={manage}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {manage ? (
        // Buttons wrap as whole pills rather than wrapping their own labels.
        <div className="mt-5 flex flex-wrap gap-2">
          {dispatched && settlement.hasFee ? (
            <AdminButton
              onClick={() => setAdjustOpen(true)}
              variant="ghost"
            >
              Adjust the fee
            </AdminButton>
          ) : (
            <AdminButton
              onClick={() => setFeeOpen(true)}
              variant={settlement.hasFee ? "ghost" : "primary"}
            >
              {settlement.hasFee ? "Change fee" : "Agree the fee"}
            </AdminButton>
          )}
          {settlement.hasFee && settlement.status !== "SETTLED" ? (
            <AdminButton onClick={() => setPayOpen(true)}>
              Record a payment
            </AdminButton>
          ) : null}
        </div>
      ) : null}

      {feeOpen ? (
        <DriverFeeDialog
          currentFeeGhs={settlement.feeGhs}
          onClose={() => {
            setFeeOpen(false);
          }}
          shipmentId={shipmentId}
        />
      ) : null}
      {payOpen ? (
        <DriverPaymentDialog
          driverName={driver.name}
          onClose={() => {
            setPayOpen(false);
          }}
          outstandingGhs={settlement.outstandingGhs}
          shipmentId={shipmentId}
        />
      ) : null}
      {adjustOpen ? (
        <DriverFeeAdjustDialog
          onClose={() => {
            setAdjustOpen(false);
          }}
          shipmentId={shipmentId}
        />
      ) : null}
      {reversing ? (
        <ReverseReasonDialog
          onClose={() => {
            setReversing(null);
          }}
          onSubmit={(reason) => void onReverse(reason)}
          subject={reversing.transactionNo}
          submitting={reverseState.isLoading}
        />
      ) : null}
    </AdminCard>
  );
}
