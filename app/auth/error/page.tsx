import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">
          Invitation could not be verified
        </h1>

        <p className="mt-4 text-sm leading-6 text-gray-600">
          The invitation link may be invalid or may have expired.
          Please contact your supervisor for a new invitation.
        </p>

        <Link
          href="/login"
          className="mt-6 inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Return to sign in
        </Link>
      </div>
    </main>
  );
}