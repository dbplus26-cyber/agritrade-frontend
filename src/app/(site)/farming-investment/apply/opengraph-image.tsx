import { brandOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-template";

export const alt = "Apply for the DB Plus farming investment scheme";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function ApplyOpengraphImage() {
  return brandOgImage({
    eyebrow: "Farming investment · Applications open",
    title: "Apply for the scheme.",
    subtitle: "Tell us your acreage, crops and what you need - we visit the farm.",
    cta: "Start your application →",
  });
}
