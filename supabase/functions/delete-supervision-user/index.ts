import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const PRIMARY_SUPERVISOR_EMAIL = "bastian.gonzalez.b@mail.udp.cl";

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
    data: { user: caller },
    error: callerUserError,
  } = await admin.auth.getUser(token);

  if (callerUserError || !caller) {
    return jsonResponse({ ok: false, error: "Authentication is required." }, 401);
  }

  const { data: callerProfile, error: callerProfileError } = await admin
    .from("profiles")
    .select("role, email")
    .eq("id", caller.id)
    .maybeSingle();

  if (
    callerProfileError ||
    !callerProfile ||
    callerProfile.role !== "admin" ||
    callerProfile.email?.toLowerCase() !== PRIMARY_SUPERVISOR_EMAIL.toLowerCase()
  ) {
    return jsonResponse(
      { ok: false, error: "Global supervisor access is required." },
      403
    );
  }

  let payload: { user_id?: string };

  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid request body." }, 400);
  }

  const targetUserId = payload.user_id?.trim();

  if (!targetUserId) {
    return jsonResponse({ ok: false, error: "Account ID is required." }, 400);
  }

  if (targetUserId === caller.id) {
    return jsonResponse(
      { ok: false, error: "The primary supervisor account cannot be deleted." },
      409
    );
  }

  const { data: targetProfile, error: targetProfileError } = await admin
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", targetUserId)
    .maybeSingle();

  if (targetProfileError || !targetProfile) {
    return jsonResponse({ ok: false, error: "Account not found." }, 404);
  }

  const targetEmail = targetProfile.email?.trim().toLowerCase() ?? "";

  if (targetEmail === PRIMARY_SUPERVISOR_EMAIL.toLowerCase()) {
    return jsonResponse(
      { ok: false, error: "The primary supervisor account cannot be deleted." },
      409
    );
  }

  const historyChecks = await Promise.all([
    admin
      .from("feedback")
      .select("id", { count: "exact", head: true })
      .eq("author_id", targetUserId),
    admin
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("uploaded_by", targetUserId),
    admin
      .from("meetings")
      .select("id", { count: "exact", head: true })
      .eq("created_by", targetUserId),
    admin
      .from("supervisions")
      .select("id", { count: "exact", head: true })
      .eq("supervisor_id", targetUserId),
  ]);

  if (historyChecks.some((result) => result.error)) {
    return jsonResponse(
      { ok: false, error: "Unable to verify account supervision history." },
      500
    );
  }

  if (historyChecks.some((result) => (result.count ?? 0) > 0)) {
    return jsonResponse(
      {
        ok: false,
        error:
          "This account has authored supervision history and cannot be deleted from Access.",
      },
      409
    );
  }

  let emptyIndividualCaseIds: string[] = [];

  if (targetProfile.role === "admin") {
    const { count, error } = await admin
      .from("case_staff")
      .select("id", { count: "exact", head: true })
      .eq("staff_id", targetUserId);

    if (error) {
      return jsonResponse(
        { ok: false, error: "Unable to verify staff assignments." },
        500
      );
    }

    if ((count ?? 0) > 0) {
      return jsonResponse(
        {
          ok: false,
          error:
            "This Staff account is assigned to supervision cases. Remove those assignments before deleting the account.",
        },
        409
      );
    }
  } else if (targetProfile.role === "student") {
    const { data: studentRows, error: studentError } = await admin
      .from("students")
      .select("id")
      .eq("user_id", targetUserId);

    if (studentError) {
      return jsonResponse(
        { ok: false, error: "Unable to verify the Student record." },
        500
      );
    }

    for (const student of studentRows ?? []) {
      const { data: memberships, error: membershipError } = await admin
        .from("case_members")
        .select("case_id")
        .eq("student_id", student.id);

      if (membershipError) {
        return jsonResponse(
          { ok: false, error: "Unable to verify Student supervision cases." },
          500
        );
      }

      for (const membership of memberships ?? []) {
        const caseId = membership.case_id;
        const checks = await Promise.all([
          admin
            .from("case_members")
            .select("id", { count: "exact", head: true })
            .eq("case_id", caseId),
          admin
            .from("milestones")
            .select("id", { count: "exact", head: true })
            .eq("case_id", caseId),
          admin
            .from("meetings")
            .select("id", { count: "exact", head: true })
            .eq("case_id", caseId),
          admin
            .from("submissions")
            .select("id", { count: "exact", head: true })
            .eq("case_id", caseId),
        ]);

        if (checks.some((result) => result.error)) {
          return jsonResponse(
            { ok: false, error: "Unable to verify Student supervision history." },
            500
          );
        }

        const [members, milestones, meetings, submissions] = checks.map(
          (result) => result.count ?? 0
        );

        if (members !== 1) {
          return jsonResponse(
            {
              ok: false,
              error:
                "This Student belongs to a group supervision case and cannot be deleted from Access.",
            },
            409
          );
        }

        if (milestones > 0 || meetings > 0 || submissions > 0) {
          return jsonResponse(
            {
              ok: false,
              error:
                "This Student has supervision history. Preserve the account or remove the supervision data through an explicit archival workflow.",
            },
            409
          );
        }

        emptyIndividualCaseIds.push(caseId);
      }
    }
  } else {
    return jsonResponse(
      { ok: false, error: "This account role cannot be deleted from Access." },
      409
    );
  }

  emptyIndividualCaseIds = [...new Set(emptyIndividualCaseIds)];

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(targetUserId);

  if (deleteUserError) {
    return jsonResponse(
      { ok: false, error: "The Auth account could not be deleted." },
      500
    );
  }

  if (emptyIndividualCaseIds.length > 0) {
    const { error: caseDeleteError } = await admin
      .from("supervision_cases")
      .delete()
      .in("id", emptyIndividualCaseIds);

    if (caseDeleteError) {
      return jsonResponse(
        {
          ok: false,
          error:
            "The account was deleted, but an empty supervision case could not be cleaned up automatically.",
        },
        500
      );
    }
  }

  if (targetEmail) {
    await admin
      .from("access_invitations")
      .update({
        status: "cancelled",
        auth_user_id: null,
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .ilike("email", targetEmail)
      .in("status", ["pending", "sent", "failed"]);
  }

  return jsonResponse({
    ok: true,
    message: `${targetProfile.full_name}'s account was deleted.`,
  });
});
