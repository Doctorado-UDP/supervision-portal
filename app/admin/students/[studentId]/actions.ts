"use server";

import { revalidatePath } from "next/cache";

import { requireGlobalSupervisor } from "@/lib/auth/require-admin";

import { createClient } from "@/lib/supabase/server";

export type PlanningActionState = {
  error: string | null;
  success: string | null;
};

const allowedStudentStatuses = [
  "active",
  "on_track",
  "attention",
  "completed",
  "inactive",
];

function revalidateStudentPages(
  studentId: string
) {
  revalidatePath("/admin");

  revalidatePath(
    "/admin/timetable"
  );

  revalidatePath(
    "/admin/students"
  );

  revalidatePath(
    `/admin/students/${studentId}`
  );

  revalidatePath(
    "/admin/supervisions"
  );

  revalidatePath(
    "/student"
  );
}

// ============================================================
// UPDATE STUDENT DETAILS
// ============================================================
//
// SUPERVISOR ONLY.
//
// Assigned staff may read students belonging to their assigned
// cases, but may not change the student's administrative record.
// ============================================================

export async function updateStudentDetails(
  _previousState: PlanningActionState,
  formData: FormData
): Promise<PlanningActionState> {
  await requireGlobalSupervisor(
    "/admin/students"
  );

  const supabase =
    await createClient();

  const studentId =
    String(
      formData.get(
        "student_id"
      ) ?? ""
    ).trim();

  const fullName =
    String(
      formData.get(
        "full_name"
      ) ?? ""
    ).trim();

  const programme =
    String(
      formData.get(
        "programme"
      ) ?? ""
    ).trim();

  const startDate =
    String(
      formData.get(
        "start_date"
      ) ?? ""
    ).trim();

  const targetCompletionDate =
    String(
      formData.get(
        "target_completion_date"
      ) ?? ""
    ).trim();

  const status =
    String(
      formData.get(
        "status"
      ) ?? ""
    ).trim();

  if (
    !studentId ||
    !fullName ||
    !programme ||
    !startDate ||
    !targetCompletionDate ||
    !status
  ) {
    return {
      error:
        "Please complete all required fields.",
      success: null,
    };
  }

  if (
    !allowedStudentStatuses.includes(
      status
    )
  ) {
    return {
      error:
        "The selected student status is invalid.",
      success: null,
    };
  }

  if (
    targetCompletionDate <
    startDate
  ) {
    return {
      error:
        "The target completion date cannot be earlier than the start date.",
      success: null,
    };
  }

  const {
    data: student,
    error: studentLookupError,
  } = await supabase
    .from("students")
    .select(
      "id, user_id"
    )
    .eq(
      "id",
      studentId
    )
    .single();

  if (
    studentLookupError ||
    !student
  ) {
    return {
      error:
        "The student record could not be found.",
      success: null,
    };
  }

  const {
    error: profileError,
  } = await supabase
    .from("profiles")
    .update({
      full_name:
        fullName,

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      student.user_id
    );

  if (
    profileError
  ) {
    console.error(
      profileError
    );

    return {
      error:
        "Unable to update the student's name.",
      success: null,
    };
  }

  const {
    error: studentError,
  } = await supabase
    .from("students")
    .update({
      programme,

      start_date:
        startDate,

      target_completion_date:
        targetCompletionDate,

      status,

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      studentId
    );

  if (
    studentError
  ) {
    console.error(
      studentError
    );

    return {
      error:
        "Unable to update the student record.",
      success: null,
    };
  }

  revalidateStudentPages(
    studentId
  );

  return {
    error: null,
    success:
      "Student details updated.",
  };
}
