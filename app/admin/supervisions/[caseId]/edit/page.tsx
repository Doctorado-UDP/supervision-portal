import Link from "next/link";
import { notFound } from "next/navigation";

import SupervisionCaseForm from "@/components/admin/supervision-case-form";

import { createClient } from "@/lib/supabase/server";

const SUPERVISOR_EMAIL =
  "bastian.gonzalez.b@mail.udp.cl";

type EditSupervisionPageProps = {
  params: Promise<{
    caseId: string;
  }>;
};

export default async function EditSupervisionPage({
  params,
}: EditSupervisionPageProps) {
  const {
    caseId,
  } = await params;

  const supabase =
    await createClient();

  // ============================================================
  // CASE
  // ============================================================

  const {
    data: supervisionCase,
    error: caseError,
  } = await supabase
    .from("supervision_cases")
    .select(
      "id, title, case_type, programme, start_date, target_completion_date, status"
    )
    .eq(
      "id",
      caseId
    )
    .maybeSingle();

  if (caseError) {
    console.error(
      caseError
    );

    throw new Error(
      "Unable to load supervision case."
    );
  }

  if (!supervisionCase) {
    notFound();
  }

  // ============================================================
  // RELATED DATA
  // ============================================================

  const [
    membershipsResult,
    studentsResult,
    profilesResult,
    staffResult,
  ] = await Promise.all([
    supabase
      .from("case_members")
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

  if (
    membershipsResult.error ||
    studentsResult.error ||
    profilesResult.error ||
    staffResult.error
  ) {
    console.error(
      membershipsResult.error,
      studentsResult.error,
      profilesResult.error,
      staffResult.error
    );

    throw new Error(
      "Unable to load supervision configuration."
    );
  }

  const memberships =
    membershipsResult.data ?? [];

  const students =
    studentsResult.data ?? [];

  const profiles =
    profilesResult.data ?? [];

  const caseStaff =
    staffResult.data ?? [];

  // ============================================================
  // LOOKUPS
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

  const caseByStudent =
    new Map<
      string,
      string
    >();

  const memberCountByCase =
    new Map<
      string,
      number
    >();

  for (
    const membership of memberships
  ) {
    caseByStudent.set(
      membership.student_id,
      membership.case_id
    );

    memberCountByCase.set(
      membership.case_id,
      (
        memberCountByCase.get(
          membership.case_id
        ) ?? 0
      ) + 1
    );
  }

  // ============================================================
  // CURRENT MEMBERS
  // ============================================================

  const currentStudentIds =
    memberships
      .filter(
        (membership) =>
          membership.case_id ===
          caseId
      )
      .map(
        (membership) =>
          membership.student_id
      );

  // ============================================================
  // AVAILABLE STUDENTS
  // ============================================================
  //
  // Include:
  // 1. everyone already in this case
  // 2. students in another individual case
  //
  // Exclude:
  // students belonging to some other group.
  // ============================================================

  const availableStudents =
    students
      .flatMap(
        (student) => {
          const studentCaseId =
            caseByStudent.get(
              student.id
            );

          if (
            !studentCaseId
          ) {
            return [];
          }

          const isCurrentMember =
            studentCaseId ===
            caseId;

          const memberCount =
            memberCountByCase.get(
              studentCaseId
            ) ?? 0;

          const isIndividual =
            memberCount === 1;

          if (
            !isCurrentMember &&
            !isIndividual
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
  // SUPERVISOR
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
  // STAFF OPTIONS
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

  const selectedStaffIds =
    caseStaff
      .filter(
        (relation) =>
          relation.case_id ===
            caseId &&
          relation.staff_role ===
            "staff"
      )
      .map(
        (relation) =>
          relation.staff_id
      );

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <Link
          href="/admin/supervisions"
          className="text-sm font-medium text-gray-600 hover:text-gray-950"
        >
          ← Back to supervisions
        </Link>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-950">
          Edit supervision
        </h1>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          Update the supervision
          case, student membership,
          and associated staff.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <SupervisionCaseForm
          mode="edit"
          caseId={
            supervisionCase.id
          }
          students={
            availableStudents
          }
          staff={
            staffOptions
          }
          supervisorName={
            supervisor.full_name
          }
          initialValues={{
            title:
              supervisionCase.title,

            programme:
              supervisionCase.programme ??
              "",

            startDate:
              supervisionCase.start_date ??
              "",

            targetCompletionDate:
              supervisionCase.target_completion_date ??
              "",

            status:
              supervisionCase.status,

            studentIds:
              currentStudentIds,

            staffIds:
              selectedStaffIds,
          }}
        />
      </div>
    </div>
  );
}