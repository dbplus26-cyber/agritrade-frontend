/**
 * Compatibility barrel. Screens across the console (buyers, drivers, agents,
 * warehouses, delivery addresses, payment accounts) import the supplier
 * screens and the shared RegistryAvatar/RecordTimestamps helpers from this
 * path; the code itself lives in supplier-table.tsx and supplier-form.tsx and
 * is forwarded here so those imports keep resolving.
 */
export {
  RecordTimestamps,
  RegistryAvatar,
  SupplierTable,
} from "./supplier-table";
export { SupplierCreate, SupplierEdit } from "./supplier-form";
