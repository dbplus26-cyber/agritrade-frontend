"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useHydrated } from "@/hooks/use-hydrated";
import { userLoggedIn } from "@/redux/auth/auth-slice";
import { AuthCard } from "./auth-card";
import { LoginForm } from "./login-form";
import { TwoFactorForm } from "./two-factor-form";

/**
 * The console sign-in screen: either the credentials step or — when the
 * account has 2FA — the code step (emailed OTP, with a recovery-code fallback).
 *
 * A visitor with a persisted session is sent straight to the console, where
 * RequireAuth validates it for real (and bounces a stale one back here after
 * clearing it — no loop). Deliberately NOT a GET /auth/me here: for an
 * anonymous visitor that 401 would churn through the silent-refresh reset
 * machinery instead of just showing the form.
 */
export function LoginClient({ redirectTo }: { redirectTo: string }) {
  const [challengeEmail, setChallengeEmail] = useState<string | null>(null);
  const router = useRouter();
  const dispatch = useDispatch();
  const cachedUser = useCurrentUser();
  const hydrated = useHydrated();

  useEffect(() => {
    if (!hydrated || !cachedUser) return;
    // Re-issue the proxy's `dbplus.auth.hint` cookie before leaving, through
    // the same action that writes it on sign-in.
    //
    // The two halves of the persisted session expire differently: the hint
    // cookie lasts 7 days, the stored user in localStorage never expires. Once
    // the cookie is gone but the user isn't, redirecting on the cached user
    // alone looped forever - the proxy bounced /admin to /login, this effect
    // bounced straight back, and RequireAuth (the only code that revalidates
    // and clears a stale user) never got to mount. Re-setting the hint lets
    // the console actually load, and RequireAuth's GET /auth/me settles it: a
    // dead session is cleared there and lands back here as a real sign-in.
    dispatch(userLoggedIn({ user: cachedUser }));
    router.replace(redirectTo);
  }, [hydrated, cachedUser, dispatch, router, redirectTo]);

  // Pre-hydration (the persisted user lives in localStorage, invisible to the
  // server) and mid-redirect: hold the spinner, never flash the form.
  if (!hydrated || cachedUser) return <LoadingScreen className="min-h-screen" />;

  return (
    <AuthCard
      title={challengeEmail ? "Two-step verification" : "Sign in"}
      subtitle={
        challengeEmail
          ? "One more step to keep the business secure."
          : "Welcome back — sign in to run the trading house."
      }
    >
      {challengeEmail ? (
        <TwoFactorForm
          email={challengeEmail}
          redirectTo={redirectTo}
          onBack={() => setChallengeEmail(null)}
        />
      ) : (
        <LoginForm redirectTo={redirectTo} onChallenge={setChallengeEmail} />
      )}
    </AuthCard>
  );
}
