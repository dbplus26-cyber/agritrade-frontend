import { Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { getSiteContact } from "@/lib/public-contact";

/**
 * Mobile-only contact rail: small square plates stacked flush against the
 * right edge of the viewport. It replaces the old full-width sticky bar, which
 * ate a band off the bottom of every page and parked itself over the footer.
 *
 * Channels render ONLY when the owner has actually published them - a tel:
 * link to nobody is worse than no button - and the rail disappears entirely
 * when neither exists.
 */
export async function StickyCallBar() {
  const contact = await getSiteContact();
  if (!contact.hasPhone && !contact.hasWhatsapp) return null;

  // 44px is the accessibility floor for a tap target, so the plates are square
  // at exactly that. The hard offset shadow falls left, since the rail is
  // welded to the right edge.
  const plate =
    "flex size-11 items-center justify-center transition-[filter] duration-100 active:brightness-90 focus-visible:outline-2 focus-visible:-outline-offset-[3px] focus-visible:outline-surface";

  return (
    <div
      // Below centre: inside easy thumb reach, and clear of the band where
      // most of a page's reading actually happens.
      className="fixed right-[env(safe-area-inset-right,0px)] top-[64%] z-40 flex -translate-y-1/2 flex-col border-y-2 border-l-2 border-ink/80 shadow-[-3px_3px_0_rgb(31_33_28/0.28)] lg:hidden"
    >
      {contact.hasPhone ? (
        <a
          href={contact.phoneHref}
          aria-label={`Call us on ${contact.phone}`}
          className={`${plate} bg-forest ${contact.hasWhatsapp ? "border-b-2 border-ink/80" : ""}`}
        >
          <Phone aria-hidden="true" className="size-[19px] text-harvest" strokeWidth={2.3} />
        </a>
      ) : null}
      {contact.hasWhatsapp ? (
        <a
          href={contact.whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Message us on WhatsApp at ${contact.whatsapp}`}
          className={`${plate} bg-leaf`}
        >
          <WhatsAppIcon aria-hidden="true" className="size-[21px] text-surface" />
        </a>
      ) : null}
    </div>
  );
}
