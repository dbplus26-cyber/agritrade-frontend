"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { SimpleSelect } from "@/components/ui/simple-select";
import {
  AdminButton,
  AdminCard,
  AdminField,
  DetailHeader,
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/ui";
import { DASHBOARD_CRUMB, DetailNav } from "@/components/admin/detail-nav";
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
    },
  });

  const onSubmit = async (values: CreateUserValues) => {
    // An owner account is a privilege grant, so the email is typed back. A
    // plain staff or agent account is one deliberate click - permissions are
    // granted afterwards on the Permissions screen, never at creation.
    const privileged = values.role === UserRole.SUPER_ADMIN;
    const confirmed = await confirm({
      title: "Create this account?",
      description: `${values.firstName} ${values.lastName} (${values.email}) - ${
        ROLE_LABEL[values.role]
      }. They can sign in as soon as you hand over the password.`,
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
      <DetailNav
        crumbs={[DASHBOARD_CRUMB, { label: "Users", href: "/admin/users" }]}
        current="Add user"
      />
      <DetailHeader
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
          <section className="flex flex-col gap-5">
            <div className="grid gap-5 @min-[440px]:grid-cols-2">
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
            <div className="grid gap-5 @min-[440px]:grid-cols-2">
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
                <Input
                  type="tel"
                  placeholder="e.g. 024 000 0000"
                  className={cn(
                    adminInputClass,
                    errors.phone && "border-console-red",
                  )}
                  {...register("phone")}
                />
              </AdminField>
            </div>
          </section>

          <section className="flex flex-col gap-5">
            <div className="grid gap-5 @min-[520px]:grid-cols-2">
            <AdminField
              label="Role"
              hint="Agents only ever see their own float and purchases."
            >
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <SimpleSelect
                    className={cn(adminSelectClass, "w-full")}
                    value={field.value}
                    onChange={field.onChange}
                    options={ROLE_OPTIONS.map((role) => ({
                      value: role,
                      label: ROLE_LABEL[role],
                    }))}
                  />
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
            </div>
          </section>

          <div className="flex justify-end gap-2">
            <AdminButton
              type="button"
              variant="outline"
              size="lg"
              onClick={() => router.push("/admin/users")}
            >
              Cancel
            </AdminButton>
            <AdminButton
              type="submit"
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? "Creating…" : "Create user"}
            </AdminButton>
          </div>
        </form>
      </AdminCard>
      {confirmationDialog}
    </div>
  );
}
