import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 items-center justify-center rounded-md border border-dashed border-gray-300 bg-white text-sm text-gray-500">
            University logo
          </div>

          <h1 className="text-2xl font-semibold text-gray-900">
            Supervision Portal
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Graduate supervision and progress tracking
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-lg font-medium text-gray-900">
            Sign in
          </h2>

          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          Access is restricted to authorised users.
        </p>
      </div>
    </main>
  );
}