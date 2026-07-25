import { Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { getSiteContact } from "@/lib/public-contact";

/**
 * Mobile-only sticky Call/WhatsApp bar. The design chose this over a floating
 * bubble deliberately: the two are equal-weight conversion events, and a lone
 * WhatsApp float would demote Call.
 */
export async function StickyCallBar() {
  const contact = await getSiteContact();
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-px border-t border-soil/25 bg-soil/30 shadow-[0_-6px_18px_rgb(31_33_28/0.15)] lg:hidden">
      <a
        href={contact.phoneHref}
        className="flex items-center justify-center gap-2 bg-forest py-4 text-[15px] font-bold text-surface"
      >
        <Phone aria-hidden="true" className="size-4 text-harvest" strokeWidth={2.2} />
        Call
      </a>
      <a
        href={contact.whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 bg-leaf py-4 text-[15px] font-bold text-surface"
      >
        <WhatsAppIcon aria-hidden="true" className="size-[17px]" />
        WhatsApp
      </a>
    </div>
  );
}
