import type { Metadata } from "next";
import { SeasonsRegister } from "@/components/admin/farm/seasons-register";

export const metadata: Metadata = { title: "Seasons" };

export default function SeasonsPage() {
  return <SeasonsRegister />;
}
