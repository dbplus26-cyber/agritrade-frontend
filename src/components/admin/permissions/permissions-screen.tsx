"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ShieldCheck } from "lucide-react";
import {
  AdminButton,
  AdminCard,
  AdminPageHeader,
  SectionHeading,
  ToneBadge,
  adminInputClass,
} from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirm } from "@/hooks/use-confirm";
import { useGetUsersQuery } from "@/redux/users/users-api";
import {
  useGetPermissionMatrixQuery,
  useGetUserPermissionsQuery,
  useSetUserPermissionsMutation,
  useUpdateRolePermissionsMutation,
} from "@/redux/permissions/permissions-api";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { UserRole, type IUser } from "@/types/user.types";
import type {
  EditableRole,
  IPermissionGroup,
  Permission,
} from "@/types/permission.types";
import { ROLE_LABEL, initialsOf } from "@/components/admin/users/user-bits";

/* ── Shared bits ─────────────────────────────────────────────────────────── */

const ROLE_TITLE: Record<EditableRole, string> = {
  STAFF: "Office staff",
  AGENT: "Field agents",
};

const ROLE_BLURB: Record<EditableRole, string> = {
  STAFF:
    "Everyone with the Office staff role starts with exactly this. Extra access for one person is granted on the People tab.",
  AGENT:
    "Field agents work through their own purchasing screens - the console itself stays out of reach whatever is switched on here.",
};

const sameSet = (a: ReadonlySet<string>, b: ReadonlySet<string>) =>
  a.size === b.size && [...a].every((x) => b.has(x));

const catalogSize = (catalog: IPermissionGroup[]) =>
  catalog.reduce((n, g) => n + g.permissions.length, 0);

/**
 * The grouped permission list both tabs share: one row per permission with
 * its plain-words description and a switch. `checked` drives the switch,
 * `effective` drives the group counts (on the People tab a switch can be off
 * while the role still allows the thing), `viaRole` shows where an allowance
 * is really coming from.
 */
function PermissionGroups({
  catalog,
  checked,
  effective,
  viaRole,
  onToggle,
  disabled,
}: {
  catalog: IPermissionGroup[];
  checked: (p: Permission) => boolean;
  effective: (p: Permission) => boolean;
  viaRole?: (p: Permission) => boolean;
  onToggle: (p: Permission) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      {catalog.map((group) => {
        const on = group.permissions.filter((m) =>
          effective(m.permission),
        ).length;
        return (
          <div key={group.group}>
            <div className="flex items-baseline justify-between gap-3 border-t border-adm-line bg-adm-sunken px-4 py-[7px] sm:px-5">
              <span className="text-[11px] font-bold tracking-[0.08em] text-adm-muted uppercase">
                {group.group}
              </span>
              <span className="font-adminmono text-[11px] tabular-nums text-adm-faint">
                {on} of {group.permissions.length} on
              </span>
            </div>
            {group.permissions.map((meta) => {
              const p = meta.permission;
              const fromRole = viaRole?.(p) ?? false;
              return (
                <label
                  key={p}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-4 border-t border-adm-hairline px-4 py-3 sm:px-5",
                    disabled && "cursor-default opacity-60",
                  )}
                >
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13.5px] font-semibold text-adm-ink">
                      {meta.label}
                      {fromRole ? (
                        <ToneBadge tone="forest">Via role</ToneBadge>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] leading-[1.5] text-adm-muted">
                      {meta.description}
                    </span>
                  </span>
                  <Switch
                    checked={checked(p)}
                    onCheckedChange={() => onToggle(p)}
                    disabled={disabled}
                    className="flex-none data-checked:bg-console"
                    aria-label={meta.label}
                  />
                </label>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/** The commit row every card here ends with: discard left of save, both idle
 * until something actually changed. */
function SaveRow({
  dirty,
  saving,
  onDiscard,
  onSave,
}: {
  dirty: boolean;
  saving: boolean;
  onDiscard: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-2 border-t border-adm-line px-4 py-3.5 sm:px-5">
      {dirty ? (
        <span className="mr-auto text-[12px] font-medium text-console-gold">
          Unsaved changes
        </span>
      ) : null}
      <AdminButton
        variant="outline"
        size="lg"
        disabled={!dirty || saving}
        onClick={onDiscard}
      >
        Discard
      </AdminButton>
      <AdminButton size="lg" disabled={!dirty || saving} onClick={onSave}>
        {saving ? "Saving…" : "Save changes"}
      </AdminButton>
    </div>
  );
}

/* ── Role defaults tab ───────────────────────────────────────────────────── */

function RoleDefaults({
  catalog,
  matrix,
  editableRoles,
}: {
  catalog: IPermissionGroup[];
  matrix: Record<EditableRole, Permission[]>;
  editableRoles: EditableRole[];
}) {
  const { confirm, confirmationDialog } = useConfirm();
  const [updateRole, { isLoading: saving }] = useUpdateRolePermissionsMutation();
  const [role, setRole] = useState<EditableRole>(editableRoles[0] ?? "STAFF");
  // One draft per role, so flipping between roles never throws edits away.
  const [drafts, setDrafts] = useState<
    Partial<Record<EditableRole, Permission[]>>
  >({});

  const total = catalogSize(catalog);
  const saved = useMemo(() => new Set(matrix[role] ?? []), [matrix, role]);
  const current = useMemo(
    () => new Set(drafts[role] ?? matrix[role] ?? []),
    [drafts, matrix, role],
  );
  const dirty = !sameSet(current, saved);

  const toggle = (p: Permission) => {
    const next = new Set(current);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setDrafts((d) => ({ ...d, [role]: [...next] }));
  };

  const discard = () => {
    setDrafts((d) => {
      const next = { ...d };
      delete next[role];
      return next;
    });
  };

  const save = async () => {
    const selection = [...current];
    // Emptying EVERY role at once would read to the backend as a never-edited
    // matrix, which silently brings the code defaults back - refuse the trap.
    const otherEmpty = editableRoles
      .filter((r) => r !== role)
      .every((r) => (drafts[r] ?? matrix[r] ?? []).length === 0);
    if (selection.length === 0 && otherEmpty) {
      notify.error("At least one role must keep a permission", {
        description:
          "Clearing every permission from every role would reset the whole matrix to its defaults.",
      });
      return;
    }
    const added = selection.filter((p) => !saved.has(p)).length;
    const removed = [...saved].filter((p) => !current.has(p)).length;
    const ok = await confirm({
      title: `Change what ${ROLE_TITLE[role].toLowerCase()} can do?`,
      description:
        selection.length === 0
          ? `Every ${ROLE_TITLE[role].toLowerCase()} account loses all access until something is switched back on.`
          : `This applies to everyone with the role straight away${
              added ? ` - ${String(added)} switched on` : ""
            }${removed ? `${added ? "," : " -"} ${String(removed)} switched off` : ""}.`,
      confirmText: "Save changes",
      ...(removed > 0 || selection.length === 0 ? { isDestructive: true } : {}),
    });
    if (!ok) return;
    try {
      await updateRole({ role, permissions: selection }).unwrap();
      discard();
      notify.success(`Permissions updated for ${ROLE_TITLE[role].toLowerCase()}`);
    } catch (err) {
      notify.error("Couldn't save the permissions", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <div>
      {/* Role picker: the same quiet segmented control the console uses for
          queues, with each segment carrying its live allowance count. */}
      <div
        role="tablist"
        aria-label="Role"
        className="mb-4 flex w-fit max-w-full gap-[3px] bg-adm-sunken p-[3px]"
      >
        {editableRoles.map((r) => {
          const count = (drafts[r] ?? matrix[r] ?? []).length;
          const unsaved =
            drafts[r] !== undefined &&
            !sameSet(new Set(drafts[r]), new Set(matrix[r] ?? []));
          return (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={role === r}
              onClick={() => setRole(r)}
              className={cn(
                "flex cursor-pointer items-center gap-[7px] rounded-none px-3.5 py-[7px] text-[13px] leading-[1.4] font-[550]",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-console",
                role === r
                  ? "bg-adm-card text-adm-ink shadow-[0_1px_2px_rgba(0,0,0,.08)]"
                  : "bg-transparent text-adm-muted",
              )}
            >
              {ROLE_TITLE[r]}
              <span className="font-adminmono rounded-full bg-adm-sunken px-[7px] py-px text-[10.5px] font-bold tabular-nums text-adm-body">
                {count}
              </span>
              {unsaved ? (
                <span
                  aria-label="Unsaved changes"
                  className="h-1.5 w-1.5 flex-none rounded-full bg-console-gold"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <AdminCard className="overflow-hidden">
        <div className="px-4 pt-4 pb-3.5 sm:px-5">
          <SectionHeading
            className="mb-0"
            actions={
              <span className="font-adminmono text-[12px] font-semibold tabular-nums text-adm-body">
                {current.size} of {total} allowed
              </span>
            }
          >
            {ROLE_TITLE[role]}
          </SectionHeading>
          <p className="mt-0.5 max-w-[600px] text-[12.5px] leading-[1.55] text-adm-muted">
            {ROLE_BLURB[role]}
          </p>
        </div>
        <PermissionGroups
          catalog={catalog}
          checked={(p) => current.has(p)}
          effective={(p) => current.has(p)}
          onToggle={toggle}
          disabled={saving}
        />
        <SaveRow
          dirty={dirty}
          saving={saving}
          onDiscard={discard}
          onSave={() => void save()}
        />
      </AdminCard>
      {confirmationDialog}
    </div>
  );
}

/* ── People tab ──────────────────────────────────────────────────────────── */

function PersonRow({
  user,
  active,
  onSelect,
}: {
  user: IUser;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2.5 border-t border-adm-hairline px-3.5 py-2.5 text-left first:border-t-0",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-console",
        active ? "bg-adm-sunken" : "hover:bg-adm-sunken/60",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full text-[12px] font-bold",
          active ? "bg-console text-white" : "bg-adm-sunken text-adm-body",
        )}
      >
        {initialsOf(user)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-adm-ink">
          {user.firstName} {user.lastName}
        </span>
        <span className="block truncate text-[11.5px] text-adm-muted">
          {ROLE_LABEL[user.role]}
        </span>
      </span>
      {active ? (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 flex-none rounded-full bg-console"
        />
      ) : null}
    </button>
  );
}

function PersonEditor({
  id,
  catalog,
}: {
  id: string;
  catalog: IPermissionGroup[];
}) {
  const { data, isLoading, isError, error, refetch } =
    useGetUserPermissionsQuery(id);
  const [setPermissions, { isLoading: saving }] = useSetUserPermissionsMutation();
  const { confirm, confirmationDialog } = useConfirm();
  // null = mirror what the server holds; an array = local edits in progress.
  // The caller keys this component by the person's id, so switching people
  // remounts it and the draft can never leak from one person to the next.
  const [draft, setDraft] = useState<Permission[] | null>(null);

  if (isLoading) {
    return (
      <AdminCard aria-hidden="true" className="overflow-hidden">
        <div className="px-4 pt-4 pb-3.5 sm:px-5">
          <Skeleton className="h-4 w-44 rounded-none" />
          <Skeleton className="mt-2 h-3 w-64 max-w-full rounded-none" />
        </div>
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 border-t border-adm-hairline px-4 py-3.5 sm:px-5"
          >
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-36 rounded-none" />
              <Skeleton className="h-2.5 w-[70%] rounded-none" />
            </div>
            <Skeleton className="h-4 w-8 flex-none rounded-full" />
          </div>
        ))}
      </AdminCard>
    );
  }
  if (isError || !data) {
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );
  }

  const { user, fromRole, granted: savedGranted } = data.data;
  const roleSet = new Set(fromRole);
  const granted = new Set(draft ?? savedGranted);
  const dirty = !sameSet(granted, new Set(savedGranted));
  const total = catalogSize(catalog);
  const effectiveCount = catalog
    .flatMap((g) => g.permissions)
    .filter((m) => roleSet.has(m.permission) || granted.has(m.permission))
    .length;
  const name = `${user.firstName} ${user.lastName}`;

  const toggle = (p: Permission) => {
    const next = new Set(granted);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setDraft([...next]);
  };

  const save = async () => {
    const selection = [...granted];
    const removed = savedGranted.filter((p) => !granted.has(p)).length;
    const ok = await confirm({
      title: `Update ${name}'s access?`,
      description:
        "Personal grants apply on top of the role's defaults and take effect straight away.",
      confirmText: "Save changes",
      ...(removed > 0 ? { isDestructive: true } : {}),
    });
    if (!ok) return;
    try {
      await setPermissions({ id, permissions: selection }).unwrap();
      setDraft(null);
      notify.success(`Access updated for ${name}`);
    } catch (err) {
      notify.error("Couldn't save the permissions", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <AdminCard className="overflow-hidden">
      <div className="px-4 pt-4 pb-3.5 sm:px-5">
        <SectionHeading
          className="mb-0"
          actions={
            <span className="font-adminmono text-[12px] font-semibold tabular-nums text-adm-body">
              {effectiveCount} of {total} allowed
            </span>
          }
        >
          {name}{" "}
          <ToneBadge className="align-middle" tone="slate">
            {ROLE_LABEL[user.role]}
          </ToneBadge>
        </SectionHeading>
        <p className="mt-0.5 max-w-[600px] text-[12.5px] leading-[1.55] text-adm-muted">
          Switches here are personal grants on top of the{" "}
          {ROLE_LABEL[user.role].toLowerCase()} defaults. Anything marked via
          role is already allowed to the whole role - a personal grant keeps
          working even if those defaults are later narrowed.
        </p>
      </div>
      <PermissionGroups
        catalog={catalog}
        checked={(p) => granted.has(p)}
        effective={(p) => roleSet.has(p) || granted.has(p)}
        viaRole={(p) => roleSet.has(p)}
        onToggle={toggle}
        disabled={saving}
      />
      <SaveRow
        dirty={dirty}
        saving={saving}
        onDiscard={() => setDraft(null)}
        onSave={() => void save()}
      />
      {confirmationDialog}
    </AdminCard>
  );
}

function People({
  catalog,
  focusId,
  onFocus,
}: {
  catalog: IPermissionGroup[];
  focusId: string | null;
  onFocus: (id: string) => void;
}) {
  const { data, isLoading, isError, error, refetch } = useGetUsersQuery({
    limit: 100,
  });
  const [search, setSearch] = useState("");

  const people = useMemo(
    () =>
      (data?.data ?? []).filter((u) => u.role !== UserRole.SUPER_ADMIN),
    [data],
  );
  const q = search.trim().toLowerCase();
  const shown = q
    ? people.filter((u) =>
        `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q),
      )
    : people;
  const selected = people.find((u) => u.id === focusId) ?? null;

  if (isLoading) {
    return (
      <AdminCard aria-hidden="true" className="p-4 sm:p-5">
        <Skeleton className="h-9 w-full max-w-[320px] rounded-none" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-none" />
          ))}
        </div>
      </AdminCard>
    );
  }
  if (isError) {
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );
  }
  if (people.length === 0) {
    return (
      <AdminCard className="overflow-hidden">
        <EmptyState
          variant="plain"
          title="No staff or agents yet"
          description="Permissions are granted to staff and agent accounts. Create one and it will appear here."
        />
      </AdminCard>
    );
  }

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <AdminCard className="overflow-hidden lg:sticky lg:top-[70px]">
        <div className="border-b border-adm-line p-3">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-adm-faint"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people…"
              aria-label="Search people"
              className={cn(adminInputClass, "h-[34px] pl-8 text-[13px]")}
            />
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto lg:max-h-[calc(100vh-240px)]">
          {shown.length === 0 ? (
            <p className="px-3.5 py-5 text-center text-[12.5px] text-adm-muted">
              Nobody matches this search.
            </p>
          ) : (
            shown.map((u) => (
              <PersonRow
                key={u.id}
                user={u}
                active={u.id === selected?.id}
                onSelect={() => onFocus(u.id)}
              />
            ))
          )}
        </div>
      </AdminCard>

      {selected ? (
        <PersonEditor key={selected.id} id={selected.id} catalog={catalog} />
      ) : (
        <AdminCard className="flex min-h-[220px] items-center justify-center p-8">
          <div className="text-center">
            <ShieldCheck
              aria-hidden="true"
              className="mx-auto h-6 w-6 text-adm-faint"
            />
            <p className="mt-2.5 text-[13.5px] font-semibold text-adm-ink">
              Pick a person
            </p>
            <p className="mx-auto mt-1 max-w-[340px] text-[12.5px] leading-[1.55] text-adm-muted">
              Choose a staff member or agent to see what they may do and grant
              them extra access.
            </p>
          </div>
        </AdminCard>
      )}
    </div>
  );
}

/* ── Screen ──────────────────────────────────────────────────────────────── */

/** Loading silhouette (also the page's Suspense fallback). */
export function PermissionsSkeleton() {
  return (
    <div aria-hidden="true" className="w-full max-w-[1120px]">
      <div className="mb-5">
        <Skeleton className="h-5 w-36 rounded-none" />
        <Skeleton className="mt-2 h-3 w-72 max-w-full rounded-none" />
      </div>
      <Skeleton className="mb-4 h-9 w-64 max-w-full rounded-none" />
      <AdminCard className="overflow-hidden">
        <div className="px-4 pt-4 pb-3.5 sm:px-5">
          <Skeleton className="h-4 w-40 rounded-none" />
          <Skeleton className="mt-2 h-3 w-80 max-w-full rounded-none" />
        </div>
        {Array.from({ length: 7 }, (_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 border-t border-adm-hairline px-4 py-3.5 sm:px-5"
          >
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-40 rounded-none" />
              <Skeleton className="h-2.5 w-[65%] rounded-none" />
            </div>
            <Skeleton className="h-4 w-8 flex-none rounded-full" />
          </div>
        ))}
      </AdminCard>
    </div>
  );
}

type PermissionsTab = "roles" | "people";

/**
 * The Permissions screen: what each ROLE may do (defaults every holder
 * starts from) and what one PERSON has been granted on top. Deep-linkable -
 * `?user=<id>` lands on the People tab with that person open, which is how
 * the user-detail page hands over.
 */
export function PermissionsScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const focusId = params.get("user");
  const tab: PermissionsTab =
    focusId || params.get("tab") === "people" ? "people" : "roles";

  const { data, isLoading, isError, error, refetch } =
    useGetPermissionMatrixQuery();

  const goTo = (next: PermissionsTab, user?: string) => {
    const suffix =
      next === "people"
        ? user
          ? `?tab=people&user=${user}`
          : "?tab=people"
        : "";
    router.replace(`/admin/permissions${suffix}`, { scroll: false });
  };

  if (isLoading) return <PermissionsSkeleton />;
  if (isError || !data) {
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );
  }

  const { catalog, editableRoles, matrix } = data.data;

  return (
    <div className="w-full max-w-[1120px]">
      <AdminPageHeader
        title="Permissions"
        hint="Decide what staff and agents may do - for the whole role, or one person at a time."
        sub="Role defaults set what everyone with a role starts with; personal grants open single doors for single people."
      />

      <div
        role="tablist"
        aria-label="Permissions view"
        className="mb-4 flex w-fit max-w-full gap-[3px] bg-adm-sunken p-[3px]"
      >
        {(
          [
            ["roles", "Role defaults"],
            ["people", "People"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => goTo(value)}
            className={cn(
              "cursor-pointer rounded-none px-3.5 py-[7px] text-[13px] leading-[1.4] font-[550]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-console",
              tab === value
                ? "bg-adm-card text-adm-ink shadow-[0_1px_2px_rgba(0,0,0,.08)]"
                : "bg-transparent text-adm-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "roles" ? (
        <RoleDefaults
          catalog={catalog}
          matrix={matrix}
          editableRoles={editableRoles}
        />
      ) : (
        <People
          catalog={catalog}
          focusId={focusId}
          onFocus={(id) => goTo("people", id)}
        />
      )}
    </div>
  );
}
