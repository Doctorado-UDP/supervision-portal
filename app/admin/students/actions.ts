"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireGlobalSupervisor } from "@/lib/auth/require-admin";
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
  await requireGlobalSupervisor("/admin/students");
  const supabase = await createClient();

  const userId = String(formData.get("user_id") ?? "").trim();
  const programme = String(formData.get("programme") ?? "").trim();
  const startDate = String(formData.get("start_date") ?? "").trim();
  const targetCompletionDate = String(
    formData.get("target_completion_date") ?? ""
  ).trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!userId || !programme || !startDate || !targetCompletionDate || !status) {
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
      error: "The target completion date cannot be earlier than the start date.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return {
      error: "The selected user account could not be found.",
    };
  }

  if (profile.role !== "student") {
    return {
      error: "Only Student accounts can be configured as students.",
    };
  }

  const { data: existingStudent, error: existingStudentError } = await supabase
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

  // Creating the student record triggers creation of the individual
  // supervision case, case membership, primary supervisor assignment,
  // and the legacy supervision relationship.
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
      error: "Unable to configure the student record.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/students");
  revalidatePath("/admin/supervisions");
  revalidatePath("/admin/access");

  redirect(`/admin/students/${student.id}`);
}
