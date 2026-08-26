import Image from "next/image";
import { redirect } from "next/navigation";

import SiteFooter from "@/components/shared/site-footer";
import { createClient } from "@/lib/supabase/server";

import PasswordForm from "./password-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    throw new Error(
      "The authenticated user does not have an accessible profile."
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mb-6 flex justify-center">
              <Image
                src="/branding/udp.png"
                alt="Universidad Diego Portales"
                width={267}
                height={65}
                priority
                className="h-auto w-auto max-w-full"
              />
            </div>

            <h1 className="text-2xl font-semibold text-gray-900">
              Welcome to the Supervision Portal
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              Complete your {profile.role === "admin" ? "Staff" : "Student"} account setup
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-medium text-gray-900">
              Create your password
            </h2>

            <p className="mb-6 mt-2 text-sm text-gray-600">
              Choose the password you will use to access the portal.
            </p>

            <PasswordForm />
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
