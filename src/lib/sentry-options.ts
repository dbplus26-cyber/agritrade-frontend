// The Sentry.init options shared by the browser, Node and edge configs. With
// no DSN the SDK is disabled outright, so local dev, CI and tests never need
// a Sentry project.
import { env } from "@/lib/env";

const isProduction = process.env.NODE_ENV === "production";

export const sentryOptions = {
  dsn: env.SENTRY_DSN,
  enabled: Boolean(env.SENTRY_DSN),
  environment:
    env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || process.env.NODE_ENV,
  release: env.SENTRY_RELEASE || undefined,
  // Staff and agent identity never leaves the app: no IP, cookies or headers.
  sendDefaultPii: false,
  tracesSampleRate: isProduction ? 0.1 : 0,
};
