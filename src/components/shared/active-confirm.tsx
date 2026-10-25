"use client";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api-client";

// UC20 FA02 and UC21 FA02 (docs/equipe/equipe-do-painel.md): the confirmed
// deactivation and reactivation of a staff member or a role, which are never
// deleted (RN026, decision 0022).

type ActiveConfirmProps = {
  // The PATCH route of the record, as /api/admin/staff/:id.
  path: string;
  // The name the screen reader hears after the verb.
  name: string;
  isActive: boolean;
  updatedAt: string;
  deactivateTitle: string;
  deactivateDescription: string;
  reactivateTitle: string;
  reactivateDescription: string;
  onChange: () => void;
};

export function ActiveConfirm({
  path,
  name,
  isActive,
  updatedAt,
  deactivateTitle,
  deactivateDescription,
  reactivateTitle,
  reactivateDescription,
  onChange,
}: ActiveConfirmProps) {
  const verb = isActive ? "Desativar" : "Reativar";
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
      onConfirm={async () => {
        await apiRequest(path, {
          method: "PATCH",
          body: { isActive: !isActive, updatedAt },
        });
      }}
      onConfirmed={onChange}
    />
  );
}
