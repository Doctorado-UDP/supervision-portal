"use client";

import { deleteAccessAccount } from "@/app/admin/access/actions";

type AccountDeleteButtonProps = {
  userId: string;
  fullName: string;
};

export default function AccountDeleteButton({
  userId,
  fullName,
}: AccountDeleteButtonProps) {
  return (
    <form
      action={deleteAccessAccount}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `Delete ${fullName}'s account?\n\nThis permanently removes the sign-in account. Empty individual Student setup can be cleaned up automatically, but accounts with supervision history, group supervision, or Staff assignments are protected and will not be deleted.`
        );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="user_id" value={userId} />
      <button
        type="submit"
        className="rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
      >
        Delete account
      </button>
    </form>
  );
}
