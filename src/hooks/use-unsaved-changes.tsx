"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/use-confirm";

const LEAVE = {
  title: "Leave without saving?",
  description: "What you have written since the last save will be lost.",
  confirmText: "Leave",
  cancelText: "Keep writing",
  isDestructive: true,
} as const;

/** A click on a link that would take this tab to another page of the app. */
const inAppHref = (event: MouseEvent): string | null => {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return null;
  }
  const target = event.target;
  const anchor = target instanceof Element ? target.closest("a[href]") : null;
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if (anchor.target && anchor.target !== "_self") return null;
  if (anchor.hasAttribute("download")) return null;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  // The same page (a hash link) is not leaving.
  if (url.pathname === window.location.pathname) return null;
  return `${url.pathname}${url.search}${url.hash}`;
};

/**
 * Stops unsaved work on a long form being lost by leaving the page. While
 * `dirty` is true every way out asks first:
 *
 *   - reload, closing the tab, a typed address: the browser's own prompt;
 *   - a link anywhere in the app (the rail, the breadcrumbs): our dialog;
 *   - the back button: our dialog. Back cannot be cancelled once it happens,
 *     so a spare history entry for this same page is kept under the form; back
 *     lands on that entry (nothing moves) and the dialog decides whether to
 *     go on.
 *
 * `leave(href)` is for the form's own exits (Cancel, the redirect after a
 * save): it asks when dirty and uses up the spare entry so it is not left
 * behind as a dead back press.
 */
export function useUnsavedChanges(dirty: boolean) {
  const router = useRouter();
  const { confirm, confirmationDialog } = useConfirm();
  const dirtyRef = useRef(dirty);
  // True while the spare history entry is on the stack.
  const spare = useRef(false);

  useEffect(() => {
    dirtyRef.current = dirty;
    if (dirty && !spare.current) {
      window.history.pushState(window.history.state, "", window.location.href);
      spare.current = true;
    }
  }, [dirty]);

  /** Leave for `href`, asking first when there is unsaved work. */
  const leave = useCallback(
    async (href: string, options: { ask?: boolean } = {}) => {
      const ask = options.ask ?? true;
      if (ask && dirtyRef.current && !(await confirm(LEAVE))) return;
      // Replacing swaps the spare entry for the destination.
      if (spare.current) router.replace(href);
      else router.push(href);
      spare.current = false;
      dirtyRef.current = false;
    },
    [confirm, router],
  );

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current) event.preventDefault();
    };

    const onClick = (event: MouseEvent) => {
      if (!dirtyRef.current && !spare.current) return;
      const href = inAppHref(event);
      if (!href) return;
      // Capture phase on the document: the link's own handler never runs.
      event.preventDefault();
      event.stopPropagation();
      void leave(href);
    };

    const onPopState = () => {
      if (!spare.current) return;
      // Back has just used up the spare entry; this page is still showing.
      spare.current = false;
      if (!dirtyRef.current) {
        window.history.back();
        return;
      }
      void confirm(LEAVE).then((ok) => {
        if (ok) {
          dirtyRef.current = false;
          window.history.back();
        } else {
          window.history.pushState(
            window.history.state,
            "",
            window.location.href,
          );
          spare.current = true;
        }
      });
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [confirm, leave]);

  return { leave, unsavedDialog: confirmationDialog };
}
