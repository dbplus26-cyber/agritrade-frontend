import type { Metadata, Viewport } from "next";
import {
  Barlow_Condensed,
  Barlow_Semi_Condensed,
  Stardos_Stencil,
} from "next/font/google";
import { AnalyticsProvider } from "@/components/providers/analytics-provider";
import { Toaster } from "@/components/ui/sonner";
import { StoreProvider } from "@/redux/store-provider";
import { siteConfig, siteUrl } from "@/lib/site";
import "./globals.css";

// Display face: Barlow Condensed - the TALL grotesque of crate markings and
// shipping manifests, which is exactly the paperwork world this site is drawn
// from. Squatter grotesques read heavy at display size; this one carries
// headlines upright.
const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

// Body face: the semi-condensed cut of the same family - the tall vertical
// rhythm without squeezing running prose past comfort, and one family across
// the whole site means display and body can never drift apart.
const barlowSemi = Barlow_Semi_Condensed({
  variable: "--font-barlow-semi",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const stardos = Stardos_Stencil({
  variable: "--font-stardos",
  subsets: ["latin"],
  weight: "700",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteConfig.title,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  applicationName: siteConfig.name,
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: "/",
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
  },
};

export const viewport: Viewport = {
  themeColor: siteConfig.themeColor,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${barlowCondensed.variable} ${barlowSemi.variable} ${stardos.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <StoreProvider>
          <AnalyticsProvider>{children}</AnalyticsProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                borderRadius: "2px",
                border: "1px solid rgb(89 82 59 / 0.35)",
                boxShadow: "3px 3px 0 rgb(31 33 28 / 0.18)",
                background: "#FBFCF7",
                color: "#1F211C",
              },
              classNames: {
                title: "!text-[13.5px] !font-semibold !text-[#1F211C]",
                // Sonner's default description tint is unreadable on the light
                // paper background - pin it dark enough to actually read.
                description: "!text-[12.5px] !leading-[1.5] !text-[#4A4E45]",
              },
            }}
          />
        </StoreProvider>
      </body>
    </html>
  );
}
