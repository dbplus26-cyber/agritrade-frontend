import { BuyingSteps } from "@/components/land/buying-steps";
import { LandIntro } from "@/components/land/land-intro";
import { PLOT_PAGE_SIZE } from "@/components/land/plot-card-grid";
import { PlotFiles } from "@/components/land/plot-files";
import { fetchPublicLandPlotsPage } from "@/lib/public-land";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Land - plots around Tamale",
  description:
    "Documented plots in and around Tamale, sold papers first: site plan and indenture checked, boundary walked pillar to pillar before any money changes hands.",
  path: "/land",
  keywords: [
    "plots for sale Tamale",
    "land Tamale Ghana",
    "documented land Northern Region",
    "residential plots Kumbungu Road",
  ],
});

export default async function LandPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  // The register follows the SERVER's window: `?page=N` fetches that page of
  // the feed plus register-wide meta, so the grid holds whatever the register
  // grows to. Cached under the `land-plots` tag - the backend purges it when
  // plots are published or change status. No published plots (or the API
  // briefly down) renders the "NO PLOTS ON FILE" ledger page.
  const { page: rawPage } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);
  const windowed = await fetchPublicLandPlotsPage({
    limit: PLOT_PAGE_SIZE,
    page,
  });
  return (
    <div className="texture-grain bg-surface">
      <LandIntro />
      <div aria-hidden="true" className="ledger-rule mx-auto mb-10 max-w-[1312px] px-5 lg:mb-12 lg:px-8" />
      <BuyingSteps />
      <PlotFiles
        page={page}
        plots={windowed?.plots ?? []}
        totalPages={windowed?.meta.totalPages ?? 1}
      />
    </div>
  );
}
