"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requireGlobalSupervisor } from "@/lib/auth/require-admin";
import { SITE_CONFIG } from "@/lib/config/site";
import { createClient } from "@/lib/supabase/server";

function getText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function redirectAccess(kind: "notice" | "error", message: string): never {
  redirect(`/admin/access?${kind}=${encodeURIComponent(message)}`);
}

async function getRequestOrigin() {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost ?? requestHeaders.get("host");
  const forwardedProto = requestHeaders.get("x-forwarded-proto");
  const protocol = forwardedProto ?? "https";

  if (!host) {
    return SITE_CONFIG.siteUrl;
  }

  return `${protocol}://${host}`;
}

async function invokeInvitationAction(
  invitationId: string,
  action: "send" | "retry" | "cancel"
) {
  const supabase = await createClient();
  const redirectOrigin = await getRequestOrigin();
  const { data, error } = await supabase.functions.invoke(
    "invite-supervision-user",
    {
      body: {
        invitation_id: invitationId,
        action,
        redirect_origin: redirectOrigin,
      },
    }
  );

  if (error) {
    console.error(`Invitation ${action} failed:`, error, data);
    return {
      ok: false,
      message:
        typeof data?.error === "string"
          ? data.error
          : `The invitation could not be ${action === "cancel" ? "cancelled" : "sent"}.`,
    };
  }

  if (!data || data.ok !== true) {
    return {
      ok: false,
      message:
        typeof data?.error === "string"
          ? data.error
          : "The invitation request returned an unexpected response.",
    };
  }

  return {
    ok: true,
    message:
      typeof data.message === "string" ? data.message : "Invitation updated.",
  };
}

async function invokeAccountDeletion(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke(
    "delete-supervision-user",
    {
      body: { user_id: userId },
    }
  );

  if (error) {
    console.error("Account deletion failed:", error, data);
    return {
      ok: false,
      message:
        typeof data?.error === "string"
          ? data.error
          : "The account could not be deleted.",
    };
  }

  if (!data || data.ok !== true) {
    return {
      ok: false,
      message:
        typeof data?.error === "string"
          ? data.error
          : "The account deletion request returned an unexpected response.",
    };
  }

  return {
    ok: true,
    message: typeof data.message === "string" ? data.message : "Account deleted.",
  };
}

export async function createAccessInvitation(formData: FormData) {
  const supervisor = await requireGlobalSupervisor("/admin");
  const fullName = getText(formData, "full_name");
  const email = getText(formData, "email").toLowerCase();
  const intendedRole = getText(formData, "intended_role");

  if (fullName.length < 2) {
    redirectAccess("error", "Enter the invited user's full name.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirectAccess("error", "Enter a valid email address.");
  }

  if (!["student", "staff"].includes(intendedRole)) {
    redirectAccess("error", "Choose Student or Staff access.");
  }

  const supabase = await createClient();

  const { data: existingProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (profileError) {
    console.error("Existing-account check failed:", profileError);
    redirectAccess("error", "The portal could not check existing accounts.");
  }

  if (existingProfile) {
    redirectAccess(
      "error",
      "An account already exists for this email address. Manage the existing account instead of sending another invitation."
    );
  }

  const { data: invitation, error: insertError } = await supabase
    .from("access_invitations")
    .insert({
      full_name: fullName,
      email,
      intended_role: intendedRole,
      created_by: supervisor.id,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !invitation) {
    console.error("Invitation creation failed:", insertError);
    const duplicate = insertError?.code === "23505";
    redirectAccess(
      "error",
      duplicate
        ? "An active invitation already exists for this email address."
        : "The invitation could not be created."
    );
  }

  const result = await invokeInvitationAction(invitation.id, "send");
  revalidatePath("/admin/access");
  revalidatePath("/admin/students");

  redirectAccess(result.ok ? "notice" : "error", result.message);
}

export async function retryAccessInvitation(formData: FormData) {
  await requireGlobalSupervisor("/admin");
  const invitationId = getText(formData, "invitation_id");

  if (!invitationId) {
    redirectAccess("error", "Select an invitation to retry.");
  }

  const result = await invokeInvitationAction(invitationId, "retry");
  revalidatePath("/admin/access");
  revalidatePath("/admin/students");
  redirectAccess(result.ok ? "notice" : "error", result.message);
}

export async function cancelAccessInvitation(formData: FormData) {
  await requireGlobalSupervisor("/admin");
  const invitationId = getText(formData, "invitation_id");

  if (!invitationId) {
    redirectAccess("error", "Select an invitation to cancel.");
  }

  const result = await invokeInvitationAction(invitationId, "cancel");
  revalidatePath("/admin/access");
  revalidatePath("/admin/students");
  redirectAccess(result.ok ? "notice" : "error", result.message);
}

export async function deleteAccessAccount(formData: FormData) {
  await requireGlobalSupervisor("/admin");
  const userId = getText(formData, "user_id");

  if (!userId) {
    redirectAccess("error", "Select an account to delete.");
  }

  const result = await invokeAccountDeletion(userId);
  revalidatePath("/admin");
  revalidatePath("/admin/access");
  revalidatePath("/admin/students");
  revalidatePath("/admin/supervisions");
  revalidatePath("/admin/timetable");

  redirectAccess(result.ok ? "notice" : "error", result.message);
}
