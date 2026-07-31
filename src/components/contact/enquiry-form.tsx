"use client";

import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { DocCard } from "@/components/ui/DocCard";
import { FieldError } from "@/components/ui/FieldError";
import { Stamp } from "@/components/ui/Stamp";
import {
  TURNSTILE_ENABLED,
  TurnstileWidget,
} from "@/components/ui/TurnstileWidget";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { useSiteContact } from "@/components/providers/site-contact-provider";
import { cn } from "@/lib/utils";
import { useCreateEnquiryMutation } from "@/redux/enquiries/enquiries-api";
import { ENQUIRY_SUBJECTS, type EnquirySubject } from "@/types/enquiry.types";
import {
  enquirySchema,
  type EnquiryValues,
} from "@/validations/enquiry-schema";

const inputClass =
  "w-full rounded-[2px] border-[1.5px] border-soil/35 bg-[#FBFCF7] px-3.5 py-3.5 text-[16px] text-ink outline-none transition-[border-color,box-shadow] placeholder:text-soil/55 focus:border-leaf focus:shadow-[0_0_0_3px_rgb(62_125_98/0.16)] aria-invalid:border-error";

const labelClass = "stencil text-[11px] tracking-[0.14em] text-harvest-deep";

/**
 * The enquiry form document. Validates on submit then live per-field (design
 * rule: error text sits under the field, never as a toast — the toast is for
 * transport failures only). Success swaps the sheet for the "RECEIVED" file.
 *
 * Bot protection mirrors the backend's: a hidden honeypot field bots fill and
 * people never see, plus Cloudflare Turnstile when a site key is configured
 * (without one the widget renders nothing and submission proceeds unblocked).
 *
 * Service pages deep-link here with a preselected subject (and optionally
 * what the enquiry is about, e.g. a plot reference) via `defaultSubject` /
 * `defaultAbout` — the contact page derives both from its search params.
 */
export function EnquiryForm({
  defaultSubject = "General enquiry",
  defaultAbout,
}: {
  defaultSubject?: EnquirySubject;
  defaultAbout?: string;
}) {
  const fieldId = useId();
  const contact = useSiteContact();
  const [reference, setReference] = useState<string | null>(null);
  // Cloudflare Turnstile: the token gates submit only when a site key is set
  // (mirrors the backend, which skips verification without its secret key).
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileError, setTurnstileError] = useState(false);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [createEnquiry, { isLoading: submitting }] = useCreateEnquiryMutation();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<EnquiryValues>({
    resolver: zodResolver(enquirySchema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      subject: defaultSubject,
      message: defaultAbout ? `Regarding ${defaultAbout} - ` : "",
      website: "",
    },
  });

  const onSubmit = async (values: EnquiryValues) => {
    if (TURNSTILE_ENABLED && !turnstileToken) {
      setTurnstileError(true);
      return;
    }
    try {
      const res = await createEnquiry({
        fullName: values.fullName.trim(),
        phone: values.phone.trim(),
        email: values.email || undefined,
        subject: values.subject,
        message: values.message.trim(),
        website: values.website ?? "",
        turnstileToken: turnstileToken || undefined,
      }).unwrap();
      setReference(res.data.reference);
    } catch (err) {
      const { message, fieldErrors, hasFieldErrors } = extractApiError(err);
      if (hasFieldErrors && fieldErrors) {
        for (const [field, msg] of Object.entries(fieldErrors)) {
          if (
            field === "fullName" ||
            field === "phone" ||
            field === "email" ||
            field === "message"
          ) {
            setError(field, { message: msg });
          }
        }
      }
      notify.error("Couldn't send your enquiry", { description: message });
      // A Turnstile token is single-use — reset so a retry gets a fresh one.
      setTurnstileReset((n) => n + 1);
    }
  };

  if (reference) {
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
          Enquiry on file. Thank you.
        </h2>
        <p className="mb-2 text-[14px] leading-[1.65] text-soil">
          We&rsquo;ll call or message you within one working day. If it&rsquo;s
          urgent, WhatsApp us now and mention the enquiry.
        </p>
        <p className="stencil mb-5 text-[12px] tracking-[0.14em] text-harvest-deep">
          REFERENCE · {reference}
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href={contact.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-[2px] bg-leaf px-[22px] py-[13px] text-[14px] font-bold text-surface shadow-[3px_3px_0_rgb(31_33_28/0.3)]"
          >
            WhatsApp us
          </a>
          <button
            type="button"
            onClick={() => {
              reset();
              setReference(null);
            }}
            className="cursor-pointer rounded-[2px] border-2 border-soil/50 px-5 py-[11px] text-[14px] font-bold text-soil shadow-[3px_3px_0_rgb(89_82_59/0.25)]"
          >
            Send another enquiry
          </button>
        </div>
      </DocCard>
    );
  }

  return (
    <DocCard bleed title="ENQUIRY FORM" fileNo="N° EN-____">
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-[18px] px-5 pb-8 pt-6 sm:px-8"
      >
        <div className="grid gap-[18px] sm:grid-cols-2 sm:gap-5">
          <div className="flex flex-col gap-[7px]">
            <label htmlFor={`${fieldId}-name`} className={labelClass}>
              FULL NAME *
            </label>
            <input
              id={`${fieldId}-name`}
              {...register("fullName")}
              placeholder="e.g. Kwame Mensah"
              aria-invalid={errors.fullName ? true : undefined}
              aria-describedby={
                errors.fullName ? `${fieldId}-name-error` : undefined
              }
              className={inputClass}
            />
            <FieldError
              id={`${fieldId}-name-error`}
              message={errors.fullName?.message}
            />
          </div>
          <div className="flex flex-col gap-[7px]">
            <label htmlFor={`${fieldId}-phone`} className={labelClass}>
              PHONE *
            </label>
            <input
              id={`${fieldId}-phone`}
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
            <label htmlFor={`${fieldId}-email`} className={labelClass}>
              EMAIL - OPTIONAL
            </label>
            <input
              id={`${fieldId}-email`}
              type="email"
              {...register("email")}
              placeholder="you@company.com"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={
                errors.email ? `${fieldId}-email-error` : undefined
              }
              className={inputClass}
            />
            <FieldError
              id={`${fieldId}-email-error`}
              message={errors.email?.message}
            />
          </div>
          <div className="flex flex-col gap-[7px]">
            <label htmlFor={`${fieldId}-subject`} className={labelClass}>
              SUBJECT
            </label>
            <select
              id={`${fieldId}-subject`}
              {...register("subject")}
              className={cn(inputClass, "cursor-pointer")}
            >
              {ENQUIRY_SUBJECTS.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-[7px]">
          <label htmlFor={`${fieldId}-message`} className={labelClass}>
            MESSAGE *
          </label>
          <textarea
            id={`${fieldId}-message`}
            rows={5}
            {...register("message")}
            placeholder="e.g. We need 30 tonnes of white maize delivered to Tema by end of month."
            aria-invalid={errors.message ? true : undefined}
            aria-describedby={
              errors.message ? `${fieldId}-message-error` : undefined
            }
            className={cn(inputClass, "resize-y leading-[1.6]")}
          />
          <FieldError
            id={`${fieldId}-message-error`}
            message={errors.message?.message}
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
                ? "Please complete the verification to send your enquiry."
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
            {submitting ? "Sending…" : "Send enquiry"}
          </Button>
          <span className="text-[13px] text-soil">
            We reply within one working day.
          </span>
        </div>
      </form>
    </DocCard>
  );
}
