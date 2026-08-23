import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AdminShell } from "@/components/admin/shell";
import { RequireAuth } from "@/components/auth/require-auth";
import { RequireRole } from "@/components/auth/require-role";
import { UserRole } from "@/types/user.types";

// The console reads numbers all day, so its type is chosen for plainness
// rather than character: a neutral grotesque with unambiguous figures, the
// kind of face every dashboard a person has already used is set in. Nothing
// here should ask to be looked at.
const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

// Its own monospace, for the columns that have to line up: document numbers,
// weights and money. Same family, so a figure in a table and a label above it
// are visibly related.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Console · DB Plus",
    template: "%s · DB Plus Console",
  },
  // The console is private tooling - never indexed (robots.ts blocks /admin too).
  robots: { index: false, follow: false },
};

/**
 * The DB Plus Console - its own chrome (no public header/footer), Meridian
 * fonts, slate UI. RequireAuth validates the session against GET /auth/me
 * before the console renders; the proxy's cookie gate is only the first,
 * cheap line of defence.
 */
export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className={`${geist.variable} ${geistMono.variable} admin-scope font-admin min-h-screen bg-adm-page text-[14px] leading-[1.5] text-adm-body antialiased`}
    >
      <RequireAuth>
        {/* Field agents have their own surface - the console is not it. */}
        <RequireRole
          allow={[UserRole.SUPER_ADMIN, UserRole.STAFF]}
          redirectTo="/agent"
        >
          <AdminShell>{children}</AdminShell>
        </RequireRole>
      </RequireAuth>
    </div>
  );
}
