import { CACHE_TAGS } from "@/config/cache-tags";
import { env } from "@/lib/env";
import { siteConfig } from "@/lib/site";

/**
 * The owner-editable company contact block, fetched from the backend under the
 * `contact` cache tag. The backend purges the tag after any settings write, so
 * the 1-hour ISR window is only the backstop for a lost purge. When a value is
 * blank or the API is unreachable, the static `siteConfig` value stands in, so
 * the site always shows a usable contact.
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
  phone: string;
  phoneHref: string;
  whatsapp: string;
  whatsappHref: string;
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
  const whatsapp = api?.whatsapp?.trim() || api?.phone?.trim() || phone;
  const email = api?.email?.trim() || siteConfig.email;
  const address = api?.address?.trim() || siteConfig.address;
  const phoneIntl = ghIntlDigits(phone);
  const whatsappIntl = ghIntlDigits(whatsapp);
  return {
    address,
    email,
    phone,
    phoneHref: phoneIntl ? `tel:+${phoneIntl}` : siteConfig.phoneHref,
    whatsapp,
    whatsappHref: whatsappIntl
      ? `https://wa.me/${whatsappIntl}`
      : siteConfig.whatsappHref,
  };
}
