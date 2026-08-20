"use client";

import {
  FormEvent,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

const MAX_FILE_SIZE_BYTES =
  25 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
];

type SubmissionUploadFormProps = {
  studentId: string;
};

function getExtension(fileName: string) {
  return (
    fileName
      .split(".")
      .pop()
      ?.toLowerCase() ?? ""
  );
}

function sanitiseFileName(
  fileName: string
) {
  const extension =
    getExtension(fileName);

  const baseName =
    fileName
      .replace(/\.[^/.]+$/, "")
      .normalize("NFKD")
      .replace(
        /[^a-zA-Z0-9_-]+/g,
        "_"
      )
      .replace(/^_+|_+$/g, "")
      .slice(0, 100) ||
    "document";

  return `${baseName}.${extension}`;
}

export default function SubmissionUploadForm({
  studentId,
}: SubmissionUploadFormProps) {
  const router = useRouter();

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const [title, setTitle] =
    useState("");

  const [file, setFile] =
    useState<File | null>(null);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<string | null>(null);

  const [isUploading, setIsUploading] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanTitle =
      title.trim();

    if (!cleanTitle) {
      setErrorMessage(
        "Please enter a submission title."
      );
      return;
    }

    if (!file) {
      setErrorMessage(
        "Please select a file."
      );
      return;
    }

    const extension =
      getExtension(file.name);

    if (
      !ALLOWED_EXTENSIONS.includes(
        extension
      )
    ) {
      setErrorMessage(
        "Only PDF, DOC and DOCX files are allowed."
      );
      return;
    }

    if (
      file.size >
      MAX_FILE_SIZE_BYTES
    ) {
      setErrorMessage(
        "The file exceeds the 25 MB upload limit."
      );
      return;
    }

    setIsUploading(true);

    const supabase =
      createClient();

    // --------------------------------------------------------
    // 1. Identify authenticated uploader
    // --------------------------------------------------------

    const {
      data: userData,
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !userData.user
    ) {
      setErrorMessage(
        "Your session could not be verified. Please sign in again."
      );
      setIsUploading(false);
      return;
    }

    // --------------------------------------------------------
    // 2. Determine next version number
    // --------------------------------------------------------

    const {
      data: versions,
      error: versionError,
    } = await supabase
      .from("submissions")
      .select("version")
      .eq(
        "student_id",
        studentId
      )
      .eq("title", cleanTitle)
      .order("version", {
        ascending: false,
      })
      .limit(1);

    if (versionError) {
      console.error(versionError);

      setErrorMessage(
        "Unable to determine the submission version."
      );

      setIsUploading(false);
      return;
    }

    const nextVersion =
      (versions?.[0]?.version ??
        0) + 1;

    // --------------------------------------------------------
    // 3. Generate permanent IDs / private Storage path
    // --------------------------------------------------------

    const submissionId =
      crypto.randomUUID();

    const safeFileName =
      sanitiseFileName(
        file.name
      );

    const filePath =
      `${studentId}/${submissionId}/${safeFileName}`;

    // --------------------------------------------------------
    // 4. Upload directly to private Supabase Storage
    // --------------------------------------------------------

    const uploadOptions = {
      cacheControl: "3600",
      upsert: false,
      ...(file.type
        ? {
            contentType:
              file.type,
          }
        : {}),
    };

    const {
      error: uploadError,
    } = await supabase.storage
      .from("submissions")
      .upload(
        filePath,
        file,
        uploadOptions
      );

    if (uploadError) {
      console.error(uploadError);

      setErrorMessage(
        `Upload failed: ${uploadError.message}`
      );

      setIsUploading(false);
      return;
    }

    // --------------------------------------------------------
    // 5. Register metadata in PostgreSQL
    // --------------------------------------------------------

    const {
      error: metadataError,
    } = await supabase
      .from("submissions")
      .insert({
        id: submissionId,
        student_id:
          studentId,
        title: cleanTitle,
        version: nextVersion,
        file_name:
          file.name,
        file_path:
          filePath,
        file_type:
          file.type || null,
        file_size_bytes:
          file.size,
        uploaded_by:
          userData.user.id,
      });

    if (metadataError) {
      console.error(
        metadataError
      );

      // Avoid leaving an orphaned file
      // if the database insert failed.
      await supabase.storage
        .from("submissions")
        .remove([filePath]);

      setErrorMessage(
        "The file was uploaded but the submission record could not be created. The uploaded file has been removed."
      );

      setIsUploading(false);
      return;
    }

    setTitle("");
    setFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value =
        "";
    }

    setSuccessMessage(
      `Submission uploaded as version ${nextVersion}.`
    );

    setIsUploading(false);

    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      <div>
        <label
          htmlFor="submission-title"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Submission title
        </label>

        <input
          id="submission-title"
          type="text"
          required
          value={title}
          onChange={(event) =>
            setTitle(
              event.target.value
            )
          }
          placeholder="e.g. Methods chapter"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />

        <p className="mt-2 text-xs text-gray-500">
          Reusing the same title
          automatically creates the
          next version.
        </p>
      </div>

      <div>
        <label
          htmlFor="submission-file"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          File
        </label>

        <input
          ref={fileInputRef}
          id="submission-file"
          type="file"
          required
          accept=".pdf,.doc,.docx"
          onChange={(event) =>
            setFile(
              event.target
                .files?.[0] ??
                null
            )
          }
          className="block w-full text-sm text-gray-700"
        />

        <p className="mt-2 text-xs text-gray-500">
          PDF, DOC or DOCX. Maximum
          file size: 25 MB.
        </p>
      </div>

      {errorMessage && (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          {successMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={isUploading}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isUploading
          ? "Uploading..."
          : "Upload submission"}
      </button>
    </form>
  );
}