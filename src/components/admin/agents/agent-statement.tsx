"use client";

import { useState } from "react";
import { AdminButton, AdminPageHeader } from "@/components/admin/ui";
import {
  ConsoleDateRange,
  ConsoleFieldHeight,
} from "@/components/admin/filter-bar";
import { DASHBOARD_CRUMB, DetailNav } from "@/components/admin/detail-nav";
import { DocumentView } from "@/components/admin/documents/document-view";
import { documentPdfUrl } from "@/redux/documents/documents-api";

/**
 * The agent's float statement: every top-up, purchase, expense and adjustment
 * against the cash they hold, oldest first, with a running balance that opens
 * at the pre-window position so the sheet adds up on its own.
 *
 * The sheet is the server's document, the same one the PDF prints. A handover
 * is argued from the paper, so the screen must not be able to say anything
 * different from it.
 */
export function AgentStatement({ id }: { id: string }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const windowed = Boolean(from || to);
  const args = {
    id,
    params: { ...(from ? { from } : {}), ...(to ? { to } : {}) },
    type: "agent-statement" as const,
  };

  return (
    <div>
      <DetailNav
        className="print:hidden"
        crumbs={[DASHBOARD_CRUMB, { label: "Agents", href: "/admin/agents" }]}
        current="Statement"
        backHref={`/admin/agents/${id}`}
        backLabel="Back to agent"
      >
        <AdminPageHeader
          className="mb-4 print:hidden"
          title="Agent float statement"
          hint="Every movement in and out of this agent's money, in order."
          sub="Every top-up, purchase and expense against the cash this agent holds, ready to print and sign"
        />
      </DetailNav>

      {/* The window belongs to the DOCUMENT, not to a list, so it is a
          page-level control rather than a toolbar filter - and it sits under
          the heading on the same edge as the sheet it acts on, instead of
          across the page from it. Every control on the row is one height and
          they share a baseline: the dates carry labels and the buttons do
          not, so aligning their tops would hang the buttons in the air. */}
      <div className="mb-6 flex flex-wrap items-end gap-2 print:hidden">
        <ConsoleFieldHeight>
          <ConsoleDateRange
            className="w-auto"
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
          />
        </ConsoleFieldHeight>
        {windowed ? (
          <AdminButton
            variant="outline"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
          >
            All history
          </AdminButton>
        ) : null}
        {/* The same document as a paginated A4 PDF, window and all - printing
            happens from the viewer, which previews the sheet true to size
            instead of the browser dialog's guesswork. */}
        <AdminButton asChild>
          <a
            href={documentPdfUrl(args)}
            target="_blank"
            rel="noopener noreferrer"
          >
            View PDF
          </a>
        </AdminButton>
      </div>

      <DocumentView args={args} />
    </div>
  );
}
