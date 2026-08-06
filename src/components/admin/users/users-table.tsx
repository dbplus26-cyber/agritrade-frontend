"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { columnMeta } from "@/components/admin/registry/registry-bits";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { columnHelp, ConsoleDataTable } from "@/components/admin/data-table";
import {
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import { AdminCard } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
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
  visibilityLabel,
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

/** Stable defaults for the URL-synced table state (module const on purpose —
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
 * The live Users register, fully server-driven (dms pattern): the debounced
 * search, the role/status facets, the page and the page size all travel to
 * GET /admin/users, and the table renders exactly the page the backend
 * returns. While a refetch is in flight the current list stays visible
 * (dimmed) and snaps to the new result - the skeleton shows only on first
 * load. The navbar's global search (?q=) seeds the search box.
 */
export function UsersTable() {
  const router = useRouter();
  const me = useCurrentUser();

  // URL-synced + session-remembered table state (khadys/dms convention):
  // paginate to page 4, open a detail page or another tab, come back - the
  // table is exactly where you left it. The navbar's global search seeds the
  // same `search` param.
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
        meta: columnMeta({ stretch: true }),
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
                  <span className="font-adminmono inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-console/10 text-[10px] font-bold text-console">
                    {initialsOf(u)}
                  </span>
                )}
                <span className="block min-w-0 max-w-[90%]">
                  <span className="block truncate font-medium text-adm-ink">
                    {u.firstName} {u.lastName}
                  </span>
                  <span className="block truncate text-[11.5px] text-adm-faint">
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
        meta: columnMeta({ at: "lg" }),
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
            {row.original.phone ?? "—"}
          </span>
        ),
      },
      {
        id: "visibility",
        accessorFn: visibilityLabel,
        header: columnHelp(
          "Visibility",
          "How much of the money on screen this person is allowed to see.",
        ),
        enableSorting: false,
        meta: columnMeta({ at: "xl" }),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-adm-muted">
            {visibilityLabel(row.original)}
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
        meta: columnMeta({ at: "xl" }),
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
        meta: columnMeta(),
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
      <div className="mb-3.5">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-adm-ink">
          Users
        </h1>
        <p className="mt-0.5 text-[13px] text-adm-muted">
          Staff accounts and permissions
        </p>
      </div>

      {/* dms rule: a failed PLAIN load hides the toolbar (dead UI beside an
          error card) - but when the user's own search/filters might be the
          cause, the toolbar stays so they can clear or adjust them. */}
      {isError && !search && activeFilterCount === 0 ? null : (
      <ConsoleFilterBar
        search={searchInput}
        onSearch={setSearch}
        searchPlaceholder="Search user…"
        activeCount={activeFilterCount}
        onClear={resetFilters}
        action={
          <Button asChild variant="harvest" className="h-8 px-3.5 text-[13px]">
            <Link href="/admin/users/new">+ Add user</Link>
          </Button>
        }
      >
        <ConsoleLabeledSelect
          label="Role"
          value={roleFilter}
          onChange={(v) => setFilter("role", v)}
          options={ROLE_FILTER_OPTIONS}
          active={roleFilter !== "all"}
          className="lg:w-[150px]"
        />
        <ConsoleLabeledSelect
          label="Status"
          value={statusFilter}
          onChange={(v) => setFilter("status", v)}
          options={STATUS_FILTER_OPTIONS}
          active={statusFilter !== "all"}
          className="lg:w-[150px]"
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
        // Outside the table on purpose (dms pattern): inside it, the nowrap
        // headers force a wide scroll area and the card overflows on phones.
        <AdminCard className="overflow-hidden">
          {search || activeFilterCount > 0 ? (
            <EmptyState
              variant="plain"
              title="No matching users"
              description="Nothing matches this search and filter combination. Adjust the criteria or clear them to see everyone."
              actionLabel="Clear search & filters"
              onAction={() => {
                setSearch("");
                resetFilters();
              }}
            />
          ) : (
            <EmptyState
              variant="plain"
              title="No users yet"
              description="Add your first staff account - assign a role, set the permission flags and hand over the first password."
              actionLabel="Add your first user"
              onAction={() => router.push("/admin/users/new")}
            />
          )}
        </AdminCard>
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
              <button
                type="button"
                onClick={() => void deleteSelected(selected, clear)}
                className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-[6px] bg-console-red px-2.5 text-[12px] font-semibold text-white hover:bg-console-red-deep"
              >
                Delete selected
              </button>
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
