import {
  brandOgImage,
  fetchOgPhoto,
  OG_CONTENT_TYPE,
  OG_SIZE,
} from "@/lib/og-template";
import { fetchPublicLandPlots } from "@/lib/public-land";
import { findBySlug } from "@/lib/slug";

export const alt = "A documented DB Plus plot near Tamale";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/**
 * Per-plot share card: the plot's name, size and use on the brand frame, with
 * its frontage photograph as the card's right panel. An unknown slug or
 * unreachable backend degrades to the generic land card, so a share never
 * fails.
 */
export default async function PlotOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const plots = (await fetchPublicLandPlots()) ?? [];
  const plot = findBySlug(plots, slug, (candidate) => candidate.reference);

  if (!plot) {
    return brandOgImage({
      eyebrow: "Land · Documented plots, Tamale",
      title: "Papers before money.",
      subtitle:
        "Site plan and indenture checked, the boundary walked, before any deposit.",
      cta: "See available plots →",
    });
  }

  const facts = [plot.sizeText, plot.use].filter(Boolean).join(" · ");
  return brandOgImage({
    eyebrow: `Land · Plot ${plot.reference}`,
    title: plot.name,
    subtitle: facts
      ? `${facts} · Papers checked before money moves.`
      : "Papers checked before money moves.",
    cta: "Ask about this plot →",
    photo: await fetchOgPhoto(plot.photo),
  });
}
