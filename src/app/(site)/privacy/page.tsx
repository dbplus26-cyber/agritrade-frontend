import { LegalDoc, type LegalSection } from "@/components/legal/legal-doc";
import { pageMetadata } from "@/lib/seo";
import {
  getSiteContact,
  type ResolvedContact,
} from "@/lib/public-contact";

export const metadata = pageMetadata({
  title: "Privacy policy",
  description:
    "What DB Plus Trading Ltd collects when you enquire or pay, how it's used and kept, who it's shared with, and the rights you have over it.",
  path: "/privacy",
});

function buildSections(contact: ResolvedContact): LegalSection[] {
  return [
  {
    title: "What we collect",
    paragraphs: [
      "We collect only what running a trading house needs:",
    ],
    points: [
      "Enquiries — your name, phone number, optional email, the subject and your message, when you send the enquiry form or contact us directly.",
      "Trading records — order references, weights, waybills, payment references and receipts for transactions you're part of.",
      "Payments — the sale reference you look up on the pay page and confirmation of payments made. Card and mobile-money details are entered with the payment processor, not with us.",
    ],
  },
  {
    title: "How we use it",
    paragraphs: [
      "To respond to your enquiry, to quote, fulfil and document transactions, to keep the business records the law requires of us, and to contact you about business you have with us — for example when a plot you asked about becomes available. We do not send marketing you haven't asked for, and we never sell your details.",
    ],
  },
  {
    title: "Payments",
    paragraphs: [
      "We do not take payments through this website. Payments are made directly to us by cash, mobile money or bank transfer, and what we record is the amount, the method and the reference you quoted, kept as part of that sale's record.",
    ],
  },
  {
    title: "Sharing",
    paragraphs: [
      "Your details are shared only where the work requires it: with the payment processor to take a payment, with transporters to deliver a load consigned to you, with professional advisers where a transaction needs them (for example a land transfer), and with authorities where the law requires disclosure. Nothing is shared for advertising.",
    ],
  },
  {
    title: "Retention",
    paragraphs: [
      "Enquiries that don't become business are kept for up to two years so we can honour \"contact me when one comes up\" requests, then deleted. Transaction records — weights, waybills, invoices, receipts — are kept for as long as Ghanaian tax and company law requires.",
    ],
  },
  {
    title: "Your rights",
    paragraphs: [
      // Only names the channels the owner has published: a data-rights notice
      // pointing at an unanswered address is a promise the business cannot keep.
      `Under Ghana's Data Protection Act, 2012 (Act 843), you may ask what we hold about you, have inaccuracies corrected, and ask us to delete details we have no legal duty to keep. ${
        contact.hasPhone && contact.hasEmail
          ? `Call ${contact.phone} or write to ${contact.email}`
          : contact.hasPhone
            ? `Call ${contact.phone}`
            : contact.hasEmail
              ? `Write to ${contact.email}`
              : "Use the contact page on this website"
      } - we answer within a reasonable time, usually the same working week.`,
    ],
  },
  {
    title: "Cookies and tracking",
    paragraphs: [
      "This website sets no advertising or analytics cookies and does not track you across the web. Anything stored in your browser is strictly what a page needs to function while you use it.",
    ],
  },
  {
    title: "Changes to this policy",
    paragraphs: [
      "If how we handle your details changes, this page changes with it and the date at the top moves. Significant changes affecting existing customers are communicated directly.",
    ],
  },
  ];
}

export default async function PrivacyPage() {
  const contact = await getSiteContact();
  return (
    <LegalDoc
      eyebrow="OFFICE · PRIVACY POLICY"
      title="What we keep, and why."
      fileNo="DOC - PRIVACY POLICY"
      updated="11 JUL 2026"
      intro="We're a trading house, not a data business. This page sets out the little we collect when you enquire or pay, what it's used for, how long it's kept, and the rights you have over it."
      sections={buildSections(contact)}
    />
  );
}
