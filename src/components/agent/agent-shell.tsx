"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useConfirm } from "@/hooks/use-confirm";
import { useLogoutMutation } from "@/redux/auth/auth-api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { notify } from "@/lib/notify";

/**
 * The field app's chrome: one slim top bar (brand, who is signed in, profile,
 * sign out) over a narrow column. Deliberately light - agents work on slow
 * rural connections, so no sidebar, no heavy tables, no decoration that costs
 * bytes (design doc 8.6).
 */
export function AgentShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useCurrentUser();
  const { confirm, confirmationDialog } = useConfirm();
  const [logout, { isLoading }] = useLogoutMutation();

  const signOut = async () => {
    // Sign out is confirm-gated: on a phone this button sits a thumb-width
    // from Profile, and a mistap here costs a full log-in on a 2G connection.
    const ok = await confirm({
      title: "Sign out?",
      description: "You'll need your password to sign back in.",
      confirmText: "Sign out",
    });
    if (!ok) return;
    await logout()
      .unwrap()
      .catch(() => {});
    notify.success("Signed out");
    router.replace("/login");
  };

  // Every screen below the home one gets a way back. Browser history first
  // (it returns a form-filler to the list they came from); home when this
  // page was landed on cold and there is nowhere back to go.
  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push("/agent");
  };

  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="border-b border-soil/25 bg-paper">
        <div className="mx-auto flex h-14 max-w-[560px] items-center justify-between px-4">
          <Link href="/agent" className="flex min-w-0 items-center gap-2.5">
            <Image
              src="/logo-mark.png"
              alt=""
              width={64}
              height={64}
              className="h-8 w-8 shrink-0"
            />
            <span className="min-w-0">
              <span className="block text-[15px] font-bold tracking-tight text-forest">
                DB PLUS
              </span>
              <span className="block truncate text-[11px] text-soil">
                Field agent{user ? ` · ${user.firstName}` : ""}
              </span>
            </span>
          </Link>
          <div className="flex flex-none items-center gap-2">
            <Link
              href="/agent/profile"
              className="rounded border border-soil/35 px-3 py-1.5 text-[12.5px] font-medium text-soil transition-colors hover:bg-surface-alt"
            >
              Profile
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              disabled={isLoading}
              className="rounded border border-soil/35 px-3 py-1.5 text-[12.5px] font-medium text-soil transition-colors hover:bg-surface-alt"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[560px] px-4 py-4">
        {pathname !== "/agent" ? (
          <button
            type="button"
            onClick={goBack}
            className="mb-3 inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-soil transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </button>
        ) : null}
        {children}
      </main>
      {confirmationDialog}
    </div>
  );
}
