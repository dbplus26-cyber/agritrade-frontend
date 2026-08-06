"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  DetailGrid,
  DetailItem,
  DetailShell,
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/ui";
import { BackButton } from "@/components/ui/BackButton";
import { DetailSkeleton } from "@/components/admin/skeletons";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Absent } from "@/components/admin/registry/registry-bits";
import { useAuthRole } from "@/hooks/use-auth-role";
import { useConfirm } from "@/hooks/use-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { formatDateTime } from "@/lib/format-date";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useDeleteEnquiryMutation,
  useGetEnquiryQuery,
  useUpdateEnquiryMutation,
} from "@/redux/enquiries/enquiries-api";
import {
  ENQUIRY_STATUSES,
  type EnquiryStatus,
  type IAdminEnquiry,
} from "@/types/inbox.types";
import { ENQUIRY_STATUS_META, EnquiryStatusBadge } from "./inbox-bits";

const LIST = "/admin/enquiries";

function EnquiryDetailBody({ enquiry }: { enquiry: IAdminEnquiry }) {
  const router = useRouter();
  const { isSuperAdmin } = useAuthRole();
  const { confirm, confirmationDialog } = useConfirm();
  const [updateEnquiry, { isLoading: saving }] = useUpdateEnquiryMutation();
  const [deleteEnquiry, { isLoading: deleting }] = useDeleteEnquiryMutation();

  const [status, setStatus] = useState<EnquiryStatus>(enquiry.status);
  const [notes, setNotes] = useState(enquiry.notes ?? "");
  const statusDirty = status !== enquiry.status;
  const notesDirty = notes.trim() !== (enquiry.notes ?? "");
  const dirty = statusDirty || notesDirty;

  const replyHref = enquiry.email
    ? `mailto:${enquiry.email}?subject=${encodeURIComponent(
        `Re: ${enquiry.subject} (${enquiry.reference})`,
      )}`
    : null;

  const onSave = async () => {
    try {
      await updateEnquiry({
        id: enquiry.id,
        body: {
          ...(statusDirty ? { status } : {}),
          ...(notesDirty ? { notes: notes.trim() || null } : {}),
        },
      }).unwrap();
      notify.success("Enquiry updated");
    } catch (err) {
      notify.error("Couldn't update the enquiry", {
        description: extractApiError(err).message,
      });
    }
  };

  const onDelete = async () => {
    const confirmed = await confirm({
      title: "Delete this enquiry?",
      description: `${enquiry.reference} from ${enquiry.fullName} will be removed permanently. This cannot be undone.`,
      confirmText: "Delete enquiry",
      isDestructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteEnquiry(enquiry.id).unwrap();
      notify.success("Enquiry deleted");
      router.push(LIST);
    } catch (err) {
      notify.error("Couldn't delete the enquiry", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <div>
      <BackButton href={LIST} label="All enquiries" className="mb-2" />
      <AdminPageHeader
        title="Enquiry details"
        sub={`Enquiry ${enquiry.reference}`}
        actions={<EnquiryStatusBadge status={enquiry.status} />}
      />

      <DetailShell
        asideFirstOnStack={false}
        main={
          <div className="flex flex-col gap-5">
            {/* The message itself, filed as a document. */}
            <AdminCard className="px-5 py-[18px]">
              <p className="text-[11px] uppercase tracking-[0.14em] text-adm-muted">
                {enquiry.subject}
              </p>
              <p className="mt-3 text-[14px] leading-[1.75] whitespace-pre-wrap text-adm-ink [overflow-wrap:anywhere]">
                {enquiry.message}
              </p>
              {replyHref ? (
                <div className="mt-4 border-t border-adm-hairline pt-3.5">
                  <AdminButton asChild variant="gold" className="h-9 px-4">
                    <a href={replyHref}>Reply by email</a>
                  </AdminButton>
                </div>
              ) : null}
            </AdminCard>

            {/* Provenance as a fact GRID, not label-left/value-right rows.
                Spreading each pair to opposite edges of a full-width card put
                40rem of nothing between "Reference" and its value, so nothing
                read as a pair; DetailItem stacks the label directly
                over its value with a hairline under each, and the grid packs
                three of them per row on a wide console. */}
            <AdminCard className="px-5 py-3">
              <p className="mb-1.5 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
                Sender &amp; provenance
              </p>
              <DetailGrid>
                {/* Who sent it. This was the page heading; the heading now
                    names the page, so the record names the sender. */}
                <DetailItem label="From" strong>
                  {enquiry.fullName}
                </DetailItem>
                <DetailItem label="Reference" mono>
                  {enquiry.reference}
                </DetailItem>
                <DetailItem label="Phone" mono>
                  <a
                    href={`tel:${enquiry.phone}`}
                    className="text-console hover:underline"
                  >
                    {enquiry.phone}
                  </a>
                </DetailItem>
                <DetailItem label="Email">
                  {enquiry.email ? (
                    <a
                      href={`mailto:${enquiry.email}`}
                      className="text-console hover:underline"
                    >
                      {enquiry.email}
                    </a>
                  ) : (
                    <Absent />
                  )}
                </DetailItem>
                <DetailItem label="Received">
                  {formatDateTime(enquiry.receivedAt)}
                </DetailItem>
                <DetailItem label="Submitted from" mono>
                  {enquiry.ip ?? <Absent />}
                </DetailItem>
              </DetailGrid>
            </AdminCard>
          </div>
        }
        aside={
          <div className="flex flex-col gap-5">
            <AdminCard className="px-5 py-[18px]">
              <div className="flex flex-col gap-[13px]">
                <AdminField label="Status">
                  <select
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value as EnquiryStatus);
                    }}
                    className={cn(adminSelectClass, "w-full")}
                  >
                    {ENQUIRY_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {ENQUIRY_STATUS_META[s].label}
                      </option>
                    ))}
                  </select>
                </AdminField>
                <AdminField
                  label="Internal notes"
                  optional
                  hint="For the office only - the sender never sees these."
                >
                  <textarea
                    rows={4}
                    maxLength={2000}
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value);
                    }}
                    placeholder="Who called back, what was agreed…"
                    className={cn(
                      adminInputClass,
                      "h-auto min-h-[112px] w-full resize-y py-2",
                    )}
                  />
                </AdminField>
                <AdminButton
                  type="button"
                  disabled={!dirty || saving}
                  onClick={() => void onSave()}
                  className="h-[38px] px-[18px]"
                >
                  {saving ? "Saving…" : "Save changes"}
                </AdminButton>
              </div>
            </AdminCard>

            {isSuperAdmin ? (
              <AdminCard className="px-5 py-4">
                <p className="text-[12.5px] text-adm-muted">
                  Deleting removes the enquiry permanently.
                </p>
                <AdminButton
                  type="button"
                  variant="danger"
                  disabled={deleting}
                  onClick={() => void onDelete()}
                  className="mt-2.5 h-9 px-4"
                >
                  {deleting ? "Deleting…" : "Delete enquiry"}
                </AdminButton>
              </AdminCard>
            ) : null}
          </div>
        }
      />
      {confirmationDialog}
    </div>
  );
}

/** /admin/enquiries/[id] - one enquiry, workable from a phone. */
export function EnquiryDetail({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetEnquiryQuery(id);

  if (isLoading) return <DetailSkeleton facts={5} />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const enquiry = data.data.enquiry;
  // Keyed on updatedAt so a successful PATCH reseeds the working copy.
  return <EnquiryDetailBody key={enquiry.updatedAt} enquiry={enquiry} />;
}
