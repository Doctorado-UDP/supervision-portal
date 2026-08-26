import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import SiteFooter from "@/components/shared/site-footer";
import { isGlobalSupervisor } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

import {
  changeOwnPassword,
  requestEmailChange,
  updateOwnName,
} from "./actions";

type AccountPageProps = {
  searchParams: Promise<{
    notice?: string;
    error?: string;
  }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    redirect("/login");
  }

  const [profileResult, userResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email, role")
      .eq("id", userId)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  if (userResult.error || !userResult.data.user) {
    redirect("/login");
  }

  if (profileResult.error || !profileResult.data) {
    throw new Error("Could not load your account profile.");
  }

  const profile = profileResult.data;
  const user = userResult.data.user;
  const currentEmail = user.email ?? profile.email ?? "";
  const globalSupervisor = isGlobalSupervisor(profile);
  const roleLabel = globalSupervisor
    ? "Primary supervisor"
    : profile.role === "admin"
      ? "Staff"
      : "Student";
  const backHref = profile.role === "admin" ? "/admin" : "/student";

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex min-h-20 w-full max-w-5xl items-center justify-between gap-6 px-6">
          <Link href={backHref} className="flex items-center gap-4">
            <Image
              src="/branding/udp.png"
              alt="Universidad Diego Portales"
              width={164}
              height={40}
              priority
              className="h-auto w-auto max-w-[164px]"
            />
            <span className="hidden border-l border-gray-200 pl-4 text-sm font-semibold text-gray-800 sm:block">
              Supervision Portal
            </span>
          </Link>

          <Link
            href={backHref}
            className="text-sm font-medium text-gray-600 underline-offset-4 hover:text-gray-950 hover:underline"
          >
            Back to portal
          </Link>
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="mx-auto w-full max-w-3xl space-y-8">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
              Personal settings
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">
              Account
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Manage your own profile and sign-in credentials. These settings do
              not change supervision assignments or portal permissions.
            </p>
          </div>

          {params.notice && (
            <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              {params.notice}
            </div>
          )}

          {params.error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {params.error}
            </div>
          )}

          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-950">
                  Personal details
                </h2>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Your display name is used throughout the Supervision Portal.
                </p>
              </div>
              <span className="inline-flex w-fit rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                {roleLabel}
              </span>
            </div>

            <form action={updateOwnName} className="mt-6 max-w-xl space-y-4">
              <div>
                <label
                  htmlFor="full_name"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Full name
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  required
                  minLength={2}
                  defaultValue={profile.full_name}
                  autoComplete="name"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-gray-500"
                />
              </div>
              <button
                type="submit"
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
              >
                Save name
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-950">Email address</h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Your email address is your sign-in identity. A change takes effect
              only after the required email confirmation steps are completed.
            </p>

            <div className="mt-5 max-w-xl rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Current email
              </div>
              <div className="mt-1 break-all text-sm font-medium text-gray-800">
                {currentEmail}
              </div>
            </div>

            {globalSupervisor ? (
              <p className="mt-5 max-w-xl text-sm leading-6 text-gray-600">
                The primary supervisor email is fixed because it anchors global
                administrative access.
              </p>
            ) : (
              <form action={requestEmailChange} className="mt-6 max-w-xl space-y-4">
                <div>
                  <label
                    htmlFor="new_email"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    New email address
                  </label>
                  <input
                    id="new_email"
                    name="new_email"
                    type="email"
                    required
                    autoComplete="email"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-gray-500"
                  />
                </div>
                <p className="text-xs leading-5 text-gray-500">
                  For security, Supabase may require confirmation from both the
                  current and new email addresses.
                </p>
                <button
                  type="submit"
                  className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                >
                  Change email
                </button>
              </form>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-950">Password</h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Set a new password for your account. Passwords must contain at
              least 10 characters.
            </p>

            <form action={changeOwnPassword} className="mt-6 max-w-xl space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="password"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    New password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={10}
                    autoComplete="new-password"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-gray-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="confirm_password"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Confirm password
                  </label>
                  <input
                    id="confirm_password"
                    name="confirm_password"
                    type="password"
                    required
                    minLength={10}
                    autoComplete="new-password"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-gray-500"
                  />
                </div>
              </div>
              <p className="text-xs leading-5 text-gray-500">
                After the password changes, the portal signs you out so you can
                sign in again with the new password.
              </p>
              <button
                type="submit"
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
              >
                Change password
              </button>
            </form>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
