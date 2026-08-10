import { brandOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-template";

export const alt =
  "DB Plus commodities - maize, soya beans and groundnuts from the Tamale warehouse";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function CommoditiesOpengraphImage() {
  return brandOgImage({
    eyebrow: "The board · Tamale warehouse",
    title: "Grain on hand.",
    subtitle:
      "Maize, soya beans and groundnuts - graded, weighed and ready to truck south.",
    cta: "See today's board →",
  });
}
