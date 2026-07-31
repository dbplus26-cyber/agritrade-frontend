import { BuyingSteps } from "@/components/land/buying-steps";
import { LandIntro } from "@/components/land/land-intro";
import { PlotFiles } from "@/components/land/plot-files";
import { fetchPublicLandPlots } from "@/lib/public-land";
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

export default async function LandPage() {
  // Live register cached under the `land-plots` tag - the backend purges it
  // when plots are published or change status. No published plots (or the
  // API briefly down) renders the "NO PLOTS ON FILE" ledger page.
  const plots = (await fetchPublicLandPlots()) ?? [];
  return (
    <div className="texture-grain bg-surface">
      <LandIntro />
      <div aria-hidden="true" className="ledger-rule mx-auto mb-10 max-w-[1312px] px-5 lg:mb-12 lg:px-8" />
      <BuyingSteps />
      <PlotFiles plots={plots} />
    </div>
  );
}
