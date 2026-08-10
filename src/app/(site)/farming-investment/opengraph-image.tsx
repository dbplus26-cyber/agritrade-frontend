import { brandOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-template";

export const alt =
  "DB Plus farming investment - inputs against the harvest, on signed terms";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function FarmingInvestmentOpengraphImage() {
  return brandOgImage({
    eyebrow: "Farming investment · Northern Region",
    title: "Inputs now, grain later.",
    subtitle:
      "Seed, fertilizer and tractor services against the harvest, on signed terms.",
    cta: "How the scheme works →",
  });
}
