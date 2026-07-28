import { brandOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-template";

export const alt =
  "DB Plus - bulk maize, soya beans and groundnuts, weighed honestly, trucked south";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OpengraphImage() {
  return brandOgImage({
    eyebrow: "Dispatch · Tamale, Northern Region",
    title: "DB Plus",
    subtitle: "Weighed honestly, trucked south.",
  });
}
