import Link from "next/link";

import StudentForm from "@/components/admin/student-form";
import { requireGlobalSupervisor } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

type NewStudentPageProps = {
  searchParams: Promise<{
    userId?: string;
  }>;
};

export default async function NewStudentPage({
  searchParams,
}: NewStudentPageProps) {
  await requireGlobalSupervisor("/admin/students");
  const params = await searchParams;
  const supabase = await createClient();

  const [profilesResult, studentsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("role", "student")
      .order("full_name", { ascending: true }),
    supabase.from("students").select("user_id"),
  ]);

  if (profilesResult.error || studentsResult.error) {
    console.error(profilesResult.error, studentsResult.error);
    throw new Error("Unable to load invited Student accounts.");
  }

  const registeredUserIds = new Set(
    (studentsResult.data ?? []).map((student) => student.user_id)
  );

  const availableProfiles = (profilesResult.data ?? []).filter(
    (profile) => !registeredUserIds.has(profile.id)
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link
          href="/admin/students"
          className="text-sm font-medium text-gray-600 hover:text-gray-950"
        >
          ← Students
        </Link>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-950">
          Configure student
        </h1>

        <p className="mt-2 text-gray-600">
          Add supervision details to an invited Student account. This creates the
          student&apos;s supervision case and primary supervisor assignment.
        </p>
      </div>

      {availableProfiles.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900">
            No Student accounts require setup
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-600">
            Invite a new Student from Access management. The invited account will
            appear in Students immediately and can then be configured here.
          </p>

          <Link
            href="/admin/access#invite-user"
            className="mt-4 inline-flex rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Invite student
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <StudentForm
            availableProfiles={availableProfiles}
            defaultUserId={params.userId}
          />
        </div>
      )}
    </div>
  );
}
