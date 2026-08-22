/**
 * Whether a photo src should skip the Next image optimizer.
 *
 * The demo fixture photographs everything with Picsum, and the optimizer's
 * first fetch of a Picsum URL can fail transiently (cold upstream + redirect)
 * with a 500 - which `Photo`/`PhotoFrame` treat as a dead image and remove
 * for the rest of the session, so a detail page loses its photograph on first
 * view. Picsum already serves CDN-sized JPEGs, so the optimizer buys nothing
 * there; real (Cloudinary) photography keeps it.
 */
export const bypassOptimizer = (src: unknown): boolean =>
  typeof src === "string" &&
  (src.startsWith("https://picsum.photos/") ||
    src.startsWith("https://fastly.picsum.photos/"));
