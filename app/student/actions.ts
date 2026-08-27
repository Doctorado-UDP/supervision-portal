"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type StudentMilestoneActionState = {
  error: string | null;
  success: string | null;
};

const allowedMilestoneStatuses = [
  "planned",
  "in_progress",
  "completed",
  "cancelled",
];

async function getStudentCaseContext(caseId: string) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    return null;
  }

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (studentError || !student) {
    return null;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("case_members")
    .select("case_id")
    .eq("case_id", caseId)
    .eq("student_id", student.id)
    .maybeSingle();

  if (membershipError || !membership) {
    return null;
  }

  return { supabase };
}

function revalidateMilestonePages(caseId: string) {
  revalidatePath("/student");
  revalidatePath("/admin");
  revalidatePath("/admin/timetable");
  revalidatePath("/admin/supervisions");
  revalidatePath(`/admin/supervisions/${caseId}`);
}

export async function createStudentMilestone(
  _previousState: StudentMilestoneActionState,
  formData: FormData
): Promise<StudentMilestoneActionState> {
  const caseId = String(formData.get("case_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const targetDate = String(formData.get("target_date") ?? "").trim();
  const status = String(formData.get("status") ?? "planned").trim();

  if (!caseId || !title || !targetDate) {
    return { error: "Title and target date are required.", success: null };
  }

  if (!allowedMilestoneStatuses.includes(status)) {
    return { error: "The selected milestone status is invalid.", success: null };
  }

  const context = await getStudentCaseContext(caseId);

  if (!context) {
    return {
      error: "You do not have permission to add milestones to this supervision.",
      success: null,
    };
  }

  const completedAt =
    status === "completed" ? new Date().toISOString().slice(0, 10) : null;

  const { error } = await context.supabase.from("milestones").insert({
    case_id: caseId,
    student_id: null,
    title,
    description: description || null,
    target_date: targetDate,
    status,
    completed_at: completedAt,
  });

  if (error) {
    console.error(error);
    return { error: "Unable to create the milestone.", success: null };
  }

  revalidateMilestonePages(caseId);
  return { error: null, success: "Milestone added." };
}

export async function updateStudentMilestone(
  _previousState: StudentMilestoneActionState,
  formData: FormData
): Promise<StudentMilestoneActionState> {
  const caseId = String(formData.get("case_id") ?? "").trim();
  const milestoneId = String(formData.get("milestone_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const targetDate = String(formData.get("target_date") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!caseId || !milestoneId || !title || !targetDate) {
    return { error: "Title and target date are required.", success: null };
  }

  if (!allowedMilestoneStatuses.includes(status)) {
    return { error: "The selected milestone status is invalid.", success: null };
  }

  const context = await getStudentCaseContext(caseId);

  if (!context) {
    return {
      error: "You do not have permission to edit milestones in this supervision.",
      success: null,
    };
  }

  const completedAt =
    status === "completed" ? new Date().toISOString().slice(0, 10) : null;

  const { data, error } = await context.supabase
    .from("milestones")
    .update({
      title,
      description: description || null,
      target_date: targetDate,
      status,
      completed_at: completedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", milestoneId)
    .eq("case_id", caseId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error(error);
    return { error: "Unable to update the milestone.", success: null };
  }

  revalidateMilestonePages(caseId);
  return { error: null, success: "Milestone updated." };
}
