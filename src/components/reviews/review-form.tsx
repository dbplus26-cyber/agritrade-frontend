"use client";

import { useId, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocCard } from "@/components/ui/DocCard";
import { FieldError } from "@/components/ui/FieldError";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Stamp } from "@/components/ui/Stamp";
import {
  TURNSTILE_ENABLED,
  TurnstileWidget,
} from "@/components/ui/TurnstileWidget";
import { extractApiError } from "@/lib/extract-api-error";
import { REVIEWER_NAME_MAX } from "@/lib/limits";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { useSubmitPublicReviewMutation } from "@/redux/reviews/public-reviews-api";
import {
  REVIEW_ROLES,
  REVIEW_ROLE_LABELS,
} from "@/types/public-review.types";
import { reviewSchema, type ReviewValues } from "@/validations/review-schema";

const inputClass =
  "w-full rounded-[2px] border-[1.5px] border-soil/35 bg-[#FBFCF7] px-3.5 py-3.5 text-[16px] text-ink outline-none transition-[border-color,box-shadow] placeholder:text-soil/55 focus:border-leaf focus:shadow-[0_0_0_3px_rgb(62_125_98/0.16)] aria-invalid:border-error";

const labelClass = "stencil text-[11px] tracking-[0.14em] text-harvest-deep";

const helperClass = "text-[12px] leading-[1.55] text-soil";

/** Keyboard-accessible 5-star radio group; the value lives in the form. */
function StarRating({
  name,
  value,
  invalid,
  describedBy,
  onPick,
}: {
  name: string;
  value: number;
  invalid: boolean;
  describedBy?: string;
  onPick: (rating: number) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Rating"
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className="flex items-center gap-1"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <label key={star} className="cursor-pointer">
          <input
            type="radio"
            name={name}
            value={star}
            checked={value === star}
            onChange={() => {
              onPick(star);
            }}
            aria-label={`${String(star)} star${star > 1 ? "s" : ""}`}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className={cn(
              "block px-0.5 text-[30px] leading-none transition-colors peer-focus-visible:rounded-[2px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-leaf",
              star <= value ? "text-harvest" : "text-soil/30",
            )}
          >
            <Star className="h-[30px] w-[30px]" fill="currentColor" />
          </span>
        </label>
      ))}
    </div>
  );
}

/**
 * The public review form - same architecture as the enquiry form (rhf + zod,
 * inline field errors, honeypot + Turnstile, toast only for transport
 * failures). Reviews are gated to real customers: the backend matches the
 * transaction number + phone against the books, and its REVIEW_NOT_VERIFIED
 * message is shown verbatim under the transaction-number field. Success
 * swaps the sheet for the "RECEIVED" file - the review appears on the site
 * only after the office approves it.
 */
export function ReviewForm() {
  const fieldId = useId();
  const [received, setReceived] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileError, setTurnstileError] = useState(false);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [submitReview, { isLoading: submitting }] =
    useSubmitPublicReviewMutation();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    control,
    formState: { errors },
  } = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      authorName: "",
      phone: "",
      transactionNo: "",
      role: "BUYER",
      rating: 0,
      text: "",
      website: "",
    },
  });
  const rating = useWatch({ control, name: "rating" });

  const onSubmit = async (values: ReviewValues) => {
    if (TURNSTILE_ENABLED && !turnstileToken) {
      setTurnstileError(true);
      return;
    }
    try {
      await submitReview({
        authorName: values.authorName.trim(),
        rating: values.rating,
        text: values.text.trim(),
        role: values.role,
        transactionNo: values.transactionNo.trim(),
        phone: values.phone.trim(),
        website: values.website ?? "",
        turnstileToken: turnstileToken || undefined,
      }).unwrap();
      setReceived(true);
    } catch (err) {
      const { message, code, fieldErrors, hasFieldErrors } =
        extractApiError(err);
      // A Turnstile token is single-use - reset so a retry gets a fresh one.
      setTurnstileReset((n) => n + 1);
      if (code === "REVIEW_NOT_VERIFIED") {
        // The backend couldn't match the transaction number + phone - its
        // message says exactly what to check, so show it verbatim inline.
        setError("transactionNo", { message });
        return;
      }
      if (hasFieldErrors && fieldErrors) {
        for (const [field, msg] of Object.entries(fieldErrors)) {
          if (
            field === "authorName" ||
            field === "phone" ||
            field === "transactionNo" ||
            field === "rating" ||
            field === "text"
          ) {
            setError(field, { message: msg });
          }
        }
      }
      notify.error("Couldn't send your review", { description: message });
    }
  };

  if (received) {
    return (
      <DocCard bleed tint="paper" className="px-5 pb-8 pt-7 sm:px-9">
        <div
          aria-hidden="true"
          className="relative mb-[22px] h-[120px] bg-[repeating-linear-gradient(180deg,transparent_0px,transparent_27px,rgb(89_82_59/0.25)_27px,rgb(89_82_59/0.25)_28px)]"
        >
          <Stamp className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap border-[3px] px-5 py-[11px] text-[20px]">
            Received
          </Stamp>
        </div>
        <h2 className="mb-2 font-display text-[24px] font-bold text-forest">
          Thank you - your review is on file.
        </h2>
        <p className="mb-5 text-[14px] leading-[1.65] text-soil">
          Every review is checked against the books before it goes up, so
          yours will appear once it is approved.
        </p>
        <button
          type="button"
          onClick={() => {
            reset();
            setTurnstileToken("");
            setTurnstileReset((n) => n + 1);
            setReceived(false);
          }}
          className="cursor-pointer rounded-[2px] border-2 border-soil/50 px-5 py-[11px] text-[14px] font-bold text-soil shadow-[3px_3px_0_rgb(89_82_59/0.25)]"
        >
          Write another review
        </button>
      </DocCard>
    );
  }

  return (
    <DocCard bleed title="REVIEW FORM" fileNo="N° RV-____">
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-[18px] px-5 pb-8 pt-6 sm:px-8"
      >
        <div className="grid gap-[18px] sm:grid-cols-2 sm:gap-5">
          <div className="flex flex-col gap-[7px]">
            <label htmlFor={`${fieldId}-name`} className={labelClass}>
              YOUR NAME *
            </label>
            <input
              id={`${fieldId}-name`}
              {...register("authorName")}
              maxLength={REVIEWER_NAME_MAX}
              placeholder="e.g. Kwame Mensah"
              aria-invalid={errors.authorName ? true : undefined}
              aria-describedby={
                errors.authorName ? `${fieldId}-name-error` : undefined
              }
              className={inputClass}
            />
            <FieldError
              id={`${fieldId}-name-error`}
              message={errors.authorName?.message}
            />
          </div>
          <div className="flex flex-col gap-[7px]">
            <label htmlFor={`${fieldId}-phone`} className={labelClass}>
              PHONE USED ON THE TRANSACTION *
            </label>
            <input
              id={`${fieldId}-phone`}
              type="tel"
              {...register("phone")}
              placeholder="e.g. 024 123 4567"
              aria-invalid={errors.phone ? true : undefined}
              aria-describedby={
                errors.phone ? `${fieldId}-phone-error` : undefined
              }
              className={inputClass}
            />
            <FieldError
              id={`${fieldId}-phone-error`}
              message={errors.phone?.message}
            />
          </div>
        </div>

        <div className="grid gap-[18px] sm:grid-cols-2 sm:gap-5">
          <div className="flex flex-col gap-[7px]">
            <label htmlFor={`${fieldId}-txn`} className={labelClass}>
              TRANSACTION NUMBER *
            </label>
            <input
              id={`${fieldId}-txn`}
              {...register("transactionNo")}
              placeholder="SAL-2026-00042"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={errors.transactionNo ? true : undefined}
              aria-describedby={cn(
                `${fieldId}-txn-help`,
                errors.transactionNo && `${fieldId}-txn-error`,
              )}
              className={cn(inputClass, "font-mono tracking-[0.04em]")}
            />
            <FieldError
              id={`${fieldId}-txn-error`}
              message={errors.transactionNo?.message}
            />
            <span id={`${fieldId}-txn-help`} className={helperClass}>
              The number printed on your receipt or waybill - only real
              customers can review.
            </span>
          </div>
          <div className="flex flex-col gap-[7px]">
            <label htmlFor={`${fieldId}-role`} className={labelClass}>
              YOU DEALT WITH US AS
            </label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <SimpleSelect
                  id={`${fieldId}-role`}
                  className={cn(inputClass, "cursor-pointer")}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Choose how you dealt with us"
                  options={REVIEW_ROLES.map((role) => ({
                    value: role,
                    label: REVIEW_ROLE_LABELS[role],
                  }))}
                />
              )}
            />
          </div>
        </div>

        <div className="flex flex-col gap-[7px]">
          <span className={labelClass}>RATING *</span>
          <StarRating
            name={`${fieldId}-rating`}
            value={rating}
            invalid={Boolean(errors.rating)}
            describedBy={errors.rating ? `${fieldId}-rating-error` : undefined}
            onPick={(value) => {
              setValue("rating", value, { shouldValidate: true });
            }}
          />
          <FieldError
            id={`${fieldId}-rating-error`}
            message={errors.rating?.message}
          />
        </div>

        <div className="flex flex-col gap-[7px]">
          <label htmlFor={`${fieldId}-text`} className={labelClass}>
            YOUR REVIEW *
          </label>
          <textarea
            id={`${fieldId}-text`}
            rows={5}
            {...register("text")}
            placeholder="e.g. Bought 20 tonnes of maize - weighed in front of us, delivered on the day agreed."
            aria-invalid={errors.text ? true : undefined}
            aria-describedby={errors.text ? `${fieldId}-text-error` : undefined}
            className={cn(inputClass, "resize-y leading-[1.6]")}
          />
          <FieldError
            id={`${fieldId}-text-error`}
            message={errors.text?.message}
          />
        </div>

        {/* Honeypot: invisible to people, irresistible to bots. The backend
            rejects any submission that fills it. */}
        <input
          {...register("website")}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
        />

        <div className="flex flex-col gap-[7px]">
          <TurnstileWidget
            onVerify={(token) => {
              setTurnstileToken(token);
              if (token) setTurnstileError(false);
            }}
            resetSignal={turnstileReset}
          />
          <FieldError
            id={`${fieldId}-turnstile-error`}
            message={
              turnstileError
                ? "Please complete the verification to send your review."
                : undefined
            }
          />
        </div>

        <div className="flex flex-wrap items-center gap-[18px] pt-1">
          <Button
            type="submit"
            disabled={submitting}
            className="shadow-block h-auto rounded-[2px] bg-harvest px-[30px] py-[15px] text-[15px] font-bold text-ink transition-[transform,box-shadow] duration-100 hover:translate-x-px hover:translate-y-px hover:bg-harvest hover:shadow-[2px_2px_0_#1F211C]"
          >
            {submitting ? "Sending…" : "Send review"}
          </Button>
          <span className="text-[13px] text-soil">
            Reviews appear after approval.
          </span>
        </div>
      </form>
    </DocCard>
  );
}
