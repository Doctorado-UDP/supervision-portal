"use client";

import {
  cancelAccessInvitation,
  retryAccessInvitation,
} from "@/app/admin/access/actions";

type InvitationActionsProps = {
  invitationId: string;
};

export default function InvitationActions({
  invitationId,
}: InvitationActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <form action={retryAccessInvitation}>
        <input type="hidden" name="invitation_id" value={invitationId} />
        <button
          type="submit"
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Retry invitation
        </button>
      </form>

      <form
        action={cancelAccessInvitation}
        onSubmit={(event) => {
          if (
            !window.confirm(
              "Cancel this invitation and remove its unused onboarding account?"
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="invitation_id" value={invitationId} />
        <button
          type="submit"
          className="rounded-md border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
        >
          Cancel invitation
        </button>
      </form>
    </div>
  );
}
