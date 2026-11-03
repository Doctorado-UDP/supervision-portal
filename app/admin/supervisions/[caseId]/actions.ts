"use server";

import { revalidatePath } from "next/cache";

import {
  requireAdmin,
  requireGlobalSupervisor,
} from "@/lib/auth/require-admin";
import {
  getPortalDateKey,
  isMeetingTimeZone,
  zonedWallTimeToUtc,
} from "@/lib/datetime/format";
import { createClient } from "@/lib/supabase/server";

export type PlanningActionState = {
  error: string | null;
  success: string | null;
};

export type FeedbackActionState = {
  error: string | null;
  success: string | null;
};

export type SubmissionActionState = {
  error: string | null;
  success: string | null;
};

const allowedMilestoneStatuses = [
  "planned",
  "in_progress",
  "completed",
  "cancelled",
];

// completed_at is the Santiago date on which a milestone became completed. It
// is kept when an already completed milestone is edited.
function getCompletedAt(
  status: string,
  previous?: { status: string; completed_at: string | null } | null
) {
  if (status !== "completed") {
    return null;
  }

  if (previous?.status === "completed" && previous.completed_at) {
    return previous.completed_at;
  }

  return getPortalDateKey();
}

// Reads a datetime-local value and its zone from a meeting or submission form.
function readZonedDateTime(
  formData: FormData,
  valueField: string
) {
  const local = String(formData.get(valueField) ?? "").trim();
  const timeZone = String(formData.get("time_zone") ?? "").trim();

  if (!local) {
    return { date: null, error: "missing" as const };
  }

  if (!isMeetingTimeZone(timeZone)) {
    return { date: null, error: "zone" as const };
  }

  const date = zonedWallTimeToUtc(local, timeZone);
  return date
    ? { date, error: null }
    : { date: null, error: "invalid" as const };
}

function revalidateSupervisionPages(
  caseId: string
) {
  revalidatePath("/admin");
  revalidatePath("/admin/timetable");
  revalidatePath("/admin/supervisions");
  revalidatePath(
    `/admin/supervisions/${caseId}`
  );
  revalidatePath("/student");
}

export async function createFeedback(
  _previousState: FeedbackActionState,
  formData: FormData
): Promise<FeedbackActionState> {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const caseId = String(formData.get("case_id") ?? "").trim();
  const submissionId = String(formData.get("submission_id") ?? "").trim();
  const feedbackText = String(formData.get("feedback_text") ?? "").trim();

  if (!caseId || !submissionId || !feedbackText) {
    return { error: "Feedback cannot be empty.", success: null };
  }

  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .select("id")
    .eq("id", submissionId)
    .eq("case_id", caseId)
    .maybeSingle();

  if (submissionError || !submission) {
    console.error(submissionError);
    return {
      error: "The submission could not be found in this supervision.",
      success: null,
    };
  }

  const { error } = await supabase.from("feedback").insert({
    submission_id: submissionId,
    author_id: admin.id,
    feedback_text: feedbackText,
  });

  if (error) {
    console.error(error);
    return { error: "Unable to post feedback.", success: null };
  }

  revalidateSupervisionPages(caseId);
  return { error: null, success: "Feedback posted." };
}

export async function updateFeedback(
  _previousState: FeedbackActionState,
  formData: FormData
): Promise<FeedbackActionState> {
  await requireAdmin();
  const supabase = await createClient();
  const caseId = String(formData.get("case_id") ?? "").trim();
  const feedbackId = String(formData.get("feedback_id") ?? "").trim();
  const feedbackText = String(formData.get("feedback_text") ?? "").trim();

  if (!caseId || !feedbackId || !feedbackText) {
    return { error: "Feedback cannot be empty.", success: null };
  }

  const { data: feedbackItem, error: feedbackError } = await supabase
    .from("feedback")
    .select("id, submission_id")
    .eq("id", feedbackId)
    .maybeSingle();

  if (feedbackError || !feedbackItem) {
    console.error(feedbackError);
    return { error: "The feedback could not be found.", success: null };
  }

  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .select("id")
    .eq("id", feedbackItem.submission_id)
    .eq("case_id", caseId)
    .maybeSingle();

  if (submissionError || !submission) {
    console.error(submissionError);
    return {
      error: "The feedback does not belong to this supervision.",
      success: null,
    };
  }

  const { data: updated, error } = await supabase
    .from("feedback")
    .update({
      feedback_text: feedbackText,
      updated_at: new Date().toISOString(),
    })
    .eq("id", feedbackId)
    .select("id");

  if (error) {
    console.error(error);
    return { error: "Unable to update feedback.", success: null };
  }

  // RLS filters out rows the caller may not change, which is not an error.
  if (!updated || updated.length === 0) {
    return {
      error: "This feedback could not be updated. Only its author can edit it.",
      success: null,
    };
  }

  revalidateSupervisionPages(caseId);
  return { error: null, success: "Feedback updated." };
}

export async function createMilestone(
  _previousState: PlanningActionState,
  formData: FormData
): Promise<PlanningActionState> {
  await requireAdmin();
  const supabase = await createClient();
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

  const completedAt = getCompletedAt(status);

  const { error } = await supabase.from("milestones").insert({
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

  revalidateSupervisionPages(caseId);
  return { error: null, success: "Milestone added." };
}

export async function updateMilestone(
  _previousState: PlanningActionState,
  formData: FormData
): Promise<PlanningActionState> {
  await requireAdmin();
  const supabase = await createClient();
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

  const { data: existing, error: existingError } = await supabase
    .from("milestones")
    .select("status, completed_at")
    .eq("id", milestoneId)
    .eq("case_id", caseId)
    .maybeSingle();

  if (existingError || !existing) {
    console.error(existingError);
    return {
      error: "The milestone could not be found in this supervision.",
      success: null,
    };
  }

  const { data: updated, error } = await supabase
    .from("milestones")
    .update({
      title,
      description: description || null,
      target_date: targetDate,
      status,
      completed_at: getCompletedAt(status, existing),
      updated_at: new Date().toISOString(),
    })
    .eq("id", milestoneId)
    .eq("case_id", caseId)
    .select("id");

  if (error) {
    console.error(error);
    return { error: "Unable to update the milestone.", success: null };
  }

  if (!updated || updated.length === 0) {
    return {
      error: "The milestone could not be updated in this supervision.",
      success: null,
    };
  }

  revalidateSupervisionPages(caseId);
  return { error: null, success: "Milestone updated." };
}

export async function updateMilestoneStatus(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const caseId = String(formData.get("case_id") ?? "").trim();
  const milestoneId = String(formData.get("milestone_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!caseId || !milestoneId || !allowedMilestoneStatuses.includes(status)) {
    return;
  }

  const { data: existing, error: existingError } = await supabase
    .from("milestones")
    .select("status, completed_at")
    .eq("id", milestoneId)
    .eq("case_id", caseId)
    .maybeSingle();

  if (existingError || !existing) {
    console.error(existingError ?? "Milestone not found for status update.");
    return;
  }

  const { data: updated, error } = await supabase
    .from("milestones")
    .update({
      status,
      completed_at: getCompletedAt(status, existing),
      updated_at: new Date().toISOString(),
    })
    .eq("id", milestoneId)
    .eq("case_id", caseId)
    .select("id");

  if (error || !updated || updated.length === 0) {
    console.error(error ?? "Milestone status update matched no row.");
    return;
  }

  revalidateSupervisionPages(caseId);
}

export async function deleteMilestone(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const caseId = String(formData.get("case_id") ?? "").trim();
  const milestoneId = String(formData.get("milestone_id") ?? "").trim();

  if (!caseId || !milestoneId) {
    return;
  }

  const { data: deleted, error } = await supabase
    .from("milestones")
    .delete()
    .eq("id", milestoneId)
    .eq("case_id", caseId)
    .select("id");

  if (error || !deleted || deleted.length === 0) {
    console.error(error ?? "Milestone deletion matched no row.");
    return;
  }

  revalidateSupervisionPages(caseId);
}

export async function createMeeting(
  _previousState: PlanningActionState,
  formData: FormData
): Promise<PlanningActionState> {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const caseId = String(formData.get("case_id") ?? "").trim();
  const scheduled = readZonedDateTime(formData, "scheduled_local");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!caseId || scheduled.error === "missing") {
    return { error: "Meeting date and time are required.", success: null };
  }

  if (scheduled.error === "zone") {
    return { error: "Choose Santiago or Amsterdam time.", success: null };
  }

  if (!scheduled.date) {
    return {
      error: "The meeting time is invalid or does not exist in the chosen time zone.",
      success: null,
    };
  }

  const { error } = await supabase.from("meetings").insert({
    case_id: caseId,
    student_id: null,
    scheduled_at: scheduled.date.toISOString(),
    notes: notes || null,
    created_by: admin.id,
  });

  if (error) {
    console.error(error);
    return { error: "Unable to create the meeting.", success: null };
  }

  revalidateSupervisionPages(caseId);
  return { error: null, success: "Meeting added." };
}

export async function updateMeeting(
  _previousState: PlanningActionState,
  formData: FormData
): Promise<PlanningActionState> {
  await requireAdmin();
  const supabase = await createClient();
  const caseId = String(formData.get("case_id") ?? "").trim();
  const meetingId = String(formData.get("meeting_id") ?? "").trim();
  const scheduled = readZonedDateTime(formData, "scheduled_local");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!caseId || !meetingId || scheduled.error === "missing") {
    return { error: "Meeting date and time are required.", success: null };
  }

  if (scheduled.error === "zone") {
    return { error: "Choose Santiago or Amsterdam time.", success: null };
  }

  if (!scheduled.date) {
    return {
      error: "The meeting time is invalid or does not exist in the chosen time zone.",
      success: null,
    };
  }

  const { data: updated, error } = await supabase
    .from("meetings")
    .update({
      scheduled_at: scheduled.date.toISOString(),
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", meetingId)
    .eq("case_id", caseId)
    .select("id");

  if (error) {
    console.error(error);
    return { error: "Unable to update the meeting.", success: null };
  }

  if (!updated || updated.length === 0) {
    return {
      error: "The meeting could not be updated in this supervision.",
      success: null,
    };
  }

  revalidateSupervisionPages(caseId);
  return { error: null, success: "Meeting updated." };
}

export async function deleteMeeting(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const caseId = String(formData.get("case_id") ?? "").trim();
  const meetingId = String(formData.get("meeting_id") ?? "").trim();

  if (!caseId || !meetingId) {
    return;
  }

  const { data: deleted, error } = await supabase
    .from("meetings")
    .delete()
    .eq("id", meetingId)
    .eq("case_id", caseId)
    .select("id");

  if (error || !deleted || deleted.length === 0) {
    console.error(error ?? "Meeting deletion matched no row.");
    return;
  }

  revalidateSupervisionPages(caseId);
}

export async function updateSubmissionMetadata(
  _previousState: SubmissionActionState,
  formData: FormData
): Promise<SubmissionActionState> {
  await requireGlobalSupervisor();
  const supabase = await createClient();
  const caseId = String(formData.get("case_id") ?? "").trim();
  const submissionId = String(formData.get("submission_id") ?? "").trim();
  const submitted = readZonedDateTime(formData, "submitted_local");
  const originalDate = String(formData.get("original_date") ?? "").trim();

  if (
    !caseId ||
    !submissionId ||
    submitted.error === "missing" ||
    !originalDate
  ) {
    return { error: "Submission and original dates are required.", success: null };
  }

  if (submitted.error === "zone") {
    return { error: "Choose Santiago or Amsterdam time.", success: null };
  }

  if (!submitted.date) {
    return {
      error: "The submission time is invalid or does not exist in the chosen time zone.",
      success: null,
    };
  }

  if (!/^d{4}-d{2}-d{2}$/.test(originalDate)) {
    return { error: "The original date is invalid.", success: null };
  }

  const { data: updated, error } = await supabase
    .from("submissions")
    .update({
      submitted_at: submitted.date.toISOString(),
      original_date: originalDate,
    })
    .eq("id", submissionId)
    .eq("case_id", caseId)
    .select("id");

  if (error) {
    console.error(error);
    return { error: "Unable to update the submission dates.", success: null };
  }

  if (!updated || updated.length === 0) {
    return {
      error: "The submission could not be updated in this supervision.",
      success: null,
    };
  }

  revalidateSupervisionPages(caseId);
  return { error: null, success: "Submission dates updated." };
}
