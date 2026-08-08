import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// The API origin the browser talks to (RTK Query, PDF receipt links). Built
// into the CSP at build time from the same env var src/lib/env.ts requires -
// when it is unset the app cannot boot anyway (env.ts throws), so the
// fallback here is simply "no extra origin" rather than a guessed URL.
const apiOrigin = (() => {
  const raw = process.env.NEXT_PUBLIC_SERVER_URI;
  if (!raw) return "";
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
})();

// One directive per line; every allowance beyond 'self' records why it exists.
// Kept deny-by-default: no third-party origin gets in without a note.
const contentSecurityPolicy = [
  "default-src 'self'",
  // 'unsafe-inline': the App Router streams its hydration/flight payload in
  // inline <script> tags, and without a per-request nonce (which would force
  // every page dynamic - the public pages are tag-cached static) inline must
  // be allowed. challenges.cloudflare.com: the Turnstile api.js loaded by
  // TurnstileWidget. 'unsafe-eval' dev-only: React uses eval in development
  // to rebuild server error stacks; neither React nor Next needs it in prod.
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ""}`,
  // 'unsafe-inline': Tailwind v4 preflight aside, next/font and components
  // set style attributes/tags inline (e.g. avatar colors, Turnstile scaling).
  "style-src 'self' 'unsafe-inline'",
  // blob:: staged photo previews (usePhotoStaging object URLs). data:: the
  // paper-grain SVG noise textures in globals.css are data: URIs. The https
  // hosts mirror images.remotePatterns in this file: Cloudinary uploads and
  // picsum demo photos are rendered via plain <img>/bypassOptimizer, and the
  // Wikimedia pair covers any non-optimized use of the credited photography.
  "img-src 'self' blob: data: https://res.cloudinary.com https://picsum.photos https://fastly.picsum.photos https://upload.wikimedia.org https://commons.wikimedia.org",
  // next/font self-hosts the Google fonts at build time - no external origin.
  "font-src 'self'",
  // The DB Plus API (cookies + JSON, RTK Query). ws: dev-only for HMR - some
  // browsers still refuse same-origin websockets under bare 'self'.
  `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ""}${isDev ? " ws:" : ""}`,
  // Turnstile renders its challenge in an iframe; the contact page embeds the
  // office map (maps.google.com redirects into www.google.com to serve it).
  "frame-src https://challenges.cloudflare.com https://maps.google.com https://www.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Belt with the X-Frame-Options braces below.
  "frame-ancestors 'none'",
  // Prod-only: dev runs on plain http://localhost and must not be upgraded.
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Deny-by-default for the powerful sensors; nothing in the app uses them.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
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
  images: {
    // Photography is served from Wikimedia Commons (CC BY-SA, credited in the
    // footer). Special:FilePath 302s to upload.wikimedia.org, so both hosts
    // are allowed.
    remotePatterns: [
      { protocol: "https", hostname: "commons.wikimedia.org" },
      // Demo-fixture photography (prisma/demo/kit.ts). Picsum serves a stable
      // image per seed string, which is what lets the seeded console be
      // screenshotted twice and look the same. Harmless in production: nothing
      // the app writes ever points here.
      { protocol: "https", hostname: "picsum.photos" },
      // Picsum redirects to this CDN host to serve the actual bytes.
      { protocol: "https", hostname: "fastly.picsum.photos" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
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

export default nextConfig;
