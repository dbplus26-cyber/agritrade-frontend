import { brandOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-template";

export const alt = "DB Plus terms of service";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function TermsOpengraphImage() {
  return brandOgImage({
    eyebrow: "The office · Legal",
    title: "Terms of service.",
    subtitle: "The rules of trade for the website and the yard, in plain words.",
    cta: "Read the terms →",
  });
}
