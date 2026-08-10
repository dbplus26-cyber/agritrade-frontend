import { notFound } from "next/navigation";
import { LotDetail } from "@/components/commodities/lot-detail";
import { fetchPublicCommodities, toLots } from "@/lib/public-commodities";
import { pageMetadata } from "@/lib/seo";
import { findBySlug } from "@/lib/slug";
import type { PublicLot } from "@/lib/public-commodities";

/**
 * One commodity's page.
 *
 * Keyed on the slug of the commodity's name, which the register already keeps
 * unique. The page reads the same cached feed the board and the register read,
 * so it costs no extra request and follows the same `commodities` purge: edit
 * a commodity in the console and this page changes with the rest.
 */

/** A commodity published after the build still renders, on its first request. */
export const dynamicParams = true;

async function findLot(slug: string): Promise<PublicLot | undefined> {
  const lots = toLots(await fetchPublicCommodities());
  return findBySlug(lots, slug, (lot) => lot.slug);
}

export async function generateStaticParams() {
  const lots = toLots(await fetchPublicCommodities());
  return lots.map((lot) => ({ slug: lot.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lot = await findLot(slug);
  if (!lot) {
    return pageMetadata({
      title: "Commodity not on file",
      description: "This commodity is not on the DB Plus register.",
      path: `/commodities/${slug}`,
      index: false,
    });
  }

  const spec = [lot.variety, lot.qualityGrade].filter(Boolean).join(" · ");
  return pageMetadata({
    title: lot.name,
    // The office's own words where it has written them, and the facts of the
    // record where it has not - never an invented sentence about the grain.
    description:
      lot.description ??
      `${lot.name}${spec ? ` (${spec})` : ""} from the DB Plus warehouse in Tamale. ${
        lot.inStock ? "In stock now." : "On order - ask us."
      } Call with tonnage and destination for a same-day quote.`,
    path: `/commodities/${lot.slug}`,
    // No `image` here: the sibling opengraph-image.tsx generates this lot's
    // share card - name, spec and the lot's own photograph on the brand frame
    // - and a file-convention image outranks a metadata one anyway.
    keywords: [lot.name, `${lot.name} Ghana`, `${lot.name} Tamale`],
  });
}

export default async function CommodityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lot = await findLot(slug);
  // Unpublished, renamed or never filed: all the same to a reader, and all
  // the 404 page. Never a stub page for a commodity we do not trade.
  if (!lot) notFound();
  return <LotDetail lot={lot} />;
}
