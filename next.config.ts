import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets CI / verification builds run alongside a live `next dev` without the
  // two fighting over .next (e.g. NEXT_DIST_DIR=.next-build next build).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    // Photography is served from Wikimedia Commons (CC BY-SA, credited in the
    // footer). Special:FilePath 302s to upload.wikimedia.org, so both hosts
    // are allowed.
    remotePatterns: [
      { protocol: "https", hostname: "commons.wikimedia.org" },
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
