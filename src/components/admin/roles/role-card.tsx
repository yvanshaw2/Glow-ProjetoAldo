"use client";

import { ActiveConfirm } from "@/components/shared/active-confirm";
import { Badge } from "@/components/ui/badge";
import type { AdminRole } from "@/shared/api/staff";
import { PERMISSION_LABELS } from "@/shared/constants/permissions";

// UC21 step 2 and FA02, FA03 (docs/equipe/equipe-do-painel.md): a role with
// the situation, its permissions and the confirmed deactivation and
// reactivation (RN026).

type RoleCardProps = {
  role: AdminRole;
  onChange: () => void;
};

export function RoleCard({ role, onChange }: RoleCardProps) {
  const { id, name, description, permissionKeys, isActive, updatedAt } = role;
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
        <ActiveConfirm
          path={`/api/admin/roles/${id}`}
          name={name}
          isActive={isActive}
          updatedAt={updatedAt}
          deactivateTitle="Desativar este cargo?"
          deactivateDescription="O cargo deixa de poder ser atribuído a funcionários. Os funcionários que já o têm continuam com ele."
          reactivateTitle="Reativar este cargo?"
          reactivateDescription="O cargo volta a poder ser atribuído a funcionários."
          onChange={onChange}
        />
      </div>
    </article>
  );
}
