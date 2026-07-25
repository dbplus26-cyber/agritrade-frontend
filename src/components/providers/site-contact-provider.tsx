"use client";

import { createContext, useContext } from "react";
import {
  type ResolvedContact,
  resolveSiteContact,
} from "@/lib/public-contact";

/**
 * Holds the resolved public contact (fetched once in the (site) layout) so any
 * client component under the marketing site reads the owner-editable
 * phone/WhatsApp/email/address via `useSiteContact()`. The default value falls
 * back to the static siteConfig, so a consumer rendered outside the provider
 * still gets a usable contact.
 */
const SiteContactContext = createContext<ResolvedContact>(
  resolveSiteContact(null),
);

export function SiteContactProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: ResolvedContact;
}) {
  return (
    <SiteContactContext.Provider value={value}>
      {children}
    </SiteContactContext.Provider>
  );
}

/** The resolved public contact block (display values + tel:/wa.me links). */
export function useSiteContact(): ResolvedContact {
  return useContext(SiteContactContext);
}
