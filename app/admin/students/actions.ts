"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export type CreateStudentState = {
  error: string | null;
};

const allowedStatuses = [
  "active",
  "on_track",
  "attention",
  "completed",
  "inactive",
];

export async function createStudent(
  _previousState: CreateStudentState,
  formData: FormData
): Promise<CreateStudentState> {
  const adminProfile = await requireAdmin();
  const supabase = await createClient();

  const userId = String(formData.get("user_id") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const programme = String(formData.get("programme") ?? "").trim();
  const startDate = String(formData.get("start_date") ?? "").trim();
  const targetCompletionDate = String(
    formData.get("target_completion_date") ?? ""
  ).trim();

  const status = String(formData.get("status") ?? "").trim();

  if (
    !userId ||
    !fullName ||
    !programme ||
    !startDate ||
    !targetCompletionDate ||
    !status
  ) {
    return {
      error: "Please complete all required fields.",
    };
  }

  if (!allowedStatuses.includes(status)) {
    return {
      error: "The selected student status is invalid.",
    };
  }

  if (targetCompletionDate < startDate) {
    return {
      error:
        "The target completion date cannot be earlier than the start date.",
    };
  }

  // Confirm that this is a genuine student profile.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, email")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return {
      error: "The selected user account could not be found.",
    };
  }

  if (profile.role !== "student") {
    return {
      error: "Only student accounts can be registered as students.",
    };
  }

  // Prevent the same Auth account from being registered twice.
  const { data: existingStudent, error: existingStudentError } =
    await supabase
      .from("students")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

  if (existingStudentError) {
    console.error(existingStudentError);

    return {
      error: "Unable to check the existing student record.",
    };
  }

  if (existingStudent) {
    return {
      error: "This account already has a student record.",
    };
  }

  // Update the student's application display name.
  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (profileUpdateError) {
    console.error(profileUpdateError);

    return {
      error: "Unable to update the student's profile.",
    };
  }

  // Create the student record.
  const { data: student, error: studentError } = await supabase
    .from("students")
    .insert({
      user_id: userId,
      programme,
      start_date: startDate,
      target_completion_date: targetCompletionDate,
      status,
    })
    .select("id")
    .single();

  if (studentError || !student) {
    console.error(studentError);

    return {
      error: "Unable to create the student record.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/students");

  redirect(`/admin/students/${student.id}`);
}