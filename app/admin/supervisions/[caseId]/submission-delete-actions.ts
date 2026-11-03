"use server";

import { revalidatePath } from "next/cache";

import { requireGlobalSupervisor } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

function revalidateSupervisionPages(caseId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/supervisions");
  revalidatePath(`/admin/supervisions/${caseId}`);
  revalidatePath("/student");
}

export async function deleteSubmission(formData: FormData) {
  await requireGlobalSupervisor();
  const supabase = await createClient();
  const caseId = String(formData.get("case_id") ?? "").trim();
  const submissionId = String(formData.get("submission_id") ?? "").trim();

  if (!caseId || !submissionId) return;

  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .select("id, file_path")
    .eq("id", submissionId)
    .eq("case_id", caseId)
    .maybeSingle();

  if (submissionError || !submission) {
    console.error(submissionError);
    return;
  }

  const { data: deleted, error: deleteError } = await supabase
    .from("submissions")
    .delete()
    .eq("id", submissionId)
    .eq("case_id", caseId)
    .select("id");

  // Remove the file only once its row is really gone.
  if (deleteError || !deleted || deleted.length === 0) {
    console.error(deleteError ?? "Submission deletion matched no row.");
    return;
  }

  const { error: storageError } = await supabase.storage
    .from("submissions")
    .remove([submission.file_path]);

  if (storageError) {
    console.error("Submission metadata was deleted, but file cleanup failed.", storageError);
  }

  revalidateSupervisionPages(caseId);
}
