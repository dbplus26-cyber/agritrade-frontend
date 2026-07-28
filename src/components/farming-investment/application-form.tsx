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
import { useSubmitFarmApplicationMutation } from "@/redux/farm-applications/public-farm-applications-api";
import {
  farmApplicationSchema,
  type FarmApplicationValues,
} from "@/validations/farm-application-schema";

const inputClass =
  "w-full rounded-[2px] border-[1.5px] border-soil/35 bg-[#FBFCF7] px-3.5 py-3.5 text-[16px] text-ink outline-none transition-[border-color,box-shadow] placeholder:text-soil/55 focus:border-leaf focus:shadow-[0_0_0_3px_rgb(62_125_98/0.16)] aria-invalid:border-error";

const labelClass = "stencil text-[11px] tracking-[0.14em] text-harvest-deep";

const helperClass = "text-[12px] leading-[1.55] text-soil";

/** Fields the backend can return per-field errors for. */
const FIELD_NAMES = [
  "name",
  "phone",
  "email",
  "community",
  "address",
  "farmLocation",
  "farmSizeAcres",
  "crops",
  "itemsNeeded",
  "expectedYieldKg",
  "previousExperience",
  "guarantorName",
  "guarantorPhone",
  "message",
] as const;
type FieldName = (typeof FIELD_NAMES)[number];

const isFieldName = (field: string): field is FieldName =>
  (FIELD_NAMES as readonly string[]).includes(field);

/** The stencilled caption that opens each section of the application document. */
function SectionRule({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 first:mt-0">
      <span className="stencil text-[11px] tracking-[0.22em] text-ink">
        {children}
      </span>
    </div>
  );
}

/**
 * The farming-programme application - same architecture as the enquiry form
 * (rhf + zod, inline field errors, honeypot + Turnstile, toast only for
 * transport failures). Only name + phone are required; everything else
 * helps the office review faster. The numeric fields hold raw strings
 * (phones must be able to clear and retype) and convert on submit. Success
 * swaps the sheet for the "RECEIVED" file with the FA-XXXX reference.
 */
export function ApplicationForm() {
  const fieldId = useId();
  const contact = useSiteContact();
  const [reference, setReference] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileError, setTurnstileError] = useState(false);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [submitApplication, { isLoading: submitting }] =
    useSubmitFarmApplicationMutation();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FarmApplicationValues>({
    resolver: zodResolver(farmApplicationSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      community: "",
      address: "",
      farmLocation: "",
      farmSizeAcres: "",
      crops: "",
      itemsNeeded: "",
      expectedYieldKg: "",
      previousExperience: "",
      guarantorName: "",
      guarantorPhone: "",
      message: "",
      website: "",
    },
  });

  const onSubmit = async (values: FarmApplicationValues) => {
    if (TURNSTILE_ENABLED && !turnstileToken) {
      setTurnstileError(true);
      return;
    }
    const optional = (v: string | undefined) => v?.trim() || undefined;
    try {
      const res = await submitApplication({
        name: values.name.trim(),
        phone: values.phone.trim(),
        email: optional(values.email),
        community: optional(values.community),
        address: optional(values.address),
        farmLocation: optional(values.farmLocation),
        farmSizeAcres: values.farmSizeAcres?.trim()
          ? Number(values.farmSizeAcres)
          : undefined,
        crops: optional(values.crops),
        itemsNeeded: optional(values.itemsNeeded),
        expectedYieldKg: values.expectedYieldKg?.trim()
          ? Number(values.expectedYieldKg)
          : undefined,
        previousExperience: optional(values.previousExperience),
        guarantorName: optional(values.guarantorName),
        guarantorPhone: optional(values.guarantorPhone),
        message: optional(values.message),
        website: values.website ?? "",
        turnstileToken: turnstileToken || undefined,
      }).unwrap();
      setReference(res.data.reference);
    } catch (err) {
      const { message, fieldErrors, hasFieldErrors } = extractApiError(err);
      if (hasFieldErrors && fieldErrors) {
        for (const [field, msg] of Object.entries(fieldErrors)) {
          if (isFieldName(field)) setError(field, { message: msg });
        }
      }
      notify.error("Couldn't send your application", { description: message });
      // A Turnstile token is single-use - reset so a retry gets a fresh one.
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
          Application on file. We will call you.
        </h2>
        <p className="mb-2 text-[14px] leading-[1.65] text-soil">
          The office reviews applications in the order they arrive and calls
          every applicant. Keep your phone on - and if anything changes,
          WhatsApp us and mention your reference.
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
              setTurnstileToken("");
              setTurnstileReset((n) => n + 1);
              setReference(null);
            }}
            className="cursor-pointer rounded-[2px] border-2 border-soil/50 px-5 py-[11px] text-[14px] font-bold text-soil shadow-[3px_3px_0_rgb(89_82_59/0.25)]"
          >
            Send another application
          </button>
        </div>
      </DocCard>
    );
  }

  return (
    <DocCard bleed title="APPLICATION FORM" fileNo="N° FA-____">
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-[18px] px-5 pb-8 pt-6 sm:px-8"
      >
        <SectionRule>IDENTITY</SectionRule>
        <div className="grid gap-[18px] sm:grid-cols-2 sm:gap-5">
          <div className="flex flex-col gap-[7px]">
            <label htmlFor={`${fieldId}-name`} className={labelClass}>
              FULL NAME *
            </label>
            <input
              id={`${fieldId}-name`}
              {...register("name")}
              placeholder="e.g. Fuseini Alhassan"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={
                errors.name ? `${fieldId}-name-error` : undefined
              }
              className={inputClass}
            />
            <FieldError
              id={`${fieldId}-name-error`}
              message={errors.name?.message}
            />
          </div>
          <div className="flex flex-col gap-[7px]">
            <label htmlFor={`${fieldId}-phone`} className={labelClass}>
              PHONE *
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
        <div className="flex flex-col gap-[7px]">
          <label htmlFor={`${fieldId}-email`} className={labelClass}>
            EMAIL - OPTIONAL
          </label>
          <input
            id={`${fieldId}-email`}
            type="email"
            {...register("email")}
            placeholder="you@example.com"
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

        <SectionRule>WHERE YOU FARM</SectionRule>
        <div className="grid gap-[18px] sm:grid-cols-2 sm:gap-5">
          <div className="flex flex-col gap-[7px]">
            <label htmlFor={`${fieldId}-community`} className={labelClass}>
              COMMUNITY
            </label>
            <input
              id={`${fieldId}-community`}
              {...register("community")}
              placeholder="e.g. Kumbungu"
              aria-invalid={errors.community ? true : undefined}
              aria-describedby={
                errors.community ? `${fieldId}-community-error` : undefined
              }
              className={inputClass}
            />
            <FieldError
              id={`${fieldId}-community-error`}
              message={errors.community?.message}
            />
          </div>
          <div className="flex flex-col gap-[7px]">
            <label htmlFor={`${fieldId}-address`} className={labelClass}>
              HOUSE / POSTAL ADDRESS
            </label>
            <input
              id={`${fieldId}-address`}
              {...register("address")}
              placeholder="e.g. House No. 12, Kumbungu"
              aria-invalid={errors.address ? true : undefined}
              aria-describedby={
                errors.address ? `${fieldId}-address-error` : undefined
              }
              className={inputClass}
            />
            <FieldError
              id={`${fieldId}-address-error`}
              message={errors.address?.message}
            />
          </div>
        </div>
        <div className="grid gap-[18px] sm:grid-cols-2 sm:gap-5">
          <div className="flex flex-col gap-[7px]">
            <label htmlFor={`${fieldId}-location`} className={labelClass}>
              WHERE THE FARM IS
            </label>
            <input
              id={`${fieldId}-location`}
              {...register("farmLocation")}
              placeholder="e.g. Off the Kumbungu road, near the dam"
              aria-invalid={errors.farmLocation ? true : undefined}
              aria-describedby={
                errors.farmLocation ? `${fieldId}-location-error` : undefined
              }
              className={inputClass}
            />
            <FieldError
              id={`${fieldId}-location-error`}
              message={errors.farmLocation?.message}
            />
          </div>
          <div className="flex flex-col gap-[7px]">
            <label htmlFor={`${fieldId}-size`} className={labelClass}>
              FARM SIZE (ACRES)
            </label>
            <input
              id={`${fieldId}-size`}
              inputMode="decimal"
              {...register("farmSizeAcres")}
              placeholder="e.g. 5"
              aria-invalid={errors.farmSizeAcres ? true : undefined}
              aria-describedby={
                errors.farmSizeAcres ? `${fieldId}-size-error` : undefined
              }
              className={inputClass}
            />
            <FieldError
              id={`${fieldId}-size-error`}
              message={errors.farmSizeAcres?.message}
            />
          </div>
        </div>

        <SectionRule>WHAT YOU NEED</SectionRule>
        <div className="grid gap-[18px] sm:grid-cols-2 sm:gap-5">
          <div className="flex flex-col gap-[7px]">
            <label htmlFor={`${fieldId}-crops`} className={labelClass}>
              CROPS YOU GROW
            </label>
            <input
              id={`${fieldId}-crops`}
              {...register("crops")}
              placeholder="e.g. Maize and soya beans"
              aria-invalid={errors.crops ? true : undefined}
              aria-describedby={
                errors.crops ? `${fieldId}-crops-error` : undefined
              }
              className={inputClass}
            />
            <FieldError
              id={`${fieldId}-crops-error`}
              message={errors.crops?.message}
            />
          </div>
          <div className="flex flex-col gap-[7px]">
            <label htmlFor={`${fieldId}-yield`} className={labelClass}>
              EXPECTED YIELD (KG)
            </label>
            <input
              id={`${fieldId}-yield`}
              inputMode="numeric"
              {...register("expectedYieldKg")}
              placeholder="e.g. 4000"
              aria-invalid={errors.expectedYieldKg ? true : undefined}
              aria-describedby={
                errors.expectedYieldKg ? `${fieldId}-yield-error` : undefined
              }
              className={inputClass}
            />
            <FieldError
              id={`${fieldId}-yield-error`}
              message={errors.expectedYieldKg?.message}
            />
          </div>
        </div>
        <div className="flex flex-col gap-[7px]">
          <label htmlFor={`${fieldId}-items`} className={labelClass}>
            INPUTS YOU NEED
          </label>
          <textarea
            id={`${fieldId}-items`}
            rows={3}
            {...register("itemsNeeded")}
            placeholder="e.g. 10 bags of NPK, 5 bags of urea, certified maize seed for 5 acres"
            aria-invalid={errors.itemsNeeded ? true : undefined}
            aria-describedby={
              errors.itemsNeeded ? `${fieldId}-items-error` : undefined
            }
            className={cn(inputClass, "resize-y leading-[1.6]")}
          />
          <FieldError
            id={`${fieldId}-items-error`}
            message={errors.itemsNeeded?.message}
          />
        </div>
        <div className="flex flex-col gap-[7px]">
          <label htmlFor={`${fieldId}-experience`} className={labelClass}>
            PREVIOUS FARMING EXPERIENCE
          </label>
          <textarea
            id={`${fieldId}-experience`}
            rows={3}
            {...register("previousExperience")}
            placeholder="e.g. Farming maize for 8 years; supplied an aggregator the last two seasons"
            aria-invalid={errors.previousExperience ? true : undefined}
            aria-describedby={
              errors.previousExperience
                ? `${fieldId}-experience-error`
                : undefined
            }
            className={cn(inputClass, "resize-y leading-[1.6]")}
          />
          <FieldError
            id={`${fieldId}-experience-error`}
            message={errors.previousExperience?.message}
          />
        </div>

        <SectionRule>GUARANTOR</SectionRule>
        <p className={cn(helperClass, "-mt-1")}>
          Someone who vouches for you - it speeds up review.
        </p>
        <div className="grid gap-[18px] sm:grid-cols-2 sm:gap-5">
          <div className="flex flex-col gap-[7px]">
            <label htmlFor={`${fieldId}-guarantor`} className={labelClass}>
              GUARANTOR NAME
            </label>
            <input
              id={`${fieldId}-guarantor`}
              {...register("guarantorName")}
              placeholder="e.g. Chief farmer, assemblyman, elder"
              aria-invalid={errors.guarantorName ? true : undefined}
              aria-describedby={
                errors.guarantorName ? `${fieldId}-guarantor-error` : undefined
              }
              className={inputClass}
            />
            <FieldError
              id={`${fieldId}-guarantor-error`}
              message={errors.guarantorName?.message}
            />
          </div>
          <div className="flex flex-col gap-[7px]">
            <label htmlFor={`${fieldId}-guarantor-phone`} className={labelClass}>
              GUARANTOR PHONE
            </label>
            <input
              id={`${fieldId}-guarantor-phone`}
              type="tel"
              {...register("guarantorPhone")}
              placeholder="e.g. 024 765 4321"
              aria-invalid={errors.guarantorPhone ? true : undefined}
              aria-describedby={
                errors.guarantorPhone
                  ? `${fieldId}-guarantor-phone-error`
                  : undefined
              }
              className={inputClass}
            />
            <FieldError
              id={`${fieldId}-guarantor-phone-error`}
              message={errors.guarantorPhone?.message}
            />
          </div>
        </div>

        <SectionRule>ANYTHING ELSE</SectionRule>
        <div className="flex flex-col gap-[7px]">
          <label htmlFor={`${fieldId}-message`} className={labelClass}>
            MESSAGE
          </label>
          <textarea
            id={`${fieldId}-message`}
            rows={4}
            {...register("message")}
            placeholder="Anything else the office should know before calling you."
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
                ? "Please complete the verification to send your application."
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
            {submitting ? "Sending…" : "Send application"}
          </Button>
          <span className="text-[13px] text-soil">
            The office calls every applicant.
          </span>
        </div>
      </form>
    </DocCard>
  );
}
