/**
 * The single tag registry for the RTK Query api-slice. Every feature file
 * pulls tag names from here so invalidation can never typo a tag.
 */
export const apiSliceTags = [
  "Agents",
  "Approvals",
  "ApprovalsCount",
  "AuditLogs",
  "Buyers",
  "Commodities",
  "Enquiries",
  "ExpenseCategories",
  "Expenses",
  "Farmers",
  "FarmPlans",
  "FarmStats",
  "FloatLedger",
  "Grants",
  "InputItems",
  "LandAcquisitions",
  "LandPlots",
  "LandSales",
  "LandSellers",
  "Notifications",
  "Repayments",
  "Seasons",
  "PaymentPolicies",
  "Purchases",
  "Reconciliations",
  "Reports",
  "Sales",
  "SaleStats",
  "Settings",
  "Shipments",
  "Stock",
  "StockMovements",
  "Suppliers",
  "Users",
  "Warehouses",
] as const;

export type ApiSliceTag = (typeof apiSliceTags)[number];

/** Standard list metadata returned by every paginated endpoint. */
export interface IPaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
