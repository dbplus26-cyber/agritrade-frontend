"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";

import { ActionRow, AdminButton, AdminCard, Mono } from "@/components/admin/ui";

/**
 * The field app's error boundary. Without it a crash out in the field falls
 * all the way to the ROOT boundary and paints the public site's
 * paper-and-stamp card - customer wording, customer chrome, and a link to
 * the contact page rather than a way back to work. This boundary sits inside
 * the agent layout, so the shell and the bottom tabs stay put and only the
 * failed screen is replaced.
 *
 * The wording matters more here than in the console: an agent whose purchase
 * screen just died is standing at a village scale with a farmer waiting, and
 * the first thing they need to know is whether the money was taken. It was
 * not - a crashed screen committed nothing.
 */
export default function AgentErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-[560px] px-4 py-6">
      <AdminCard className="px-5 py-5">
        <p className="text-[10.5px] font-bold tracking-[0.09em] text-console-red uppercase">
          Nothing was recorded
        </p>
        <h1 className="mt-1 text-[19px] font-bold text-adm-ink">
          This screen didn&rsquo;t load
        </h1>
        <p className="mt-1.5 text-[13px] leading-[1.6] text-adm-muted">
          Nothing was saved and no money left your float. Try again - if the
          screen keeps failing, record the purchase on paper and enter it once
          you have signal, then quote the reference below to the office.
        </p>
        {error.digest ? (
          <p className="mt-3 text-[12.5px] text-adm-muted">
            Reference <Mono className="text-adm-ink">{error.digest}</Mono>
          </p>
        ) : null}
        <ActionRow className="mt-4">
          <AdminButton onClick={reset}>
            <RefreshCw aria-hidden="true" data-slot="icon" />
            Try again
          </AdminButton>
          <AdminButton asChild variant="outline">
            <Link href="/agent">Back to my day</Link>
          </AdminButton>
        </ActionRow>
      </AdminCard>
    </div>
  );
}
