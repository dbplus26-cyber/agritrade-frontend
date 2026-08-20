import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ConfirmEmailChange } from "@/components/auth/confirm-email-change";

export const metadata: Metadata = {
  title: "Confirm your new email · DB Plus",
  // Auth plumbing - keep it out of search indexes.
  robots: { index: false, follow: false },
};

export default async function ConfirmEmailChangePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  const backToLogin = (
    <Link
      href="/login"
      className="font-semibold text-slate-600 no-underline transition-colors hover:text-console"
    >
      ← Back to sign in
    </Link>
  );

  // A link with no token is unusable - say so instead of rendering a button
  // that can only fail.
  if (!token) {
    return (
      <AuthCard
        title="Invalid confirmation link"
        subtitle="This link is missing its token or has already been used."
        footer={backToLogin}
      >
        <p className="text-[13.5px] leading-[1.6] text-slate-600">
          Email-change links work once. Request the change again from your
          profile to get a fresh one.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Confirm your new email"
      subtitle="One press applies the change to your sign-in."
      footer={backToLogin}
    >
      <ConfirmEmailChange token={token} />
    </AuthCard>
  );
}
