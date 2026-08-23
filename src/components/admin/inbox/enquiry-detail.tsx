"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminButton,
  AdminCard,
  AdminField,
  DetailGrid,
  DetailHeader,
  DetailItem,
  DetailShell,
  SectionHeading,
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/ui";
import { DASHBOARD_CRUMB, DetailNav } from "@/components/admin/detail-nav";
import { SimpleSelect } from "@/components/ui/simple-select";
import { DetailSkeleton } from "@/components/admin/skeletons";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Absent } from "@/components/admin/registry/registry-bits";
import { useAuthRole } from "@/hooks/use-auth-role";
import { usePermissions } from "@/hooks/use-permissions";
import { useConfirm } from "@/hooks/use-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { formatDateTime } from "@/lib/format-date";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useDeleteEnquiryMutation,
  useGetEnquiryQuery,
  useReplyToEnquiryMutation,
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
  const { has } = usePermissions();
  const canModerate = isSuperAdmin || has("WEBSITE_MODERATE");
  const { confirm, confirmationDialog } = useConfirm();
  const [updateEnquiry, { isLoading: saving }] = useUpdateEnquiryMutation();
  const [deleteEnquiry, { isLoading: deleting }] = useDeleteEnquiryMutation();
  const [replyToEnquiry, { isLoading: replying }] = useReplyToEnquiryMutation();

  const [status, setStatus] = useState<EnquiryStatus>(enquiry.status);
  const [notes, setNotes] = useState(enquiry.notes ?? "");
  const statusDirty = status !== enquiry.status;
  const notesDirty = notes.trim() !== (enquiry.notes ?? "");
  const dirty = statusDirty || notesDirty;

  const [replyBody, setReplyBody] = useState("");
  const canReply = canModerate && Boolean(enquiry.email);

  /**
   * Sends the reply and records it.
   *
   * Not a `mailto:` link: that hands the job to whatever mail client the
   * machine has - nothing at all on a machine with none configured, so the
   * button reads as dead - and whatever is eventually typed lives in one
   * person's sent folder, leaving the console showing the enquiry as
   * unanswered. The endpoint behind this sends the email AND stores the text,
   * and it reports `delivered` from the real outcome, so a bounce is visible
   * rather than assumed away.
   */
  const onReply = async () => {
    const body = replyBody.trim();
    if (!body) return;
    try {
      const res = await replyToEnquiry({ body, id: enquiry.id }).unwrap();
      setReplyBody("");
      if (res.data.reply.delivered) {
        notify.success("Reply sent");
      } else {
        // Recorded but not delivered. Saying "sent" here would be a lie the
        // reader has no way to catch.
        notify.error("Saved, but the email did not go out", {
          description:
            "The reply is on the record so you can try again. Check the address on file.",
        });
      }
    } catch (err) {
      notify.error("Couldn't send the reply", {
        description: extractApiError(err).message,
      });
    }
  };

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
      <DetailNav
        crumbs={[DASHBOARD_CRUMB, { label: "Enquiries", href: LIST }]}
        current="Enquiry details"
      />
      <DetailHeader
        title="Enquiry details"
        hint="One website message and the replies sent back."
        sub={`Enquiry ${enquiry.reference}`}
        badges={<EnquiryStatusBadge status={enquiry.status} />}
      />

      <DetailShell
        asideFirstOnStack={false}
        main={
          <div className="flex flex-col gap-5">
            {/* The message itself, filed as a document. */}
            <AdminCard className="px-5 py-[18px]">
              {/* The subject titles the message, so it is the card's heading -
                  as a muted uppercase eyebrow it reads quieter than the
                  "replies sent" heading a few lines below it, and uppercasing
                  a sentence the sender wrote themselves loses their emphasis. */}
              <SectionHeading className="mb-3">
                {enquiry.subject}
              </SectionHeading>
              <p className="text-[12px] leading-[1.75] whitespace-pre-wrap text-adm-ink [overflow-wrap:anywhere]">
                {enquiry.message}
              </p>
              {/* The thread, then the composer. Anyone opening this needs to
                  know it has already been answered before they answer it
                  again, so the history reads above the box. */}
              {enquiry.replies.length > 0 ? (
                <div className="mt-4 border-t border-adm-hairline pt-3.5">
                  <SectionHeading className="mb-2">
                    {enquiry.replies.length === 1
                      ? "1 reply sent"
                      : `${String(enquiry.replies.length)} replies sent`}
                  </SectionHeading>
                  <ul className="flex flex-col gap-3">
                    {enquiry.replies.map((r) => (
                      <li
                        className="rounded-none bg-adm-sunken px-3.5 py-3"
                        key={r.id}
                      >
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="text-[10.5px] text-adm-faint">
                            {formatDateTime(r.sentAt)}
                          </span>
                          <span className="min-w-0 text-[10.5px] text-adm-faint [overflow-wrap:anywhere]">
                            to {r.sentToEmail}
                          </span>
                          {!r.delivered ? (
                            <span className="text-[10.5px] font-bold tracking-[0.06em] text-console-red uppercase">
                              Not delivered
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1.5 text-[11.5px] leading-[1.7] whitespace-pre-wrap text-adm-ink [overflow-wrap:anywhere]">
                          {r.body}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-4 border-t border-adm-hairline pt-3.5">
                {canReply ? (
                  <>
                    <AdminField label="Reply">
                      <textarea
                        className={cn(
                          adminInputClass,
                          "h-auto min-h-[104px] w-full resize-y py-2",
                        )}
                        onChange={(e) => {
                          setReplyBody(e.target.value);
                        }}
                        placeholder="Write the reply that will be emailed to them."
                        rows={4}
                        value={replyBody}
                      />
                    </AdminField>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                      <AdminButton
                        disabled={replying || replyBody.trim().length === 0}
                        onClick={() => void onReply()}
                        variant="gold"
                      >
                        {replying ? "Sending…" : "Send reply"}
                      </AdminButton>
                      <span className="min-w-0 text-[11px] text-adm-muted [overflow-wrap:anywhere]">
                        Goes to {enquiry.email}
                      </span>
                    </div>
                  </>
                ) : (
                  // Many enquiries arrive phone-only, and the server refuses a
                  // reply with nowhere to send it. Saying so here is better
                  // than a button that can only fail.
                  <p className="text-[11.5px] text-adm-muted">
                    No email address on file, so there is nowhere to send a
                    reply. Call or message the number on the record instead.
                  </p>
                )}
              </div>
            </AdminCard>

            {/* Provenance as a fact GRID, not label-left/value-right rows.
                Spreading each pair to opposite edges of a full-width card puts
                40rem of nothing between "Reference" and its value, so nothing
                reads as a pair; DetailItem stacks the label directly
                over its value with a hairline under each, and the grid packs
                three of them per row on a wide console. */}
            <AdminCard className="px-5 py-3">
              <SectionHeading className="mb-1.5">
                Sender &amp; provenance
              </SectionHeading>
              <DetailGrid>
                {/* Who sent it: the heading names the page, so the record
                    names the sender. */}
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
                  <SimpleSelect
                    value={status}
                    onChange={(v) => {
                      setStatus(v as EnquiryStatus);
                    }}
                    className={cn(adminSelectClass, "w-full")}
                    placeholder="Choose a status"
                    options={ENQUIRY_STATUSES.map((s) => ({
                      value: s,
                      label: ENQUIRY_STATUS_META[s].label,
                    }))}
                  />
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
                {canModerate ? (
                  <AdminButton
                    type="button"
                    disabled={!dirty || saving}
                    loading={saving}
                    onClick={() => void onSave()}
                    size="lg"
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </AdminButton>
                ) : null}
              </div>
            </AdminCard>

            {isSuperAdmin ? (
              <AdminCard className="px-5 py-4">
                <p className="text-[11px] text-adm-muted">
                  Deleting removes the enquiry permanently.
                </p>
                <AdminButton
                  type="button"
                  variant="danger"
                  disabled={deleting}
                  loading={deleting}
                  onClick={() => void onDelete()}
                  className="mt-2.5"
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
