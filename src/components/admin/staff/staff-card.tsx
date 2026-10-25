"use client";

import { ActiveConfirm } from "@/components/shared/active-confirm";
import { Badge } from "@/components/ui/badge";
import type { AdminStaffMember } from "@/shared/api/staff";

// UC20 step 2 and FA01, FA02 (docs/equipe/equipe-do-painel.md): a staff
// member with the situation and the confirmed deactivation and reactivation.

type StaffCardProps = {
  member: AdminStaffMember;
  onChange: () => void;
};

export function StaffCard({ member, onChange }: StaffCardProps) {
  const { id, firstName, lastName, email, jobTitle, roleName, isActive } =
    member;
  const fullName = `${firstName} ${lastName}`;
  return (
    <article className="flex h-full flex-col gap-3 rounded-xl bg-background p-5 shadow-neu-md">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-semibold">{fullName}</h2>
        <Badge
          variant={isActive ? "secondary" : "outline"}
          className={
            isActive ? "text-link" : "border-input text-muted-foreground"
          }
        >
          {isActive ? "Ativo" : "Inativo"}
        </Badge>
      </div>
      <div className="flex flex-col gap-1 text-muted-foreground">
        <p className="break-words">{email}</p>
        {jobTitle && <p>{jobTitle}</p>}
        <p>
          Cargo do sistema:{" "}
          <span className="font-semibold text-foreground">{roleName}</span>
        </p>
      </div>
      <div className="mt-auto flex flex-wrap gap-2 pt-2">
        <ActiveConfirm
          path={`/api/admin/staff/${id}`}
          name={fullName}
          isActive={isActive}
          updatedAt={member.updatedAt}
          deactivateTitle="Desativar este funcionário?"
          deactivateDescription="O funcionário perde o acesso ao painel administrativo. Você pode reativá-lo depois."
          reactivateTitle="Reativar este funcionário?"
          reactivateDescription="O funcionário volta a acessar o painel com o cargo atual."
          onChange={onChange}
        />
      </div>
    </article>
  );
}
