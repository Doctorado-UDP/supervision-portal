import type { ReactNode } from "react";

import AdminHeader from "@/components/admin/admin-header";
import { requireAdmin } from "@/lib/auth/require-admin";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({
  children,
}: AdminLayoutProps) {
  const profile = await requireAdmin();

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader fullName={profile.full_name} />

      <main className="mx-auto max-w-7xl px-6 py-8">
        {children}
      </main>
    </div>
  );
}