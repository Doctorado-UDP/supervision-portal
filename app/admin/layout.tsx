import type { ReactNode } from "react";

import AdminHeader from "@/components/admin/admin-header";
import SiteFooter from "@/components/shared/site-footer";
import { isGlobalSupervisor, requireAdmin } from "@/lib/auth/require-admin";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const profile = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <AdminHeader
        fullName={profile.full_name}
        globalSupervisor={isGlobalSupervisor(profile)}
      />

      <main className="mx-auto w-full max-w-7xl px-6 py-8">{children}</main>

      <SiteFooter />
    </div>
  );
}
