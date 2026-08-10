import { brandOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-template";

export const alt = "DB Plus privacy policy";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function PrivacyOpengraphImage() {
  return brandOgImage({
    eyebrow: "The office · Legal",
    title: "Privacy policy.",
    subtitle: "What we keep on file, why we keep it, and who can ask about it.",
    cta: "Read the policy →",
  });
}
