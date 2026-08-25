"use server";

import { revalidatePath } from "next/cache";

import { requireGlobalSupervisor } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

function revalidateSupervisionPages(caseId: string) {
  revalidatePath("/admin");
  revalidatePath(`/admin/supervisions/${caseId}`);
  revalidatePath("/student");
}

export async function deleteFeedback(formData: FormData) {
  await requireGlobalSupervisor();
  const supabase = await createClient();
  const caseId = String(formData.get("case_id") ?? "").trim();
  const feedbackId = String(formData.get("feedback_id") ?? "").trim();

  if (!caseId || !feedbackId) return;

  const { data: feedbackItem, error: feedbackError } = await supabase
    .from("feedback")
    .select("id, submission_id")
    .eq("id", feedbackId)
    .maybeSingle();

  if (feedbackError || !feedbackItem) {
    console.error(feedbackError);
    return;
  }

  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .select("id")
    .eq("id", feedbackItem.submission_id)
    .eq("case_id", caseId)
    .maybeSingle();

  if (submissionError || !submission) {
    console.error(submissionError);
    return;
  }

  const { error } = await supabase
    .from("feedback")
    .delete()
    .eq("id", feedbackId);

  if (error) {
    console.error(error);
    return;
  }

  revalidateSupervisionPages(caseId);
}
