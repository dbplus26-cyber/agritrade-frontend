import { CompanyFile } from "@/components/about/company-file";
import { Story } from "@/components/about/story";
import { ValuesBand } from "@/components/about/values-band";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "About the trading house",
  description:
    "One buyer, a weighing scale and a rented warehouse corner in Tamale - how DB Plus grew into a Northern Region trading house, and the three things we don't bend.",
  path: "/about",
  keywords: ["about DB Plus", "Tamale grain traders", "Northern Region aggregator"],
});

export default function AboutPage() {
  return (
    <div className="texture-grain bg-surface">
      <Story />
      <ValuesBand />
      <CompanyFile />
    </div>
  );
}
