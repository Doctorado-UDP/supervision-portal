"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function PasswordForm() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] =
    useState("");

  const [errorMessage, setErrorMessage] = useState<string | null>(
    null
  );

  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage(null);

    if (password.length < 10) {
      setErrorMessage(
        "Your password must contain at least 10 characters."
      );
      return;
    }

    if (password !== passwordConfirmation) {
      setErrorMessage("The passwords do not match.");
      return;
    }

    setIsLoading(true);

    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Password
        </label>

        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-gray-500"
        />

        <p className="mt-1 text-xs text-gray-500">
          Use at least 10 characters.
        </p>
      </div>

      <div>
        <label
          htmlFor="password-confirmation"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Confirm password
        </label>

        <input
          id="password-confirmation"
          name="password-confirmation"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          value={passwordConfirmation}
          onChange={(event) =>
            setPasswordConfirmation(event.target.value)
          }
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-gray-500"
        />
      </div>

      {errorMessage && (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-gray-900 px-4 py-2.5 font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Creating account..." : "Complete account setup"}
      </button>
    </form>
  );
}