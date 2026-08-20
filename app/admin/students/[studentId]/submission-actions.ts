"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  requireAdmin,
} from "@/lib/auth/require-admin";

import {
  createClient,
} from "@/lib/supabase/server";

export type FeedbackActionState = {
  error: string | null;
  success: string | null;
};

export async function createFeedback(
  _previousState: FeedbackActionState,
  formData: FormData
): Promise<FeedbackActionState> {
  const admin =
    await requireAdmin();

  const supabase =
    await createClient();

  const studentId = String(
    formData.get(
      "student_id"
    ) ?? ""
  ).trim();

  const submissionId = String(
    formData.get(
      "submission_id"
    ) ?? ""
  ).trim();

  const feedbackText = String(
    formData.get(
      "feedback_text"
    ) ?? ""
  ).trim();

  if (
    !studentId ||
    !submissionId ||
    !feedbackText
  ) {
    return {
      error:
        "Feedback cannot be empty.",
      success: null,
    };
  }

  // Confirm that the submission belongs
  // to this student.
  const {
    data: submission,
    error: submissionError,
  } = await supabase
    .from("submissions")
    .select("id")
    .eq("id", submissionId)
    .eq(
      "student_id",
      studentId
    )
    .single();

  if (
    submissionError ||
    !submission
  ) {
    return {
      error:
        "The submission could not be found.",
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
        "Unable to save feedback.",
      success: null,
    };
  }

  revalidatePath(
    `/admin/students/${studentId}`
  );

  revalidatePath(
    "/admin"
  );

  revalidatePath(
    "/student"
  );

  return {
    error: null,
    success:
      "Feedback saved.",
  };
}