/**
 * Typed, fail-fast access to the public env vars - mirrors the backend `ENV`
 * module so config lives in one place and is never read via bare
 * `process.env` scattered around the app. Importing this module
 * validates the required vars, so a misconfigured deployment fails at load
 * rather than silently issuing requests to `undefined/api/v1`.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  /** Origin of the DB Plus API (e.g. https://api.dbplus.example). Required. */
  SERVER_URI: required(
    "NEXT_PUBLIC_SERVER_URI",
    process.env.NEXT_PUBLIC_SERVER_URI,
  ).replace(/\/$/, ""),
  /** Canonical site origin, used for metadata/links. */
  BASE_URL: process.env.NEXT_PUBLIC_BASE_URL ?? "",
  /**
   * Cloudflare Turnstile site key for the public forms. Optional BY DESIGN,
   * mirroring the backend's TURNSTILE_SECRET_KEY: when unset (local dev), the
   * widget renders nothing and submission proceeds unblocked - the backend
   * skips verification too. Set BOTH keys to enforce in production.
   */
  TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
} as const;
