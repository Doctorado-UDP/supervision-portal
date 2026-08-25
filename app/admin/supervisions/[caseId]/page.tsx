import Link from "next/link";
import { notFound } from "next/navigation";

import AdminSubmissionsSection from "@/components/admin/admin-submissions-section";
import MeetingEditForm from "@/components/admin/meeting-edit-form";
import MeetingForm from "@/components/admin/meeting-form";
import MilestoneEditForm from "@/components/admin/milestone-edit-form";
import MilestoneForm from "@/components/admin/milestone-form";
import PaginatedList from "@/components/shared/paginated-list";

import {
  isGlobalSupervisor,
  requireAdmin,
} from "@/lib/auth/require-admin";
import { SITE_CONFIG } from "@/lib/config/site";
import { formatPortalDateTime } from "@/lib/datetime/format";
import { createClient } from "@/lib/supabase/server";

import {
  deleteMeeting,
  deleteMilestone,
  updateMilestoneStatus,
} from "./actions";

type SupervisionPageProps = {
  params: Promise<{ caseId: string }>;
};

function formatStatus(status: string) {
  switch (status) {
    case "on_track": return "On track";
    case "attention": return "Needs attention";
    case "completed": return "Completed";
    case "inactive": return "Inactive";
    default: return "Active";
  }
}

function formatMilestoneStatus(status: string) {
  switch (status) {
    case "in_progress": return "In progress";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
    default: return "Planned";
  }
}

export default async function SupervisionPage({ params }: SupervisionPageProps) {
  const { caseId } = await params;
  const admin = await requireAdmin();
  const canConfigure = isGlobalSupervisor(admin);
  const supabase = await createClient();

  const [caseResult, membersResult, staffResult, milestonesResult, meetingsResult] =
    await Promise.all([
      supabase
        .from("supervision_cases")
        .select("id, title, case_type, programme, start_date, target_completion_date, status")
        .eq("id", caseId)
        .maybeSingle(),
      supabase.from("case_members").select("student_id").eq("case_id", caseId),
      supabase.from("case_staff").select("staff_id, staff_role").eq("case_id", caseId),
      supabase
        .from("milestones")
        .select("id, title, description, target_date, status, completed_at")
        .eq("case_id", caseId)
        .order("target_date", { ascending: false }),
      supabase
        .from("meetings")
        .select("id, scheduled_at, notes, created_by")
        .eq("case_id", caseId)
        .order("scheduled_at", { ascending: false }),
    ]);

  if (caseResult.error) {
    console.error(caseResult.error);
    throw new Error("Unable to load supervision case.");
  }

  if (!caseResult.data) {
    notFound();
  }

  if (
    membersResult.error ||
    staffResult.error ||
    milestonesResult.error ||
    meetingsResult.error
  ) {
    console.error(
      membersResult.error,
      staffResult.error,
      milestonesResult.error,
      meetingsResult.error
    );
    throw new Error("Unable to load supervision workspace.");
  }

  const supervisionCase = caseResult.data;
  const memberships = membersResult.data ?? [];
  const caseStaff = staffResult.data ?? [];
  const milestones = milestonesResult.data ?? [];
  const meetings = meetingsResult.data ?? [];

  const studentIds = memberships.map((membership) => membership.student_id);
  let students: { id: string; user_id: string }[] = [];

  if (studentIds.length > 0) {
    const { data, error } = await supabase
      .from("students")
      .select("id, user_id")
      .in("id", studentIds);

    if (error) {
      console.error(error);
      throw new Error("Unable to load supervision students.");
    }
    students = data ?? [];
  }

  const profileIds = [
    ...new Set([
      ...students.map((student) => student.user_id),
      ...caseStaff.map((staff) => staff.staff_id),
    ]),
  ];

  let profiles: { id: string; full_name: string; email: string | null }[] = [];

  if (profileIds.length > 0) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", profileIds);

    if (error) {
      console.error(error);
      throw new Error("Unable to load supervision participants.");
    }
    profiles = data ?? [];
  }

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  const members = students
    .flatMap((student) => {
      const profile = profileMap.get(student.user_id);
      return profile
        ? [{ studentId: student.id, fullName: profile.full_name, email: profile.email }]
        : [];
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const staffMembers = caseStaff
    .flatMap((staff) => {
      const profile = profileMap.get(staff.staff_id);
      return profile
        ? [{
            profileId: profile.id,
            fullName: profile.full_name,
            email: profile.email,
            role: staff.staff_role,
          }]
        : [];
    })
    .sort((a, b) => {
      if (a.role === "supervisor" && b.role !== "supervisor") return -1;
      if (b.role === "supervisor" && a.role !== "supervisor") return 1;
      return a.fullName.localeCompare(b.fullName);
    });

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/supervisions"
          className="text-sm font-medium text-gray-600 hover:text-gray-950"
        >
          ← Supervisions
        </Link>

        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight text-gray-950">
                {supervisionCase.title}
              </h1>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                {supervisionCase.case_type === "group"
                  ? "Group supervision"
                  : "Individual supervision"}
              </span>
              <span className="rounded-full border border-gray-200 px-3 py-1 text-sm font-medium text-gray-600">
                {formatStatus(supervisionCase.status)}
              </span>
            </div>
            {supervisionCase.programme && (
              <p className="mt-2 text-gray-600">{supervisionCase.programme}</p>
            )}
          </div>

          {canConfigure && (
            <Link
              href={`/admin/supervisions/${caseId}/edit`}
              className="h-fit rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit configuration
            </Link>
          )}
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-950">Students</h2>
          <p className="mt-1 text-sm text-gray-500">
            Students participating in this supervision.
          </p>
          <div className="mt-5 space-y-3">
            {members.length === 0 ? (
              <p className="text-sm text-gray-500">No students assigned.</p>
            ) : (
              members.map((member) => (
                <div
                  key={member.studentId}
                  className="flex flex-col justify-between gap-2 rounded-lg bg-gray-50 px-4 py-3 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-medium text-gray-900">{member.fullName}</p>
                    {member.email && (
                      <p className="mt-1 text-xs text-gray-500">{member.email}</p>
                    )}
                  </div>
                  <Link
                    href={`/admin/students/${member.studentId}`}
                    className="text-sm font-medium text-gray-600 hover:text-gray-950"
                  >
                    View student
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-950">Supervision team</h2>
          <p className="mt-1 text-sm text-gray-500">
            Supervisor and staff assigned to this case.
          </p>
          <div className="mt-5 space-y-3">
            {staffMembers.length === 0 ? (
              <p className="text-sm text-gray-500">No staff assigned.</p>
            ) : (
              staffMembers.map((member) => (
                <div
                  key={member.profileId}
                  className="flex flex-col justify-between gap-2 rounded-lg bg-gray-50 px-4 py-3 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-medium text-gray-900">{member.fullName}</p>
                    {member.email && (
                      <p className="mt-1 text-xs text-gray-500">{member.email}</p>
                    )}
                  </div>
                  <span className="text-xs font-medium text-gray-500">
                    {member.role === "supervisor" ? "Supervisor" : "Staff"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-950">Supervision timetable</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Start date
            </p>
            <p className="mt-1 text-sm text-gray-900">
              {supervisionCase.start_date ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Target completion
            </p>
            <p className="mt-1 text-sm text-gray-900">
              {supervisionCase.target_completion_date ?? "—"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-3">
          <h2 className="text-lg font-semibold text-gray-950">Milestones</h2>
          <p className="mt-1 text-sm text-gray-500">
            Planned outputs, deadlines and progress for this supervision.
          </p>

          <div className="mt-6">
            {milestones.length === 0 ? (
              <p className="rounded-lg bg-gray-50 px-4 py-6 text-sm text-gray-500">
                No milestones have been added.
              </p>
            ) : (
              <PaginatedList className="divide-y divide-gray-100" ariaLabel="Milestones pagination">
                {milestones.map((milestone) => (
                  <div key={milestone.id} className="py-5">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row">
                      <div>
                        <p className="font-medium text-gray-900">{milestone.title}</p>
                        {milestone.description && (
                          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
                            {milestone.description}
                          </p>
                        )}
                        <p className="mt-2 text-sm text-gray-500">
                          Target: {milestone.target_date}
                        </p>
                      </div>
                      <span className="h-fit rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                        {formatMilestoneStatus(milestone.status)}
                      </span>
                    </div>

                    <MilestoneEditForm caseId={caseId} milestone={milestone} />

                    <div className="mt-4 flex flex-wrap gap-2">
                      {milestone.status !== "completed" && (
                        <form action={updateMilestoneStatus}>
                          <input type="hidden" name="case_id" value={caseId} />
                          <input type="hidden" name="milestone_id" value={milestone.id} />
                          <input type="hidden" name="status" value="completed" />
                          <button
                            type="submit"
                            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Mark completed
                          </button>
                        </form>
                      )}

                      {milestone.status === "planned" && (
                        <form action={updateMilestoneStatus}>
                          <input type="hidden" name="case_id" value={caseId} />
                          <input type="hidden" name="milestone_id" value={milestone.id} />
                          <input type="hidden" name="status" value="in_progress" />
                          <button
                            type="submit"
                            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Start
                          </button>
                        </form>
                      )}

                      <form action={deleteMilestone}>
                        <input type="hidden" name="case_id" value={caseId} />
                        <input type="hidden" name="milestone_id" value={milestone.id} />
                        <button
                          type="submit"
                          className="rounded-md px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </PaginatedList>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-950">Add milestone</h2>
          <div className="mt-6">
            <MilestoneForm caseId={caseId} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-3">
          <h2 className="text-lg font-semibold text-gray-950">Supervision meetings</h2>
          <p className="mt-1 text-sm text-gray-500">
            Scheduled meetings and supervision notes.
          </p>

          <div className="mt-6">
            {meetings.length === 0 ? (
              <p className="rounded-lg bg-gray-50 px-4 py-6 text-sm text-gray-500">
                No meetings have been recorded.
              </p>
            ) : (
              <PaginatedList className="divide-y divide-gray-100" ariaLabel="Meetings pagination">
                {meetings.map((meeting) => (
                  <div key={meeting.id} className="py-5">
                    <p className="font-medium text-gray-900">
                      {formatPortalDateTime(meeting.scheduled_at)}
                    </p>
                    {meeting.notes && (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                        {meeting.notes}
                      </p>
                    )}

                    <MeetingEditForm caseId={caseId} meeting={meeting} />

                    <form action={deleteMeeting} className="mt-3">
                      <input type="hidden" name="case_id" value={caseId} />
                      <input type="hidden" name="meeting_id" value={meeting.id} />
                      <button
                        type="submit"
                        className="text-xs font-medium text-red-700 hover:text-red-900"
                      >
                        Delete meeting
                      </button>
                    </form>
                  </div>
                ))}
              </PaginatedList>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-950">Add meeting</h2>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Meetings are booked through SavvyCal. Add the confirmed meeting here
            to maintain the supervision record.
          </p>
          <a
            href={SITE_CONFIG.savvyCalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm font-medium text-gray-700 hover:text-gray-950"
          >
            Open SavvyCal ↗
          </a>
          <div className="mt-6">
            <MeetingForm caseId={caseId} />
          </div>
        </div>
      </section>

      <AdminSubmissionsSection caseId={caseId} />
    </div>
  );
}
