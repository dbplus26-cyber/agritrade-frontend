import { redirect } from "next/navigation";

/** Adding an input item is a dialog on the register now. */
export default function NewInputItemPage() {
  redirect("/admin/input-items");
}
