/**
 * Compatibility barrel, matching the supplier-screens split. The buyer pages
 * under src/app/admin/buyers import from this path; the code now lives in
 * buyer-table.tsx and buyer-form.tsx and this file only forwards it.
 */
export { BuyerTable } from "./buyer-table";
export { BuyerCreate, BuyerEdit } from "./buyer-form";
