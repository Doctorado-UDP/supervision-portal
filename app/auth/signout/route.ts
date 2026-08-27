import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  if (claimsData?.claims) {
    await supabase.auth.signOut();
  }

  revalidatePath("/", "layout");

  return new Response(null, {
    status: 303,
    headers: {
      Location: "/login",
    },
  });
}
