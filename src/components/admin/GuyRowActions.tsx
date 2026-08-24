"use client";

import { approveGuy, rejectGuy, suspendGuy, reinstateGuy } from "@/lib/actions/admin";
import { ActionButton } from "./ActionButton";
import { ReasonActionButton } from "./ReasonActionButton";
import type { GuyStatus } from "@/types/database";

export function GuyRowActions({ guyId, status }: { guyId: string; status: GuyStatus }) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {status === "pending" && (
        <>
          <ActionButton variant="trust" action={() => approveGuy(guyId)}>
            Approve
          </ActionButton>
          <ReasonActionButton
            label="Reject"
            title="Reject application"
            fieldLabel="Reason (shared with the applicant)"
            confirmVariant="danger"
            action={(reason) => rejectGuy(guyId, reason)}
          />
        </>
      )}
      {status === "approved" && (
        <ReasonActionButton
          label="Suspend"
          title="Suspend Guy"
          fieldLabel="Reason for suspension"
          confirmVariant="danger"
          action={(reason) => suspendGuy(guyId, reason)}
        />
      )}
      {(status === "suspended" || status === "rejected") && (
        <ActionButton
          variant="trust"
          confirmMessage="Reinstate this Guy to approved status?"
          action={() => reinstateGuy(guyId)}
        >
          Reinstate
        </ActionButton>
      )}
    </div>
  );
}
