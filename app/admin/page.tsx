import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", userId)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-semibold text-gray-900">
          Admin dashboard
        </h1>

        <p className="mt-2 text-gray-600">
          Welcome, {profile.full_name}.
        </p>

        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
          <p className="font-medium text-gray-900">
            Authentication successful
          </p>

          <p className="mt-2 text-sm text-gray-600">
            You are signed in with administrator access.
          </p>
        </div>

        <form action="/auth/signout" method="post" className="mt-6">
          <button
            type="submit"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}