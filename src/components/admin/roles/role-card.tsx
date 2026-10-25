"use client";

import { useRef } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { RoleFormDialog } from "@/components/admin/roles/role-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApiError, apiRequest } from "@/lib/api-client";
import type { AdminRole } from "@/shared/api/staff";
import { PERMISSION_LABELS } from "@/shared/constants/permissions";

// UC21 step 2 and FA02, FA03 (docs/equipe/equipe-do-painel.md): a role with
// the situation, its permissions and the confirmed deactivation and
// reactivation (RN026). After a version conflict (RNF011) the list is read
// again, so the card and the open confirmation show the current situation.

type RoleCardProps = {
  role: AdminRole;
  // The list shows the inactive roles too.
  isInactiveShown: boolean;
  onChange: () => void;
};

// A role deactivated leaves the list that hides the inactive ones, and with it
// the button that opened the confirmation: the focus goes to the switch of the
// inactive ones, in the same panel (RNF005). Any other way of closing returns
// it to the button.
function focusInactiveSwitch() {
  return document.querySelector<HTMLElement>(
    '[role="tabpanel"] [role="switch"]',
  );
}

export function RoleCard({ role, isInactiveShown, onChange }: RoleCardProps) {
  const { id, name, description, permissionKeys, isActive, updatedAt } = role;
  const wasDeactivated = useRef(false);
  return (
    <article className="flex h-full flex-col gap-3 rounded-xl bg-background p-5 shadow-neu-md">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-semibold">{name}</h2>
        <Badge
          variant={isActive ? "secondary" : "outline"}
          className={
            isActive ? "text-link" : "border-input text-muted-foreground"
          }
        >
          {isActive ? "Ativo" : "Inativo"}
        </Badge>
      </div>
      {description && <p className="text-muted-foreground">{description}</p>}
      <p className="text-muted-foreground">
        {permissionKeys.length === 1
          ? "1 permissão"
          : `${permissionKeys.length} permissões`}
      </p>
      <ul aria-label="Permissões" className="flex flex-wrap gap-2">
        {permissionKeys.map((permission) => (
          <li key={permission}>
            <Badge variant="outline" className="border-input">
              {PERMISSION_LABELS[permission]}
            </Badge>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-wrap gap-2 pt-2">
        <RoleFormDialog
          role={role}
          onSaved={onChange}
          onConflict={onChange}
          trigger={
            <Button variant="outline" aria-label={`Editar ${name}`}>
              Editar
            </Button>
          }
        />
        <ConfirmDialog
          trigger={
            <Button
              variant="outline"
              aria-label={`${isActive ? "Desativar" : "Reativar"} ${name}`}
            >
              {isActive ? "Desativar" : "Reativar"}
            </Button>
          }
          title={isActive ? "Desativar este cargo?" : "Reativar este cargo?"}
          description={
            isActive
              ? "O cargo deixa de poder ser atribuído a funcionários. Os funcionários que o têm ficam sem acesso às páginas do painel até receberem outro cargo ou até você reativá-lo."
              : "O cargo volta a poder ser atribuído a funcionários, e os que o têm voltam a acessar as páginas dele."
          }
          confirmLabel={isActive ? "Desativar" : "Reativar"}
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
              await apiRequest(`/api/admin/roles/${id}`, {
                method: "PATCH",
                body: { isActive: !isActive, updatedAt },
              });
              wasDeactivated.current = isActive;
            } catch (error) {
              if (
                error instanceof ApiError &&
                error.code === "VERSION_CONFLICT"
              ) {
                onChange();
              }
              throw error;
            }
          }}
          onConfirmed={onChange}
        />
      </div>
    </article>
  );
}
