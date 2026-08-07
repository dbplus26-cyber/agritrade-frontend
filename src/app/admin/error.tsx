"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { AdminButton, AdminCard, Mono } from "@/components/admin/ui";

/**
 * The console's error boundary. Without one, a crash anywhere under /admin
 * bubbles to the root boundary and paints the public site's paper-and-stamp
 * card - customer-facing chrome, customer-facing wording, and no way back into
 * the console. This boundary lives inside the admin layout, so the shell and
 * nav stay put and only the failed screen is replaced.
 *
 * `digest` is the server-side hash Next attaches to the logged error - the one
 * handle staff can quote when reporting the failure.
 */
export default function AdminErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-[560px]">
      <AdminCard className="px-5 py-5">
        <p className="text-[10.5px] font-bold tracking-[0.09em] text-console-red uppercase">
          Not processed
        </p>
        <h1 className="mt-1 text-[19px] font-bold text-adm-ink">
          This screen didn&rsquo;t load
        </h1>
        <p className="mt-1.5 text-[13px] leading-[1.6] text-adm-muted">
          The action that failed saved nothing - no money, stock or paperwork
          moved. Try again; if it keeps failing, quote the reference below to
          whoever maintains the console.
        </p>
        {error.digest ? (
          <p className="mt-3 text-[12.5px] text-adm-muted">
            Reference <Mono className="text-adm-ink">{error.digest}</Mono>
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <AdminButton onClick={reset}>
            <RefreshCw aria-hidden="true" data-slot="icon" />
            Try again
          </AdminButton>
          <AdminButton asChild variant="outline">
            <Link href="/admin">Back to the dashboard</Link>
          </AdminButton>
        </div>
      </AdminCard>
    </div>
  );
}
