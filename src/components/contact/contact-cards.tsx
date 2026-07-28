import { LocationMap } from "@/components/contact/location-map";
import { DocCard, DocRow } from "@/components/ui/DocCard";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { getSiteContact } from "@/lib/public-contact";

/** Call/WhatsApp tiles + the location/hours file with the live Tamale map. */
export async function ContactCards() {
  const contact = await getSiteContact();
  return (
    <div className="flex flex-col gap-[22px]">
      {/* Hidden below lg: the quick Call/WhatsApp pair already sits above the
          form there, so these tiles would just repeat it. */}
      <div className="hidden grid-cols-2 gap-4 lg:grid">
        <a
          href={contact.phoneHref}
          className="texture-grain-dark flex flex-col items-center gap-[7px] rounded-[2px] bg-forest px-3 py-[22px] text-surface shadow-[4px_4px_0_rgb(31_33_28/0.3)] transition-[transform,box-shadow] duration-100 hover:translate-x-px hover:translate-y-px hover:shadow-[3px_3px_0_rgb(31_33_28/0.3)]"
        >
          <span className="stencil text-[10px] tracking-[0.24em] text-harvest">
            DISPATCH LINE
          </span>
          <span className="font-display text-[17px] font-bold">Call us</span>
          <span className="text-[12px] font-medium text-surface/75">
            {contact.phoneLabel}
          </span>
        </a>
        <a
          href={contact.whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-[7px] rounded-[2px] bg-leaf px-3 py-[22px] text-surface shadow-[4px_4px_0_rgb(31_33_28/0.3)] transition-[transform,box-shadow] duration-100 hover:translate-x-px hover:translate-y-px hover:shadow-[3px_3px_0_rgb(31_33_28/0.3)]"
        >
          <span className="stencil flex items-center gap-1.5 text-[10px] tracking-[0.24em] text-surface/80">
            {contact.whatsappIsSeparate ? "CHAT LINE" : "SAME NUMBER"}
          </span>
          <span className="flex items-center gap-2 font-display text-[17px] font-bold">
            <WhatsAppIcon aria-hidden="true" className="size-[17px]" />
            WhatsApp
          </span>
          <span className="text-[12px] font-medium text-surface/75">
            {contact.hasWhatsapp ? contact.whatsapp : "Message us"}
          </span>
        </a>
      </div>

      <DocCard tint="paper">
        <LocationMap />
        <div className="px-1 pb-2 pt-1.5">
          <DocRow label="LOCATION">{contact.address}</DocRow>
          <DocRow label="HOURS" last>
            Mon – Sat 7:00 – 17:00 ·{" "}
            <span className="text-soil">Sunday closed</span>
          </DocRow>
        </div>
      </DocCard>
    </div>
  );
}
