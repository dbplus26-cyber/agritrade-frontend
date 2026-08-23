import { redirect } from "next/navigation";

/** Drafting a sale is a dialog on the register and on the plot itself now. */
export default function NewLandSalePage() {
  redirect("/admin/land-sales");
}
