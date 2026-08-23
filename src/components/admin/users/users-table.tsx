"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { columnMeta } from "@/components/admin/registry/registry-bits";
import { useRouter } from "next/navigation";
import { columnHelp, ConsoleDataTable } from "@/components/admin/data-table";
import { Plus } from "lucide-react";
import {
  ConsoleFilterBar,
  ConsoleLabeledSelect,
  FilterChip,
  labelOf,
} from "@/components/admin/filter-bar";
import {
  AdminButton,
  AdminCard,
  AdminPageHeader,
} from "@/components/admin/ui";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { RegisterEmpty } from "@/components/admin/register-empty";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import {
  useDeleteUserMutation,
  useGetUsersQuery,
} from "@/redux/users/users-api";
import { useConfirm } from "@/hooks/use-confirm";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { DateTimeCell } from "@/components/admin/date-cell";
import { notify } from "@/lib/notify";
import { UserRole, type IUser, type IUserListQuery } from "@/types/user.types";
import { UserActionsDropdown } from "./user-actions";
import {
  initialsOf,
  lastActiveLabel,
  ROLE_LABEL,
  StatusBadge,
} from "./user-bits";

const ROLE_FILTER_OPTIONS = [
  { value: "all", label: "All roles" },
  { value: UserRole.SUPER_ADMIN, label: "Super admin" },
  { value: UserRole.STAFF, label: "Office staff" },
  { value: UserRole.AGENT, label: "Field agent" },
] as const;

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "blocked", label: "Blocked" },
] as const;

type StatusFilter = (typeof STATUS_FILTER_OPTIONS)[number]["value"];

/** Stable defaults for the URL-synced table state (module const on purpose -
 * the hook keys its effects on this identity). `size` is the page size. */
const FILTER_DEFAULTS = { role: "all", status: "all", size: "10" };

/** Maps the status facet onto the backend's isActive/blocked filters. */
const statusToQuery = (status: StatusFilter): Partial<IUserListQuery> => {
  switch (status) {
    case "active":
      return { isActive: true, blocked: false };
    case "suspended":
      return { isActive: false };
    case "blocked":
      return { blocked: true };
    default:
      return {};
  }
};

/**
 * The live Users register, fully server-driven: the debounced
 * search, the role/status facets, the page and the page size all travel to
 * GET /admin/users, and the table renders exactly the page the backend
 * returns. While a refetch is in flight the current list stays visible
 * (dimmed) and snaps to the new result - the skeleton shows only on first
 * load. The navbar's global search (?q=) seeds the search box.
 */
export function UsersTable() {
  const router = useRouter();
  const me = useCurrentUser();

  // URL-synced + session-remembered table state: paginate to page 4, open a
  // detail page or another tab, come back, and the table is exactly where it
  // was left. The navbar's global search seeds the same `search` param.
  const {
    page,
    search: searchInput,
    filters,
    setSearch,
    setFilter,
    setPage,
    resetFilters,
    queryParams,
  } = useTableQuery({ defaults: FILTER_DEFAULTS });

  const roleFilter = filters.role;
  const statusFilter = filters.status as StatusFilter;
  const pageSize = Number(filters.size) || 10;
  const search = (queryParams.search as string | undefined) ?? "";

  const queryArgs = useMemo<IUserListQuery>(
    () => ({
      page,
      limit: pageSize,
      ...(search ? { search } : {}),
      ...(roleFilter !== "all" ? { role: roleFilter as UserRole } : {}),
      ...statusToQuery(statusFilter),
    }),
    [page, pageSize, search, roleFilter, statusFilter],
  );

  // `data` holds the last successful page across argument changes, which is
  // exactly the keep-current-list-then-snap behaviour; `isLoading` is only
  // true before the very first result.
  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetUsersQuery(queryArgs);
  const users = data?.data ?? [];
  const totalCount = data?.meta.total ?? 0;

  const [deleteUser] = useDeleteUserMutation();
  const { confirm, confirmationDialog } = useConfirm();

  const activeFilterCount =
    (roleFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0);
  const filtered = Boolean(search) || activeFilterCount > 0;
  // A register with nothing on file and no filters narrowing it shows ONLY
  // the empty state (with its create action) - a filter bar filters nothing.
  const pristine = !isLoading && !isError && users.length === 0 && !filtered;

  const deleteSelected = async (selected: IUser[], clear: () => void) => {
    const deletable = selected.filter((u) => u.id !== me?.id);
    if (deletable.length === 0) {
      notify.error("Nothing to delete", {
        description: "You cannot delete your own account.",
      });
      return;
    }
    const ok = await confirm({
      title: `Delete ${String(deletable.length)} selected user${deletable.length > 1 ? "s" : ""}?`,
      description:
        "This permanently removes their access and cannot be undone. Type 'delete selected' to confirm.",
      confirmText: "Delete selected",
      isDestructive: true,
      requireExactMatch: "delete selected",
    });
    if (!ok) return;
    try {
      await Promise.all(deletable.map((u) => deleteUser(u.id).unwrap()));
      clear();
      notify.success(
        `${String(deletable.length)} user${deletable.length > 1 ? "s" : ""} deleted`,
        selected.length !== deletable.length
          ? { description: "Your own account was skipped." }
          : undefined,
      );
    } catch (err) {
      notify.error("Couldn't delete every selected user", {
        description: extractApiError(err).message,
      });
    }
  };

  const columns = useMemo<ColumnDef<IUser, unknown>[]>(
    () => [
      {
        id: "user",
        accessorFn: (u) => `${u.firstName} ${u.lastName} ${u.email}`,
        header: "User",
        enableSorting: false,
        meta: columnMeta({ card: "title", stretch: true }),
        cell: ({ row }) => {
          const u = row.original;
          return (
            <Link
              href={`/admin/users/${u.id}`}
              className="outline-none focus-visible:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="inline-flex max-w-full min-w-0 items-center gap-2">
                {u.profilePicture ? (
                  // eslint-disable-next-line @next/next/no-img-element -- avatar
                  <img
                    src={u.profilePicture}
                    alt=""
                    width={24}
                    height={24}
                    className="h-6 w-6 flex-none rounded-full object-cover"
                  />
                ) : (
                  <span className="font-adminmono inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-console/10 text-[11px] font-bold text-console">
                    {initialsOf(u)}
                  </span>
                )}
                <span className="block min-w-0 @2xl/table:max-w-[90%]">
                  <span className="block [overflow-wrap:anywhere] @2xl/table:truncate font-medium text-adm-ink">
                    {u.firstName} {u.lastName}
                  </span>
                  <span className="block [overflow-wrap:anywhere] @2xl/table:truncate text-[12.5px] text-adm-faint">
                    {u.email}
                  </span>
                </span>
              </span>
            </Link>
          );
        },
      },
      {
        id: "role",
        accessorFn: (u) => ROLE_LABEL[u.role],
        header: columnHelp(
          "Role",
          "What this person is allowed to do: agents only ever see their own float and purchases.",
        ),
        enableSorting: false,
        meta: columnMeta({ card: "meta", at: "lg" }),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-adm-muted">
            {ROLE_LABEL[row.original.role]}
          </span>
        ),
      },
      {
        id: "phone",
        accessorFn: (u) => u.phone ?? "",
        header: "Phone",
        enableSorting: false,
        meta: columnMeta({ at: "xl" }),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-adm-muted">
            {row.original.phone ?? "-"}
          </span>
        ),
      },
      {
        id: "lastActive",
        accessorFn: lastActiveLabel,
        header: columnHelp(
          "Last active",
          "The last time this person signed in, so you can spot accounts nobody uses.",
        ),
        enableSorting: false,
        meta: columnMeta({ card: "meta", at: "xl" }),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-adm-muted">
            {lastActiveLabel(row.original)}
          </span>
        ),
      },
      {
        id: "added",
        accessorFn: (u) => u.createdAt,
        header: "Added",
        enableSorting: false,
        meta: columnMeta({ at: "2xl" }),
        cell: ({ row }) => <DateTimeCell value={row.original.createdAt} />,
      },
      {
        id: "status",
        header: "Status",
        enableSorting: false,
        meta: columnMeta({ card: "badge" }),
        cell: ({ row }) => <StatusBadge user={row.original} />,
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        meta: {
          className: "w-16 pl-0 text-right",
        },
        cell: ({ row }) => (
          <span className="inline-flex justify-end">
            <UserActionsDropdown user={row.original} />
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <AdminPageHeader title="Users" sub="Staff accounts and permissions" />

      {/* A pristine register or a failed plain load hides the toolbar - but
          when the user's own search/filters might be the cause, it stays so
          they can clear or adjust them. */}
      {pristine || (isError && !filtered) ? null : (
      <ConsoleFilterBar
        search={searchInput}
        onSearch={setSearch}
        searchPlaceholder="Search user…"
        activeCount={activeFilterCount}
        onClear={resetFilters}
        totalCount={totalCount}
        noun="users"
        action={
          <AdminButton asChild aria-label="Add user">
            <Link href="/admin/users/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Add user</span>
            </Link>
          </AdminButton>
        }
        chips={
          <>
            {roleFilter !== "all" ? (
              <FilterChip onRemove={() => setFilter("role", "all")}>
                Role: {labelOf(ROLE_FILTER_OPTIONS, roleFilter)}
              </FilterChip>
            ) : null}
            {statusFilter !== "all" ? (
              <FilterChip onRemove={() => setFilter("status", "all")}>
                Status: {labelOf(STATUS_FILTER_OPTIONS, statusFilter)}
              </FilterChip>
            ) : null}
          </>
        }
      >
        <ConsoleLabeledSelect
          label="Role"
          value={roleFilter}
          onChange={(v) => setFilter("role", v)}
          options={ROLE_FILTER_OPTIONS}
          active={roleFilter !== "all"}
        />
        <ConsoleLabeledSelect
          label="Status"
          value={statusFilter}
          onChange={(v) => setFilter("status", v)}
          options={STATUS_FILTER_OPTIONS}
          active={statusFilter !== "all"}
        />
      </ConsoleFilterBar>
      )}

      {isLoading ? (
        <ConsoleTableSkeleton columns={6} />
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : users.length === 0 ? (
        <RegisterEmpty
          filtered={filtered}
          noun="users"
          description="Add your first staff account - assign a role, set the permission flags and hand over the first password."
          actionLabel="Add your first user"
          onAction={() => router.push("/admin/users/new")}
          onClear={() => {
            setSearch("");
            resetFilters();
          }}
        />
      ) : (
        <AdminCard className="overflow-hidden">
          <ConsoleDataTable<IUser>
            columns={columns}
            data={users}
            itemNoun="users"
            isFetching={isFetching}
            serverPagination={{
              totalCount,
              page,
              pageSize,
              onPageChange: setPage,
              onPageSizeChange: (size) => setFilter("size", String(size)),
            }}
            enableSelection
            renderBulkActions={(selected, clear) => (
              <AdminButton
                variant="danger"
                size="sm"
                onClick={() => void deleteSelected(selected, clear)}
              >
                Delete selected
              </AdminButton>
            )}
            rowHref={(u) => `/admin/users/${u.id}`}
            rowClassName={() => "h-12 hover:bg-adm-sunken"}
          />
        </AdminCard>
      )}
      {confirmationDialog}
    </div>
  );
}
