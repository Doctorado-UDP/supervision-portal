"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireGlobalSupervisor } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export type ConfigureSupervisionState = {
  error: string | null;
};

export async function configureSupervision(
  previousState: ConfigureSupervisionState,
  formData: FormData
): Promise<ConfigureSupervisionState> {
  void previousState;

  // ============================================================
  // AUTHORIZATION
  // ============================================================

  await requireGlobalSupervisor(
    "/admin/supervisions"
  );

  const supabase =
    await createClient();

  // ============================================================
  // FORM VALUES
  // ============================================================

  const caseIdValue =
    String(
      formData.get("caseId") ?? ""
    ).trim();

  const caseId =
    caseIdValue || null;

  const title =
    String(
      formData.get("title") ?? ""
    ).trim();

  const programme =
    String(
      formData.get("programme") ?? ""
    ).trim();

  const startDate =
    String(
      formData.get("startDate") ?? ""
    ).trim();

  const targetCompletionDate =
    String(
      formData.get(
        "targetCompletionDate"
      ) ?? ""
    ).trim();

  const status =
    String(
      formData.get("status") ??
        "active"
    ).trim();

  const studentIds = [
    ...new Set(
      formData
        .getAll("studentIds")
        .map((value) =>
          String(value)
        )
        .filter(Boolean)
    ),
  ];

  const staffIds = [
    ...new Set(
      formData
        .getAll("staffIds")
        .map((value) =>
          String(value)
        )
        .filter(Boolean)
    ),
  ];

  // ============================================================
  // VALIDATION
  // ============================================================

  if (!title) {
    return {
      error:
        "A supervision title is required.",
    };
  }

  if (!programme) {
    return {
      error:
        "A programme is required.",
    };
  }

  if (!startDate) {
    return {
      error:
        "A start date is required.",
    };
  }

  if (!targetCompletionDate) {
    return {
      error:
        "A target completion date is required.",
    };
  }

  if (
    studentIds.length < 1 ||
    studentIds.length > 3
  ) {
    return {
      error:
        "Select between one and three students.",
    };
  }

  const allowedStatuses = [
    "active",
    "on_track",
    "attention",
    "completed",
    "inactive",
  ];

  if (
    !allowedStatuses.includes(
      status
    )
  ) {
    return {
      error:
        "Invalid supervision status.",
    };
  }

  // ============================================================
  // CONFIGURE / UPDATE CASE
  // ============================================================

  const {
    data: configuredCaseId,
    error: configureError,
  } = await supabase.rpc(
    "admin_configure_supervision_case",
    {
      p_case_id:
        caseId,

      p_title:
        title,

      p_student_ids:
        studentIds,

      p_staff_ids:
        staffIds,

      p_programme:
        programme,

      p_start_date:
        startDate,

      p_target_completion_date:
        targetCompletionDate,

      p_status:
        status,
    }
  );

  if (configureError) {
    console.error(
      configureError
    );

    return {
      error:
        configureError.message ||
        "Unable to configure supervision.",
    };
  }

  // ============================================================
  // REFRESH
  // ============================================================

  revalidatePath("/admin");

  revalidatePath(
    "/admin/students"
  );

  revalidatePath(
    "/admin/supervisions"
  );

  revalidatePath(
    "/admin/timetable"
  );

  if (configuredCaseId) {
    revalidatePath(
      `/admin/supervisions/${configuredCaseId}`
    );

    revalidatePath(
      `/admin/supervisions/${configuredCaseId}/edit`
    );
  }

  if (caseId) {
    redirect(
      "/admin/supervisions?updated=1"
    );
  }

  redirect(
    "/admin/supervisions?configured=1"
  );
}