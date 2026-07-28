import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

/**
 * Shared brand template for every Open Graph card: husk field, forest band,
 * the company mark, page-specific text and a gold conversion tag - so every
 * share looks like a DB Plus dispatch ticket.
 *
 * Satori (behind `ImageResponse`) supports only flexbox and a CSS subset - no
 * grid - so the layout stays flex-based. The mark is the real logo, read off
 * disk as base64 (the documented Node-runtime pattern for local assets in an
 * OG route); it is the mark ONLY, because the full lockup's wordmark would be
 * unreadable at the size it sits here and the card already says the name.
 */
export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

const SURFACE = "#EFF1E8";
const FOREST = "#155744";
const HARVEST = "#D89C2E";
const SOIL = "#59523B";
const INK = "#1F211C";

// No phone number here on purpose. This card is generated at build/edge time
// with no access to the owner's settings, so a number baked in cannot be
// corrected without a redeploy - and the placeholder that used to sit here
// shipped a dead line into every WhatsApp share of the site. Keep the CTA
// about the offer and let the landing page carry the live contact.
const DEFAULT_CTA = "Same-day quotes from the Tamale yard →";

export async function brandOgImage({
  eyebrow,
  title,
  subtitle,
  cta = DEFAULT_CTA,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  /** The conversion line on the card — tailor it per page. */
  cta?: string;
}) {
  // Scale the headline down as it gets longer so long titles never overflow.
  const titleSize = title.length > 30 ? 62 : title.length > 18 ? 84 : 104;

  const markSrc = `data:image/png;base64,${await readFile(
    join(process.cwd(), "public", "logo-mark.png"),
    "base64",
  )}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: SURFACE,
          color: INK,
          padding: "64px 80px",
          borderTop: `18px solid ${FOREST}`,
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: 22,
              letterSpacing: 8,
              textTransform: "uppercase",
              color: SOIL,
              fontWeight: 600,
            }}
          >
            {eyebrow}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori
              renders plain <img>; next/image does not exist in an OG card. */}
          <img src={markSrc} width={96} height={96} alt="" />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: titleSize,
              fontWeight: 700,
              color: FOREST,
              lineHeight: 1.02,
              letterSpacing: -1,
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 30, color: SOIL, marginTop: 18 }}>
            {subtitle}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              background: HARVEST,
              color: INK,
              fontSize: 26,
              fontWeight: 700,
              padding: "18px 30px",
              borderRadius: 4,
              boxShadow: "6px 6px 0 rgba(31,33,28,.35)",
            }}
          >
            {cta}
          </div>
          <div style={{ fontSize: 24, color: SOIL }}>
            {`${siteConfig.legalName} · ${siteConfig.city}`}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
