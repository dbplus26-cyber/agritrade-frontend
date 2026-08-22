import { notFound } from "next/navigation";

/**
 * Catch-all for mistyped console URLs. Without it an unmatched /admin path
 * falls through to the PUBLIC site's 404 - marketing styling, links out of
 * the console, no way back to work - which reads as "the console is broken".
 * notFound() renders the console-scoped not-found inside the admin shell.
 */
export default function MissingAdminPage() {
  notFound();
}
