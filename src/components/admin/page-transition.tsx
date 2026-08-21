"use client";

import { usePathname } from "next/navigation";

/**
 * Eases each console page in as it mounts: a short fade with a few pixels of
 * lift, re-run on every route change (keyed on the pathname, so filter and
 * page changes on a register do not re-trigger it). The global
 * prefers-reduced-motion rule switches it off for people who ask.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div
      key={pathname}
      className="animate-in fade-in slide-in-from-bottom-1 fill-mode-both duration-200 ease-out"
    >
      {children}
    </div>
  );
}
