import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const PRIMARY_SUPERVISOR_EMAIL = "bastian.gonzalez.b@mail.udp.cl";
const SITE_URL = "https://supervision.bgonzalezbustamante.com";

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization");

  if (!supabaseUrl || !serviceRoleKey || !authorization?.startsWith("Bearer ")) {
    return jsonResponse({ ok: false, error: "Authentication is required." }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const token = authorization.slice("Bearer ".length);
  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);

  if (userError || !user) {
    return jsonResponse({ ok: false, error: "Authentication is required." }, 401);
  }

  const { data: callerProfile, error: callerError } = await admin
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .maybeSingle();

  if (
    callerError ||
    !callerProfile ||
    callerProfile.role !== "admin" ||
    callerProfile.email?.toLowerCase() !== PRIMARY_SUPERVISOR_EMAIL.toLowerCase()
  ) {
    return jsonResponse({ ok: false, error: "Global supervisor access is required." }, 403);
  }

  let payload: { invitation_id?: string; action?: string };

  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid request body." }, 400);
  }

  const invitationId = payload.invitation_id?.trim();
  const action = payload.action === "cancel" ? "cancel" : payload.action === "retry" ? "retry" : "send";

  if (!invitationId) {
    return jsonResponse({ ok: false, error: "Invitation ID is required." }, 400);
  }

  const { data: invitation, error: invitationError } = await admin
    .from("access_invitations")
    .select("id, email, full_name, intended_role, status, auth_user_id")
    .eq("id", invitationId)
    .maybeSingle();

  if (invitationError || !invitation) {
    return jsonResponse({ ok: false, error: "Invitation not found." }, 404);
  }

  if (invitation.status === "accepted") {
    return jsonResponse({ ok: false, error: "This invitation has already been accepted." }, 409);
  }

  if (invitation.status === "cancelled" && action !== "send") {
    return jsonResponse({ ok: false, error: "This invitation has been cancelled." }, 409);
  }

  async function accountHasLinkedRecords(authUserId: string) {
    const checks = await Promise.all([
      admin.from("students").select("id", { count: "exact", head: true }).eq("user_id", authUserId),
      admin.from("case_staff").select("id", { count: "exact", head: true }).eq("staff_id", authUserId),
      admin.from("submissions").select("id", { count: "exact", head: true }).eq("uploaded_by", authUserId),
      admin.from("feedback").select("id", { count: "exact", head: true }).eq("author_id", authUserId),
      admin.from("meetings").select("id", { count: "exact", head: true }).eq("created_by", authUserId),
      admin.from("supervisions").select("id", { count: "exact", head: true }).eq("supervisor_id", authUserId),
    ]);

    if (checks.some((result) => result.error)) {
      throw new Error("Unable to verify whether the onboarding account is unused.");
    }

    return checks.some((result) => (result.count ?? 0) > 0);
  }

  async function removeUnusedAuthUser(authUserId: string) {
    if (await accountHasLinkedRecords(authUserId)) {
      throw new Error(
        "This account already has supervision activity or assignments and cannot be removed as a pending invitation."
      );
    }

    const { error } = await admin.auth.admin.deleteUser(authUserId);

    if (error) {
      throw new Error("The unused onboarding account could not be removed.");
    }
  }

  if (action === "cancel") {
    try {
      if (invitation.auth_user_id) {
        await removeUnusedAuthUser(invitation.auth_user_id);
      }
    } catch (error) {
      return jsonResponse(
        { ok: false, error: error instanceof Error ? error.message : "Invitation cancellation failed." },
        409
      );
    }

    const { error: cancelError } = await admin
      .from("access_invitations")
      .update({
        status: "cancelled",
        auth_user_id: null,
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    if (cancelError) {
      return jsonResponse({ ok: false, error: "The invitation could not be cancelled." }, 500);
    }

    return jsonResponse({ ok: true, message: "Invitation cancelled." });
  }

  if (action === "retry" && invitation.auth_user_id) {
    try {
      await removeUnusedAuthUser(invitation.auth_user_id);
    } catch (error) {
      return jsonResponse(
        { ok: false, error: error instanceof Error ? error.message : "Invitation retry failed." },
        409
      );
    }

    await admin
      .from("access_invitations")
      .update({ auth_user_id: null, updated_at: new Date().toISOString() })
      .eq("id", invitation.id);
  }

  const { data: inviteData, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(invitation.email, {
      data: { full_name: invitation.full_name },
      redirectTo: `${SITE_URL}/auth/confirm?next=/onboarding`,
    });

  if (inviteError || !inviteData.user) {
    const message = inviteError?.message ?? "Invitation email could not be sent.";

    await admin
      .from("access_invitations")
      .update({
        status: "failed",
        last_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    return jsonResponse({ ok: false, error: message }, 500);
  }

  const { error: updateError } = await admin
    .from("access_invitations")
    .update({
      status: "sent",
      auth_user_id: inviteData.user.id,
      sent_at: new Date().toISOString(),
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invitation.id);

  if (updateError) {
    return jsonResponse(
      { ok: false, error: "The invitation was sent, but its portal status could not be updated." },
      500
    );
  }

  return jsonResponse({ ok: true, message: action === "retry" ? "Invitation resent." : "Invitation sent." });
});
