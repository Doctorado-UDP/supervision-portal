"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import SiteFooter from "@/components/shared/site-footer";
import { createClient } from "@/lib/supabase/client";

type RecoveryState = "verifying" | "ready" | "saving" | "failed";

export default function PasswordRecoveryPage() {
  const router = useRouter();
  const [state, setState] = useState<RecoveryState>("verifying");
  const [message, setMessage] = useState(
    "Verifying your password recovery link..."
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function establishRecoverySession() {
      const supabase = createClient();
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const errorDescription =
        hash.get("error_description") ?? url.searchParams.get("error_description");

      if (errorDescription) {
        if (!cancelled) {
          setState("failed");
          setMessage(
            decodeURIComponent(errorDescription.replace(/\+/g, " "))
          );
        }
        return;
      }

      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type");

      if (tokenHash && type === "recovery") {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });

        if (error) {
          if (!cancelled) {
            setState("failed");
            setMessage("The password recovery link is invalid or has expired.");
          }
          return;
        }

        window.history.replaceState({}, "", "/auth/recovery");

        if (!cancelled) {
          setState("ready");
          setMessage("");
        }
        return;
      }

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const hashType = hash.get("type");

      if (accessToken && refreshToken && hashType === "recovery") {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          if (!cancelled) {
            setState("failed");
            setMessage(
              "The password recovery session could not be established. The link may have expired."
            );
          }
          return;
        }

        window.history.replaceState({}, "", "/auth/recovery");

        if (!cancelled) {
          setState("ready");
          setMessage("");
        }
        return;
      }

      const code = url.searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          if (!cancelled) {
            setState("failed");
            setMessage(
              "The password recovery session could not be established. The link may have expired."
            );
          }
          return;
        }

        window.history.replaceState({}, "", "/auth/recovery");

        if (!cancelled) {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (!user) {
            setState("failed");
            setMessage("No valid password recovery session was found.");
            return;
          }

          setState("ready");
          setMessage("");
        }
        return;
      }

      if (!cancelled) {
        setState("failed");
        setMessage(
          "No valid password recovery session was found. Request a new recovery email and use the newest link."
        );
      }
    }

    void establishRecoverySession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handlePasswordUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 10) {
      setMessage("Choose a password with at least 10 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("The passwords do not match.");
      return;
    }

    setState("saving");
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      console.error("Password recovery update failed:", error);
      setState("ready");
      setMessage(error.message || "Your password could not be updated.");
      return;
    }

    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      console.error("Password recovery sign-out failed:", signOutError);
    }

    router.replace(
      "/login?message=Password updated. Please sign in with your new password."
    );
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900">
      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
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
              Reset your password
            </h1>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            {state === "verifying" && (
              <p className="text-sm leading-6 text-gray-600">{message}</p>
            )}

            {state === "failed" && (
              <>
                <p className="text-sm leading-6 text-red-700">{message}</p>
                <div className="mt-6 flex flex-wrap gap-4">
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm font-medium text-gray-700 underline-offset-4 hover:text-gray-950 hover:underline"
                  >
                    Request a new recovery email
                  </Link>
                  <Link
                    href="/login"
                    className="text-sm font-medium text-gray-500 underline-offset-4 hover:text-gray-900 hover:underline"
                  >
                    Return to sign in
                  </Link>
                </div>
              </>
            )}

            {(state === "ready" || state === "saving") && (
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
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
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-gray-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirm_password"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Confirm new password
                  </label>
                  <input
                    id="confirm_password"
                    name="confirm_password"
                    type="password"
                    required
                    minLength={10}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-gray-500"
                  />
                </div>

                <p className="text-xs leading-5 text-gray-500">
                  Use at least 10 characters. After the password changes, the
                  portal signs this account out.
                </p>

                {message && (
                  <p className="text-sm font-medium text-red-700">{message}</p>
                )}

                <button
                  type="submit"
                  disabled={state === "saving"}
                  className="w-full rounded-md bg-gray-900 px-4 py-2.5 font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {state === "saving" ? "Updating password..." : "Update password"}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
