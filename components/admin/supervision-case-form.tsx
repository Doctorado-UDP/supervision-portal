"use client";

import {
  useActionState,
} from "react";

import {
  configureSupervision,
  type ConfigureSupervisionState,
} from "@/app/admin/supervisions/actions";

type StudentOption = {
  id: string;
  fullName: string;
  email: string | null;
  programme: string | null;
};

type StaffOption = {
  id: string;
  fullName: string;
  email: string | null;
};

type InitialValues = {
  title: string;
  programme: string;
  startDate: string;
  targetCompletionDate: string;
  status: string;
  studentIds: string[];
  staffIds: string[];
};

type SupervisionCaseFormProps = {
  students: StudentOption[];
  staff: StaffOption[];
  supervisorName: string;

  caseId?: string | null;

  initialValues?: InitialValues;

  mode?: "create" | "edit";
};

const initialState: ConfigureSupervisionState =
  {
    error: null,
  };

export default function SupervisionCaseForm({
  students,
  staff,
  supervisorName,
  caseId = null,
  initialValues,
  mode = "create",
}: SupervisionCaseFormProps) {
  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    configureSupervision,
    initialState
  );

  const selectedStudentIds =
    new Set(
      initialValues?.studentIds ??
        []
    );

  const selectedStaffIds =
    new Set(
      initialValues?.staffIds ??
        []
    );

  const editing =
    mode === "edit";

  return (
    <form
      action={formAction}
      className="space-y-6"
    >
      {/* EXISTING CASE */}

      {caseId && (
        <input
          type="hidden"
          name="caseId"
          value={caseId}
        />
      )}

      {/* TITLE */}

      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-900"
        >
          Supervision title
        </label>

        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={
            initialValues?.title ??
            ""
          }
          placeholder="e.g. Digital Governance and AI"
          className="mt-2 w-full rounded-md border bg-white px-3 py-2 text-sm"
        />

        <p className="mt-1 text-xs leading-5 text-gray-500">
          Use the thesis title or a
          clear descriptive title for
          the supervision.
        </p>
      </div>

      {/* STUDENTS */}

      <fieldset>
        <legend className="text-sm font-medium text-gray-900">
          Students
        </legend>

        <p className="mt-1 text-xs leading-5 text-gray-500">
          Select one student for an
          individual supervision or
          two to three students for a
          group thesis.
        </p>

        {students.length ===
        0 ? (
          <p className="mt-3 rounded-md bg-gray-50 p-3 text-sm text-gray-500">
            No students are
            available.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {students.map(
              (student) => (
                <label
                  key={
                    student.id
                  }
                  className="flex cursor-pointer gap-3 rounded-lg border border-gray-200 bg-white p-3 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    name="studentIds"
                    value={
                      student.id
                    }
                    defaultChecked={
                      selectedStudentIds.has(
                        student.id
                      )
                    }
                    className="mt-1 h-4 w-4"
                  />

                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-900">
                      {
                        student.fullName
                      }
                    </span>

                    {student.email && (
                      <span className="block truncate text-xs text-gray-500">
                        {
                          student.email
                        }
                      </span>
                    )}

                    {student.programme && (
                      <span className="mt-1 block text-xs text-gray-500">
                        {
                          student.programme
                        }
                      </span>
                    )}
                  </span>
                </label>
              )
            )}
          </div>
        )}

        <p className="mt-2 text-xs leading-5 text-gray-500">
          Students who belong to
          another group supervision
          are excluded. Students in
          individual cases may be
          added to this case.
        </p>
      </fieldset>

      {/* PROGRAMME */}

      <div>
        <label
          htmlFor="programme"
          className="block text-sm font-medium text-gray-900"
        >
          Programme
        </label>

        <input
          id="programme"
          name="programme"
          type="text"
          required
          defaultValue={
            initialValues?.programme ??
            ""
          }
          placeholder="e.g. Master of Public Administration"
          className="mt-2 w-full rounded-md border bg-white px-3 py-2 text-sm"
        />
      </div>

      {/* DATES */}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="startDate"
            className="block text-sm font-medium text-gray-900"
          >
            Start date
          </label>

          <input
            id="startDate"
            name="startDate"
            type="date"
            required
            defaultValue={
              initialValues?.startDate ??
              ""
            }
            className="mt-2 w-full rounded-md border bg-white px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="targetCompletionDate"
            className="block text-sm font-medium text-gray-900"
          >
            Target completion
          </label>

          <input
            id="targetCompletionDate"
            name="targetCompletionDate"
            type="date"
            required
            defaultValue={
              initialValues?.targetCompletionDate ??
              ""
            }
            className="mt-2 w-full rounded-md border bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* STATUS */}

      <div>
        <label
          htmlFor="status"
          className="block text-sm font-medium text-gray-900"
        >
          Status
        </label>

        <select
          id="status"
          name="status"
          defaultValue={
            initialValues?.status ??
            "active"
          }
          className="mt-2 w-full rounded-md border bg-white px-3 py-2 text-sm"
        >
          <option value="active">
            Active
          </option>

          <option value="on_track">
            On track
          </option>

          <option value="attention">
            Needs attention
          </option>

          <option value="completed">
            Completed
          </option>

          <option value="inactive">
            Inactive
          </option>
        </select>
      </div>

      {/* SUPERVISOR */}

      <div>
        <p className="text-sm font-medium text-gray-900">
          Supervisor
        </p>

        <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-sm font-medium text-gray-900">
            {supervisorName}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Primary supervisor
          </p>
        </div>
      </div>

      {/* STAFF */}

      <fieldset>
        <legend className="text-sm font-medium text-gray-900">
          Additional staff
        </legend>

        <p className="mt-1 text-xs leading-5 text-gray-500">
          Optional. Select TAs or
          other staff associated with
          this supervision.
        </p>

        {staff.length === 0 ? (
          <p className="mt-3 rounded-md bg-gray-50 p-3 text-sm text-gray-500">
            No additional staff
            accounts are available.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {staff.map(
              (member) => (
                <label
                  key={
                    member.id
                  }
                  className="flex cursor-pointer gap-3 rounded-lg border border-gray-200 bg-white p-3 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    name="staffIds"
                    value={
                      member.id
                    }
                    defaultChecked={
                      selectedStaffIds.has(
                        member.id
                      )
                    }
                    className="mt-1 h-4 w-4"
                  />

                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-900">
                      {
                        member.fullName
                      }
                    </span>

                    {member.email && (
                      <span className="block truncate text-xs text-gray-500">
                        {
                          member.email
                        }
                      </span>
                    )}

                    <span className="mt-1 block text-xs text-gray-500">
                      Staff
                    </span>
                  </span>
                </label>
              )
            )}
          </div>
        )}
      </fieldset>

      {/* WARNING */}

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs leading-5 text-gray-600">
          {editing
            ? "Updating membership may convert an individual supervision into a group, or a group back into an individual supervision. A student removed from this case will receive a new individual supervision case."
            : "Creating a group supervision merges the selected students' existing individual supervision cases into a shared case."}
        </p>
      </div>

      {/* ERROR */}

      {state.error && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      {/* SUBMIT */}

      <button
        type="submit"
        disabled={
          pending ||
          students.length === 0
        }
        className="w-full rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending
          ? editing
            ? "Saving..."
            : "Configuring..."
          : editing
            ? "Save changes"
            : "Configure supervision"}
      </button>
    </form>
  );
}