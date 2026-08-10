import { brandOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-template";

export const alt = "DB Plus land - documented plots around Tamale";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function LandOpengraphImage() {
  return brandOgImage({
    eyebrow: "Land · Documented plots, Tamale",
    title: "Papers before money.",
    subtitle:
      "Site plan and indenture checked, the boundary walked, before any deposit.",
    cta: "See available plots →",
  });
}
