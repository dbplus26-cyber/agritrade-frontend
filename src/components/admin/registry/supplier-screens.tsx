/**
 * Compatibility barrel. This module once held every supplier screen plus the
 * shared RegistryAvatar/RecordTimestamps helpers, and screens across the
 * console (buyers, drivers, agents, warehouses, delivery addresses, payment
 * accounts) import them from this path. The code now lives in
 * supplier-table.tsx and supplier-form.tsx; this file only forwards the old
 * surface so those imports keep resolving.
 */
export {
  RecordTimestamps,
  RegistryAvatar,
  SupplierTable,
} from "./supplier-table";
export { SupplierCreate, SupplierEdit } from "./supplier-form";
