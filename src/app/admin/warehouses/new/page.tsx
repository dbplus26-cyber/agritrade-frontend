import { redirect } from "next/navigation";

/** Adding a warehouse is a dialog on the register now. */
export default function NewWarehousePage() {
  redirect("/admin/warehouses");
}
