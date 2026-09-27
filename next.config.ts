import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Deny-by-default for the powerful sensors; nothing in the app uses them.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

// The deployed git SHA, bridged into the browser bundle so client and server
// events report the same Sentry release. Only set on Vercel; a plain build
// leaves the release unset rather than baking in an empty string.
const releaseSha = process.env.VERCEL_GIT_COMMIT_SHA;

// PostHog is reached through a same-origin rewrite so the CSP stays closed
// and ad blockers cannot drop the events. EU region: the data stays in the
// EU project.
const POSTHOG_INGEST_HOST = "https://eu.i.posthog.com";
const POSTHOG_ASSETS_HOST = "https://eu-assets.i.posthog.com";

const nextConfig: NextConfig = {
  ...(releaseSha ? { env: { NEXT_PUBLIC_SENTRY_RELEASE: releaseSha } } : {}),
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  // Lets CI / verification builds run alongside a live `next dev` without the
  // two fighting over .next (e.g. NEXT_DIST_DIR=.next-build next build).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: `${POSTHOG_ASSETS_HOST}/static/:path*`,
      },
      {
        source: "/ingest/:path*",
        destination: `${POSTHOG_INGEST_HOST}/:path*`,
      },
    ];
  },
  // PostHog's API paths end in a slash; the default redirect would 308 them
  // before the rewrite ran.
  skipTrailingSlashRedirect: true,
  images: {
    // The site's own photography lives in /public/images and needs no remote
    // host. What remains here is the console's uploaded media and demo
    // fixtures.
    remotePatterns: [
      // Demo-fixture photography (prisma/demo/kit.ts). Picsum serves a stable
      // image per seed string, which is what lets the seeded console be
      // screenshotted twice and look the same. Harmless in production: nothing
      // the app writes ever points here.
      { protocol: "https", hostname: "picsum.photos" },
      // Picsum redirects to this CDN host to serve the actual bytes.
      { protocol: "https", hostname: "fastly.picsum.photos" },
      // Commodity photos uploaded from the console (Cloudinary).
      //
      // The cloud name lives with the backend (it owns the upload
      // credentials) and is never exposed to this app, so the account
      // segment has to stay a wildcard - set it here the day it is
      // published as a public env var. The delivery-type path is still
      // pinned to `image/upload`, which is what actually matters: an
      // unrestricted `res.cloudinary.com` also allows `/image/fetch/<any
      // url>`, turning our optimizer into an open image proxy for the whole
      // internet.
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/*/image/upload/**",
      },
    ],
  },
};

// Source maps upload only when the three SENTRY_* build secrets are present;
// without them the plugin skips the upload and the build still passes. The
// tunnel keeps browser events on this origin, so the CSP connect-src above
// stays closed to third-party hosts and ad blockers cannot drop them.
export default withSentryConfig(nextConfig, {
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  tunnelRoute: "/monitoring",
  bundleSizeOptimizations: { excludeDebugStatements: true },
  widenClientFileUpload: true,
});
