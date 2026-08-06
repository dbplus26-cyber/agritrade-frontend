import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset your password · DB Plus",
  // Auth plumbing - keep it out of search indexes.
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter your email and we'll send a link to set a new one. It also unblocks an account locked by failed sign-ins."
      footer={
        <Link
          href="/login"
          className="font-semibold text-slate-600 no-underline transition-colors hover:text-console"
        >
          ← Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
