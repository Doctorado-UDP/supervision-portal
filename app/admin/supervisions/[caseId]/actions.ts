"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export type PlanningActionState = {
  error: string | null;
  success: string | null;
};

export type FeedbackActionState = {
  error: string | null;
  success: string | null;
};

const allowedMilestoneStatuses = [
  "planned",
  "in_progress",
  "completed",
  "cancelled",
];

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

// ============================================================
// CREATE FEEDBACK
// ============================================================

export async function createFeedback(
  _previousState: FeedbackActionState,
  formData: FormData
): Promise<FeedbackActionState> {
  const admin =
    await requireAdmin();

  const supabase =
    await createClient();

  const caseId =
    String(
      formData.get("case_id") ?? ""
    ).trim();

  const submissionId =
    String(
      formData.get("submission_id") ?? ""
    ).trim();

  const feedbackText =
    String(
      formData.get("feedback_text") ?? ""
    ).trim();

  if (
    !caseId ||
    !submissionId ||
    !feedbackText
  ) {
    return {
      error:
        "Feedback cannot be empty.",
      success: null,
    };
  }

  const {
    data: submission,
    error: submissionError,
  } = await supabase
    .from("submissions")
    .select("id")
    .eq("id", submissionId)
    .eq("case_id", caseId)
    .maybeSingle();

  if (
    submissionError ||
    !submission
  ) {
    console.error(
      submissionError
    );

    return {
      error:
        "The submission could not be found in this supervision.",
      success: null,
    };
  }

  const { error } =
    await supabase
      .from("feedback")
      .insert({
        submission_id:
          submissionId,
        author_id:
          admin.id,
        feedback_text:
          feedbackText,
      });

  if (error) {
    console.error(error);

    return {
      error:
        "Unable to post feedback.",
      success: null,
    };
  }

  revalidateSupervisionPages(
    caseId
  );

  return {
    error: null,
    success:
      "Feedback posted.",
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

  const supabase =
    await createClient();

  const caseId =
    String(
      formData.get("case_id") ?? ""
    ).trim();

  const title =
    String(
      formData.get("title") ?? ""
    ).trim();

  const description =
    String(
      formData.get("description") ?? ""
    ).trim();

  const targetDate =
    String(
      formData.get("target_date") ?? ""
    ).trim();

  const status =
    String(
      formData.get("status") ??
        "planned"
    ).trim();

  if (
    !caseId ||
    !title ||
    !targetDate
  ) {
    return {
      error:
        "Title and target date are required.",
      success: null,
    };
  }

  if (
    !allowedMilestoneStatuses.includes(
      status
    )
  ) {
    return {
      error:
        "The selected milestone status is invalid.",
      success: null,
    };
  }

  const completedAt =
    status === "completed"
      ? new Date()
          .toISOString()
          .slice(0, 10)
      : null;

  const { error } =
    await supabase
      .from("milestones")
      .insert({
        case_id:
          caseId,
        student_id:
          null,
        title,
        description:
          description || null,
        target_date:
          targetDate,
        status,
        completed_at:
          completedAt,
      });

  if (error) {
    console.error(error);

    return {
      error:
        "Unable to create the milestone.",
      success: null,
    };
  }

  revalidateSupervisionPages(
    caseId
  );

  return {
    error: null,
    success:
      "Milestone added.",
  };
}

// ============================================================
// UPDATE MILESTONE STATUS
// ============================================================

export async function updateMilestoneStatus(
  formData: FormData
) {
  await requireAdmin();

  const supabase =
    await createClient();

  const caseId =
    String(
      formData.get("case_id") ?? ""
    ).trim();

  const milestoneId =
    String(
      formData.get("milestone_id") ?? ""
    ).trim();

  const status =
    String(
      formData.get("status") ?? ""
    ).trim();

  if (
    !caseId ||
    !milestoneId ||
    !allowedMilestoneStatuses.includes(
      status
    )
  ) {
    return;
  }

  const completedAt =
    status === "completed"
      ? new Date()
          .toISOString()
          .slice(0, 10)
      : null;

  const { error } =
    await supabase
      .from("milestones")
      .update({
        status,
        completed_at:
          completedAt,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", milestoneId)
      .eq("case_id", caseId);

  if (error) {
    console.error(error);
    return;
  }

  revalidateSupervisionPages(
    caseId
  );
}

// ============================================================
// DELETE MILESTONE
// ============================================================

export async function deleteMilestone(
  formData: FormData
) {
  await requireAdmin();

  const supabase =
    await createClient();

  const caseId =
    String(
      formData.get("case_id") ?? ""
    ).trim();

  const milestoneId =
    String(
      formData.get("milestone_id") ?? ""
    ).trim();

  if (
    !caseId ||
    !milestoneId
  ) {
    return;
  }

  const { error } =
    await supabase
      .from("milestones")
      .delete()
      .eq("id", milestoneId)
      .eq("case_id", caseId);

  if (error) {
    console.error(error);
    return;
  }

  revalidateSupervisionPages(
    caseId
  );
}

// ============================================================
// CREATE MEETING
// ============================================================

export async function createMeeting(
  _previousState: PlanningActionState,
  formData: FormData
): Promise<PlanningActionState> {
  const admin =
    await requireAdmin();

  const supabase =
    await createClient();

  const caseId =
    String(
      formData.get("case_id") ?? ""
    ).trim();

  const scheduledAt =
    String(
      formData.get("scheduled_at") ?? ""
    ).trim();

  const notes =
    String(
      formData.get("notes") ?? ""
    ).trim();

  if (
    !caseId ||
    !scheduledAt
  ) {
    return {
      error:
        "Meeting date and time are required.",
      success: null,
    };
  }

  const parsedDate =
    new Date(scheduledAt);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return {
      error:
        "The meeting date is invalid.",
      success: null,
    };
  }

  const { error } =
    await supabase
      .from("meetings")
      .insert({
        case_id:
          caseId,
        student_id:
          null,
        scheduled_at:
          parsedDate.toISOString(),
        notes:
          notes || null,
        created_by:
          admin.id,
      });

  if (error) {
    console.error(error);

    return {
      error:
        "Unable to create the meeting.",
      success: null,
    };
  }

  revalidateSupervisionPages(
    caseId
  );

  return {
    error: null,
    success:
      "Meeting added.",
  };
}

// ============================================================
// DELETE MEETING
// ============================================================

export async function deleteMeeting(
  formData: FormData
) {
  await requireAdmin();

  const supabase =
    await createClient();

  const caseId =
    String(
      formData.get("case_id") ?? ""
    ).trim();

  const meetingId =
    String(
      formData.get("meeting_id") ?? ""
    ).trim();

  if (
    !caseId ||
    !meetingId
  ) {
    return;
  }

  const { error } =
    await supabase
      .from("meetings")
      .delete()
      .eq("id", meetingId)
      .eq("case_id", caseId);

  if (error) {
    console.error(error);
    return;
  }

  revalidateSupervisionPages(
    caseId
  );
}