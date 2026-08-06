import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Set a new password · DB Plus",
  // Auth plumbing - keep it out of search indexes.
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  const backToForgot = (
    <Link
      href="/forgot-password"
      className="font-semibold text-slate-600 no-underline transition-colors hover:text-console"
    >
      ← Request a new link
    </Link>
  );

  // A link with no token is unusable - send the user back to request a fresh
  // one rather than rendering a form that can only fail.
  if (!token) {
    return (
      <AuthCard
        title="Invalid reset link"
        subtitle="This link is missing its token or has already been used."
        footer={backToForgot}
      >
        <p className="text-[13.5px] leading-[1.6] text-slate-600">
          Password-reset links expire after 30 minutes and can only be used
          once. Request a fresh one to continue.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Set a new password"
      subtitle="Choose a strong password you don't use anywhere else."
      footer={backToForgot}
    >
      <ResetPasswordForm token={token} />
    </AuthCard>
  );
}
