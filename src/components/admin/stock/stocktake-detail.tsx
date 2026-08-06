"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AdminButton,
  AdminCard,
  AdminPageHeader,
  DetailRow,
  DetailShell,
  Mono,
} from "@/components/admin/ui";
import { Absent } from "@/components/admin/registry/registry-bits";
import { BackButton } from "@/components/ui/BackButton";
import { DetailSkeleton } from "@/components/admin/skeletons";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useAuthRole } from "@/hooks/use-auth-role";
import { useConfirm } from "@/hooks/use-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { formatDateTime } from "@/lib/format-date";
import { notify } from "@/lib/notify";
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
    // h-full so the sheet ends where the rail beside it does. A stocktake of
    // one or two lines left a short card at the top of the left column with
    // the rail running past it to the bottom of the page - two columns that
    // start together and end nowhere near each other read as broken rather
    // than as a short list. Filling puts the slack inside the card, below the
    // rows, where on a count sheet it reads as room for more.
    <AdminCard className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-adm-hairline px-4 py-3 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase sm:px-5">
        Count lines
      </div>
      <div className="@container/lines">
        {/* Wide: the real four-column table. */}
        <div className="hidden overflow-x-auto @xl/lines:block">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-adm-sunken text-left text-[10.5px] font-bold uppercase tracking-[0.09em] text-adm-muted">
                <th className="px-5 py-2.5">Commodity</th>
                <th className="px-5 py-2.5 text-right">Counted</th>
                <th className="px-5 py-2.5 text-right">Book</th>
                <th className="px-5 py-2.5 text-right">Difference</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.commodity.id} className="border-t border-adm-hairline">
                  <td className="px-5 py-2 font-medium text-adm-ink">
                    <span
                      className="block min-w-0 max-w-[260px] line-clamp-1 whitespace-normal [overflow-wrap:anywhere]"
                      title={l.commodity.name}
                    >
                      {l.commodity.name}
                    </span>
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
                <span
                  className="min-w-0 text-[13.5px] font-medium text-adm-ink line-clamp-1 whitespace-normal [overflow-wrap:anywhere]"
                  title={l.commodity.name}
                >
                  {l.commodity.name}
                </span>
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
        title={`Stocktake ${st.transactionNo}`}
        sub={`Created ${formatDateTime(st.createdAt)}`}
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
        <DetailShell
          main={<LinesCard lines={st.lines} />}
          aside={
            <AdminCard className="px-5 py-4">
              <div className="text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
                Sheet
              </div>
              <div className="mt-1 divide-y divide-adm-hairline">
                <DetailRow label="Warehouse">
                  <Link
                    href={`/admin/warehouses/${st.warehouse.id}`}
                    className="text-console underline-offset-2 hover:underline"
                  >
                    {st.warehouse.name}
                  </Link>
                </DetailRow>
                <DetailRow label="Lines" mono>
                  {st.lines.length}
                </DetailRow>
                <DetailRow label="Created">
                  {formatDateTime(st.createdAt)}
                </DetailRow>
                <DetailRow label="Submitted">
                  {st.submittedAt ? formatDateTime(st.submittedAt) : <Absent />}
                </DetailRow>
                <DetailRow label="Decided">
                  {st.decidedAt ? formatDateTime(st.decidedAt) : <Absent />}
                </DetailRow>
                {st.notes ? (
                  <DetailRow label="Notes">{st.notes}</DetailRow>
                ) : null}
              </div>

              {st.status === StocktakeStatus.DRAFT ? (
                <div className="mt-4 flex flex-col gap-2">
                  <AdminButton
                    className="w-full"
                    disabled={busy}
                    onClick={() => void onSubmit()}
                  >
                    {submitState.isLoading ? "Submitting…" : "Submit"}
                  </AdminButton>
                  <AdminButton
                    variant="secondary"
                    className="w-full"
                    disabled={busy}
                    onClick={() => setEditing(true)}
                  >
                    Edit counts
                  </AdminButton>
                  <AdminButton
                    variant="outline"
                    className="w-full text-console-red hover:text-console-red"
                    disabled={busy}
                    onClick={() => void onCancel()}
                  >
                    {cancelState.isLoading ? "Cancelling…" : "Cancel stocktake"}
                  </AdminButton>
                </div>
              ) : st.status === StocktakeStatus.SUBMITTED ? (
                <div className="mt-4 flex flex-col gap-2">
                  {isSuperAdmin ? (
                    <AdminButton
                      className="w-full"
                      disabled={busy}
                      onClick={() => void onApprove()}
                    >
                      {approveState.isLoading ? "Approving…" : "Approve"}
                    </AdminButton>
                  ) : (
                    <p className="text-[12.5px] text-adm-muted">
                      Waiting for the owner to approve or cancel this sheet.
                    </p>
                  )}
                  <AdminButton
                    variant="outline"
                    className="w-full text-console-red hover:text-console-red"
                    disabled={busy}
                    onClick={() => void onCancel()}
                  >
                    {cancelState.isLoading ? "Cancelling…" : "Cancel stocktake"}
                  </AdminButton>
                </div>
              ) : (
                <p className="mt-4 text-[12.5px] text-adm-muted">
                  {st.status === StocktakeStatus.APPROVED
                    ? `Approved ${st.decidedAt ? formatDateTime(st.decidedAt) : ""} - every difference posted as a stock adjustment.`
                    : `Cancelled ${st.decidedAt ? formatDateTime(st.decidedAt) : ""} - nothing posted from this sheet.`}
                </p>
              )}
            </AdminCard>
          }
        />
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
