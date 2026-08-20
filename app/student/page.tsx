import Link from "next/link";
import { redirect } from "next/navigation";

import StudentHeader from "@/components/student/student-header";

import SubmissionUploadForm from "@/components/submissions/submission-upload-form";

import {
  createClient,
} from "@/lib/supabase/server";

function formatBytes(
  bytes: number
) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(1)} MB`;
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone:
        "Europe/Amsterdam",
    }
  ).format(
    new Date(value)
  );
}

function formatStatus(
  status: string
) {
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

export default async function StudentPage() {
  const supabase =
    await createClient();

  const {
    data: claimsData,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      "id, full_name, role"
    )
    .eq("id", userId)
    .single();

  if (
    profileError ||
    !profile
  ) {
    redirect("/login");
  }

  if (
    profile.role === "admin"
  ) {
    redirect("/admin");
  }

  const {
    data: student,
    error: studentError,
  } = await supabase
    .from("students")
    .select(
      "id, programme, start_date, target_completion_date, status"
    )
    .eq(
      "user_id",
      userId
    )
    .maybeSingle();

  // Account exists, but supervisor
  // has not created student record yet.
  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50">
        <StudentHeader
          fullName={
            profile.full_name
          }
        />

        <main className="mx-auto max-w-4xl px-6 py-8">
          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-semibold text-gray-950">
              Account setup in progress
            </h1>

            <p className="mt-3 text-gray-600">
              Your account is active,
              but your supervision
              record has not yet been
              configured.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (studentError) {
    throw new Error(
      "Unable to load student record."
    );
  }

  const [
    submissionsResult,
    milestonesResult,
    meetingsResult,
  ] = await Promise.all([
    supabase
      .from("submissions")
      .select(
        "id, title, version, file_name, file_size_bytes, submitted_at"
      )
      .eq(
        "student_id",
        student.id
      )
      .order(
        "submitted_at",
        {
          ascending: false,
        }
      ),

    supabase
      .from("milestones")
      .select(
        "id, title, description, target_date, status"
      )
      .eq(
        "student_id",
        student.id
      )
      .order(
        "target_date",
        {
          ascending: true,
        }
      ),

    supabase
      .from("meetings")
      .select(
        "id, scheduled_at, notes"
      )
      .eq(
        "student_id",
        student.id
      )
      .order(
        "scheduled_at",
        {
          ascending: false,
        }
      ),
  ]);

  if (
    submissionsResult.error ||
    milestonesResult.error ||
    meetingsResult.error
  ) {
    console.error(
      submissionsResult.error,
      milestonesResult.error,
      meetingsResult.error
    );

    throw new Error(
      "Unable to load supervision information."
    );
  }

  const submissions =
    submissionsResult.data ?? [];

  const submissionIds =
    submissions.map(
      (submission) =>
        submission.id
    );

  let feedback:
    {
      id: string;
      submission_id: string;
      feedback_text: string;
      created_at: string;
    }[] = [];

  if (
    submissionIds.length > 0
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("feedback")
      .select(
        "id, submission_id, feedback_text, created_at"
      )
      .in(
        "submission_id",
        submissionIds
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      );

    if (error) {
      throw new Error(
        "Unable to load feedback."
      );
    }

    feedback = data ?? [];
  }

  const feedbackMap =
    new Map<
      string,
      typeof feedback
    >();

  for (
    const item of feedback
  ) {
    const existing =
      feedbackMap.get(
        item.submission_id
      ) ?? [];

    existing.push(item);

    feedbackMap.set(
      item.submission_id,
      existing
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <StudentHeader
        fullName={
          profile.full_name
        }
      />

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-950">
            {profile.full_name}
          </h1>

          <p className="mt-2 text-gray-600">
            {student.programme}
          </p>

          <span className="mt-3 inline-flex rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
            {formatStatus(
              student.status
            )}
          </span>
        </div>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-950">
              Submissions
            </h2>

            <div className="mt-6 space-y-5">
              {submissions.length ===
              0 ? (
                <p className="rounded-lg bg-gray-50 px-4 py-6 text-sm text-gray-500">
                  No submissions
                  uploaded yet.
                </p>
              ) : (
                submissions.map(
                  (submission) => {
                    const items =
                      feedbackMap.get(
                        submission.id
                      ) ?? [];

                    return (
                      <article
                        key={
                          submission.id
                        }
                        className="rounded-lg border border-gray-200 p-5"
                      >
                        <div className="flex flex-col justify-between gap-4 sm:flex-row">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {
                                submission.title
                              }{" "}
                              <span className="font-normal text-gray-500">
                                — Version{" "}
                                {
                                  submission.version
                                }
                              </span>
                            </h3>

                            <p className="mt-2 text-sm text-gray-600">
                              {
                                submission.file_name
                              }{" "}
                              ·{" "}
                              {formatBytes(
                                Number(
                                  submission.file_size_bytes
                                )
                              )}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              {formatDate(
                                submission.submitted_at
                              )}
                            </p>
                          </div>

                          <Link
                            href={`/submissions/${submission.id}/download`}
                            className="h-fit rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Download
                          </Link>
                        </div>

                        <div className="mt-5 border-t border-gray-100 pt-5">
                          <h4 className="text-sm font-semibold text-gray-900">
                            Supervisor
                            feedback
                          </h4>

                          {items.length ===
                          0 ? (
                            <p className="mt-2 text-sm text-gray-500">
                              No
                              feedback
                              posted
                              yet.
                            </p>
                          ) : (
                            <div className="mt-3 space-y-3">
                              {items.map(
                                (
                                  item
                                ) => (
                                  <div
                                    key={
                                      item.id
                                    }
                                    className="rounded-md bg-gray-50 p-4"
                                  >
                                    <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                                      {
                                        item.feedback_text
                                      }
                                    </p>

                                    <p className="mt-2 text-xs text-gray-500">
                                      {formatDate(
                                        item.created_at
                                      )}
                                    </p>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  }
                )
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-950">
              Upload submission
            </h2>

            <div className="mt-6">
              <SubmissionUploadForm
                studentId={
                  student.id
                }
              />
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-950">
              Milestones
            </h2>

            <div className="mt-5 space-y-4">
              {(
                milestonesResult.data ??
                []
              ).length === 0 ? (
                <p className="text-sm text-gray-500">
                  No milestones.
                </p>
              ) : (
                (
                  milestonesResult.data ??
                  []
                ).map(
                  (milestone) => (
                    <div
                      key={
                        milestone.id
                      }
                      className="border-b border-gray-100 pb-4 last:border-0"
                    >
                      <p className="font-medium text-gray-900">
                        {
                          milestone.title
                        }
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        Target:{" "}
                        {
                          milestone.target_date
                        }{" "}
                        ·{" "}
                        {
                          milestone.status
                        }
                      </p>
                    </div>
                  )
                )
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-950">
              Supervision meetings
            </h2>

            <div className="mt-5 space-y-4">
              {(
                meetingsResult.data ??
                []
              ).length === 0 ? (
                <p className="text-sm text-gray-500">
                  No meetings recorded.
                </p>
              ) : (
                (
                  meetingsResult.data ??
                  []
                ).map(
                  (meeting) => (
                    <div
                      key={
                        meeting.id
                      }
                      className="border-b border-gray-100 pb-4 last:border-0"
                    >
                      <p className="font-medium text-gray-900">
                        {formatDate(
                          meeting.scheduled_at
                        )}
                      </p>

                      {meeting.notes && (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">
                          {
                            meeting.notes
                          }
                        </p>
                      )}
                    </div>
                  )
                )
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}