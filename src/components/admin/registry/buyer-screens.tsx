/**
 * Barrel matching the supplier-screens split: the buyer pages under
 * src/app/admin/buyers import from this path, while the code itself lives in
 * buyer-table.tsx and buyer-form.tsx.
 */
export { BuyerTable } from "./buyer-table";
export { BuyerCreate, BuyerEdit } from "./buyer-form";
