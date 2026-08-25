"use client";

import * as Sentry from "@sentry/nextjs";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { Suspense, useEffect, type ReactNode } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { env } from "@/lib/env";

// Events go through the same-origin /ingest rewrite (next.config.ts) so the
// CSP's connect-src stays closed to third-party hosts; ui_host is where the
// toolbar and session links resolve.
const POSTHOG_UI_HOST = "https://eu.posthog.com";

const analyticsEnabled = Boolean(env.POSTHOG_KEY);

if (typeof window !== "undefined" && analyticsEnabled) {
  posthog.init(env.POSTHOG_KEY, {
    api_host: "/ingest",
    ui_host: POSTHOG_UI_HOST,
    // Pageviews are captured by hand below: the App Router navigates without
    // a document load, so the automatic one would only see the first page.
    capture_pageview: false,
    // Anonymous visitors on the public site get no person profile; one is
    // created only once identify() runs after sign-in.
    person_profiles: "identified_only",
  });
}

/** One pageview per App Router navigation, including query changes. */
function PageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    const query = searchParams.toString();
    posthog.capture("$pageview", {
      $current_url: `${window.location.origin}${pathname}${query ? `?${query}` : ""}`,
    });
  }, [pathname, searchParams]);

  return null;
}

/**
 * Ties the signed-in user's opaque id to both trackers and drops it on sign
 * out. Only the id crosses the boundary: no name, email or phone.
 */
function Identity() {
  const userId = useCurrentUser()?.id ?? null;

  useEffect(() => {
    if (userId) {
      Sentry.setUser({ id: userId });
      if (analyticsEnabled) posthog.identify(userId);
    } else {
      Sentry.setUser(null);
      if (analyticsEnabled) posthog.reset();
    }
  }, [userId]);

  return null;
}

/**
 * Mounts PostHog (when NEXT_PUBLIC_POSTHOG_KEY is set) and the shared identity
 * effect. Must sit inside StoreProvider: Identity reads the auth slice. The
 * Suspense boundary keeps useSearchParams from opting the whole layout out of
 * static rendering.
 */
export function AnalyticsProvider({ children }: { children: ReactNode }) {
  if (!analyticsEnabled) {
    return (
      <>
        <Identity />
        {children}
      </>
    );
  }

  return (
    <PostHogProvider client={posthog}>
      <Suspense fallback={null}>
        <PageView />
      </Suspense>
      <Identity />
      {children}
    </PostHogProvider>
  );
}
