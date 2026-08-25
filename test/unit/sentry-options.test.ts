// test/unit/sentry-options.test.ts
//
// The options are read from the environment at import time, so each case
// stubs the env and re-imports the module.
import { afterEach, describe, expect, it, vi } from "vitest";

const load = async () => {
  vi.resetModules();
  return (await import("@/lib/sentry-options")).sentryOptions;
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sentryOptions", () => {
  it("is disabled and carries no release without a DSN", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    vi.stubEnv("NEXT_PUBLIC_SENTRY_RELEASE", "");
    const options = await load();
    expect(options.enabled).toBe(false);
    expect(options.release).toBeUndefined();
    expect(options.sendDefaultPii).toBe(false);
  });

  it("enables with a DSN and reports the bridged release", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://key@o1.ingest.sentry.io/1");
    vi.stubEnv("NEXT_PUBLIC_SENTRY_RELEASE", "abc123");
    const options = await load();
    expect(options.enabled).toBe(true);
    expect(options.release).toBe("abc123");
  });

  it("prefers the explicit environment over VERCEL_ENV and NODE_ENV", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_ENVIRONMENT", "staging");
    vi.stubEnv("VERCEL_ENV", "production");
    expect((await load()).environment).toBe("staging");

    vi.stubEnv("NEXT_PUBLIC_SENTRY_ENVIRONMENT", "");
    expect((await load()).environment).toBe("production");
  });

  it("samples traces only in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect((await load()).tracesSampleRate).toBe(0.1);
    vi.stubEnv("NODE_ENV", "test");
    expect((await load()).tracesSampleRate).toBe(0);
  });
});
