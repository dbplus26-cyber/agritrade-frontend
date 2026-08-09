"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  adminInputClass,
  adminSelectClass,
  SectionHeading,
} from "@/components/admin/ui";
import { BackButton } from "@/components/ui/BackButton";
import { useConfirm } from "@/hooks/use-confirm";
import { useCreateUserMutation } from "@/redux/users/users-api";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types/user.types";
import {
  createUserSchema,
  type CreateUserValues,
} from "@/validations/user-schema";
import { ROLE_LABEL, ROLE_OPTIONS } from "./user-bits";

/** A pronounceable-enough random initial password that satisfies the policy. */
function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%";
  const pick = (set: string, n: number) =>
    Array.from(
      crypto.getRandomValues(new Uint8Array(n)),
      (b) => set[b % set.length],
    ).join("");
  return `${pick(upper, 3)}${pick(lower, 4)}${pick(digits, 2)}${pick(special, 1)}`;
}

/**
 * Create a console account. The initial password is set here and shared with
 * the person out of band - the welcome email deliberately carries no
 * credentials (backend rule).
 */
export function UserForm() {
  const router = useRouter();
  const [createUser, { isLoading }] = useCreateUserMutation();
  const { confirm, confirmationDialog } = useConfirm();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      phone: "",
      role: UserRole.STAFF,
      canApprove: false,
      financialVisibility: false,
    },
  });

  const onSubmit = async (values: CreateUserValues) => {
    // Read the account's reach back in plain words - the two switches are
    // easy to leave on by accident and they decide who sees the money.
    const extras = [
      values.canApprove ? "can approve requests" : null,
      values.financialVisibility ? "can see money" : null,
    ].filter(Boolean);
    // An owner account, approval rights or the money columns are a privilege
    // grant, so the email is typed back. A plain staff account with neither
    // switch on is one deliberate click - no friction where none is earned.
    const privileged =
      values.role === UserRole.SUPER_ADMIN ||
      values.canApprove ||
      values.financialVisibility;
    const confirmed = await confirm({
      title: "Create this account?",
      description: `${values.firstName} ${values.lastName} (${values.email}) - ${
        ROLE_LABEL[values.role]
      }${extras.length > 0 ? `, ${extras.join(" and ")}` : ""}. They can sign in as soon as you hand over the password.`,
      confirmText: "Create user",
      ...(privileged ? { requireExactMatch: values.email } : {}),
    });
    if (!confirmed) return;

    try {
      const res = await createUser({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        ...(values.phone?.trim() ? { phone: values.phone.trim() } : {}),
        role: values.role,
        canApprove: values.canApprove,
        financialVisibility: values.financialVisibility,
      }).unwrap();
      notify.success("User created", {
        description:
          "Share the initial password with them securely - it is not emailed.",
        duration: 8000,
      });
      router.replace(`/admin/users/${res.data.user.id}`);
    } catch (err) {
      const { message, fieldErrors, hasFieldErrors } = extractApiError(err);
      if (hasFieldErrors && fieldErrors) {
        for (const field of [
          "firstName",
          "lastName",
          "email",
          "password",
          "phone",
        ] as const) {
          if (fieldErrors[field]) setError(field, { message: fieldErrors[field] });
        }
      }
      notify.error("Couldn't create the user", { description: message });
    }
  };

  return (
    <div className="max-w-[640px]">
      <BackButton href="/admin/users" label="All users" className="mb-2" />
      <AdminPageHeader
        title="Add user"
        hint="Someone who can sign in, and what they are allowed to do."
        sub="Create a console account and hand over its first password"
      />
      <AdminCard className="px-5 py-[18px]">
        {/* Field pairs measure against this form, not the viewport: the
            console shell keeps a ~225px rail beside it, so `sm:` paired the
            names up while the column was still too narrow for two. */}
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="@container flex flex-col gap-5"
        >
          <section className="flex flex-col gap-[13px]">
            <SectionHeading className="mb-0">Who they are</SectionHeading>
            <div className="grid gap-[13px] @min-[440px]:grid-cols-2">
              <AdminField label="First name" error={errors.firstName?.message}>
                <Input
                  placeholder="e.g. Amina"
                  className={cn(
                    adminInputClass,
                    errors.firstName && "border-console-red",
                  )}
                  {...register("firstName")}
                />
              </AdminField>
              <AdminField label="Last name" error={errors.lastName?.message}>
                <Input
                  placeholder="e.g. Abdulai"
                  className={cn(
                    adminInputClass,
                    errors.lastName && "border-console-red",
                  )}
                  {...register("lastName")}
                />
              </AdminField>
            </div>
            <AdminField label="Email" error={errors.email?.message}>
              <Input
                type="email"
                placeholder="e.g. amina@dbplus.com"
                className={cn(adminInputClass, errors.email && "border-console-red")}
                {...register("email")}
              />
            </AdminField>
            <AdminField
              label="Phone"
              optional
              error={errors.phone?.message}
            >
              {/* A phone number has a known length; the 640px column it
                  sits in does not have to be filled. */}
              <Input
                type="tel"
                placeholder="e.g. 024 000 0000"
                className={cn(
                  adminInputClass,
                  "max-w-[20ch]",
                  errors.phone && "border-console-red",
                )}
                {...register("phone")}
              />
            </AdminField>
          </section>

          <section className="flex flex-col gap-[13px] border-t border-adm-hairline pt-5">
            <SectionHeading
              className="mb-0"
              hint="What this account can reach, and the password you hand over to open it."
            >
              Access
            </SectionHeading>
            <AdminField
              label="Role"
              hint="Agents only ever see their own float and purchases."
            >
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={cn(adminSelectClass, "w-full")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABEL[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </AdminField>
            <AdminField
              label="Initial password"
              hint="Share it with them securely - it is never emailed. They should change it on first sign-in."
              error={errors.password?.message}
            >
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <PasswordInput
                    autoComplete="new-password"
                    placeholder="Type one, or press Generate"
                    className={cn(
                      adminInputClass,
                      errors.password && "border-console-red",
                    )}
                    {...register("password")}
                  />
                </div>
                <AdminButton
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="flex-none"
                  onClick={() =>
                    setValue("password", generatePassword(), {
                      shouldValidate: true,
                    })
                  }
                >
                  Generate
                </AdminButton>
              </div>
            </AdminField>
          </section>

          <section className="flex flex-col gap-[13px] border-t border-adm-hairline pt-5">
            <SectionHeading
              className="mb-0"
              hint="Two switches that widen the account beyond its role. Both are easy to leave on by accident."
            >
              Extra permissions
            </SectionHeading>
            <div className="grid gap-3 rounded-[6px] border border-adm-line bg-adm-sunken p-3.5">
              <Controller
                control={control}
                name="canApprove"
                render={({ field }) => (
                  <label className="flex cursor-pointer items-center justify-between gap-3">
                    <span>
                      <span className="block text-[13px] font-semibold text-adm-ink">
                        Can approve
                      </span>
                      <span className="block text-[12px] text-adm-muted">
                        May decide pending approval requests (delegated authority).
                      </span>
                    </span>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </label>
                )}
              />
              <Controller
                control={control}
                name="financialVisibility"
                render={({ field }) => (
                  <label className="flex cursor-pointer items-center justify-between gap-3">
                    <span>
                      <span className="block text-[13px] font-semibold text-adm-ink">
                        Financial visibility
                      </span>
                      <span className="block text-[12px] text-adm-muted">
                        May see prices, totals and profit across the console.
                      </span>
                    </span>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </label>
                )}
              />
            </div>
          </section>

          <div className="flex gap-2 border-t border-adm-hairline pt-5">
            <AdminButton
              type="submit"
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? "Creating…" : "Create user"}
            </AdminButton>
            <AdminButton
              type="button"
              variant="outline"
              size="lg"
              onClick={() => router.push("/admin/users")}
            >
              Cancel
            </AdminButton>
          </div>
        </form>
      </AdminCard>
      {confirmationDialog}
    </div>
  );
}
