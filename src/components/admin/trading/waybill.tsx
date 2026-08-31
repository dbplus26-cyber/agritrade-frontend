"use client";

import { AdminButton, DetailHeader } from "@/components/admin/ui";
import { DASHBOARD_CRUMB, DetailNav } from "@/components/admin/detail-nav";
import { DocumentView } from "@/components/admin/documents/document-view";
import { documentPdfUrl } from "@/redux/documents/documents-api";

/**
 * The loading sheet the truck travels with. The server builds it - including
 * the signature row, which is driven by what was actually captured against
 * THIS trip rather than by the business's saved mark - and this draws that
 * document. An unsigned slot shows an empty rule, which is what still works
 * when the depot's phone is flat.
 */
export function Waybill({ id }: { id: string }) {
  const args = { id, type: "shipment" as const };

  return (
    <div>
      <DetailNav
        className="print:hidden"
        crumbs={[
          DASHBOARD_CRUMB,
          { label: "Shipments", href: "/admin/shipments" },
          { label: "Shipment", href: `/admin/shipments/${id}` },
        ]}
        current="Waybill"
        backHref={`/admin/shipments/${id}`}
        backLabel="Back to shipment"
      >
        <DetailHeader
          className="print:hidden"
          title="Waybill"
          sub="Open the PDF, print it from the viewer and have the driver sign"
          actions={
            // The server's own A4 rendering is the ONLY way out to paper.
            // Screen-printing this page is not: the browser dialog places the
            // sheet top-left with dead space around it, while the PDF viewer
            // previews true to size and its own print button does it right.
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
