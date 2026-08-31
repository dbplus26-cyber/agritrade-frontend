"use client";

import { AdminButton, DetailHeader } from "@/components/admin/ui";
import { DASHBOARD_CRUMB, DetailNav } from "@/components/admin/detail-nav";
import { DocumentView } from "@/components/admin/documents/document-view";
import { documentPdfUrl } from "@/redux/documents/documents-api";

/**
 * The invoice / receipt for a sale. The sheet is the server's own document,
 * drawn on screen exactly as it prints: a sale still owed reads as an invoice
 * and carries the payment accounts, a settled one reads as a receipt and does
 * not. Nothing about it is decided here.
 */
export function SaleInvoice({ id }: { id: string }) {
  const args = { id, type: "sale" as const };

  return (
    <div>
      <DetailNav
        className="print:hidden"
        crumbs={[
          DASHBOARD_CRUMB,
          { label: "Sales", href: "/admin/sales" },
          { label: "Sale", href: `/admin/sales/${id}` },
        ]}
        current="Document"
        backHref={`/admin/sales/${id}`}
        backLabel="Back to sale"
      >
        <DetailHeader
          className="print:hidden"
          title="Sale document"
          sub="What the buyer is handed: an invoice while anything is owed, a receipt once the sale is settled"
          actions={
            // The server renders this same document as a real A4 PDF, so the
            // one action opens that - the viewer previews it true to size and
            // printing happens from there. The browser's own print dialog
            // places the sheet top-left with dead space around it.
            <AdminButton asChild>
              <a
                href={documentPdfUrl(args)}
                target="_blank"
                rel="noopener noreferrer"
              >
                View PDF
              </a>
            </AdminButton>
          }
        />
      </DetailNav>

      <DocumentView args={args} />
    </div>
  );
}
