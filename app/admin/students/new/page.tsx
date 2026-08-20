import Link from "next/link";

import StudentForm from "@/components/admin/student-form";
import { createClient } from "@/lib/supabase/server";

export default async function NewStudentPage() {
  const supabase = await createClient();

  const [profilesResult, studentsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("role", "student")
      .order("full_name", { ascending: true }),

    supabase
      .from("students")
      .select("user_id"),
  ]);

  if (profilesResult.error || studentsResult.error) {
    console.error(
      profilesResult.error,
      studentsResult.error
    );

    throw new Error(
      "Unable to load available student accounts."
    );
  }

  const registeredUserIds = new Set(
    (studentsResult.data ?? []).map(
      (student) => student.user_id
    )
  );

  const availableProfiles = (
    profilesResult.data ?? []
  ).filter(
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
          Add student
        </h1>

        <p className="mt-2 text-gray-600">
          Create a supervision record for an invited student account.
        </p>
      </div>

      {availableProfiles.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900">
            No available student accounts
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-600">
            Invite the student first in Supabase under
            Authentication → Users → Send invitation. After the
            account is created, refresh this page.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <StudentForm
            availableProfiles={availableProfiles}
          />
        </div>
      )}
    </div>
  );
}