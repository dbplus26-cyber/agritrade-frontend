import type { UserRole } from "./user.types";

/**
 * The dynamic permission layer, mirroring the backend catalog
 * (agritrade-backend `src/config/permissions.ts`). The database stores only
 * assignments; labels, descriptions and grouping travel with
 * `GET /admin/permissions` so the client never hardcodes them - this union
 * exists purely so a typo in code fails the build.
 */
export type Permission =
  | "APPROVALS_DECIDE"
  | "DIRECTORY_MANAGE"
  | "EXPENSES_RECORD"
  | "FARM_MANAGE"
  | "FLOATS_MANAGE"
  | "LAND_MANAGE"
  | "MONEY_VIEW"
  | "PAYMENTS_RECORD"
  | "PAYOUTS_SEND"
  | "PURCHASES_RECEIVE"
  | "PURCHASES_RECORD"
  | "SALES_MANAGE"
  | "SHIPMENTS_MANAGE"
  | "STOCK_MANAGE"
  | "TRANSFERS_MANAGE"
  | "VOCABULARY_MANAGE"
  | "WEBSITE_MODERATE";

/** The roles whose grants the owner can edit (SUPER_ADMIN holds everything). */
export type EditableRole = "STAFF" | "AGENT";

export interface IPermissionMeta {
  permission: Permission;
  label: string;
  description: string;
}

export interface IPermissionGroup {
  group: string;
  permissions: IPermissionMeta[];
}

/** `GET /admin/permissions` - catalog, editable roles and the live matrix. */
export interface IPermissionMatrixResponse {
  message: string;
  data: {
    catalog: IPermissionGroup[];
    editableRoles: EditableRole[];
    matrix: Record<EditableRole, Permission[]>;
  };
}

export interface IPermissionUserRef {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

/** `GET/PUT /admin/permissions/users/:id` - one person's access story. */
export interface IUserPermissionsResponse {
  message: string;
  data: {
    /** Baseline coming from the person's role (edited on the roles tab). */
    fromRole: Permission[];
    /** Personal grants on top of the role. */
    granted: Permission[];
    /** The union the backend guards actually enforce. */
    effective: Permission[];
    user: IPermissionUserRef;
  };
}
