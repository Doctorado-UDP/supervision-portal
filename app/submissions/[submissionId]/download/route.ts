import {
  type NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

type DownloadRouteProps = {
  params: Promise<{
    submissionId: string;
  }>;
};

export async function GET(
  request: NextRequest,
  {
    params,
  }: DownloadRouteProps
) {
  const {
    submissionId,
  } = await params;

  const supabase =
    await createClient();

  const {
    data: claimsData,
  } =
    await supabase.auth.getClaims();

  if (
    !claimsData?.claims?.sub
  ) {
    return NextResponse.redirect(
      new URL(
        "/login",
        request.url
      )
    );
  }

  // RLS determines whether this
  // authenticated user may see the row.
  const {
    data: submission,
    error: submissionError,
  } = await supabase
    .from("submissions")
    .select(
      "file_path, file_name"
    )
    .eq(
      "id",
      submissionId
    )
    .single();

  if (
    submissionError ||
    !submission
  ) {
    return NextResponse.json(
      {
        error:
          "Submission not found.",
      },
      {
        status: 404,
      }
    );
  }

  const {
    data,
    error,
  } =
    await supabase.storage
      .from("submissions")
      .createSignedUrl(
        submission.file_path,
        60,
        {
          download:
            submission.file_name,
        }
      );

  if (error || !data) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Unable to create download link.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.redirect(
    data.signedUrl
  );
}