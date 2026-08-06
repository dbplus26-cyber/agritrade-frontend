"use client";

import { useState } from "react";
import { HelpWrap } from "@/components/admin/help-tip";
import { adminLinkClass, Mono, ToneBadge } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import { FilePicker } from "@/components/ui/FilePicker";
import { SignaturePad } from "@/components/ui/SignaturePad";
import { useConfirm } from "@/hooks/use-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { formatDateTime } from "@/lib/format-date";
import { notify } from "@/lib/notify";
import type { IGrantDocument } from "@/types/farm.types";

/** "05 Jul 2026" - the console's shared date idiom. */
export function formatFarmDate(iso: string): string {
  return formatDateTime(iso);
}

export const ACTIVE_FILTER_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Active", value: "true" },
  { label: "Inactive", value: "false" },
] as const;

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <HelpWrap text="In use, so it still appears wherever this is chosen.">
      <ToneBadge tone="leaf">Active</ToneBadge>
    </HelpWrap>
  ) : (
    <HelpWrap text="Kept for old records but no longer offered when creating new ones.">
      <ToneBadge tone="slate">Inactive</ToneBadge>
    </HelpWrap>
  );
}

/**
 * The INPUT_GRANT_ABOVE_THRESHOLD overlay chip: a grant records immediately but
 * is flagged until the owner acknowledges the over-threshold value.
 */
export function GrantApprovalBadge({
  status,
}: {
  status: string | undefined;
}) {
  if (!status) return null;
  if (status === "PENDING")
    return (
      <HelpWrap text="The inputs have gone out, but their value is above what staff may give without the owner's sign-off.">
        <ToneBadge tone="harvest">Approval pending</ToneBadge>
      </HelpWrap>
    );
  if (status === "APPROVED")
    return (
      <HelpWrap text="The owner has signed off on the value of what this farmer was given.">
        <ToneBadge tone="leaf">Acknowledged</ToneBadge>
      </HelpWrap>
    );
  if (status === "REJECTED")
    return (
      <HelpWrap text="The owner did not sign this off, so the grant should be reduced or reversed.">
        <ToneBadge tone="alert">Rejected</ToneBadge>
      </HelpWrap>
    );
  return <ToneBadge tone="slate">{status}</ToneBadge>;
}

/**
 * The evidence-documents block shared by the grant and repayment detail pages:
 * private documents with authenticated download links, an add flow (name +
 * FilePicker) and a confirmed remove. The backend refuses to remove the last
 * document (LAST_DOCUMENT) so a record never loses its signed evidence - that
 * refusal's message surfaces through the error toast.
 */
export function FarmDocumentsSection({
  documents,
  urlOf,
  addBusy,
  onAdd,
  onRemove,
  /** Used when the name field is left blank, e.g. "Grant agreement". */
  defaultName,
}: {
  documents: IGrantDocument[];
  urlOf: (documentId: string) => string;
  addBusy: boolean;
  onAdd: (file: File, name: string) => Promise<unknown>;
  onRemove: (documentId: string) => Promise<unknown>;
  defaultName: string;
}) {
  const [docName, setDocName] = useState("");
  const [signing, setSigning] = useState(false);
  const { confirm, confirmationDialog } = useConfirm();

  // Runs only after the user has seen the file and confirmed it.
  const onDocConfirm = async (file: null | File) => {
    if (!file) return;
    try {
      await onAdd(file, docName.trim() || defaultName);
      notify.success("Document added");
      setDocName("");
    } catch (err) {
      notify.error("Couldn't add the document", {
        description: extractApiError(err).message,
      });
      // Rethrow so the FilePicker keeps its preview for a retry.
      throw err;
    }
  };

  const onRemoveClick = async (doc: IGrantDocument) => {
    const ok = await confirm({
      title: "Remove this document?",
      description: `"${doc.name}" will no longer be downloadable from this record. Type the document's name to confirm.`,
      confirmText: "Remove",
      isDestructive: true,
      // A signed agreement is evidence. Typing its name is the difference
      // between deciding to delete it and mis-clicking an X beside it.
      requireExactMatch: doc.name,
    });
    if (!ok) return;
    try {
      await onRemove(doc.id);
      notify.success("Document removed");
    } catch (err) {
      // e.g. LAST_DOCUMENT - the record must keep at least one document.
      notify.error("Couldn't remove the document", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <>
      {documents.length === 0 ? (
        <p className="py-2 text-[13px] text-adm-muted">No documents yet.</p>
      ) : (
        documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between gap-3 border-b border-adm-hairline py-2 text-[13px] last:border-b-0"
          >
            <a
              href={urlOf(doc.id)}
              target="_blank"
              rel="noreferrer"
              className={cn(adminLinkClass, "min-w-0 [overflow-wrap:anywhere]")}
            >
              {doc.name}
            </a>
            <div className="flex flex-none items-center gap-3">
              <Mono className="text-[12px] whitespace-nowrap text-adm-muted">
                {formatFarmDate(doc.createdAt)}
              </Mono>
              <button
                type="button"
                onClick={() => void onRemoveClick(doc)}
                className="cursor-pointer text-[12px] text-console-red"
                aria-label={`Remove ${doc.name}`}
              >
                ✕
              </button>
            </div>
          </div>
        ))
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={docName}
          onChange={(e) => setDocName(e.target.value)}
          placeholder={`Document name (default: ${defaultName})`}
          className="h-8 min-w-0 flex-1 rounded border border-adm-line bg-adm-card px-2.5 text-[13px]"
        />
        <FilePicker
          accept="image/*,application/pdf,.doc,.docx"
          busy={addBusy}
          confirmLabel="Upload"
          hint="PDF, Word or a photo"
          onConfirm={onDocConfirm}
          optimize={false}
          triggerLabel="Choose document"
        />
      </div>
      <div className="mt-3 border-t border-adm-hairline pt-3">
        <button
          type="button"
          onClick={() => setSigning((v) => !v)}
          className={cn(adminLinkClass, "cursor-pointer text-[12px] font-semibold")}
          aria-expanded={signing}
        >
          {signing ? "Hide signature pad" : "Or sign on this screen"}
        </button>
        {signing ? (
          <div className="mt-2">
            <SignaturePad
              fileName={`${(docName.trim() || defaultName)
                .toLowerCase()
                .replace(/\s+/g, "-")}.png`}
              onCapture={(file) => {
                setSigning(false);
                void onDocConfirm(file).catch(() => undefined);
              }}
            />
            <p className="mt-1 text-[11.5px] text-adm-faint">
              Saves as &quot;{docName.trim() || defaultName}&quot; - hand the
              phone over to sign right here.
            </p>
          </div>
        ) : null}
      </div>
      {confirmationDialog}
    </>
  );
}
