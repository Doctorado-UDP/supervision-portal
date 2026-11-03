import "jsr:@supabase/functions-js@2.112.3/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const PRIMARY_SUPERVISOR_EMAIL = "bastian.gonzalez.b@mail.udp.cl";
const SITE_URL = "https://supervision.bgonzalezbustamante.com";

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Invitation links always return to production. Netlify branch deploys and
// deploy previews are disabled, and Supabase Auth allows no other origin.
const INVITATION_REDIRECT_URL = `${SITE_URL}/auth/confirm`;

// listUsers page size; findAuthUserByEmail reads every page.
const AUTH_USERS_PAGE_SIZE = 1000;

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
    return jsonResponse(
      { ok: false, error: "Global supervisor access is required." },
      403
    );
  }

  // Older app versions also send redirect_origin; it is ignored.
  let payload: {
    invitation_id?: string;
    action?: string;
  };

  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid request body." }, 400);
  }

  const invitationId = payload.invitation_id?.trim();
  const action =
    payload.action === "cancel"
      ? "cancel"
      : payload.action === "retry"
        ? "retry"
        : "send";

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
    return jsonResponse(
      { ok: false, error: "This invitation has already been accepted." },
      409
    );
  }

  if (invitation.status === "cancelled") {
    return jsonResponse(
      {
        ok: false,
        error:
          "This invitation has been cancelled. Create a new invitation if access is required again.",
      },
      409
    );
  }

  if (action === "send" && invitation.status !== "pending") {
    return jsonResponse(
      {
        ok: false,
        error: "This invitation has already been processed. Use Retry instead.",
      },
      409
    );
  }

  async function accountHasLinkedRecords(authUserId: string) {
    const checks = await Promise.all([
      admin
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("user_id", authUserId),
      admin
        .from("case_staff")
        .select("id", { count: "exact", head: true })
        .eq("staff_id", authUserId),
      admin
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .eq("uploaded_by", authUserId),
      admin
        .from("feedback")
        .select("id", { count: "exact", head: true })
        .eq("author_id", authUserId),
      admin
        .from("meetings")
        .select("id", { count: "exact", head: true })
        .eq("created_by", authUserId),
      admin
        .from("supervisions")
        .select("id", { count: "exact", head: true })
        .eq("supervisor_id", authUserId),
    ]);

    if (checks.some((result) => result.error)) {
      throw new Error(
        "Unable to verify whether the onboarding account is unused."
      );
    }

    return checks.some((result) => (result.count ?? 0) > 0);
  }

  // Removes an account created by an invitation that was never used. It
  // refuses the primary supervisor, any account that has ever signed in and
  // any account with supervision records, so Cancel or Retry can never delete
  // a real account.
  async function removeUnusedAuthUser(authUserId: string) {
    const { data: target, error: targetError } =
      await admin.auth.admin.getUserById(authUserId);

    if (targetError || !target?.user) {
      throw new Error("The onboarding account could not be checked.");
    }

    if (
      target.user.email?.trim().toLowerCase() ===
        PRIMARY_SUPERVISOR_EMAIL.toLowerCase() ||
      target.user.last_sign_in_at
    ) {
      throw new Error(
        "This account is already in use and cannot be removed as a pending invitation."
      );
    }

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

  async function findAuthUserByEmail(email: string) {
    const normalizedEmail = email.trim().toLowerCase();

    for (let page = 1; ; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage: AUTH_USERS_PAGE_SIZE,
      });

      if (error) {
        throw new Error("Unable to check existing Auth accounts.");
      }

      const match = data.users.find(
        (candidate) => candidate.email?.trim().toLowerCase() === normalizedEmail
      );

      if (match) {
        return match;
      }

      if (data.users.length < AUTH_USERS_PAGE_SIZE) {
        return null;
      }
    }
  }

  if (action === "cancel") {
    try {
      if (invitation.auth_user_id) {
        await removeUnusedAuthUser(invitation.auth_user_id);
      }
    } catch (error) {
      return jsonResponse(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Invitation cancellation failed.",
        },
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
      return jsonResponse(
        { ok: false, error: "The invitation could not be cancelled." },
        500
      );
    }

    return jsonResponse({ ok: true, message: "Invitation cancelled." });
  }

  if (action === "retry" && invitation.auth_user_id) {
    try {
      await removeUnusedAuthUser(invitation.auth_user_id);
    } catch (error) {
      return jsonResponse(
        {
          ok: false,
          error:
            error instanceof Error ? error.message : "Invitation retry failed.",
        },
        409
      );
    }

    const { error: clearError } = await admin
      .from("access_invitations")
      .update({ auth_user_id: null, updated_at: new Date().toISOString() })
      .eq("id", invitation.id);

    if (clearError) {
      return jsonResponse(
        { ok: false, error: "The invitation could not be prepared for retry." },
        500
      );
    }
  }

  let existingAuthUser = null;

  try {
    existingAuthUser = await findAuthUserByEmail(invitation.email);
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to check existing Auth accounts.",
      },
      500
    );
  }

  if (existingAuthUser) {
    const message =
      "An Auth account already exists for this email address. Resolve that account before retrying the invitation.";

    // The existing account is not linked to the invitation: Cancel and Retry
    // only ever remove accounts that this function created.
    await admin
      .from("access_invitations")
      .update({
        status: "failed",
        auth_user_id: null,
        last_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    return jsonResponse({ ok: false, error: message }, 409);
  }

  const { data: inviteData, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(invitation.email, {
      data: { full_name: invitation.full_name },
      redirectTo: INVITATION_REDIRECT_URL,
    });

  if (inviteError || !inviteData.user) {
    // Only the global supervisor reaches this function, so Auth's own message
    // (for example an email rate limit) is shown to help resolve it.
    const message = inviteError?.message ?? "Invitation email could not be sent.";
    let strandedAuthUserId: string | null = null;

    try {
      const newlyCreatedUser = await findAuthUserByEmail(invitation.email);

      if (newlyCreatedUser) {
        try {
          await removeUnusedAuthUser(newlyCreatedUser.id);
        } catch {
          strandedAuthUserId = newlyCreatedUser.id;
        }
      }
    } catch {
      // Preserve the original invitation failure if cleanup inspection also fails.
    }

    await admin
      .from("access_invitations")
      .update({
        status: "failed",
        auth_user_id: strandedAuthUserId,
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
      {
        ok: false,
        error: "The invitation was sent, but its portal status could not be updated.",
      },
      500
    );
  }

  return jsonResponse({
    ok: true,
    message: action === "retry" ? "Invitation resent." : "Invitation sent.",
  });
});
