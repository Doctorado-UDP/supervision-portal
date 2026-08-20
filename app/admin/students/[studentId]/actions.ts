"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
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

const allowedMilestoneStatuses = [
  "planned",
  "in_progress",
  "completed",
  "cancelled",
];

function revalidateStudentPages(studentId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/timetable");
  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${studentId}`);
}


// ============================================================
// UPDATE STUDENT DETAILS
// ============================================================

export async function updateStudentDetails(
  _previousState: PlanningActionState,
  formData: FormData
): Promise<PlanningActionState> {
  await requireAdmin();

  const supabase = await createClient();

  const studentId = String(
    formData.get("student_id") ?? ""
  ).trim();

  const fullName = String(
    formData.get("full_name") ?? ""
  ).trim();

  const programme = String(
    formData.get("programme") ?? ""
  ).trim();

  const startDate = String(
    formData.get("start_date") ?? ""
  ).trim();

  const targetCompletionDate = String(
    formData.get("target_completion_date") ?? ""
  ).trim();

  const status = String(
    formData.get("status") ?? ""
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
      error: "Please complete all required fields.",
      success: null,
    };
  }

  if (!allowedStudentStatuses.includes(status)) {
    return {
      error: "The selected student status is invalid.",
      success: null,
    };
  }

  if (targetCompletionDate < startDate) {
    return {
      error:
        "The target completion date cannot be earlier than the start date.",
      success: null,
    };
  }

  const { data: student, error: studentLookupError } =
    await supabase
      .from("students")
      .select("id, user_id")
      .eq("id", studentId)
      .single();

  if (studentLookupError || !student) {
    return {
      error: "The student record could not be found.",
      success: null,
    };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", student.user_id);

  if (profileError) {
    console.error(profileError);

    return {
      error: "Unable to update the student's name.",
      success: null,
    };
  }

  const { error: studentError } = await supabase
    .from("students")
    .update({
      programme,
      start_date: startDate,
      target_completion_date: targetCompletionDate,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", studentId);

  if (studentError) {
    console.error(studentError);

    return {
      error: "Unable to update the student record.",
      success: null,
    };
  }

  revalidateStudentPages(studentId);

  return {
    error: null,
    success: "Student details updated.",
  };
}


// ============================================================
// CREATE MILESTONE
// ============================================================

export async function createMilestone(
  _previousState: PlanningActionState,
  formData: FormData
): Promise<PlanningActionState> {
  await requireAdmin();

  const supabase = await createClient();

  const studentId = String(
    formData.get("student_id") ?? ""
  ).trim();

  const title = String(
    formData.get("title") ?? ""
  ).trim();

  const description = String(
    formData.get("description") ?? ""
  ).trim();

  const targetDate = String(
    formData.get("target_date") ?? ""
  ).trim();

  const status = String(
    formData.get("status") ?? "planned"
  ).trim();

  if (!studentId || !title || !targetDate) {
    return {
      error: "Title and target date are required.",
      success: null,
    };
  }

  if (!allowedMilestoneStatuses.includes(status)) {
    return {
      error: "The selected milestone status is invalid.",
      success: null,
    };
  }

  const completedAt =
    status === "completed"
      ? new Date().toISOString().slice(0, 10)
      : null;

  const { error } = await supabase
    .from("milestones")
    .insert({
      student_id: studentId,
      title,
      description: description || null,
      target_date: targetDate,
      status,
      completed_at: completedAt,
    });

  if (error) {
    console.error(error);

    return {
      error: "Unable to create the milestone.",
      success: null,
    };
  }

  revalidateStudentPages(studentId);

  return {
    error: null,
    success: "Milestone added.",
  };
}


// ============================================================
// UPDATE MILESTONE STATUS
// ============================================================

export async function updateMilestoneStatus(
  formData: FormData
) {
  await requireAdmin();

  const supabase = await createClient();

  const milestoneId = String(
    formData.get("milestone_id") ?? ""
  ).trim();

  const studentId = String(
    formData.get("student_id") ?? ""
  ).trim();

  const status = String(
    formData.get("status") ?? ""
  ).trim();

  if (
    !milestoneId ||
    !studentId ||
    !allowedMilestoneStatuses.includes(status)
  ) {
    return;
  }

  const completedAt =
    status === "completed"
      ? new Date().toISOString().slice(0, 10)
      : null;

  const { error } = await supabase
    .from("milestones")
    .update({
      status,
      completed_at: completedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", milestoneId)
    .eq("student_id", studentId);

  if (error) {
    console.error(error);
    return;
  }

  revalidateStudentPages(studentId);
}


// ============================================================
// DELETE MILESTONE
// ============================================================

export async function deleteMilestone(
  formData: FormData
) {
  await requireAdmin();

  const supabase = await createClient();

  const milestoneId = String(
    formData.get("milestone_id") ?? ""
  ).trim();

  const studentId = String(
    formData.get("student_id") ?? ""
  ).trim();

  if (!milestoneId || !studentId) {
    return;
  }

  const { error } = await supabase
    .from("milestones")
    .delete()
    .eq("id", milestoneId)
    .eq("student_id", studentId);

  if (error) {
    console.error(error);
    return;
  }

  revalidateStudentPages(studentId);
}


// ============================================================
// CREATE MEETING
// ============================================================

export async function createMeeting(
  _previousState: PlanningActionState,
  formData: FormData
): Promise<PlanningActionState> {
  const admin = await requireAdmin();

  const supabase = await createClient();

  const studentId = String(
    formData.get("student_id") ?? ""
  ).trim();

  const scheduledAt = String(
    formData.get("scheduled_at") ?? ""
  ).trim();

  const notes = String(
    formData.get("notes") ?? ""
  ).trim();

  if (!studentId || !scheduledAt) {
    return {
      error: "Meeting date and time are required.",
      success: null,
    };
  }

  const parsedDate = new Date(scheduledAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return {
      error: "The meeting date is invalid.",
      success: null,
    };
  }

  const { error } = await supabase
    .from("meetings")
    .insert({
      student_id: studentId,
      scheduled_at: parsedDate.toISOString(),
      notes: notes || null,
      created_by: admin.id,
    });

  if (error) {
    console.error(error);

    return {
      error: "Unable to create the meeting.",
      success: null,
    };
  }

  revalidateStudentPages(studentId);

  return {
    error: null,
    success: "Meeting added.",
  };
}


// ============================================================
// DELETE MEETING
// ============================================================

export async function deleteMeeting(
  formData: FormData
) {
  await requireAdmin();

  const supabase = await createClient();

  const meetingId = String(
    formData.get("meeting_id") ?? ""
  ).trim();

  const studentId = String(
    formData.get("student_id") ?? ""
  ).trim();

  if (!meetingId || !studentId) {
    return;
  }

  const { error } = await supabase
    .from("meetings")
    .delete()
    .eq("id", meetingId)
    .eq("student_id", studentId);

  if (error) {
    console.error(error);
    return;
  }

  revalidateStudentPages(studentId);
}