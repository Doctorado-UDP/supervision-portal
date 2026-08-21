import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const SUPERVISOR_EMAIL =
  "bastian.gonzalez.b@mail.udp.cl";

export type AdminProfile = {
  id: string;
  full_name: string;
  email: string | null;
  role: string;
};

export function isGlobalSupervisor(
  profile: {
    email: string | null;
    role: string;
  }
) {
  return (
    profile.role === "admin" &&
    profile.email?.toLowerCase() ===
      SUPERVISOR_EMAIL.toLowerCase()
  );
}

export async function requireAdmin() {
  const supabase =
    await createClient();

  const {
    data: claimsData,
    error: claimsError,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (
    claimsError ||
    !userId
  ) {
    redirect("/login");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, role"
    )
    .eq(
      "id",
      userId
    )
    .single();

  if (
    profileError ||
    !profile
  ) {
    redirect("/login");
  }

  if (
    profile.role !== "admin"
  ) {
    redirect("/student");
  }

  return profile;
}

export async function requireGlobalSupervisor(
  redirectTo = "/admin"
) {
  const profile =
    await requireAdmin();

  if (
    !isGlobalSupervisor(
      profile
    )
  ) {
    redirect(
      redirectTo
    );
  }

  return profile;
}