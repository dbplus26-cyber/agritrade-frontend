import { BoardHeader } from "@/components/commodities/board-header";
import { EmptyLots } from "@/components/commodities/empty-lots";
import { LotCards } from "@/components/commodities/lot-cards";
import {
  fetchPublicCommodities,
  toBoardLines,
  toLots,
} from "@/lib/public-commodities";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Commodities - the board",
  description:
    "Maize, soya beans and groundnuts by the truckload from Tamale - graded, bagged and weighed over a certified scale. See what's in the warehouse today.",
  path: "/commodities",
  keywords: [
    "maize by the truckload",
    "soya beans supplier Ghana",
    "groundnuts Tamale",
    "bulk grain availability",
  ],
});

export default async function CommoditiesPage() {
  // One live read feeds both the register and the cards, cached under the
  // `commodities` tag - the backend purges it on every stock/register write,
  // so the page follows the records within seconds. Nothing published (or the
  // API briefly down) renders the designed empty board, never stand-ins.
  const commodities = await fetchPublicCommodities();
  const lines = toBoardLines(commodities);
  const lots = toLots(commodities);
  const updatedOn = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  // The register at the top stays a glance, not a list: at most 3 lines. Every
  // lot then files into the card grid, and each card opens the lot's own page
  // - which is where the full record is read now, rather than three of them
  // being unrolled inline while the rest were summarised.
  return (
    <div className="texture-grain bg-surface">
      <BoardHeader updatedOn={updatedOn} lines={lines.slice(0, 3)} />
      {lots.length === 0 ? <EmptyLots /> : <LotCards lots={lots} />}
    </div>
  );
}
