"use client";

import {
  FormEvent,
  useRef,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";

type SubmissionUploadFormProps = {
  caseId: string;
};

const MAX_FILE_SIZE =
  25 * 1024 * 1024;

const ALLOWED_EXTENSIONS =
  new Set([
    "pdf",
    "doc",
    "docx",
  ]);

function getExtension(
  fileName: string
) {
  const parts =
    fileName
      .toLowerCase()
      .split(".");

  if (parts.length < 2) {
    return "";
  }

  return (
    parts.at(-1) ?? ""
  );
}

function sanitiseFileName(
  fileName: string
) {
  return fileName
    .trim()
    .replace(
      /[^a-zA-Z0-9._-]+/g,
      "_"
    )
    .replace(
      /^_+|_+$/g,
      ""
    );
}

export default function SubmissionUploadForm({
  caseId,
}: SubmissionUploadFormProps) {
  const router =
    useRouter();

  const fileInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    success,
    setSuccess,
  ] = useState<
    string | null
  >(null);

  const [
    uploading,
    setUploading,
  ] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    const cleanTitle =
      title.trim();

    const file =
      fileInputRef.current
        ?.files?.[0];

    // ==========================================================
    // VALIDATION
    // ==========================================================

    if (!cleanTitle) {
      setError(
        "Enter a submission title."
      );

      return;
    }

    if (!file) {
      setError(
        "Select a PDF or Word document."
      );

      return;
    }

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      setError(
        "The file must be 25 MB or smaller."
      );

      return;
    }

    const extension =
      getExtension(
        file.name
      );

    if (
      !ALLOWED_EXTENSIONS.has(
        extension
      )
    ) {
      setError(
        "Only PDF, DOC and DOCX files are allowed."
      );

      return;
    }

    setUploading(true);

    const supabase =
      createClient();

    try {
      // ========================================================
      // CURRENT USER
      // ========================================================

      const {
        data: userData,
        error: userError,
      } =
        await supabase.auth.getUser();

      if (
        userError ||
        !userData.user
      ) {
        throw new Error(
          "Your session could not be verified."
        );
      }

      const userId =
        userData.user.id;

      // ========================================================
      // NEXT CASE-LEVEL VERSION
      // ========================================================

      const {
        data: previousVersions,
        error:
          versionError,
      } = await supabase
        .from("submissions")
        .select("version")
        .eq(
          "case_id",
          caseId
        )
        .eq(
          "title",
          cleanTitle
        )
        .order(
          "version",
          {
            ascending: false,
          }
        )
        .limit(1);

      if (versionError) {
        console.error(
          versionError
        );

        throw new Error(
          "Unable to determine the next submission version."
        );
      }

      const previousVersion =
        previousVersions?.[0]
          ?.version ?? 0;

      const nextVersion =
        previousVersion + 1;

      // ========================================================
      // CASE-BASED STORAGE PATH
      // ========================================================

      const submissionId =
        crypto.randomUUID();

      const safeFileName =
        sanitiseFileName(
          file.name
        ) ||
        `submission.${extension}`;

      const filePath =
        `${caseId}/${submissionId}/${safeFileName}`;

      // ========================================================
      // UPLOAD FILE
      // ========================================================

      const {
        error: uploadError,
      } =
        await supabase.storage
          .from(
            "submissions"
          )
          .upload(
            filePath,
            file,
            {
              cacheControl:
                "3600",
              upsert: false,
            }
          );

      if (uploadError) {
        console.error(
          uploadError
        );

        throw new Error(
          uploadError.message ||
            "Unable to upload the file."
        );
      }

      // ========================================================
      // CREATE CASE-LEVEL METADATA
      // ========================================================
      //
      // student_id is intentionally NULL.
      //
      // uploaded_by records the actual user who uploaded it.
      // ========================================================

      const {
        error: metadataError,
      } = await supabase
        .from("submissions")
        .insert({
          id:
            submissionId,

          case_id:
            caseId,

          student_id:
            null,

          title:
            cleanTitle,

          version:
            nextVersion,

          file_name:
            file.name,

          file_path:
            filePath,

          file_type:
            file.type ||
            extension,

          file_size_bytes:
            file.size,

          uploaded_by:
            userId,

          submitted_at:
            new Date().toISOString(),
        });

      // ========================================================
      // REMOVE ORPHAN FILE IF DATABASE INSERT FAILS
      // ========================================================

      if (metadataError) {
        console.error(
          metadataError
        );

        await supabase.storage
          .from(
            "submissions"
          )
          .remove([
            filePath,
          ]);

        throw new Error(
          metadataError.message ||
            "The file was uploaded, but the submission record could not be created."
        );
      }

      // ========================================================
      // SUCCESS
      // ========================================================

      setTitle("");

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }

      setSuccess(
        `Submission uploaded as Version ${nextVersion}.`
      );

      router.refresh();
    } catch (
      uploadFailure
    ) {
      console.error(
        uploadFailure
      );

      setError(
        uploadFailure instanceof
          Error
          ? uploadFailure.message
          : "Unable to upload submission."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="space-y-5"
    >
      <div>
        <label
          htmlFor="submission-title"
          className="block text-sm font-medium text-gray-900"
        >
          Submission title
        </label>

        <input
          id="submission-title"
          type="text"
          value={title}
          onChange={(
            event
          ) =>
            setTitle(
              event.target.value
            )
          }
          required
          placeholder="e.g. Methods chapter"
          className="mt-2 w-full rounded-md border bg-white px-3 py-2 text-sm"
        />

        <p className="mt-1 text-xs leading-5 text-gray-500">
          Uploading the same
          title again creates the
          next version within this
          supervision.
        </p>
      </div>

      <div>
        <label
          htmlFor="submission-file"
          className="block text-sm font-medium text-gray-900"
        >
          File
        </label>

        <input
          ref={
            fileInputRef
          }
          id="submission-file"
          type="file"
          accept=".pdf,.doc,.docx"
          required
          className="mt-2 block w-full text-sm text-gray-700"
        />

        <p className="mt-1 text-xs leading-5 text-gray-500">
          PDF, DOC or DOCX.
          Maximum file size:
          25 MB.
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {success && (
        <p className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={
          uploading
        }
        className="w-full rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {uploading
          ? "Uploading..."
          : "Upload submission"}
      </button>
    </form>
  );
}