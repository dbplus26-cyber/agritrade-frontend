import { BoardHeader } from "@/components/commodities/board-header";
import { EmptyLots } from "@/components/commodities/empty-lots";
import { LOT_PAGE_SIZE, LotCards } from "@/components/commodities/lot-cards";
import {
  fetchPublicCommodities,
  fetchPublicCommoditiesPage,
  toBoardLines,
  toLots,
} from "@/lib/public-commodities";
import { routes } from "@/lib/routes";
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

export default async function CommoditiesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  // The register follows the SERVER's window: `?page=N` fetches that page of
  // the feed with the register-wide meta, so the grid holds whatever the
  // register grows to instead of downloading and slicing the whole of it in
  // the browser. The board lines stay a separate full read (they only ever
  // show the top three), and both reads share the `commodities` cache tag -
  // the backend purges it on every stock/register write, so the page follows
  // the records within seconds. Nothing published (or the API briefly down)
  // renders the designed empty board, never stand-ins.
  const { page: rawPage } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);
  const [commodities, lotsPage] = await Promise.all([
    fetchPublicCommodities(),
    fetchPublicCommoditiesPage({ limit: LOT_PAGE_SIZE, page }),
  ]);
  const lines = toBoardLines(commodities);
  const lots = toLots(lotsPage?.commodities ?? null, (page - 1) * LOT_PAGE_SIZE);
  const totalPages = lotsPage?.meta.totalPages ?? 1;
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
      {lots.length === 0 ? (
        <EmptyLots />
      ) : (
        <LotCards
          basePath={routes.commodities}
          lots={lots}
          page={page}
          totalPages={totalPages}
        />
      )}
    </div>
  );
}
