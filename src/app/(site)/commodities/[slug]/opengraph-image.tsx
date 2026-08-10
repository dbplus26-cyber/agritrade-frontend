import {
  brandOgImage,
  fetchOgPhoto,
  OG_CONTENT_TYPE,
  OG_SIZE,
} from "@/lib/og-template";
import { fetchPublicCommodities, toLots } from "@/lib/public-commodities";
import { findBySlug } from "@/lib/slug";

export const alt = "A DB Plus commodity from the Tamale warehouse";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/**
 * Per-commodity share card: the lot's name and spec on the brand frame, with
 * its own photograph as the card's right panel - so three different lots
 * shared into WhatsApp read as three different lots, inside one brand. An
 * unknown slug or unreachable backend degrades to the generic board card, so
 * a share never fails.
 */
export default async function CommodityOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lots = toLots(await fetchPublicCommodities());
  const lot = findBySlug(lots, slug, (candidate) => candidate.slug);

  if (!lot) {
    return brandOgImage({
      eyebrow: "The board · Tamale warehouse",
      title: "Grain on hand.",
      subtitle:
        "Maize, soya beans and groundnuts - graded, weighed and ready to truck south.",
      cta: "See today's board →",
    });
  }

  const spec = [lot.variety, lot.qualityGrade].filter(Boolean).join(" · ");
  return brandOgImage({
    eyebrow: `The board · ${lot.lotNo}`,
    title: lot.name,
    subtitle: spec
      ? `${spec} · From the DB Plus warehouse, Tamale.`
      : "From the DB Plus warehouse, Tamale.",
    cta: "Ask for a same-day quote →",
    photo: await fetchOgPhoto(lot.photo),
  });
}
