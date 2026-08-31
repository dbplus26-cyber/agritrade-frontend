// test/component/DocumentSheet.test.tsx
//
// The sheet is the console's rendering of a document the server described, so
// what matters is that it renders THAT document and nothing of its own: every
// block in the order the paper carries them, the figures exactly as they were
// handed over, and the marks resolved the way the printed copy resolves them.
//
// The other half is the phone. A document is read on one far more often than
// it is printed, and the middle column of a three-column table has nowhere to
// go at 360px - so it is carried under the description it qualifies rather
// than dropped, which would leave a weight off a waybill.
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { DocumentSheet } from "@/components/admin/documents/document-sheet";
import type { IDocument } from "@/types/document.types";

vi.mock("@/components/admin/document-marks", () => ({
  DocumentLogo: () => null,
  useDocumentBranding: () => ({
    logoUrl: "/logo-mark.png",
    signatureUrl: "https://cdn.test/signature.png",
  }),
}));

const document = (over: Partial<IDocument> = {}): IDocument => ({
  company: {
    address: "Aboabo Market Road, Tamale",
    email: "accounts@dbplus.test",
    name: "DB Plus",
    phone: "+233 24 400 0111",
  },
  detailHeading: "Weight × price",
  fields: [
    { label: "Date", value: "25 Jul 2026" },
    { label: "Status", value: "FULFILLED" },
  ],
  footNote: "Please quote SAL-2026-00118 when making payment.",
  lines: [
    {
      amount: "GH¢ 1,000.00",
      description: "White maize",
      detail: "200.00 kg @ GH¢ 5.00",
    },
  ],
  party: { label: "Billed to", name: "Kwame Owusu", phone: "0244000111" },
  signatureBlocks: [{ business: true, caption: "Authorised signature" }],
  title: "Invoice",
  totals: [
    { label: "Agreed total", value: "GH¢ 1,000.00" },
    { emphasis: true, label: "Balance due", value: "GH¢ 600.00" },
  ],
  transactionNo: "SAL-2026-00118",
  ...over,
});

describe("DocumentSheet", () => {
  it("draws the document it was handed, figures included", () => {
    render(<DocumentSheet document={document()} />);

    expect(screen.getByText("DB Plus")).toBeInTheDocument();
    expect(screen.getByText("Invoice")).toBeInTheDocument();
    // Twice: the number under the title, and the footer band that closes it.
    expect(screen.getAllByText("SAL-2026-00118")).toHaveLength(2);
    expect(screen.getByText("Billed to")).toBeInTheDocument();
    expect(screen.getByText("Kwame Owusu")).toBeInTheDocument();
    expect(screen.getByText("White maize")).toBeInTheDocument();
    // The figure arrives formatted; the sheet never recomputes one.
    expect(screen.getByText("GH¢ 600.00")).toBeInTheDocument();
    expect(
      screen.getByText(/Please quote SAL-2026-00118/),
    ).toBeInTheDocument();
  });

  it("carries the middle column under the description for a phone", () => {
    render(<DocumentSheet document={document()} />);

    // Both renderings are in the DOM - one for the column, one stacked under
    // the description - and each is hidden at the width the other serves.
    const stacked = screen.getByText(/Weight × price: 200.00 kg @ GH¢ 5.00/);
    expect(stacked).toHaveClass("sm:hidden");
    const cells = screen.getAllByRole("cell");
    expect(cells[1]).toHaveTextContent("200.00 kg @ GH¢ 5.00");
    expect(cells[1]).toHaveClass("hidden");
  });

  it("stamps a document that no longer represents live money", () => {
    render(<DocumentSheet document={document({ stamp: "PAID" })} />);
    expect(screen.getByText("PAID")).toBeInTheDocument();
  });

  it("stamps the business's saved mark only where the document asks for it", () => {
    render(
      <DocumentSheet
        document={document({
          signatureBlocks: [
            { caption: "Driver's signature", imageUrl: null },
            { business: true, caption: "Authorised signature" },
          ],
        })}
      />,
    );

    // The driver's rule is left empty for ink; nothing claims he signed.
    expect(
      screen.queryByAltText("Driver's signature"),
    ).not.toBeInTheDocument();
    expect(screen.getByAltText("Authorised signature")).toHaveAttribute(
      "src",
      "https://cdn.test/signature.png",
    );
  });

  it("shows a captured mark against the document it was given on", () => {
    render(
      <DocumentSheet
        document={document({
          signatureBlocks: [
            {
              caption: "Driver's signature",
              imageUrl: "https://cdn.test/driver.png",
              meta: ["Yaw Mensah - 25 Jul 2026", "Taken by Abu Salifu"],
            },
          ],
        })}
      />,
    );

    expect(screen.getByAltText("Driver's signature")).toHaveAttribute(
      "src",
      "https://cdn.test/driver.png",
    );
    // The small print is what makes a mark evidence.
    expect(screen.getByText("Taken by Abu Salifu")).toBeInTheDocument();
  });

  it("prints where to pay only when the document carries accounts", () => {
    const { rerender } = render(<DocumentSheet document={document()} />);
    expect(screen.queryByText("How to pay")).not.toBeInTheDocument();

    rerender(
      <DocumentSheet
        document={document({
          payTo: [
            {
              heading: "Ecobank Ghana",
              note: "Quote SAL-2026-00118 as the reference.",
              rows: [{ label: "Account number", value: "1441000998877" }],
            },
          ],
        })}
      />,
    );
    const payTo = screen.getByRole("heading", { name: "How to pay" });
    expect(payTo).toBeInTheDocument();
    expect(screen.getByText("1441000998877")).toBeInTheDocument();
  });

  it("says so plainly when a document has no lines", () => {
    render(<DocumentSheet document={document({ lines: [] })} />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("No line items.")).toBeInTheDocument();
  });
});
