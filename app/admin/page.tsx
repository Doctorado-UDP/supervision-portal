import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

const STORAGE_LIMIT_BYTES =
  1024 * 1024 * 1024;

function formatMegabytes(
  bytes: number
) {
  return (
    bytes /
    1024 /
    1024
  );
}

function MetricCard({
  title,
  value,
  description,
}: {
  title: string;
  value: number | string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-600">
        {title}
      </p>

      <p className="mt-2 text-3xl font-semibold text-gray-950">
        {value}
      </p>

      <p className="mt-2 text-sm text-gray-500">
        {description}
      </p>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const supabase =
    await createClient();

  // ============================================================
  // DATE WINDOW
  // ============================================================

  const today =
    new Date();

  const thirtyDaysFromNow =
    new Date(today);

  thirtyDaysFromNow.setDate(
    thirtyDaysFromNow.getDate() +
      30
  );

  const todayString =
    today
      .toISOString()
      .slice(0, 10);

  const thirtyDaysString =
    thirtyDaysFromNow
      .toISOString()
      .slice(0, 10);

  // ============================================================
  // DASHBOARD DATA
  // ============================================================

  const [
    studentsResult,
    submissionsResult,
    feedbackResult,
    milestonesResult,
    upcomingMilestonesResult,
    storageResult,
  ] = await Promise.all([
    // ----------------------------------------------------------
    // STUDENTS
    // ----------------------------------------------------------

    supabase
      .from("students")
      .select(
        "id",
        {
          count: "exact",
        }
      ),

    // ----------------------------------------------------------
    // SUBMISSIONS
    // ----------------------------------------------------------

    supabase
      .from("submissions")
      .select("id"),

    // ----------------------------------------------------------
    // FEEDBACK
    // ----------------------------------------------------------

    supabase
      .from("feedback")
      .select(
        "submission_id"
      ),

    // ----------------------------------------------------------
    // UPCOMING DEADLINE COUNT
    // ----------------------------------------------------------

    supabase
      .from("milestones")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .gte(
        "target_date",
        todayString
      )
      .lte(
        "target_date",
        thirtyDaysString
      )
      .neq(
        "status",
        "completed"
      )
      .neq(
        "status",
        "cancelled"
      ),

    // ----------------------------------------------------------
    // NEXT FIVE CASE-LEVEL MILESTONES
    // ----------------------------------------------------------

    supabase
      .from("milestones")
      .select(
        "id, case_id, title, target_date, status"
      )
      .gte(
        "target_date",
        todayString
      )
      .neq(
        "status",
        "completed"
      )
      .neq(
        "status",
        "cancelled"
      )
      .order(
        "target_date",
        {
          ascending: true,
        }
      )
      .limit(5),

    // ----------------------------------------------------------
    // STORAGE
    // ----------------------------------------------------------

    supabase
      .from("storage_usage")
      .select(
        "total_files, total_bytes, total_megabytes"
      )
      .single(),
  ]);

  // ============================================================
  // CHECK BASE QUERIES
  // ============================================================

  const errors = [
    studentsResult.error,
    submissionsResult.error,
    feedbackResult.error,
    milestonesResult.error,
    upcomingMilestonesResult.error,
    storageResult.error,
  ].filter(Boolean);

  if (
    errors.length > 0
  ) {
    console.error(errors);

    throw new Error(
      "Unable to load the administrator dashboard."
    );
  }

  // ============================================================
  // METRICS
  // ============================================================

  const studentCount =
    studentsResult.count ??
    0;

  const submissionIdsWithFeedback =
    new Set(
      (
        feedbackResult.data ??
        []
      ).map(
        (item) =>
          item.submission_id
      )
    );

  const awaitingFeedback =
    (
      submissionsResult.data ??
      []
    ).filter(
      (submission) =>
        !submissionIdsWithFeedback.has(
          submission.id
        )
    ).length;

  const upcomingDeadlines =
    milestonesResult.count ??
    0;

  // ============================================================
  // STORAGE METRICS
  // ============================================================

  const usedStorageBytes =
    Number(
      storageResult.data
        ?.total_bytes ?? 0
    );

  const usedStorageMb =
    formatMegabytes(
      usedStorageBytes
    );

  const storagePercentage =
    STORAGE_LIMIT_BYTES ===
    0
      ? 0
      : Math.min(
          (
            usedStorageBytes /
            STORAGE_LIMIT_BYTES
          ) * 100,
          100
        );

  const storageStatus =
    storagePercentage >= 85
      ? "High"
      : storagePercentage >=
          70
        ? "Warning"
        : "Normal";

  // ============================================================
  // UPCOMING MILESTONES
  // ============================================================

  const upcomingMilestones =
    upcomingMilestonesResult.data ??
    [];

  // ============================================================
  // LOAD SUPERVISION CASES FOR UPCOMING MILESTONES
  // ============================================================
  //
  // Milestones no longer belong to one student.
  //
  // milestone.case_id
  //       ↓
  // supervision_cases
  //
  // This means a group milestone appears once on the dashboard
  // under its supervision case.
  // ============================================================

  const upcomingCaseIds = [
    ...new Set(
      upcomingMilestones.map(
        (milestone) =>
          milestone.case_id
      )
    ),
  ];

  let upcomingCases: {
    id: string;
    title: string;
    case_type: string;
  }[] = [];

  if (
    upcomingCaseIds.length >
    0
  ) {
    const {
      data,
      error,
    } = await supabase
      .from(
        "supervision_cases"
      )
      .select(
        "id, title, case_type"
      )
      .in(
        "id",
        upcomingCaseIds
      );

    if (error) {
      console.error(error);

      throw new Error(
        "Unable to load supervision cases for upcoming milestones."
      );
    }

    upcomingCases =
      data ?? [];
  }

  const upcomingCaseMap =
    new Map(
      upcomingCases.map(
        (
          supervisionCase
        ) => [
          supervisionCase.id,
          supervisionCase,
        ]
      )
    );

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-8">
      {/* PAGE HEADER */}

      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-950">
          Dashboard
        </h1>

        <p className="mt-2 text-gray-600">
          Overview of supervision
          activity and upcoming
          work.
        </p>
      </div>

      {/* METRICS */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Students"
          value={
            studentCount
          }
          description="Students currently registered in the portal"
        />

        <MetricCard
          title="Awaiting feedback"
          value={
            awaitingFeedback
          }
          description="Submissions without feedback"
        />

        <MetricCard
          title="Upcoming deadlines"
          value={
            upcomingDeadlines
          }
          description="Milestones due within the next 30 days"
        />

        <MetricCard
          title="Stored files"
          value={Number(
            storageResult.data
              ?.total_files ?? 0
          )}
          description="Submission files tracked by the portal"
        />
      </section>

      {/* UPCOMING MILESTONES + STORAGE */}

      <section className="grid gap-6 lg:grid-cols-3">
        {/* UPCOMING MILESTONES */}

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-950">
                Upcoming
                milestones
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Next five
                incomplete supervision
                deadlines.
              </p>
            </div>

            <Link
              href="/admin/timetable"
              className="text-sm font-medium text-gray-700 hover:text-gray-950"
            >
              View timetable
            </Link>
          </div>

          <div className="mt-6">
            {upcomingMilestones.length ===
            0 ? (
              <p className="rounded-lg bg-gray-50 px-4 py-6 text-sm text-gray-500">
                No upcoming
                milestones.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {upcomingMilestones.map(
                  (
                    milestone
                  ) => {
                    const supervisionCase =
                      upcomingCaseMap.get(
                        milestone.case_id
                      );

                    return (
                      <div
                        key={
                          milestone.id
                        }
                        className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center sm:gap-6"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {
                              milestone.title
                            }
                          </p>

                          <p className="mt-1 text-sm font-medium text-gray-700">
                            {supervisionCase?.title ??
                              "Unknown supervision"}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {supervisionCase?.case_type ===
                            "group"
                              ? "Group supervision"
                              : "Individual supervision"}
                          </p>
                        </div>

                        <time className="whitespace-nowrap text-sm text-gray-600">
                          {
                            milestone.target_date
                          }
                        </time>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </div>

        {/* STORAGE */}

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-950">
            Storage
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Tracked submission
            storage
          </p>

          <div className="mt-6">
            <div className="flex items-end justify-between">
              <p className="text-3xl font-semibold text-gray-950">
                {usedStorageMb.toFixed(
                  1
                )}{" "}
                MB
              </p>

              <span className="text-sm font-medium text-gray-600">
                {storagePercentage.toFixed(
                  1
                )}
                %
              </span>
            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-gray-900 transition-all"
                style={{
                  width: `${storagePercentage}%`,
                }}
              />
            </div>

            <div className="mt-4 flex justify-between text-sm text-gray-500">
              <span>
                Status:{" "}
                {
                  storageStatus
                }
              </span>

              <span>
                1 GB limit
              </span>
            </div>

            {storagePercentage >=
              85 && (
              <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                Storage usage is
                above 85%. Consider
                migrating document
                storage or upgrading
                capacity.
              </p>
            )}

            {storagePercentage >=
              70 &&
              storagePercentage <
                85 && (
                <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  Storage usage has
                  exceeded the 70%
                  monitoring
                  threshold.
                </p>
              )}
          </div>
        </div>
      </section>

      {/* STUDENT MANAGEMENT */}

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-950">
          Students
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Manage student records,
          submissions and
          supervision progress.
        </p>

        <Link
          href="/admin/students"
          className="mt-5 inline-flex rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          View students
        </Link>
      </section>
    </div>
  );
}