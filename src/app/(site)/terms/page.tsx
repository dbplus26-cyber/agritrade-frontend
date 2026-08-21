import { LegalDoc, type LegalSection } from "@/components/legal/legal-doc";
import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import {
  getSiteContact,
  type ResolvedContact,
} from "@/lib/public-contact";

export const metadata = pageMetadata({
  title: "Terms of service",
  description:
    "The terms DB Plus Trading Ltd trades on - quotes, weighing, delivery, payment, land sales and the farming investment scheme, in plain language.",
  path: "/terms",
});

function buildSections(contact: ResolvedContact): LegalSection[] {
  return [
  {
    title: "Who we are",
    paragraphs: [
      `${siteConfig.legalName} ("DB Plus", "we") is an agro-commodity trading company operating from ${contact.address}. We buy, aggregate and deliver grains and pulses, sell documented land plots around Tamale, and run an input-credit farming scheme. These terms cover your use of this website and, in outline, how we trade - the signed paperwork for a specific transaction always takes precedence over this page.`,
    ],
  },
  {
    title: "Quotes and orders",
    paragraphs: [
      "We do not publish prices - the market moves daily. Quotes are given by phone or in writing against a stated commodity, tonnage and destination, and are valid for the day they are given unless we say otherwise. An order exists when we have confirmed it, in writing or by an exchanged reference.",
    ],
  },
  {
    title: "Weighing and quality",
    paragraphs: [
      "Every load is weighed over a certified scale and a weight ticket issued; the weight we invoice is the weight on that ticket. Grade and moisture descriptions are stated on the order paperwork. Inspect deliveries on arrival: shortage or quality claims must be raised at delivery, while the load can still be checked against its waybill and ticket.",
    ],
  },
  {
    title: "Delivery and risk",
    paragraphs: [
      "Confirmed deliveries travel with a waybill and weighbridge ticket. Unless the order paperwork says otherwise, risk in the goods passes to the buyer on delivery (or on collection from our warehouse). Delivery dates are given in good faith; where a delay arises we tell you as soon as we know.",
    ],
  },
  {
    title: "Payment",
    paragraphs: [
      "Payment terms are agreed per order and stated on the invoice. Every sale carries a transaction number (e.g. SAL-2026-00042) - quote it when paying. Payment is made directly to us by cash, mobile money or bank transfer; a payment is complete when we have received it and issued a receipt. Fees charged by your bank or mobile-money provider are yours.",
    ],
  },
  {
    title: "Land sales",
    paragraphs: [
      "We sell plots we hold ourselves, papers first: the site plan and indenture are shown and checked, the boundary is walked together, and transfer is completed in your name before the sale closes. Nothing on this website is legal advice - we encourage every buyer to involve their own lawyer, and nothing stops you doing so at any stage.",
    ],
  },
  {
    title: "Farming investment scheme",
    paragraphs: [
      "The scheme provides inputs to registered farmers, repaid in produce after harvest, with partners funding a season and sharing returns. Farming carries real risk - weather, pests and price movements can reduce or eliminate returns, and neither repayment nor returns are guaranteed. The written scheme agreement you sign governs entirely; this website only describes the scheme in outline.",
    ],
  },
  {
    title: "This website",
    paragraphs: [
      "Website content - including the availability board - is provided for information and reflects our records at the time it was updated; it is not an offer capable of acceptance. We may change the site, and these terms, at any time; the date at the top of this page tells you when the terms last changed.",
    ],
  },
  {
    title: "Liability",
    paragraphs: [
      "Nothing in these terms excludes liability that cannot be excluded under Ghanaian law. Beyond that, we are not liable for indirect or consequential loss arising from use of this website, and our liability in respect of any transaction is governed by that transaction's own paperwork.",
    ],
  },
  {
    title: "Governing law",
    paragraphs: [
      // A legal document must not name a contact route the business does not
      // actually answer, so unpublished channels are left out of the sentence.
      `These terms are governed by the laws of the Republic of Ghana, and the courts of Ghana have jurisdiction over any dispute arising from them. To raise anything in this document, ${
        contact.hasPhone && contact.hasEmail
          ? `call ${contact.phone} or write to ${contact.email}`
          : contact.hasPhone
            ? `call ${contact.phone}`
            : contact.hasEmail
              ? `write to ${contact.email}`
              : "use the contact page on this website"
      }.`,
    ],
  },
  ];
}

export default async function TermsPage() {
  const contact = await getSiteContact();
  return (
    <LegalDoc
      eyebrow="OFFICE · TERMS OF SERVICE"
      title="The terms we trade on."
      fileNo="DOC - TERMS OF SERVICE"
      updated="21 AUG 2026"
      intro="Plain language, the way we do business: what a quote is, how weighing works, when risk passes, how payment happens - and where the signed paperwork for your specific transaction takes over from this page."
      sections={buildSections(contact)}
    />
  );
}
