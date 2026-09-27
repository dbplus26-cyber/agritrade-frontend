"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthField } from "./auth-field";
import { AuthSubmit } from "./auth-submit";
import { notify } from "@/lib/notify";
import { extractApiError } from "@/lib/extract-api-error";
import { useForgotPasswordMutation } from "@/redux/auth/auth-api";
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from "@/validations/auth-schema";

export function ForgotPasswordForm() {
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    try {
      await forgotPassword(values).unwrap();
      // The backend responds identically whether or not the account exists (no
      // enumeration), so success just means the request was processed.
      setSentTo(values.email);
    } catch (err) {
      const { message, fieldErrors, hasFieldErrors } = extractApiError(err);
      if (hasFieldErrors && fieldErrors?.email) {
        setError("email", { message: fieldErrors.email });
      }
      notify.error("Couldn't send the reset link", { description: message });
    }
  };

  if (sentTo) {
    return (
      <div className="grid gap-3 text-[13.5px] leading-[1.65] text-soil">
        <p>
          If an account exists for{" "}
          <span className="font-semibold text-ink">{sentTo}</span>, a
          password-reset link is on its way. It expires in 30 minutes and can be
          used once.
        </p>
        <p>Didn&apos;t get it? Check your spam folder, or try again.</p>
        <button
          type="button"
          onClick={() => setSentTo(null)}
          className="cursor-pointer justify-self-start text-[12.5px] font-semibold text-console transition-colors hover:text-console-deep"
        >
          ← Use a different email
        </button>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <AuthField
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@dbplus.com"
        error={errors.email?.message}
        {...register("email")}
      />
      <AuthSubmit isLoading={isLoading} loadingText="Sending…">
        Email me a reset link
      </AuthSubmit>
    </form>
  );
}
