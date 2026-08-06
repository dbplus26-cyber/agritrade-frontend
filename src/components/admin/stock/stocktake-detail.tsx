"use client";

import { useState } from "react";
import Link from "next/link";
import {
  adminLinkClass,
  AdminButton,
  AdminCard,
  AdminPageHeader,
  DetailGrid,
  DetailItem,
  Mono,
  SectionHeading,
} from "@/components/admin/ui";
import { Absent } from "@/components/admin/registry/registry-bits";
import { HelpTip } from "@/components/admin/help-tip";
import { BackButton } from "@/components/ui/BackButton";
import { DetailSkeleton } from "@/components/admin/skeletons";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useAuthRole } from "@/hooks/use-auth-role";
import { useConfirm } from "@/hooks/use-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { formatDateTime } from "@/lib/format-date";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useApproveStocktakeMutation,
  useCancelStocktakeMutation,
  useGetStocktakeQuery,
  useSubmitStocktakeMutation,
  useUpdateStocktakeMutation,
} from "@/redux/stocktakes/stocktakes-api";
import type { IStocktakeLine, IStocktakeLineInput } from "@/types/ops.types";
import { StocktakeStatus } from "@/types/ops.types";
import { Kg, SignedKg } from "./stock-bits";
import { StocktakeCountSheet, StocktakeStatusBadge } from "./stocktake-bits";

const LIST = "/admin/stocktakes";

/** Counted vs book difference; only meaningful once the sheet is submitted. */
function Delta({ deltaKg }: { deltaKg: number | null }) {
  if (deltaKg === null) return <Absent />;
  if (deltaKg === 0)
    return <Mono className="text-[13px] text-adm-muted">0 kg</Mono>;
  return <SignedKg kg={deltaKg} />;
}

/** The count lines, dual-rendered off this card's own container width. */
function LinesCard({ lines }: { lines: IStocktakeLine[] }) {
  return (
    <AdminCard className="overflow-hidden">
      {/* The rule stays on the band; mb-0 because the band's py-3 already
          spaces the title off the table below it. */}
      <div className="border-b border-adm-hairline px-4 py-3 sm:px-5">
        <SectionHeading className="mb-0">Count lines</SectionHeading>
      </div>
      <div className="@container/lines">
        {/* Wide: the real four-column table. */}
        <div className="hidden overflow-x-auto @xl/lines:block">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-adm-sunken text-left text-[10.5px] font-bold uppercase tracking-[0.09em] text-adm-muted">
                {/* The named column takes the slack; Counted, Book and Difference
                    are short fixed figures and size to themselves. Without
                    this the four columns split evenly and the commodity - the
                    only one that can run long - got a quarter of the table. */}
                <th className="w-full px-5 py-2.5">Commodity</th>
                <th className="px-5 py-2.5 text-right whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 align-middle">
                    Counted
                    <HelpTip
                      label="What is the counted weight?"
                      text="What was physically found on the warehouse floor when the sheet was filled in."
                    />
                  </span>
                </th>
                <th className="px-5 py-2.5 text-right whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 align-middle">
                    Book
                    <HelpTip
                      label="What is the book weight?"
                      text="What the system expected to be there, worked out from every purchase, load and transfer."
                    />
                  </span>
                </th>
                <th className="px-5 py-2.5 text-right whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 align-middle">
                    Difference
                    <HelpTip
                      label="What is the difference?"
                      text="The gap between what was counted and what the books expected; approving the sheet corrects the books by it."
                    />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.commodity.id} className="border-t border-adm-hairline">
                  <td className="px-5 py-2 font-medium">
                    <Link
                      className={cn(
                        adminLinkClass,
                        "block min-w-0 max-w-[260px] line-clamp-1 whitespace-normal [overflow-wrap:anywhere]",
                      )}
                      href={`/admin/commodities/${l.commodity.id}`}
                      title={l.commodity.name}
                    >
                      {l.commodity.name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-5 py-2 text-right">
                    <Kg kg={l.countedKg} className="font-semibold text-adm-ink" />
                  </td>
                  <td className="whitespace-nowrap px-5 py-2 text-right">
                    {l.derivedKg === null ? (
                      <Absent />
                    ) : (
                      <Kg kg={l.derivedKg} className="text-adm-muted" />
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-2 text-right">
                    <Delta deltaKg={l.deltaKg} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Narrow: two dense lines per commodity - never a sideways scroll. */}
        <div className="px-4 @xl/lines:hidden">
          {lines.map((l) => (
            <div
              key={l.commodity.id}
              className="border-b border-adm-hairline py-2.5 last:border-b-0"
            >
              <div className="flex items-baseline justify-between gap-3">
                <Link
                  className={cn(
                    adminLinkClass,
                    "min-w-0 text-[13.5px] font-medium line-clamp-1 whitespace-normal [overflow-wrap:anywhere]",
                  )}
                  href={`/admin/commodities/${l.commodity.id}`}
                  title={l.commodity.name}
                >
                  {l.commodity.name}
                </Link>
                <Kg
                  kg={l.countedKg}
                  className="flex-none text-[13px] font-semibold text-adm-ink"
                />
              </div>
              {l.derivedKg !== null ? (
                <div className="mt-0.5 flex items-baseline justify-between gap-3 text-[12.5px]">
                  <span className="text-adm-muted">
                    Book <Kg kg={l.derivedKg} className="text-adm-muted" />
                  </span>
                  <Delta deltaKg={l.deltaKg} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </AdminCard>
  );
}

export function StocktakeDetail({ id }: { id: string }) {
  const { isSuperAdmin } = useAuthRole();
  const { confirm, confirmationDialog } = useConfirm();
  const [editing, setEditing] = useState(false);

  const { data, isLoading, isError, error, refetch } = useGetStocktakeQuery(id);
  const [updateStocktake, updateState] = useUpdateStocktakeMutation();
  const [submitStocktake, submitState] = useSubmitStocktakeMutation();
  const [approveStocktake, approveState] = useApproveStocktakeMutation();
  const [cancelStocktake, cancelState] = useCancelStocktakeMutation();

  if (isLoading) return <DetailSkeleton facts={4} table />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const st = data.data.stocktake;
  const busy =
    submitState.isLoading || approveState.isLoading || cancelState.isLoading;

  const onSaveCounts = async (lines: IStocktakeLineInput[], notes: string) => {
    try {
      await updateStocktake({
        id: st.id,
        body: { lines, ...(notes ? { notes } : {}) },
      }).unwrap();
      notifySuccess("Counts updated");
      setEditing(false);
    } catch (err) {
      notifyError("Couldn't update the counts", err);
    }
  };

  const onSubmit = async () => {
    const ok = await confirm({
      title: `Submit ${st.transactionNo}?`,
      description:
        "Snapshots the book balances - every line's difference is fixed at this moment and the counts lock.",
      confirmText: "Submit",
    });
    if (!ok) return;
    try {
      await submitStocktake(st.id).unwrap();
      notifySuccess("Stocktake submitted");
    } catch (err) {
      notifyError("Couldn't submit the stocktake", err);
    }
  };

  const onApprove = async () => {
    const ok = await confirm({
      title: `Approve ${st.transactionNo}?`,
      description:
        "Posts an adjustment for every difference - the book moves to match the count.",
      confirmText: "Approve",
    });
    if (!ok) return;
    try {
      await approveStocktake(st.id).unwrap();
      notifySuccess("Stocktake approved - adjustments posted");
    } catch (err) {
      notifyError("Couldn't approve the stocktake", err);
    }
  };

  const onCancel = async () => {
    const ok = await confirm({
      title: `Cancel ${st.transactionNo}?`,
      description: "The sheet keeps its counts but nothing will ever post from it.",
      confirmText: "Cancel stocktake",
      isDestructive: true,
    });
    if (!ok) return;
    try {
      await cancelStocktake(st.id).unwrap();
      notifySuccess("Stocktake cancelled");
    } catch (err) {
      notifyError("Couldn't cancel the stocktake", err);
    }
  };

  return (
    <div className="max-w-[1120px]">
      <BackButton href={LIST} label="All stocktakes" className="mb-2" />
      <AdminPageHeader
        title="Stocktake details"
        hint="One physical count, and the difference from what the system expected."
        actions={<StocktakeStatusBadge status={st.status} />}
      />

      {editing && st.status === StocktakeStatus.DRAFT ? (
        <div className="max-w-[640px]">
          <StocktakeCountSheet
            warehouseId={st.warehouse.id}
            initialLines={st.lines.map((l) => ({
              commodityId: l.commodity.id,
              commodityName: l.commodity.name,
              countedKg: l.countedKg,
            }))}
            initialNotes={st.notes ?? ""}
            saving={updateState.isLoading}
            submitLabel="Save counts"
            onCancel={() => setEditing(false)}
            onSave={(lines, notes) => void onSaveCounts(lines, notes)}
          />
        </div>
      ) : (
        // ONE COLUMN, not a rail. A stocktake is a warehouse, a date and a
        // list of counts - the list is short by nature (a warehouse holds a
        // handful of commodities, not a hundred), so pairing it with a rail
        // guaranteed a stunted left column beside a tall right one. Stretching
        // the sheet to match only moved the empty space inside it.
        //
        // The facts read across the top where they take one line each, the
        // actions sit under them, and the counts get the full width - which is
        // where the width was wanted anyway, since that is the table with four
        // columns in it. Balanced at one line or twenty, because there is no
        // second column left to be out of step with.
        <div className="flex flex-col gap-4">
          <AdminCard className="@container p-5">
            <SectionHeading className="mb-1">Sheet</SectionHeading>
            <DetailGrid>
              <DetailItem label="Stocktake no" mono strong>
                {st.transactionNo}
              </DetailItem>
              <DetailItem label="Warehouse">
                <Link
                  href={`/admin/warehouses/${st.warehouse.id}`}
                  className={adminLinkClass}
                >
                  {st.warehouse.name}
                </Link>
              </DetailItem>
              <DetailItem label="Lines" mono>
                {st.lines.length}
              </DetailItem>
              <DetailItem label="Created">
                {formatDateTime(st.createdAt)}
              </DetailItem>
              <DetailItem label="Submitted">
                {st.submittedAt ? formatDateTime(st.submittedAt) : <Absent />}
              </DetailItem>
              <DetailItem label="Decided">
                {st.decidedAt ? formatDateTime(st.decidedAt) : <Absent />}
              </DetailItem>
              {/* Notes take the row. A count sheet's note is a sentence about
                  what was found, and beside a one-line fact it left the label
                  stranded at the top of a deep cell. */}
              {st.notes ? (
                <DetailItem full label="Notes">
                  {st.notes}
                </DetailItem>
              ) : null}
            </DetailGrid>

            {st.status === StocktakeStatus.DRAFT ? (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-adm-hairline pt-4">
                <AdminButton disabled={busy} onClick={() => void onSubmit()}>
                  {submitState.isLoading ? "Submitting…" : "Submit"}
                </AdminButton>
                <AdminButton
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setEditing(true)}
                >
                  Edit counts
                </AdminButton>
                <AdminButton
                  variant="outline"
                  className="text-console-red hover:text-console-red"
                  disabled={busy}
                  onClick={() => void onCancel()}
                >
                  {cancelState.isLoading ? "Cancelling…" : "Cancel stocktake"}
                </AdminButton>
              </div>
            ) : st.status === StocktakeStatus.SUBMITTED ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-adm-hairline pt-4">
                {isSuperAdmin ? (
                  <AdminButton disabled={busy} onClick={() => void onApprove()}>
                    {approveState.isLoading ? "Approving…" : "Approve"}
                  </AdminButton>
                ) : (
                  <p className="text-[12.5px] text-adm-muted">
                    Waiting for the owner to approve or cancel this sheet.
                  </p>
                )}
                <AdminButton
                  variant="outline"
                  className="text-console-red hover:text-console-red"
                  disabled={busy}
                  onClick={() => void onCancel()}
                >
                  {cancelState.isLoading ? "Cancelling…" : "Cancel stocktake"}
                </AdminButton>
              </div>
            ) : (
              <p className="mt-4 border-t border-adm-hairline pt-4 text-[12.5px] text-adm-muted">
                {st.status === StocktakeStatus.APPROVED
                  ? `Approved ${st.decidedAt ? formatDateTime(st.decidedAt) : ""} - every difference posted as a stock adjustment.`
                  : `Cancelled ${st.decidedAt ? formatDateTime(st.decidedAt) : ""} - nothing posted from this sheet.`}
              </p>
            )}
          </AdminCard>

          <LinesCard lines={st.lines} />
        </div>
      )}

      {confirmationDialog}
    </div>
  );
}

/** Toast wrappers so the lifecycle handlers read top-to-bottom. */
function notifySuccess(title: string) {
  notify.success(title);
}
function notifyError(title: string, err: unknown) {
  notify.error(title, { description: extractApiError(err).message });
}
