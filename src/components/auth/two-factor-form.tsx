"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthField } from "./auth-field";
import { AuthSubmit } from "./auth-submit";
import { notify } from "@/lib/notify";
import { extractApiError } from "@/lib/extract-api-error";
import {
  useVerifyTwoFactorMutation,
  useResendTwoFactorCodeMutation,
  useRecoveryLoginMutation,
} from "@/redux/auth/auth-api";
import {
  twoFactorSchema,
  type TwoFactorValues,
  recoveryCodeSchema,
  type RecoveryCodeValues,
} from "@/validations/auth-schema";

interface TwoFactorFormProps {
  /** The (masked) email the challenge was issued for, shown for context. */
  email: string;
  redirectTo: string;
  /** Return to the credentials step (e.g. wrong account). */
  onBack: () => void;
}

/** The emailed-code step, with a fallback path for a single-use recovery code
 * when the mailbox is unreachable. Both complete the same pending challenge. */
export function TwoFactorForm({ email, redirectTo, onBack }: TwoFactorFormProps) {
  const [useRecovery, setUseRecovery] = useState(false);
  return useRecovery ? (
    <RecoveryStep
      redirectTo={redirectTo}
      onUseCode={() => setUseRecovery(false)}
    />
  ) : (
    <CodeStep
      email={email}
      redirectTo={redirectTo}
      onBack={onBack}
      onUseRecovery={() => setUseRecovery(true)}
    />
  );
}

function CodeStep({
  email,
  redirectTo,
  onBack,
  onUseRecovery,
}: TwoFactorFormProps & { onUseRecovery: () => void }) {
  const router = useRouter();
  const [verify, { isLoading }] = useVerifyTwoFactorMutation();
  const [resend, { isLoading: isResending }] = useResendTwoFactorCodeMutation();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<TwoFactorValues>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: { code: "" },
  });

  const onSubmit = async (values: TwoFactorValues) => {
    try {
      await verify(values).unwrap();
      notify.success("Welcome back");
      router.replace(redirectTo);
    } catch (err) {
      const { message, fieldErrors, hasFieldErrors } = extractApiError(err);
      if (hasFieldErrors && fieldErrors?.code) {
        setError("code", { message: fieldErrors.code });
      }
      notify.error("That code didn't work", { description: message });
    }
  };

  const onResend = async () => {
    try {
      await resend().unwrap();
      notify.success("New code sent", { description: `Check ${email}.` });
    } catch (err) {
      notify.error("Couldn't resend the code", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <p className="text-[13.5px] leading-[1.6] text-soil">
        We sent a 6-digit code to{" "}
        <span className="font-semibold text-ink">{email}</span>. Enter it
        below to finish signing in.
      </p>
      {/* Six digits, sized to six digits. Stretched across the whole card
          the field read as "paste something long here" and the caret sat
          alone in a wide empty box. */}
      <AuthField
        label="Verification code"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="123456"
        maxLength={6}
        className="max-w-[11ch] tracking-[0.3em]"
        error={errors.code?.message}
        {...register("code")}
      />
      <AuthSubmit isLoading={isLoading} loadingText="Verifying…">
        Verify &amp; sign in
      </AuthSubmit>
      <div className="flex items-center justify-between text-[12.5px]">
        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer font-semibold text-soil transition-colors hover:text-ink"
        >
          ← Different account
        </button>
        <button
          type="button"
          onClick={onResend}
          disabled={isResending}
          className="cursor-pointer font-semibold text-console transition-colors hover:text-console-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isResending ? "Sending…" : "Resend code"}
        </button>
      </div>
      <button
        type="button"
        onClick={onUseRecovery}
        className="cursor-pointer justify-self-center text-[12.5px] font-semibold text-soil transition-colors hover:text-console"
      >
        Can&apos;t get the email? Use a recovery code
      </button>
    </form>
  );
}

function RecoveryStep({
  redirectTo,
  onUseCode,
}: {
  redirectTo: string;
  onUseCode: () => void;
}) {
  const router = useRouter();
  const [recoveryLogin, { isLoading }] = useRecoveryLoginMutation();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RecoveryCodeValues>({
    resolver: zodResolver(recoveryCodeSchema),
    defaultValues: { code: "" },
  });

  const onSubmit = async (values: RecoveryCodeValues) => {
    try {
      await recoveryLogin(values).unwrap();
      notify.success("Welcome back", {
        description:
          "That recovery code is now used. Regenerate a fresh set from your profile if you're running low.",
      });
      router.replace(redirectTo);
    } catch (err) {
      const { message, fieldErrors, hasFieldErrors } = extractApiError(err);
      if (hasFieldErrors && fieldErrors?.code) {
        setError("code", { message: fieldErrors.code });
      }
      notify.error("That recovery code didn't work", { description: message });
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <p className="text-[13.5px] leading-[1.6] text-soil">
        Enter one of the single-use recovery codes you saved when you turned on
        two-factor authentication.
      </p>
      <AuthField
        label="Recovery code"
        autoComplete="off"
        placeholder="7F3K9-QW2MD"
        error={errors.code?.message}
        {...register("code")}
      />
      <AuthSubmit isLoading={isLoading} loadingText="Verifying…">
        Use recovery code
      </AuthSubmit>
      <button
        type="button"
        onClick={onUseCode}
        className="cursor-pointer justify-self-center text-[12.5px] font-semibold text-soil transition-colors hover:text-console"
      >
        ← Back to the emailed code
      </button>
    </form>
  );
}
