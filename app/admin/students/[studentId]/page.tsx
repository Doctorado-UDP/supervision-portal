import Link from "next/link";
import { notFound } from "next/navigation";

import StudentDetailsForm from "@/components/admin/student-details-form";

import {
  isGlobalSupervisor,
  requireAdmin,
} from "@/lib/auth/require-admin";

import { createClient } from "@/lib/supabase/server";

type StudentPageProps = {
  params: Promise<{
    studentId: string;
  }>;
};

function formatStudentStatus(
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

export default async function StudentPage({
  params,
}: StudentPageProps) {
  const {
    studentId,
  } = await params;

  const admin =
    await requireAdmin();

  const canEditStudent =
    isGlobalSupervisor(
      admin
    );

  const supabase =
    await createClient();

  // ============================================================
  // STUDENT
  //
  // RLS means an assigned staff member can retrieve this record
  // only if the student belongs to an assigned case.
  // ============================================================

  const {
    data: student,
    error: studentError,
  } = await supabase
    .from("students")
    .select(
      "id, user_id, programme, start_date, target_completion_date, status"
    )
    .eq(
      "id",
      studentId
    )
    .maybeSingle();

  if (
    studentError
  ) {
    console.error(
      studentError
    );

    throw new Error(
      "Unable to load student record."
    );
  }

  if (
    !student
  ) {
    notFound();
  }

  // ============================================================
  // PROFILE + CASE MEMBERSHIP
  // ============================================================

  const [
    profileResult,
    membershipResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "full_name, email"
      )
      .eq(
        "id",
        student.user_id
      )
      .single(),

    supabase
      .from("case_members")
      .select(
        "case_id"
      )
      .eq(
        "student_id",
        student.id
      )
      .single(),
  ]);

  if (
    profileResult.error ||
    !profileResult.data
  ) {
    console.error(
      profileResult.error
    );

    throw new Error(
      "Unable to load the student's profile."
    );
  }

  if (
    membershipResult.error ||
    !membershipResult.data
  ) {
    console.error(
      membershipResult.error
    );

    throw new Error(
      "Unable to load the student's supervision."
    );
  }

  const profile =
    profileResult.data;

  const caseId =
    membershipResult.data.case_id;

  // ============================================================
  // SUPERVISION CASE
  // ============================================================

  const {
    data: supervisionCase,
    error: caseError,
  } = await supabase
    .from("supervision_cases")
    .select(
      "id, title, case_type, status"
    )
    .eq(
      "id",
      caseId
    )
    .single();

  if (
    caseError ||
    !supervisionCase
  ) {
    console.error(
      caseError
    );

    throw new Error(
      "Unable to load the supervision case."
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/students"
          className="text-sm font-medium text-gray-600 hover:text-gray-950"
        >
          ← Students
        </Link>

        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-950">
              {
                profile.full_name
              }
            </h1>

            <p className="mt-2 text-gray-600">
              {
                student.programme
              }
            </p>

            <p className="mt-1 text-sm text-gray-500">
              {
                profile.email
              }
            </p>
          </div>

          <span className="inline-flex w-fit rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700">
            {formatStudentStatus(
              student.status
            )}
          </span>
        </div>
      </div>

      {/* STUDENT DETAILS */}

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-950">
              Student details
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Individual student
              information and
              programme record.
            </p>
          </div>

          {!canEditStudent && (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
              Read only
            </span>
          )}
        </div>

        {canEditStudent ? (
          <div className="mt-6 max-w-3xl">
            <StudentDetailsForm
              student={
                student
              }
              profile={
                profile
              }
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Programme
              </p>

              <p className="mt-1 text-sm text-gray-900">
                {student.programme ??
                  "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Start date
              </p>

              <p className="mt-1 text-sm text-gray-900">
                {student.start_date ??
                  "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Target completion
              </p>

              <p className="mt-1 text-sm text-gray-900">
                {student.target_completion_date ??
                  "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Status
              </p>

              <p className="mt-1 text-sm text-gray-900">
                {formatStudentStatus(
                  student.status
                )}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* SUPERVISION */}

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-gray-500">
              Supervision
            </p>

            <h2 className="mt-1 text-xl font-semibold text-gray-950">
              {
                supervisionCase.title
              }
            </h2>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                {supervisionCase.case_type ===
                "group"
                  ? "Group supervision"
                  : "Individual supervision"}
              </span>

              <span className="rounded-full border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600">
                {formatStudentStatus(
                  supervisionCase.status
                )}
              </span>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
              Submissions, feedback,
              milestones and meetings
              are managed in the
              supervision workspace.
            </p>
          </div>

          <Link
            href={`/admin/supervisions/${caseId}`}
            className="h-fit rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Open supervision
          </Link>
        </div>
      </section>
    </div>
  );
}