"use client";

import { useState } from "react";
import {
  ConsoleDateRange,
  ConsoleFieldHeight,
} from "@/components/admin/filter-bar";
import { AdminButton, AdminPageHeader } from "@/components/admin/ui";
import { DASHBOARD_CRUMB, DetailNav } from "@/components/admin/detail-nav";
import { DocumentView } from "@/components/admin/documents/document-view";
import { documentPdfUrl } from "@/redux/documents/documents-api";

/**
 * The farmer's ledger: every grant advanced and every repayment against it,
 * with a running balance, over whatever period the office is reconciling.
 *
 * The sheet is the server's document - the same one the PDF prints, opening
 * balance and all - so a statement read on screen and a statement signed at
 * the desk can never disagree about what is owed.
 */
export function FarmerStatement({
  id,
  seasonId,
}: {
  id: string;
  seasonId?: string;
}) {
  // Empty means "all history". A window narrows the statement to a period the
  // office is actually reconciling.
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const args = {
    id,
    params: {
      ...(from ? { from } : {}),
      ...(seasonId ? { seasonId } : {}),
      ...(to ? { to } : {}),
    },
    type: "farmer-statement" as const,
  };

  return (
    <div>
      <div className="print:hidden">
        <DetailNav
          className="print:hidden"
          crumbs={[
            DASHBOARD_CRUMB,
            { label: "Farmers", href: "/admin/farmers" },
            { label: "Farmer", href: `/admin/farmers/${id}` },
          ]}
          current="Statement"
          backHref={`/admin/farmers/${id}`}
          backLabel="Back to the farmer"
        >
          <AdminPageHeader
            className="mb-4"
            title="Farmer statement"
            hint="Everything advanced to this farmer and everything repaid, in order."
            sub="Every grant and repayment with a running balance, ready to print and sign"
          />
        </DetailNav>

        {/* The window belongs to the DOCUMENT, not to a list, so it is a
            page-level control rather than a toolbar filter - and it sits
            under the heading on the same edge as the sheet it acts on,
            instead of across the page from it. Every control on the row is
            one height and they share a baseline: the dates carry labels and
            the buttons do not, so aligning their tops would hang the buttons
            in the air. */}
        <div className="mb-6 flex flex-wrap items-end gap-2">
          <ConsoleFieldHeight>
            <ConsoleDateRange
              className="w-auto"
              from={from}
              to={to}
              onFromChange={setFrom}
              onToChange={setTo}
            />
          </ConsoleFieldHeight>
          {from || to ? (
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
          {/* The same document as a paginated A4 PDF, window and all -
              printing happens from the viewer, which previews the sheet true
              to size instead of the browser dialog's guesswork. */}
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
      </div>

      <DocumentView args={args} />
    </div>
  );
}
