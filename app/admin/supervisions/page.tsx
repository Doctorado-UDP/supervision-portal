import Link from "next/link";

import SupervisionCaseForm from "@/components/admin/supervision-case-form";

import { createClient } from "@/lib/supabase/server";

const SUPERVISOR_EMAIL =
  "bastian.gonzalez.b@mail.udp.cl";

function formatStatus(
  status: string
) {
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

export default async function AdminSupervisionsPage() {
  const supabase =
    await createClient();

  // ============================================================
  // LOAD CASE DATA
  // ============================================================

  const [
    casesResult,
    membersResult,
    studentsResult,
    profilesResult,
    staffResult,
  ] = await Promise.all([
    supabase
      .from(
        "supervision_cases"
      )
      .select(
        "id, title, case_type, programme, start_date, target_completion_date, status, updated_at"
      )
      .order(
        "updated_at",
        {
          ascending: false,
        }
      ),

    supabase
      .from(
        "case_members"
      )
      .select(
        "case_id, student_id"
      ),

    supabase
      .from("students")
      .select(
        "id, user_id, programme, start_date, target_completion_date, status"
      ),

    supabase
      .from("profiles")
      .select(
        "id, full_name, email, role"
      ),

    supabase
      .from("case_staff")
      .select(
        "case_id, staff_id, staff_role"
      ),
  ]);

  // ============================================================
  // ERRORS
  // ============================================================

  if (
    casesResult.error ||
    membersResult.error ||
    studentsResult.error ||
    profilesResult.error ||
    staffResult.error
  ) {
    console.error(
      casesResult.error,
      membersResult.error,
      studentsResult.error,
      profilesResult.error,
      staffResult.error
    );

    throw new Error(
      "Unable to load supervision cases."
    );
  }

  const cases =
    casesResult.data ?? [];

  const memberships =
    membersResult.data ?? [];

  const students =
    studentsResult.data ?? [];

  const profiles =
    profilesResult.data ?? [];

  const caseStaff =
    staffResult.data ?? [];

  // ============================================================
  // LOOKUP MAPS
  // ============================================================

  const profileMap =
    new Map(
      profiles.map(
        (profile) => [
          profile.id,
          profile,
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

  const membersByCase =
    new Map<
      string,
      string[]
    >();

  const caseByStudent =
    new Map<
      string,
      string
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

    caseByStudent.set(
      membership.student_id,
      membership.case_id
    );
  }

  const staffByCase =
    new Map<
      string,
      typeof caseStaff
    >();

  for (
    const staffMembership of caseStaff
  ) {
    const existing =
      staffByCase.get(
        staffMembership.case_id
      ) ?? [];

    existing.push(
      staffMembership
    );

    staffByCase.set(
      staffMembership.case_id,
      existing
    );
  }

  // ============================================================
  // PRIMARY SUPERVISOR
  // ============================================================

  const supervisor =
    profiles.find(
      (profile) =>
        profile.role ===
          "admin" &&
        profile.email?.toLowerCase() ===
          SUPERVISOR_EMAIL.toLowerCase()
    );

  if (!supervisor) {
    throw new Error(
      "Primary supervisor account could not be found."
    );
  }

  // ============================================================
  // AVAILABLE STUDENTS
  // ============================================================
  //
  // Only students currently in an individual case are available
  // for the configuration/merge form.
  // ============================================================

  const availableStudents =
    students
      .flatMap(
        (student) => {
          const caseId =
            caseByStudent.get(
              student.id
            );

          if (!caseId) {
            return [];
          }

          const caseMembers =
            membersByCase.get(
              caseId
            ) ?? [];

          if (
            caseMembers.length !==
            1
          ) {
            return [];
          }

          const profile =
            profileMap.get(
              student.user_id
            );

          if (!profile) {
            return [];
          }

          return [
            {
              id:
                student.id,
              fullName:
                profile.full_name,
              email:
                profile.email,
              programme:
                student.programme,
            },
          ];
        }
      )
      .sort(
        (a, b) =>
          a.fullName.localeCompare(
            b.fullName
          )
      );

  // ============================================================
  // ADDITIONAL STAFF OPTIONS
  // ============================================================

  const staffOptions =
    profiles
      .filter(
        (profile) =>
          profile.role ===
            "admin" &&
          profile.email?.toLowerCase() !==
            SUPERVISOR_EMAIL.toLowerCase()
      )
      .map(
        (profile) => ({
          id:
            profile.id,
          fullName:
            profile.full_name,
          email:
            profile.email,
        })
      )
      .sort(
        (a, b) =>
          a.fullName.localeCompare(
            b.fullName
          )
      );

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-8">
      {/* PAGE HEADER */}

      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-950">
          Supervisions
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          Manage individual and
          group thesis supervision
          cases, student membership,
          and associated staff.
        </p>
      </div>

      <section className="grid gap-8 xl:grid-cols-3">
        {/* CASE LIST */}

        <div className="space-y-5 xl:col-span-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-950">
              Current
              supervisions
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {cases.length}{" "}
              {cases.length === 1
                ? "case"
                : "cases"}
            </p>
          </div>

          {cases.length ===
          0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">
                No supervision
                cases have been
                configured.
              </p>
            </div>
          ) : (
            cases.map(
              (supervisionCase) => {
                const memberIds =
                  membersByCase.get(
                    supervisionCase.id
                  ) ?? [];

                const staff =
                  staffByCase.get(
                    supervisionCase.id
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
                          id:
                            student.id,
                          fullName:
                            profile.full_name,
                          email:
                            profile.email,
                        },
                      ];
                    }
                  );

                const staffMembers =
                  staff.flatMap(
                    (
                      staffRelation
                    ) => {
                      const profile =
                        profileMap.get(
                          staffRelation.staff_id
                        );

                      if (
                        !profile
                      ) {
                        return [];
                      }

                      return [
                        {
                          id:
                            profile.id,
                          fullName:
                            profile.full_name,
                          email:
                            profile.email,
                          role:
                            staffRelation.staff_role,
                        },
                      ];
                    }
                  );

                return (
                  <article
                    key={
                      supervisionCase.id
                    }
                    className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
                  >
                    {/* CASE HEADER */}

                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-950">
                            {
                              supervisionCase.title
                            }
                          </h3>

                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                            {supervisionCase.case_type ===
                            "group"
                              ? "Group"
                              : "Individual"}
                          </span>

                          <span className="rounded-full border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600">
                            {formatStatus(
                              supervisionCase.status
                            )}
                          </span>
                        </div>

                        {supervisionCase.programme && (
                          <p className="mt-2 text-sm text-gray-600">
                            {
                              supervisionCase.programme
                            }
                          </p>
                        )}

                        <p className="mt-2 text-xs text-gray-500">
                          {
                            memberIds.length
                          }{" "}
                          {memberIds.length ===
                          1
                            ? "student"
                            : "students"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/admin/supervisions/${supervisionCase.id}`}
                          className="h-fit rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
                        >
                          Open workspace
                        </Link>
                        
                        <Link
                          href={`/admin/supervisions/${supervisionCase.id}/edit`}
                          className="h-fit rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Edit configuration
                        </Link>
                      </div>
                    </div>

                    {/* STUDENTS */}

                    <div className="mt-6 border-t border-gray-100 pt-5">
                      <h4 className="text-sm font-semibold text-gray-900">
                        Students
                      </h4>

                      {members.length ===
                      0 ? (
                        <p className="mt-2 text-sm text-gray-500">
                          No students
                          assigned.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {members.map(
                            (
                              member
                            ) => (
                              <div
                                key={
                                  member.id
                                }
                                className="rounded-md bg-gray-50 px-4 py-3"
                              >
                                <p className="text-sm font-medium text-gray-900">
                                  {
                                    member.fullName
                                  }
                                </p>

                                {member.email && (
                                  <p className="mt-1 text-xs text-gray-500">
                                    {
                                      member.email
                                    }
                                  </p>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>

                    {/* STAFF */}

                    <div className="mt-5 border-t border-gray-100 pt-5">
                      <h4 className="text-sm font-semibold text-gray-900">
                        Supervision
                        team
                      </h4>

                      {staffMembers.length ===
                      0 ? (
                        <p className="mt-2 text-sm text-gray-500">
                          No staff
                          assigned.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {staffMembers.map(
                            (
                              member
                            ) => (
                              <div
                                key={
                                  member.id
                                }
                                className="flex flex-col justify-between gap-1 rounded-md bg-gray-50 px-4 py-3 sm:flex-row sm:items-center"
                              >
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {
                                      member.fullName
                                    }
                                  </p>

                                  {member.email && (
                                    <p className="mt-1 text-xs text-gray-500">
                                      {
                                        member.email
                                      }
                                    </p>
                                  )}
                                </div>

                                <span className="text-xs font-medium text-gray-500">
                                  {member.role ===
                                  "supervisor"
                                    ? "Supervisor"
                                    : "Staff"}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>

                    {/* DATES */}

                    <div className="mt-5 grid gap-4 border-t border-gray-100 pt-5 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Start date
                        </p>

                        <p className="mt-1 text-sm text-gray-900">
                          {supervisionCase.start_date ??
                            "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Target
                          completion
                        </p>

                        <p className="mt-1 text-sm text-gray-900">
                          {supervisionCase.target_completion_date ??
                            "—"}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              }
            )
          )}
        </div>

        {/* CONFIGURATION FORM */}

        <aside>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm xl:sticky xl:top-24">
            <h2 className="text-lg font-semibold text-gray-950">
              Configure
              supervision
            </h2>

            <p className="mt-1 text-sm leading-6 text-gray-500">
              Configure an
              individual case or
              combine two to three
              individual student
              cases into a group
              supervision.
            </p>

            <div className="mt-6">
              <SupervisionCaseForm
                students={
                  availableStudents
                }
                staff={
                  staffOptions
                }
                supervisorName={
                  supervisor.full_name
                }
              />
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}