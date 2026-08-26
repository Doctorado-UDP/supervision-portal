"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";

import SiteFooter from "@/components/shared/site-footer";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setError("Enter your email address.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/recovery`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      { redirectTo }
    );

    setSubmitting(false);

    if (resetError) {
      console.error("Password recovery request failed:", resetError);
      setError(
        "The password recovery request could not be processed. Please try again."
      );
      return;
    }

    setSent(true);
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900">
      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mb-6 flex justify-center">
              <Image
                src="/branding/udp.png"
                alt="Universidad Diego Portales"
                width={220}
                height={54}
                priority
                className="h-auto w-auto max-w-full"
              />
            </div>
            <h1 className="text-2xl font-semibold text-gray-950">
              Recover your password
            </h1>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            {sent ? (
              <>
                <p className="text-sm leading-6 text-gray-600">
                  If an account exists for that email address, a password
                  recovery message has been sent. Follow the link in the email
                  to choose a new password.
                </p>
                <Link
                  href="/login"
                  className="mt-6 inline-flex text-sm font-medium text-gray-700 underline-offset-4 hover:text-gray-950 hover:underline"
                >
                  Return to sign in
                </Link>
              </>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-gray-500"
                  />
                </div>

                <p className="text-xs leading-5 text-gray-500">
                  For security, the portal will not indicate whether an account
                  exists for the email address entered.
                </p>

                {error && (
                  <p className="text-sm font-medium text-red-700">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-md bg-gray-900 px-4 py-2.5 font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Sending recovery email..." : "Send recovery email"}
                </button>

                <div className="text-center">
                  <Link
                    href="/login"
                    className="text-sm font-medium text-gray-600 underline-offset-4 hover:text-gray-950 hover:underline"
                  >
                    Back to sign in
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
