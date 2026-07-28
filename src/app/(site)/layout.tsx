import { SiteContactProvider } from "@/components/providers/site-contact-provider";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { getSiteContact } from "@/lib/public-contact";

/**
 * The standard site chrome. The owner-editable contact block is resolved once
 * here and shared with every client consumer through the provider (server
 * components call getSiteContact directly; Next dedupes).
 */
export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const contact = await getSiteContact();
  return (
    <SiteContactProvider value={contact}>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </SiteContactProvider>
  );
}
