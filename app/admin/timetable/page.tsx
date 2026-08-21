import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

function formatMilestoneStatus(
  status: string
) {
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

function formatDate(
  value: string
) {
  const date =
    new Date(
      `${value}T00:00:00Z`
    );

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }
  ).format(date);
}

export default async function TimetablePage() {
  const supabase =
    await createClient();

  // ============================================================
  // LOAD CASE-LEVEL MILESTONES
  // ============================================================

  const [
    milestonesResult,
    casesResult,
    membershipsResult,
    studentsResult,
    profilesResult,
  ] = await Promise.all([
    supabase
      .from("milestones")
      .select(
        "id, case_id, title, description, target_date, status"
      )
      .order(
        "target_date",
        {
          ascending: true,
        }
      ),

    supabase
      .from(
        "supervision_cases"
      )
      .select(
        "id, title, case_type"
      ),

    supabase
      .from("case_members")
      .select(
        "case_id, student_id"
      ),

    supabase
      .from("students")
      .select(
        "id, user_id"
      ),

    supabase
      .from("profiles")
      .select(
        "id, full_name"
      ),
  ]);

  // ============================================================
  // CHECK ERRORS
  // ============================================================

  if (
    milestonesResult.error ||
    casesResult.error ||
    membershipsResult.error ||
    studentsResult.error ||
    profilesResult.error
  ) {
    console.error(
      milestonesResult.error,
      casesResult.error,
      membershipsResult.error,
      studentsResult.error,
      profilesResult.error
    );

    throw new Error(
      "Unable to load timetable."
    );
  }

  // ============================================================
  // DATA
  // ============================================================

  const milestones =
    milestonesResult.data ?? [];

  const supervisionCases =
    casesResult.data ?? [];

  const memberships =
    membershipsResult.data ?? [];

  const students =
    studentsResult.data ?? [];

  const profiles =
    profilesResult.data ?? [];

  // ============================================================
  // LOOKUP MAPS
  // ============================================================

  const caseMap =
    new Map(
      supervisionCases.map(
        (
          supervisionCase
        ) => [
          supervisionCase.id,
          supervisionCase,
        ]
      )
    );

  const studentMap =
    new Map(
      students.map(
        (student) => [
          student.id,
          student,
        ]
      )
    );

  const profileMap =
    new Map(
      profiles.map(
        (profile) => [
          profile.id,
          profile,
        ]
      )
    );

  const membersByCase =
    new Map<
      string,
      string[]
    >();

  for (
    const membership of memberships
  ) {
    const existing =
      membersByCase.get(
        membership.case_id
      ) ?? [];

    existing.push(
      membership.student_id
    );

    membersByCase.set(
      membership.case_id,
      existing
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-8">
      {/* PAGE HEADER */}

      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-950">
          Timetable
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          Upcoming and completed
          milestones across all
          supervision cases.
        </p>
      </div>

      {/* MILESTONES */}

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {milestones.length ===
        0 ? (
          <div className="p-6">
            <p className="rounded-lg bg-gray-50 px-4 py-6 text-sm text-gray-500">
              No milestones have
              been added.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {milestones.map(
              (milestone) => {
                const supervisionCase =
                  caseMap.get(
                    milestone.case_id
                  );

                const memberIds =
                  membersByCase.get(
                    milestone.case_id
                  ) ?? [];

                const members =
                  memberIds.flatMap(
                    (
                      studentId
                    ) => {
                      const student =
                        studentMap.get(
                          studentId
                        );

                      if (
                        !student
                      ) {
                        return [];
                      }

                      const profile =
                        profileMap.get(
                          student.user_id
                        );

                      if (
                        !profile
                      ) {
                        return [];
                      }

                      return [
                        {
                          studentId:
                            student.id,
                          fullName:
                            profile.full_name,
                        },
                      ];
                    }
                  );

                return (
                  <article
                    key={
                      milestone.id
                    }
                    className="p-6"
                  >
                    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                      {/* MILESTONE */}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-semibold text-gray-950">
                            {
                              milestone.title
                            }
                          </h2>

                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                            {formatMilestoneStatus(
                              milestone.status
                            )}
                          </span>
                        </div>

                        {milestone.description && (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                            {
                              milestone.description
                            }
                          </p>
                        )}

                        {/* SUPERVISION CASE */}

                        <div className="mt-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Supervision
                          </p>

                          <p className="mt-1 text-sm font-medium text-gray-900">
                            {supervisionCase?.title ??
                              "Unknown supervision"}
                          </p>

                          {supervisionCase && (
                            <p className="mt-1 text-xs text-gray-500">
                              {supervisionCase.case_type ===
                              "group"
                                ? "Group supervision"
                                : "Individual supervision"}
                            </p>
                          )}
                        </div>

                        {/* STUDENTS */}

                        <div className="mt-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            {members.length ===
                            1
                              ? "Student"
                              : "Students"}
                          </p>

                          {members.length ===
                          0 ? (
                            <p className="mt-1 text-sm text-gray-500">
                              No students
                              assigned.
                            </p>
                          ) : (
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                              {members.map(
                                (
                                  member,
                                  index
                                ) => (
                                  <span
                                    key={
                                      member.studentId
                                    }
                                    className="text-sm"
                                  >
                                    <Link
                                      href={`/admin/students/${member.studentId}`}
                                      className="font-medium text-gray-700 hover:text-gray-950"
                                    >
                                      {
                                        member.fullName
                                      }
                                    </Link>

                                    {index <
                                      members.length -
                                        1 && (
                                      <span className="text-gray-400">
                                        {" "}
                                        ·
                                      </span>
                                    )}
                                  </span>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* TARGET DATE */}

                      <div className="shrink-0 lg:text-right">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Target date
                        </p>

                        <p className="mt-1 font-medium text-gray-900">
                          {formatDate(
                            milestone.target_date
                          )}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
    </div>
  );
}