"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { routes } from "@/lib/routes";

/** Route-segment error boundary — the failed-document state with a reset. */
export default function ErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <ErrorMessage
        title="This page didn't go through"
        // No phone number in this copy: the office line is owner data served
        // from the settings API (see lib/public-contact.ts), and this boundary
        // renders precisely when fetching may be what failed. Point at the
        // contact page instead of hardcoding a number that can go stale.
        description="Something went wrong on our side. Try again - if it keeps failing, get in touch and we'll sort it out."
        onRetry={reset}
      />
      <Button asChild variant="ghost" className="mt-4">
        <Link href={routes.contact}>Contact us</Link>
      </Button>
    </div>
  );
}
