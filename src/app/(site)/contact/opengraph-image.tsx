import { brandOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-template";

export const alt = "Contact DB Plus - tonnage, destination and timing";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function ContactOpengraphImage() {
  return brandOgImage({
    eyebrow: "Contact · Lines open Mon - Sat",
    title: "Talk to the yard.",
    subtitle: "Tonnage, destination and timing - answered the same day.",
    cta: "Send an enquiry →",
  });
}
