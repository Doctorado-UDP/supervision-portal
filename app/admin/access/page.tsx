import InvitationActions from "@/components/admin/invitation-actions";
import { isGlobalSupervisor, requireGlobalSupervisor } from "@/lib/auth/require-admin";
import { formatPortalDateTime } from "@/lib/datetime/format";
import { createClient } from "@/lib/supabase/server";

import { createAccessInvitation } from "./actions";

type AccessPageProps = {
  searchParams: Promise<{
    notice?: string;
    error?: string;
  }>;
};

function roleLabel(role: string, primary: boolean) {
  if (primary) return "Primary supervisor";
  return role === "admin" ? "Staff" : "Student";
}

function invitationStatusLabel(status: string) {
  switch (status) {
    case "failed":
      return "Delivery failed";
    case "pending":
      return "Preparing invitation";
    default:
      return "Invitation sent";
  }
}

export default async function AccessPage({ searchParams }: AccessPageProps) {
  const params = await searchParams;
  const supervisor = await requireGlobalSupervisor("/admin");
  const supabase = await createClient();

  const [profilesResult, studentsResult, staffResult, invitationsResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, role, created_at")
        .order("full_name", { ascending: true }),
      supabase.from("students").select("user_id"),
      supabase.from("case_staff").select("staff_id"),
      supabase
        .from("access_invitations")
        .select(
          "id, email, full_name, intended_role, status, auth_user_id, sent_at, created_at, last_error"
        )
        .in("status", ["pending", "sent", "failed"])
        .order("created_at", { ascending: false }),
    ]);

  if (
    profilesResult.error ||
    studentsResult.error ||
    staffResult.error ||
    invitationsResult.error
  ) {
    console.error(
      profilesResult.error,
      studentsResult.error,
      staffResult.error,
      invitationsResult.error
    );
    throw new Error("Unable to load portal access information.");
  }

  const profiles = profilesResult.data ?? [];
  const invitations = invitationsResult.data ?? [];
  const configuredStudentIds = new Set(
    (studentsResult.data ?? []).map((student) => student.user_id)
  );
  const staffCaseCounts = new Map<string, number>();

  for (const row of staffResult.data ?? []) {
    staffCaseCounts.set(row.staff_id, (staffCaseCounts.get(row.staff_id) ?? 0) + 1);
  }

  const pendingByUserId = new Map(
    invitations
      .filter((invitation) => invitation.auth_user_id)
      .map((invitation) => [invitation.auth_user_id as string, invitation])
  );

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
          Primary supervisor
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">
          Access management
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          View portal accounts and invite new Students or Staff. Invitation
          permissions remain inactive until the invited person completes
          onboarding.
        </p>
      </div>

      {params.notice && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {params.notice}
        </div>
      )}

      {params.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {params.error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Accounts
          </div>
          <div className="mt-1 text-2xl font-semibold text-gray-950">
            {profiles.length}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Students
          </div>
          <div className="mt-1 text-2xl font-semibold text-gray-950">
            {profiles.filter((profile) => profile.role === "student").length}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Pending invitations
          </div>
          <div className="mt-1 text-2xl font-semibold text-gray-950">
            {invitations.length}
          </div>
        </div>
      </div>

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-950">Accounts</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            Roles are shown for reference. Supervision and staff assignments are
            managed separately from account identity.
          </p>
        </div>

        <div className="space-y-3">
          {profiles.map((profile) => {
            const primary = isGlobalSupervisor(profile);
            const pending = pendingByUserId.get(profile.id);
            const detail =
              profile.role === "student"
                ? configuredStudentIds.has(profile.id)
                  ? "Supervision record configured"
                  : "Supervision record not yet configured"
                : primary
                  ? "Full portal administration"
                  : `${staffCaseCounts.get(profile.id) ?? 0} assigned supervision case${(staffCaseCounts.get(profile.id) ?? 0) === 1 ? "" : "s"}`;

            return (
              <article
                key={profile.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-950">
                      {profile.full_name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {profile.email ?? "No email address"}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">{detail}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                      {roleLabel(profile.role, primary)}
                    </span>
                    {pending && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                        Onboarding pending
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <div
          id="invite-user"
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2"
        >
          <h2 className="text-lg font-semibold text-gray-950">Invite user</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            Send an invitation to a new Student or Staff account.
          </p>

          <form action={createAccessInvitation} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="full_name"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Full name
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                minLength={2}
                autoComplete="name"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-gray-500"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-gray-500"
              />
            </div>

            <div>
              <label
                htmlFor="intended_role"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Portal role
              </label>
              <select
                id="intended_role"
                name="intended_role"
                required
                defaultValue="student"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-gray-500"
              >
                <option value="student">Student</option>
                <option value="staff">Staff</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
            >
              Send invitation
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-3">
          <h2 className="text-lg font-semibold text-gray-950">
            Pending invitations
          </h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            Retry delivery or cancel an invitation before onboarding is complete.
          </p>

          {invitations.length === 0 ? (
            <p className="mt-6 rounded-lg bg-gray-50 px-4 py-6 text-sm text-gray-500">
              There are no pending invitations.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {invitations.map((invitation) => (
                <article
                  key={invitation.id}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-gray-900">
                          {invitation.full_name}
                        </h3>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                          {invitation.intended_role === "staff" ? "Staff" : "Student"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {invitation.email}
                      </p>
                      <p className="mt-2 text-xs text-gray-500">
                        {invitationStatusLabel(invitation.status)} · {" "}
                        {formatPortalDateTime(
                          invitation.sent_at ?? invitation.created_at
                        )}
                      </p>
                      {invitation.last_error && (
                        <p className="mt-2 text-xs leading-5 text-red-700">
                          {invitation.last_error}
                        </p>
                      )}
                    </div>

                    <InvitationActions invitationId={invitation.id} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <p className="text-xs leading-5 text-gray-500">
        Signed in as {supervisor.full_name}. Access administration is restricted
        to the primary/global supervisor.
      </p>
    </div>
  );
}
