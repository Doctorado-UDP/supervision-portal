import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const requestedNext = searchParams.get("next");

  // Only allow redirects inside our own application.
  const allowedDestinations = ["/onboarding", "/dashboard"];

  const next =
    requestedNext && allowedDestinations.includes(requestedNext)
      ? requestedNext
      : "/dashboard";

  const redirectTo = request.nextUrl.clone();

  redirectTo.pathname = next;
  redirectTo.search = "";

  if (tokenHash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      return NextResponse.redirect(redirectTo);
    }
  }

  const errorUrl = request.nextUrl.clone();

  errorUrl.pathname = "/auth/error";
  errorUrl.search = "";

  return NextResponse.redirect(errorUrl);
}