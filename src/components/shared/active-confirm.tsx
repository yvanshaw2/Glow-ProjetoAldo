"use client";

import { useRef } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { ApiError, apiRequest } from "@/lib/api-client";

// UC20 FA02 (docs/equipe/equipe-do-painel.md): the confirmed deactivation and
// reactivation of a staff member, who is never deleted (RN026, decision
// 0022). After a version conflict (RNF011) the list is read again, so the card
// and the open confirmation show the current situation.

type ActiveConfirmProps = {
  // The PATCH route of the record, as /api/admin/staff/:id.
  path: string;
  // The name the screen reader hears after the verb.
  name: string;
  isActive: boolean;
  updatedAt: string;
  // The list shows the inactive records too.
  isInactiveShown: boolean;
  deactivateTitle: string;
  deactivateDescription: string;
  reactivateTitle: string;
  reactivateDescription: string;
  onChange: () => void;
};

// A record deactivated leaves the list that hides the inactive ones, and with
// it the button that opened the confirmation: the focus goes to the switch of
// the inactive ones, in the same panel (RNF005). Any other way of closing
// returns it to the button.
function focusInactiveSwitch() {
  return document.querySelector<HTMLElement>(
    '[role="tabpanel"] [role="switch"]',
  );
}

export function ActiveConfirm({
  path,
  name,
  isActive,
  updatedAt,
  isInactiveShown,
  deactivateTitle,
  deactivateDescription,
  reactivateTitle,
  reactivateDescription,
  onChange,
}: ActiveConfirmProps) {
  const verb = isActive ? "Desativar" : "Reativar";
  const wasDeactivated = useRef(false);
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" aria-label={`${verb} ${name}`}>
          {verb}
        </Button>
      }
      title={isActive ? deactivateTitle : reactivateTitle}
      description={isActive ? deactivateDescription : reactivateDescription}
      confirmLabel={verb}
      loadingLabel={isActive ? "Desativando…" : "Reativando…"}
      cancelLabel="Voltar"
      finalFocus={() =>
        wasDeactivated.current && !isInactiveShown
          ? focusInactiveSwitch()
          : true
      }
      onConfirm={async () => {
        wasDeactivated.current = false;
        try {
          await apiRequest(path, {
            method: "PATCH",
            body: { isActive: !isActive, updatedAt },
          });
          wasDeactivated.current = isActive;
        } catch (error) {
          if (error instanceof ApiError && error.code === "VERSION_CONFLICT") {
            onChange();
          }
          throw error;
        }
      }}
      onConfirmed={onChange}
    />
  );
}
