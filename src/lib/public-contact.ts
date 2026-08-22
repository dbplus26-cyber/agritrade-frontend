import { CACHE_TAGS } from "@/config/cache-tags";
import { env } from "@/lib/env";
import { siteConfig } from "@/lib/site";

/**
 * The owner-editable company contact block, fetched from the backend under the
 * `contact` cache tag. The backend purges the tag after any settings write, so
 * the 1-hour ISR window is only the backstop for a lost purge. When a value is
 * blank or the API is unreachable, the static `siteConfig` placeholder stands
 * in, so the public site always displays a full contact block.
 */

/** Mirrors the backend `PublicContactDTO`. */
export interface PublicContact {
  address: string;
  email: string;
  phone: string;
  whatsapp: string;
}

/** The contact the site actually renders: display values + derived links. */
export interface ResolvedContact {
  address: string;
  email: string;
  /**
   * Whether each channel has a value to render - from the backend settings
   * when published, else the `siteConfig` placeholder. Callers branch on
   * these so a channel with no value at all renders nothing rather than an
   * empty label.
   */
  hasEmail: boolean;
  hasPhone: boolean;
  hasWhatsapp: boolean;
  phone: string;
  phoneHref: string;
  /**
   * What to print where a phone number would go. Falls back to a call to
   * action pointing at the contact page, so a site with no number published
   * reads as "contact us" rather than an empty link.
   */
  phoneLabel: string;
  whatsapp: string;
  whatsappHref: string;
  /** True only when WhatsApp is published AND differs from the phone line. */
  whatsappIsSeparate: boolean;
}

/**
 * Server helper: fetch + resolve the site contact in one call. Next dedupes the
 * underlying fetch, so every server component that calls this in a render shares
 * one request. Client components read the same value via `useSiteContact()`.
 */
export async function getSiteContact(): Promise<ResolvedContact> {
  return resolveSiteContact(await fetchPublicContact());
}

/** Fetches the published contact block, or null when the API is unreachable. */
export async function fetchPublicContact(): Promise<null | PublicContact> {
  try {
    const res = await fetch(`${env.SERVER_URI}/api/v1/public/contact`, {
      next: { revalidate: 3600, tags: [CACHE_TAGS.CONTACT] },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: { contact?: PublicContact } };
    return body.data?.contact ?? null;
  } catch {
    return null;
  }
}

/**
 * Normalise a Ghana phone number to its international digits (no +, no spaces):
 * a local `0XX...` becomes `233XX...`, a bare 9-digit becomes `233...`, and an
 * already-international number keeps its digits. Used for tel: and wa.me links.
 */
function ghIntlDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("233")) return digits;
  if (digits.startsWith("0")) return `233${digits.slice(1)}`;
  if (digits.length === 9) return `233${digits}`;
  return digits;
}

/**
 * Merge the API contact over the static `siteConfig` fallbacks and derive the
 * tel:/wa.me links. Pure, so it runs on the server (layout) or the client
 * (the provider's default value).
 */
export function resolveSiteContact(api: null | PublicContact): ResolvedContact {
  const phone = api?.phone?.trim() || siteConfig.phone;
  const whatsapp =
    api?.whatsapp?.trim() || api?.phone?.trim() || siteConfig.whatsapp;
  const email = api?.email?.trim() || siteConfig.email;
  const address = api?.address?.trim() || siteConfig.address;
  const phoneIntl = ghIntlDigits(phone);
  const whatsappIntl = ghIntlDigits(whatsapp);
  return {
    address,
    email,
    hasEmail: email.length > 0,
    hasPhone: phone.length > 0,
    hasWhatsapp: whatsapp.length > 0,
    phone,
    phoneHref: phoneIntl ? `tel:+${phoneIntl}` : siteConfig.phoneHref,
    phoneLabel: phone || "Contact us",
    whatsapp,
    whatsappHref: whatsappIntl
      ? `https://wa.me/${whatsappIntl}`
      : siteConfig.whatsappHref,
    // Only worth showing as its own channel when it is a different line;
    // otherwise the footer announces "WhatsApp same" against nothing.
    whatsappIsSeparate: whatsapp.length > 0 && whatsapp !== phone,
  };
}
