import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
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
    redirect("/admin");
  }

  if (profile.role === "student") {
    redirect("/student");
  }

  throw new Error("The authenticated user has an unknown role.");
}