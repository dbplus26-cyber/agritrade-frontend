"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useGetMeQuery, useLogoutMutation } from "@/redux/auth/auth-api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useHydrated } from "@/hooks/use-hydrated";

/**
 * Gates the admin console on a *validated* session - the real protection
 * beyond the proxy's cookie-presence check.
 *
 * The proxy blocks visitors with no session sign, but it can't tell a live
 * session from a stale or tampered cookie. This guard calls `GET /auth/me`
 * (which flows through the api-slice's silent refresh on a 401): a valid
 * session resolves and renders the console; an invalid one is cleared and
 * bounced to `/login?from=…`. A persisted user renders optimistically while
 * `/me` revalidates in the background - but only after hydration: the
 * persisted user lives in localStorage, which the server can't see, so the
 * first client render must match the server's loading screen or React
 * reports a hydration mismatch.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const cachedUser = useCurrentUser();
  const hydrated = useHydrated();
  const { data, error, isError, isFetching, refetch } = useGetMeQuery();
  const sessionRejected =
    isError && error && "status" in error && error.status === 401;
  const [logout] = useLogoutMutation();
  const handled = useRef(false);

  useEffect(() => {
    // Act only on a SETTLED failure. On remount RTK Query serves the cached
    // result instantly while revalidating - after a logout→login round trip
    // that cache holds the logout's 401, and treating it as a verdict here
    // fires a logout that revokes the brand-new session: login reports success
    // and the console never appears until a hard refresh clears the store.
    if (sessionRejected && !isFetching && !handled.current) {
      handled.current = true;
      // The session is invalid (commonly a stale cookie from a reset DB). Clear
      // the httpOnly cookies server-side so the proxy's gate no longer treats
      // this as a session, then land on sign-in. Redirect regardless of the
      // logout result so a backend hiccup can't strand us on a spinner.
      logout()
        .unwrap()
        .catch(() => {})
        .finally(() => {
          router.replace(`/login?from=${encodeURIComponent(pathname)}`);
        });
    }
  }, [sessionRejected, isFetching, logout, pathname, router]);

  if (isError && !isFetching && !sessionRejected) {
    return (
      <div
        role="alert"
        className="flex min-h-[320px] flex-col items-center justify-center gap-4 px-6 text-center"
      >
        <p>
          We could not verify your session. Check your connection and try again.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded bg-board px-4 py-2 text-surface"
        >
          Try again
        </button>
      </div>
    );
  }

  // Hold the console while a rejected session redirects or a check retries.
  if (isError) return <LoadingScreen />;

  // Verified by /me, or optimistic from a persisted user while the check runs
  // (post-hydration only - see the note above).
  if (data || (hydrated && cachedUser)) return <>{children}</>;

  // First load with no persisted user: wait for /me before revealing anything.
  return <LoadingScreen />;
}
