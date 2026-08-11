"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, X } from "lucide-react";
import { PhotoManager } from "@/components/admin/users/photo-manager";
import { useCurrentUser } from "@/hooks/use-current-user";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useChangePasswordMutation,
  useUpdateMeMutation,
} from "@/redux/auth/auth-api";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type { IUser } from "@/types/user.types";
import {
  changePasswordSchema,
  type ChangePasswordValues,
} from "@/validations/auth-schema";
import { z } from "zod";
import type { Permission } from "@/types/permission.types";

/**
 * The field app's own profile screen, in the field idiom: light, stacked,
 * thumb-sized. Names and phone are the agent's to keep current; the sign-in
 * email stays the office's to change (an admin edit applies instantly,
 * whereas self-service would park it behind a confirmation email the field
 * rarely has data for).
 */

const detailsSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name").max(50),
  lastName: z.string().trim().min(1, "Enter your last name").max(50),
  phone: z
    .string()
    .trim()
    .min(6, "Enter a full phone number")
    .max(20)
    .or(z.literal(""))
    .optional(),
});
type DetailsValues = z.infer<typeof detailsSchema>;

const fieldClass =
  "h-11 w-full rounded-none border border-soil/35 bg-paper px-3 text-[14.5px] text-ink outline-none placeholder:text-soil/60 focus:border-forest";
const labelClass = "mb-1 block text-[12.5px] font-semibold text-ink";
const errorClass = "mt-1 block text-[12px] font-medium text-error";
const cardClass = "rounded-none border border-soil/25 bg-paper px-4 py-4";
const submitClass =
  "w-full rounded-none bg-forest px-4 py-3 text-center text-[14px] font-semibold text-paper transition-colors hover:bg-board disabled:opacity-60 sm:w-auto sm:px-6";

/** The field-app actions, named the way the app names them. */
const FIELD_ACTIONS: { label: string; permission: Permission }[] = [
  { label: "Record purchases", permission: "PURCHASES_RECORD" },
  { label: "Record expenses", permission: "EXPENSES_RECORD" },
  { label: "Send money from my float", permission: "PAYOUTS_SEND" },
];

/** PhotoManager wired to the self-service PATCH /auth/me. */
function AgentPhoto({ user }: { user: IUser }) {
  const [updateMe, { isLoading }] = useUpdateMeMutation();
  return (
    <PhotoManager
      user={user}
      isSaving={isLoading}
      size={72}
      onSave={async (file) => {
        try {
          await updateMe({ body: {}, photo: file }).unwrap();
          notify.success("Profile photo updated");
        } catch (err) {
          notify.error("Couldn't upload the photo", {
            description: extractApiError(err).message,
          });
          throw err;
        }
      }}
      onRemove={async () => {
        try {
          await updateMe({ body: { removeProfilePicture: true } }).unwrap();
          notify.success("Profile photo removed");
        } catch (err) {
          notify.error("Couldn't remove the photo", {
            description: extractApiError(err).message,
          });
          throw err;
        }
      }}
    />
  );
}

function DetailsForm({
  user,
  onClose,
}: {
  user: IUser;
  onClose: () => void;
}) {
  const [updateMe, { isLoading }] = useUpdateMeMutation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? "",
    },
  });

  const onSubmit = async (values: DetailsValues) => {
    try {
      await updateMe({
        body: {
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone?.trim() ? values.phone.trim() : null,
        },
      }).unwrap();
      notify.success("Details saved");
      onClose();
    } catch (err) {
      const { message, fieldErrors, hasFieldErrors } = extractApiError(err);
      if (hasFieldErrors && fieldErrors) {
        for (const field of ["firstName", "lastName", "phone"] as const) {
          if (fieldErrors[field])
            setError(field, { message: fieldErrors[field] });
        }
      }
      notify.error("Couldn't save your details", { description: message });
    }
  };

  return (
    <form
      noValidate
      onSubmit={(e) => void handleSubmit(onSubmit)(e)}
      className="mt-3 grid gap-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className={labelClass}>First name</span>
          <input className={fieldClass} {...register("firstName")} />
          {errors.firstName ? (
            <span className={errorClass}>{errors.firstName.message}</span>
          ) : null}
        </label>
        <label>
          <span className={labelClass}>Last name</span>
          <input className={fieldClass} {...register("lastName")} />
          {errors.lastName ? (
            <span className={errorClass}>{errors.lastName.message}</span>
          ) : null}
        </label>
      </div>
      <label>
        <span className={labelClass}>Phone</span>
        <input
          type="tel"
          inputMode="tel"
          placeholder="024 000 0000"
          className={fieldClass}
          {...register("phone")}
        />
        {errors.phone ? (
          <span className={errorClass}>{errors.phone.message}</span>
        ) : null}
      </label>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          disabled={isLoading}
          onClick={onClose}
          className="w-full rounded-none border border-soil/35 bg-paper px-4 py-3 text-center text-[14px] font-medium text-ink transition-colors hover:bg-surface-alt disabled:opacity-60 sm:w-auto sm:px-6"
        >
          Cancel
        </button>
        <button type="submit" disabled={isLoading} className={submitClass}>
          {isLoading ? "Saving…" : "Save details"}
        </button>
      </div>
    </form>
  );
}

function DetailsCard() {
  const user = useCurrentUser();
  // Read-only until Edit: a phone screen full of live inputs reads as "type
  // here", and a mistap in a field the agent only meant to READ is a save
  // away from wrong data. The photo manages itself (it has its own confirm).
  const [editing, setEditing] = useState(false);
  if (!user) return null;

  return (
    <section className={cardClass}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[14px] font-bold text-ink">My details</h2>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-none border border-soil/35 bg-paper px-3 py-1.5 text-[12.5px] font-semibold text-ink transition-colors hover:bg-surface-alt"
          >
            Edit details
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-3.5">
        <AgentPhoto user={user} />
        <div className="min-w-0">
          <p className="text-[15px] font-bold break-words text-ink">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-[12px] text-soil">Field agent</p>
        </div>
      </div>

      {editing ? (
        <DetailsForm user={user} onClose={() => setEditing(false)} />
      ) : (
        <dl className="mt-3 border-t border-soil/15">
          <div className="flex items-baseline justify-between gap-3 border-b border-soil/15 py-2">
            <dt className="flex-none text-[11px] font-bold tracking-[0.08em] text-soil uppercase">
              Phone
            </dt>
            <dd className="min-w-0 text-right text-[13.5px] [overflow-wrap:anywhere] text-ink">
              {user.phone ?? "-"}
            </dd>
          </div>
          <div className="py-2">
            <dt className="text-[11px] font-bold tracking-[0.08em] text-soil uppercase">
              Sign-in email
            </dt>
            <dd className="mt-0.5 text-[13.5px] break-all text-ink">
              {user.email}
            </dd>
            <dd className="mt-0.5 text-[11.5px] text-soil/75">
              To change it, call the office - they update it from the console.
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}

function PasswordCard() {
  // Same rule as the details card: no live inputs until the agent SAYS they
  // want to change something. Three empty password boxes at rest read as a
  // form waiting to be filled, on a screen usually opened just to look.
  const [editing, setEditing] = useState(false);
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { confirm: "", currentPassword: "", newPassword: "" },
  });

  const close = () => {
    reset();
    setEditing(false);
  };

  const onSubmit = async (values: ChangePasswordValues) => {
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }).unwrap();
      close();
      notify.success("Password changed");
    } catch (err) {
      const { message } = extractApiError(err);
      setError("currentPassword", { message });
      notify.error("Couldn't change the password", { description: message });
    }
  };

  if (!editing) {
    return (
      <section className={cardClass}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[14px] font-bold text-ink">Password</h2>
            <p className="mt-0.5 font-mono text-[13.5px] tracking-[0.2em] text-soil">
              ••••••••
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex-none rounded-none border border-soil/35 bg-paper px-3 py-1.5 text-[12.5px] font-semibold text-ink transition-colors hover:bg-surface-alt"
          >
            Change password
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={cardClass}>
      <h2 className="text-[14px] font-bold text-ink">Change password</h2>
      <form
        noValidate
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="mt-3 grid gap-3"
      >
        <label>
          <span className={labelClass}>Current password</span>
          <input
            type="password"
            autoComplete="current-password"
            className={fieldClass}
            {...register("currentPassword")}
          />
          {errors.currentPassword ? (
            <span className={errorClass}>{errors.currentPassword.message}</span>
          ) : null}
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className={labelClass}>New password</span>
            <input
              type="password"
              autoComplete="new-password"
              className={fieldClass}
              {...register("newPassword")}
            />
            {errors.newPassword ? (
              <span className={errorClass}>{errors.newPassword.message}</span>
            ) : null}
          </label>
          <label>
            <span className={labelClass}>Repeat new password</span>
            <input
              type="password"
              autoComplete="new-password"
              className={fieldClass}
              {...register("confirm")}
            />
            {errors.confirm ? (
              <span className={errorClass}>{errors.confirm.message}</span>
            ) : null}
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={close}
            className="w-full rounded-none border border-soil/35 bg-paper px-4 py-3 text-center text-[14px] font-medium text-ink transition-colors hover:bg-surface-alt disabled:opacity-60 sm:w-auto sm:px-6"
          >
            Cancel
          </button>
          <button type="submit" disabled={isLoading} className={submitClass}>
            {isLoading ? "Changing…" : "Change password"}
          </button>
        </div>
      </form>
    </section>
  );
}

function AccessCard() {
  const { has, known } = usePermissions();
  if (!known) return null;
  return (
    <section className={cardClass}>
      <h2 className="text-[14px] font-bold text-ink">What I can do</h2>
      <p className="mt-0.5 text-[11.5px] text-soil/75">
        Set by the office. Call them if something you need is switched off.
      </p>
      <ul className="mt-2.5">
        {FIELD_ACTIONS.map(({ label, permission }) => {
          const on = has(permission);
          return (
            <li
              key={permission}
              className="flex items-center justify-between gap-3 border-b border-soil/15 py-2 last:border-b-0"
            >
              <span
                className={cn(
                  "text-[13.5px]",
                  on ? "text-ink" : "text-soil/70",
                )}
              >
                {label}
              </span>
              {on ? (
                <Check aria-label="Allowed" className="h-4 w-4 flex-none text-forest" />
              ) : (
                <X aria-label="Switched off" className="h-4 w-4 flex-none text-soil/50" />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function AgentProfile() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-[18px] font-bold text-ink">My profile</h1>
        <p className="text-[12.5px] text-soil">
          Your details, your password, and what your account can do.
        </p>
      </div>
      <DetailsCard />
      <PasswordCard />
      <AccessCard />
    </div>
  );
}
