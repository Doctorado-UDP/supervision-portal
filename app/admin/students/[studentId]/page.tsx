import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function formatStatus(status: string) {
  switch (status) {
    case "on_track":
      return "On track";
    case "attention":
      return "Needs attention";
    case "completed":
      return "Completed";
    case "inactive":
      return "Inactive";
    default:
      return "Active";
  }
}

type StudentPageProps = {
  params: Promise<{
    studentId: string;
  }>;
};

export default async function StudentPage({
  params,
}: StudentPageProps) {
  const { studentId } = await params;

  const supabase = await createClient();

  const { data: student, error: studentError } =
    await supabase
      .from("students")
      .select(
        "id, user_id, programme, start_date, target_completion_date, status"
      )
      .eq("id", studentId)
      .single();

  if (studentError || !student) {
    notFound();
  }

  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", student.user_id)
      .single();

  if (profileError || !profile) {
    throw new Error(
      "Unable to load the student's profile."
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/students"
          className="text-sm font-medium text-gray-600 hover:text-gray-950"
        >
          ← Students
        </Link>

        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-950">
              {profile.full_name}
            </h1>

            <p className="mt-2 text-gray-600">
              {student.programme}
            </p>
          </div>

          <span className="inline-flex w-fit rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700">
            {formatStatus(student.status)}
          </span>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Email
          </p>

          <p className="mt-2 text-sm font-medium text-gray-900">
            {profile.email ?? "—"}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Start date
          </p>

          <p className="mt-2 text-sm font-medium text-gray-900">
            {student.start_date ?? "—"}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Target completion
          </p>

          <p className="mt-2 text-sm font-medium text-gray-900">
            {student.target_completion_date ?? "—"}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Status
          </p>

          <p className="mt-2 text-sm font-medium text-gray-900">
            {formatStatus(student.status)}
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-950">
            Submissions
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Document submissions will be added in Stage 4D.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-950">
            Milestones
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Timetable management will be added in Stage 4C.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-950">
            Meetings
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Supervision meetings will be added in Stage 4C.
          </p>
        </div>
      </section>
    </div>
  );
}