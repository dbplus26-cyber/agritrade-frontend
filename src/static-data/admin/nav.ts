/**
 * The console's navigation registry (from the DB Plus Console design): five
 * groups, one entry per module. `key` doubles as the register slug for the
 * config-driven modules; custom screens (dashboard, purchases, sales,
 * shipments, approvals, reports, settings, notifications, profile) have their
 * own routes.
 */
export interface AdminNavItem {
  key: string;
  label: string;
  href: string;
  /** Show the pending-approvals badge on this item. */
  badge?: "approvals";
  /** Owner-only entry (hidden from staff, who would only hit a 403). */
  ownerOnly?: boolean;
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

export const ADMIN_HOME = "/admin";

const item = (
  key: string,
  label: string,
  opts?: { badge?: "approvals"; ownerOnly?: boolean },
): AdminNavItem => ({
  key,
  label,
  href: key === "dashboard" ? ADMIN_HOME : `${ADMIN_HOME}/${key}`,
  badge: opts?.badge,
  ownerOnly: opts?.ownerOnly,
});

/**
 * Only BUILT modules appear in the rail - the sidebar is the honest map of
 * what the system can do today, so an unbuilt tab never masquerades as a
 * feature. Groups render as collapsible dropdowns (dms-frontend convention);
 * Land and Farm are separate dropdowns of their own.
 */
export const adminNavGroups: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [
      item("dashboard", "Dashboard"),
      item("approvals", "Approvals", { badge: "approvals" }),
    ],
  },
  {
    label: "Trading",
    items: [
      item("purchases", "Purchases"),
      item("sales", "Sales"),
      item("shipments", "Shipments"),
      item("stock", "Stock"),
      item("commodities", "Commodities"),
      item("warehouses", "Warehouses"),
      item("agents", "Agents & Floats"),
      item("expenses", "Expenses"),
      item("expense-categories", "Expense Categories"),
      item("payment-policies", "Payment Policies", { ownerOnly: true }),
    ],
  },
  {
    label: "Land",
    items: [
      item("plots", "Land Plots", { ownerOnly: true }),
      item("land-acquisitions", "Acquisitions", { ownerOnly: true }),
      item("land-sellers", "Sellers", { ownerOnly: true }),
      item("land-sales", "Land Sales", { ownerOnly: true }),
    ],
  },
  {
    label: "Directory",
    items: [item("suppliers", "Suppliers"), item("buyers", "Buyers")],
  },
  {
    label: "Admin",
    items: [
      item("users", "Users", { ownerOnly: true }),
      item("audit", "Audit Log", { ownerOnly: true }),
      item("notifications", "Notifications", { ownerOnly: true }),
      // "My profile" and "Settings" deliberately absent: both live behind
      // the navbar avatar menu (dms-frontend convention), not the rail.
    ],
  },
];

/** Resolve the active nav key for a pathname (details map to their register). */
export function activeNavKey(pathname: string): string {
  if (pathname === ADMIN_HOME) return "dashboard";
  const segment = pathname.slice(ADMIN_HOME.length + 1).split("/")[0] ?? "";
  return segment || "dashboard";
}

/** Breadcrumb title for the topbar. */
export function screenTitle(pathname: string): string {
  const key = activeNavKey(pathname);
  // settings: fall back gracefully now that it lives outside the nav groups.
  if (key === "settings") return "Settings";
  if (key === "profile") return "My profile";
  for (const group of adminNavGroups) {
    const found = group.items.find((i) => i.key === key);
    if (found) return found.label;
  }
  return "Console";
}
