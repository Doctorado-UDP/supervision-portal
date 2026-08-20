import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

function formatStatus(status: string) {
  switch (status) {
    case "in_progress":
      return "In progress";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return "Planned";
  }
}

export default async function TimetablePage() {
  const supabase = await createClient();

  const [
    milestonesResult,
    studentsResult,
    profilesResult,
  ] = await Promise.all([
    supabase
      .from("milestones")
      .select(
        "id, student_id, title, target_date, status"
      )
      .order("target_date", {
        ascending: true,
      }),

    supabase
      .from("students")
      .select("id, user_id"),

    supabase
      .from("profiles")
      .select("id, full_name"),
  ]);

  if (
    milestonesResult.error ||
    studentsResult.error ||
    profilesResult.error
  ) {
    console.error(
      milestonesResult.error,
      studentsResult.error,
      profilesResult.error
    );

    throw new Error(
      "Unable to load the timetable."
    );
  }

  const students =
    studentsResult.data ?? [];

  const profiles =
    profilesResult.data ?? [];

  const milestones =
    milestonesResult.data ?? [];

  const studentUserMap = new Map(
    students.map((student) => [
      student.id,
      student.user_id,
    ])
  );

  const profileMap = new Map(
    profiles.map((profile) => [
      profile.id,
      profile.full_name,
    ])
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-950">
          Timetable
        </h1>

        <p className="mt-2 text-gray-600">
          Milestones and deadlines across all supervised students.
        </p>
      </div>

      {milestones.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h2 className="font-semibold text-gray-900">
            No milestones yet
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Add milestones from an individual student workspace.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Date
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Student
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Milestone
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>

                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {milestones.map(
                  (milestone) => {
                    const userId =
                      studentUserMap.get(
                        milestone.student_id
                      );

                    const studentName =
                      userId
                        ? profileMap.get(
                            userId
                          )
                        : undefined;

                    return (
                      <tr
                        key={milestone.id}
                      >
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                          {
                            milestone.target_date
                          }
                        </td>

                        <td className="px-6 py-4 font-medium text-gray-900">
                          {studentName ??
                            "Unknown student"}
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-700">
                          {milestone.title}
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                            {formatStatus(
                              milestone.status
                            )}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/admin/students/${milestone.student_id}`}
                            className="text-sm font-medium text-gray-700 hover:text-gray-950"
                          >
                            Open student
                          </Link>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}