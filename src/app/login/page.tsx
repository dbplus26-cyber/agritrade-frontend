import type { Metadata } from "next";
import { LoginClient } from "@/components/auth/login-client";

export const metadata: Metadata = {
  title: "Sign in · DB Plus",
  // The sign-in page is private plumbing - keep it out of search indexes.
  robots: { index: false, follow: false },
};

/** Only allow same-origin, absolute in-app paths as a post-login destination.
 * `//host` and `/\host` are both parsed as protocol-relative (off-origin) URLs
 * by the WHATWG URL parser, so reject a leading slash followed by `/` or `\`. */
function safeRedirect(from: string | string[] | undefined): string {
  const value = Array.isArray(from) ? from[0] : from;
  if (
    value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/\\")
  ) {
    return value;
  }
  return "/admin";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  return <LoginClient redirectTo={safeRedirect(from)} />;
}
