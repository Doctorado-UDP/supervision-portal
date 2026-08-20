import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import PasswordForm from "./password-form";

export default async function OnboardingPage() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

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

  if (profile.role === "admin") {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 items-center justify-center rounded-md border border-dashed border-gray-300 bg-white text-sm text-gray-500">
            University logo
          </div>

          <h1 className="text-2xl font-semibold text-gray-900">
            Welcome to the Supervision Portal
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Complete your account setup
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900">
            Create your password
          </h2>

          <p className="mt-2 mb-6 text-sm text-gray-600">
            Choose the password you will use to access the portal.
          </p>

          <PasswordForm />
        </div>
      </div>
    </main>
  );
}