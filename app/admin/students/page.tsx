import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

function formatStatus(status: string) {
  switch (status) {
    case "on_track":
      return "On track";
    case "attention":
      return "Needs attention";
    case "completed":
      return "Completed";
    case "inactive":
      return "Inactive";
    default:
      return "Active";
  }
}

export default async function StudentsPage() {
  const supabase = await createClient();

  const [studentsResult, profilesResult] = await Promise.all([
    supabase
      .from("students")
      .select(
        "id, user_id, programme, start_date, target_completion_date, status"
      )
      .order("created_at", { ascending: true }),

    supabase
      .from("profiles")
      .select("id, full_name, email"),
  ]);

  if (studentsResult.error || profilesResult.error) {
    console.error(
      studentsResult.error,
      profilesResult.error
    );

    throw new Error("Unable to load students.");
  }

  const profileMap = new Map(
    (profilesResult.data ?? []).map((profile) => [
      profile.id,
      profile,
    ])
  );

  const students = studentsResult.data ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-950">
            Students
          </h1>

          <p className="mt-2 text-gray-600">
            Manage supervised students and their progress.
          </p>
        </div>

        <Link
          href="/admin/students/new"
          className="inline-flex justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Add student
        </Link>
      </div>

      {students.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h2 className="font-semibold text-gray-900">
            No students yet
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Add your first student to begin tracking supervision.
          </p>

          <Link
            href="/admin/students/new"
            className="mt-5 inline-flex rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Add student
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Student
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Programme
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Target completion
                  </th>

                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {students.map((student) => {
                  const profile = profileMap.get(
                    student.user_id
                  );

                  return (
                    <tr key={student.id}>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">
                          {profile?.full_name ??
                            "Unknown student"}
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          {profile?.email ?? "No email"}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-700">
                        {student.programme ?? "—"}
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                          {formatStatus(student.status)}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-700">
                        {student.target_completion_date ??
                          "—"}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/students/${student.id}`}
                          className="text-sm font-medium text-gray-700 hover:text-gray-950"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}