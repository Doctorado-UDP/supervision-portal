import Image from "next/image";

import SiteFooter from "@/components/shared/site-footer";

import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mb-6 flex justify-center">
              <Image
                src="/branding/university-logo.png"
                alt="University logo"
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

      <SiteFooter />
    </div>
  );
}