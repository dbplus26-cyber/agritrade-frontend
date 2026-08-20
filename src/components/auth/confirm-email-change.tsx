"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthSubmit } from "./auth-submit";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { useConfirmEmailChangeMutation } from "@/redux/auth/auth-api";

/**
 * Applies the parked email change against the emailed token.
 *
 * A BUTTON, deliberately, not a confirm-on-mount. Corporate mail scanners
 * follow every link in a message before the person ever sees it; a page that
 * consumed the single-use token on render would let the scanner burn the link
 * and the real click land on "invalid or already used". Scanners do not press
 * buttons.
 */
export function ConfirmEmailChange({ token }: { token: string }) {
  const router = useRouter();
  const [confirm, { isLoading }] = useConfirmEmailChangeMutation();
  const [failed, setFailed] = useState<null | string>(null);

  const onConfirm = async () => {
    setFailed(null);
    try {
      await confirm({ token }).unwrap();
      notify.success("Email address updated", {
        description: "Sign in with the new address from now on.",
      });
      router.replace("/login");
    } catch (err) {
      // Shown in place as well as toasted: the person landed here from an
      // email and has no other context on this page to fall back on.
      setFailed(extractApiError(err).message);
    }
  };

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void onConfirm();
      }}
    >
      <p className="text-[13.5px] leading-[1.6] text-slate-600">
        Press the button to switch your sign-in to the new address. The link
        works once; afterwards the old address no longer signs in.
      </p>
      {failed ? (
        <p className="text-[13px] leading-[1.5] text-red-700" role="alert">
          {failed} If the link has expired, request the change again from your
          profile.
        </p>
      ) : null}
      <AuthSubmit isLoading={isLoading} loadingText="Confirming…">
        Confirm new email
      </AuthSubmit>
    </form>
  );
}
