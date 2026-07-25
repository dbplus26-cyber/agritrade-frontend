import type { Tone } from "@/components/admin/ui";

/**
 * The config-driven registers (from the DB Plus Console design): 13 modules
 * share one list template, one detail template and one form template. Each
 * entry mirrors the design's `regCfg()` plus its `seedRegRows()` stub data.
 * Custom screens (purchases, sales, shipments…) have their own routes and are
 * deliberately NOT in this record.
 */

/** One column of a register table. */
export interface RegisterHeader {
  /** Column label. */
  l: string;
  align?: "left" | "right";
  /** Money column — right-aligned mono, GH₵-prefixed in forms. */
  money?: boolean;
  /** Status column rendered as a tone chip. */
  tag?: boolean;
  /** Secondary column, hidden below the xl breakpoint. */
  wide?: boolean;
}

/** Status cell: tone-chip text. */
export interface RegisterTagCell {
  t: string;
  tone: Tone;
}

/** Text cell with an accent colour and/or weight (negative floats, estimates). */
export interface RegisterStyledCell {
  t: string;
  c?: string;
  w?: number;
}

export type RegisterCell = string | number | RegisterStyledCell | RegisterTagCell;
export type RegisterRow = RegisterCell[];

export interface RegisterLedgerRow {
  date: string;
  desc: string;
  amount: string;
  amtColor: string;
  after: string;
}

/** Optional per-record movement card on the detail screen. */
export interface RegisterLedger {
  title: string;
  rows: RegisterLedgerRow[];
}

export interface RegisterConfig {
  title: string;
  sub: string;
  /** Singular noun ("Lot", "Agent") for detail and form titles. */
  single: string;
  /** Add-button label, or null when records can't be created here. */
  add: string | null;
  search: string;
  /** Filter dropdowns (visual until the backend lands). */
  filters: string[];
  /** Tag a newly created row would wear. */
  newTag: RegisterTagCell | null;
  headers: RegisterHeader[];
  /** Header indexes surfaced as big figures on the detail screen. */
  figs: number[];
  ledger: RegisterLedger | null;
  /** First column renders with an initials avatar. */
  avatar?: boolean;
  /** No add / edit / delete (audit log). */
  readOnly?: boolean;
}

export type RegisterSlug = "land-sales" | "plots";

export const REGISTERS: Record<RegisterSlug, RegisterConfig & { rows: RegisterRow[] }> = {
  plots: {
    title: "Plots",
    sub: "Land inventory for sale",
    single: "Plot",
    add: "+ Add plot",
    search: "Search plot or location…",
    filters: ["Location", "Status"],
    newTag: { t: "Available", tone: "leaf" },
    headers: [
      { l: "Plot" },
      { l: "Location" },
      { l: "Size", wide: true },
      { l: "Price", align: "right", money: true },
      { l: "Buyer", wide: true },
      { l: "Status", tag: true },
    ],
    figs: [3],
    ledger: null,
    rows: [
      ["PL-014", "Kalpohin Estate", "100 × 80 ft", "GH₵ 85,000", "—", { t: "Available", tone: "leaf" }],
      ["PL-015", "Kalpohin Estate", "100 × 80 ft", "GH₵ 85,000", "Kwame Owusu", { t: "Reserved", tone: "harvest" }],
      ["PL-009", "Vittin", "70 × 100 ft", "GH₵ 64,000", "Alhaji Mahama", { t: "Sold", tone: "forest" }],
      ["PL-007", "Jisonayili", "100 × 100 ft", "GH₵ 58,000", "Mariama Seidu", { t: "Sold", tone: "forest" }],
      ["PL-002", "Jisonayili", "100 × 100 ft", "GH₵ 92,000", "—", { t: "Archived", tone: "slate" }],
    ],
  },
  "land-sales": {
    title: "Land Sales",
    sub: "Plot sales and instalment collections",
    single: "Land sale",
    add: "+ New land sale",
    search: "Search buyer or plot…",
    filters: ["Status"],
    newTag: { t: "Instalments", tone: "sky" },
    headers: [
      { l: "Ref" },
      { l: "Plot" },
      { l: "Buyer" },
      { l: "Agreed", align: "right", money: true },
      { l: "Paid", align: "right", money: true, wide: true },
      { l: "Balance", align: "right", money: true },
      { l: "Status", tag: true },
    ],
    figs: [3, 5],
    ledger: {
      title: "Instalments",
      rows: [
        { date: "02 Jul 2026", desc: "Instalment 2 — mobile money", amount: "+GH₵ 15,000.00", amtColor: "#2F5E3D", after: "GH₵ 55,000.00 due" },
        { date: "04 Jun 2026", desc: "Deposit — bank transfer", amount: "+GH₵ 15,000.00", amtColor: "#2F5E3D", after: "GH₵ 70,000.00 due" },
      ],
    },
    rows: [
      ["LS-032", "PL-015", "Kwame Owusu", "GH₵ 85,000", "GH₵ 30,000", { t: "GH₵ 55,000", c: "#B03A2E", w: 600 }, { t: "Instalments", tone: "sky" }],
      ["LS-031", "PL-009", "Alhaji Mahama", "GH₵ 64,000", "GH₵ 64,000", { t: "Paid in full", c: "#2F5E3D" }, { t: "Completed", tone: "leaf" }],
      ["LS-028", "PL-007", "Mariama Seidu", "GH₵ 58,000", "GH₵ 58,000", { t: "Paid in full", c: "#2F5E3D" }, { t: "Completed", tone: "leaf" }],
    ],
  },
  // `expenses` retired from the stub registers: /admin/expenses is now a live,
  // backend-driven module (src/app/admin/expenses + components/admin/expenses).
  // `seasons`, `farmers`, `grants` and `repayments` retired from the stub
  // registers: the farm module (M12) is now live and backend-driven
  // (src/app/admin/{seasons,input-items,farmers,grants,repayments} +
  // components/admin/farm).
  // `suppliers` and `buyers` retired from the stub registers: both are now
  // live, backend-driven modules (src/app/admin/{suppliers,buyers} +
  // components/admin/registry).
  // `users` retired from the stub registers: /admin/users is now a live,
  // backend-driven module (src/app/admin/users + components/admin/users).
  // `agents` retired from the stub registers: /admin/agents is now a live,
  // backend-driven module (src/app/admin/agents + components/admin/agents).
  // `audit` retired from the stub registers: /admin/audit is now a live,
  // backend-driven module (src/app/admin/audit + components/admin/audit).
};

export function getRegister(
  slug: string,
): (RegisterConfig & { rows: RegisterRow[] }) | undefined {
  return Object.prototype.hasOwnProperty.call(REGISTERS, slug)
    ? REGISTERS[slug as RegisterSlug]
    : undefined;
}

/** Plain text of any cell shape (search, refs, detail values). */
export function cellText(cell: RegisterCell | undefined): string {
  if (cell == null) return "";
  return typeof cell === "object" ? cell.t : String(cell);
}

export function isTagCell(cell: RegisterCell): cell is RegisterTagCell {
  return typeof cell === "object" && cell !== null && "tone" in cell;
}

/** Find a row by its first-cell reference (the detail-route id). */
export function findRegisterRow(
  register: RegisterConfig & { rows: RegisterRow[] },
  ref: string,
): RegisterRow | undefined {
  return register.rows.find((row) => cellText(row[0]) === ref);
}

const AVATAR_PALETTE = [
  { bg: "#E7EEE9", fg: "#1E3D2B" },
  { bg: "#E8EFF4", fg: "#33587A" },
  { bg: "#F7EED8", fg: "#7A5407" },
  { bg: "#ECEFF3", fg: "#4c5765" },
  { bg: "#F0E9E0", fg: "#6B4A2C" },
];

/** Deterministic initials avatar (the design's `avatarOf`). */
export function avatarOf(name: string): { init: string; bg: string; fg: string } {
  const s = name || "?";
  let h = 0;
  for (let i = 0; i < s.length; i++) h += s.charCodeAt(i);
  const words = s.replace(/[^A-Za-z ]/g, "").trim().split(/\s+/);
  const init = ((words[0] || "?")[0] + ((words[1] || "")[0] || "")).toUpperCase();
  return { init, ...AVATAR_PALETTE[h % AVATAR_PALETTE.length] };
}
