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
  "DeliveryAddresses",
  "Disbursements",
  "Drivers",
  "EligibleSales",
  "Enquiries",
  "ExpenseCategories",
  "Expenses",
  "FarmApplications",
  "Farmers",
  "FarmPlans",
  "FarmStats",
  "FloatHolders",
  "FloatLedger",
  "Grants",
  "InputItems",
  "LandAcquisitions",
  "LandPlots",
  "LandSales",
  "LandSellers",
  "Notifications",
  "PaymentAccounts",
  "Repayments",
  "Reviews",
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
  "Stocktakes",
  "Suppliers",
  "Transfers",
  "Treasury",
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
