import { AvailabilityBoard } from "@/components/home/availability-board";
import { BusinessLines } from "@/components/home/business-lines";
import { CtaCall } from "@/components/home/cta-call";
import { Hero } from "@/components/home/hero";
import { PaperTrail } from "@/components/home/paper-trail";
import { TrustStrip } from "@/components/home/trust-strip";
import { WaybillSteps } from "@/components/home/waybill-steps";
import { WhyUs } from "@/components/home/why-us";
import { ReviewsBand } from "@/components/reviews/reviews-band";
import {
  fetchPublicCommodities,
  toBoardLines,
} from "@/lib/public-commodities";
import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Bulk grain trading from Tamale",
  description: siteConfig.description,
  path: "/",
  keywords: [...siteConfig.keywords],
});

export default async function HomePage() {
  // Live availability cached under the `commodities` tag - the backend
  // purges it on every stock/register write. Nothing published (or the API
  // briefly down) renders the board's designed empty plank.
  const lines = toBoardLines(await fetchPublicCommodities());
  const updatedOn = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return (
    <>
      <Hero />
      <AvailabilityBoard updatedOn={updatedOn} lines={lines} />
      <div className="texture-grain bg-surface">
        <TrustStrip />
        <WaybillSteps />
        <BusinessLines />
      </div>
      <PaperTrail />
      <WhyUs />
      {/* Approved reviews only - renders nothing while the file is empty. */}
      <ReviewsBand />
      <CtaCall />
    </>
  );
}
