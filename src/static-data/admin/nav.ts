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
  /**
   * One sentence on what this section holds, shown on hover in the rail.
   *
   * The rail is where the console's vocabulary is first met - float,
   * stocktake, allocation, milestone - and a label alone teaches none of it.
   * Written for somebody who runs the business, not somebody who built the
   * software: say what the section is FOR, in their words.
   */
  hint?: string;
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
  hint: string,
  opts?: { badge?: "approvals"; ownerOnly?: boolean },
): AdminNavItem => ({
  key,
  label,
  hint,
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
      item("dashboard", "Dashboard", "Today at a glance: what came in, what went out, and what needs you."),
      item("approvals", "Approvals", "Requests waiting on your decision. Approving applies the change straight away.", { badge: "approvals" }),
      item("reports", "Reports", "Profit, cash and volume over a period you choose."),
    ],
  },
  {
    label: "Trading",
    items: [
      item("purchases", "Purchases", "Grain you have bought from suppliers and agents, and what it cost."),
      item("sales", "Sales", "Orders you have agreed with buyers, and what they have paid so far."),
      item("shipments", "Shipments", "Trucks carrying orders out: who is driving, what is on board, where it is going."),
      item("stock", "Stock", "How much of each commodity is sitting in each warehouse right now."),
      item("transfers", "Transfers", "Stock moved from one warehouse to another."),
      item("stocktakes", "Stocktakes", "Physical counts. Approving one corrects the system to match what was actually there."),
      item("commodities", "Commodities", "The list of crops you trade in. Used everywhere a commodity is chosen."),
      item("warehouses", "Warehouses", "Your storage locations. Stock is counted per warehouse."),
      item("agents", "Agents", "Field buyers who hold your money to buy on your behalf."),
      item("expenses", "Expenses", "Costs the business has incurred, and whether they have been paid."),
      item("expense-categories", "Expense Categories", "The headings costs are filed under, so spending can be grouped."),
      item("payment-policies", "Payment Policies", "When a buyer has to pay you: the deposit and balance split.", { ownerOnly: true }),
      item("driver-payment-policies", "Driver Terms", "The haulage terms trips are priced on. Record an actual driver payment on the shipment itself.", { ownerOnly: true }),
    ],
  },
  {
    label: "Money out",
    items: [
      // Staff see only their own sends; the whole register and the company's
      // bank position are the owner's business.
      item("my-sends", "My sends", "Money you personally have sent out, and whether it arrived."),
      item("disbursements", "Money sent", "Every mobile money and bank transfer sent from the business.", { ownerOnly: true }),
      item("floats", "Floats", "Money handed to agents to buy with, and what each still holds."),
      item("treasury", "Company account", "The company's own balance, and moving money between its accounts.", { ownerOnly: true }),
    ],
  },
  {
    label: "Land",
    items: [
      item("plots", "Land Plots", "Land the business owns and can sell.", { ownerOnly: true }),
      item("land-acquisitions", "Acquisitions", "Land being bought from a seller, and what has been paid for it.", { ownerOnly: true }),
      item("land-sellers", "Sellers", "People and families you buy land from.", { ownerOnly: true }),
      item("land-sales", "Land Sales", "Land sold to a buyer, and what they still owe.", { ownerOnly: true }),
    ],
  },
  {
    label: "Farm",
    items: [
      item("seasons", "Seasons", "Planting cycles. Grants and repayments are recorded against one.", { ownerOnly: true }),
      item("farmers", "Farmers", "Outgrowers you advance inputs to and take produce back from.", { ownerOnly: true }),
      item("input-items", "Input Items", "Seed, fertiliser and tools you advance to farmers.", { ownerOnly: true }),
      item("grants", "Grants", "Inputs advanced to a farmer, to be recovered in produce or cash.", { ownerOnly: true }),
      item("repayments", "Repayments", "Produce a farmer has brought back against what they were advanced.", { ownerOnly: true }),
    ],
  },
  {
    label: "Books",
    items: [
      item("statements", "Financial Statements", "The complete statement book - generated from the records, printed for signature and stamp.", { ownerOnly: true }),
      item("fixed-assets", "Fixed Assets", "The equipment, vehicles and buildings the statements depreciate.", { ownerOnly: true }),
      item("drawings", "Drawings", "Money the proprietor takes for personal use - it reduces capital, not profit.", { ownerOnly: true }),
      item("statement-settings", "Statement Settings", "The names, logo and blocks printed on the books' cover and certificate.", { ownerOnly: true }),
    ],
  },
  {
    label: "Directory",
    items: [
      item("suppliers", "Suppliers", "People and co-ops you buy grain from."),
      item("buyers", "Buyers", "Companies and people who buy from you."),
      item("drivers", "Drivers", "Hauliers who move your goods, and the terms they are paid on."),
      item("delivery-addresses", "Delivery Addresses", "Saved drop-off points, so a driver can actually find the place."),
      // Staff read these to quote an account down the phone; only the owner
      // can change one, which the backend enforces.
      item("payment-accounts", "Payment Accounts", "Your bank and mobile money accounts that customers pay into."),
    ],
  },
  {
    label: "Website",
    items: [
      item("enquiries", "Enquiries", "Messages sent through the public website."),
      item("reviews", "Reviews", "Customer reviews waiting to be published or already live."),
      item("farm-applications", "Applications", "Farmers applying to join the outgrower scheme.", { ownerOnly: true }),
    ],
  },
  {
    label: "Admin",
    items: [
      item("users", "Users", "Who can sign in, and what each of them is allowed to do.", { ownerOnly: true }),
      item("permissions", "Permissions", "What staff and agents may do - set for the whole role, or granted to one person.", { ownerOnly: true }),
      item("audit", "Audit Log", "A record of who changed what, and when.", { ownerOnly: true }),
      item("notifications", "Notifications", "Every email and text the system has tried to send.", { ownerOnly: true }),
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
