import Image from "next/image";

import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-6 flex justify-center">
            <Image
            src="/branding/udp.png"
            alt="Universidad Diego Portales"
            width={267}
            height={65}
            priority
            className="h-auto w-auto max-w-full"
            />
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