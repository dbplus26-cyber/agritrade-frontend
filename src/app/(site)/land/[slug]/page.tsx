import { notFound } from "next/navigation";
import { PlotDetail } from "@/components/land/plot-detail";
import { fetchPublicLandPlots, plotSlug } from "@/lib/public-land";
import { pageMetadata } from "@/lib/seo";
import { findBySlug } from "@/lib/slug";
import type { PublicLandPlot } from "@/lib/public-land";

/**
 * One plot's page.
 *
 * Keyed on the plot's register reference, which is unique by construction, so
 * the URL reads as the file number the office already uses. The page shares
 * the cached `land-plots` feed with the register, and the same purge: publish,
 * reserve or edit a plot in the console and this page follows.
 */

/** A plot published after the build still renders, on its first request. */
export const dynamicParams = true;

async function findPlot(slug: string): Promise<PublicLandPlot | undefined> {
  const plots = (await fetchPublicLandPlots()) ?? [];
  return findBySlug(plots, slug, (plot) => plot.reference);
}

export async function generateStaticParams() {
  const plots = (await fetchPublicLandPlots()) ?? [];
  return plots.map((plot) => ({ slug: plotSlug(plot) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const plot = await findPlot(slug);
  if (!plot) {
    return pageMetadata({
      title: "Plot not on file",
      description: "This plot is not on the DB Plus register.",
      path: `/land/${slug}`,
      index: false,
    });
  }

  return pageMetadata({
    title: `${plot.name} (Plot ${plot.reference})`,
    // The owner's own description where there is one; the plot's facts where
    // there is not.
    description:
      plot.description ??
      `${plot.sizeText}${plot.use ? ` ${plot.use}` : ""} plot at ${plot.name}, Tamale. Papers first: site plan and indenture checked and the boundary walked before any money changes hands.`,
    path: `/land/${plotSlug(plot)}`,
    // The plot's cover photo, for the same reason as the commodity pages: a
    // plot shared without its frontage is indistinguishable from any other.
    image: plot.photo ?? undefined,
    keywords: [
      `${plot.name} plot`,
      "land for sale Tamale",
      "documented plot Northern Region",
    ],
  });
}

export default async function PlotDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const plot = await findPlot(slug);
  // Sold plots unpublish, so a stale link lands on the 404 rather than a page
  // advertising land that is gone.
  if (!plot) notFound();
  return <PlotDetail plot={plot} />;
}
