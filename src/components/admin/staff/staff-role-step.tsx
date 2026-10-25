"use client";

import { useController } from "react-hook-form";
import type { StaffFormValues } from "@/components/admin/staff/staff-form-values";
import { ChoiceGroup, type Choice } from "@/components/shared/choice-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiQuery } from "@/hooks/use-api-query";
import { withQuery } from "@/lib/api-client";
import type { Page } from "@/shared/api/pagination";
import type { AdminRole } from "@/shared/api/staff";
import { MAX_PAGE_SIZE } from "@/shared/constants/pagination";

// UC19 steps 4 and 5 and UC20 step 4 (docs/equipe/equipe-do-painel.md): the
// second step of the form of a staff member, the choice of the role among the
// active ones (RN024, RN026). The role the member has stays on the list when
// it is inactive, so editing the member does not lose it.

const ROLES_PATH = "/api/admin/roles";
const LOADING_PLACES = 3;
const REQUIRED_MESSAGE = "Escolha o cargo do sistema.";

type StaffRoleStepProps = {
  // The role of the member being edited, as the list of staff gives it.
  currentRole?: { id: string; name: string };
  // The way to the roles when there is no active one (UC19 precondition).
  onGoToRoles?: () => void;
};

function toChoice(role: AdminRole): Choice<string> {
  const count = role.permissionKeys.length;
  const permissions = count === 1 ? "1 permissão" : `${count} permissões`;
  return {
    value: role.id,
    label: role.name,
    description: `${role.description ?? "Sem descrição."} ${permissions}.`,
  };
}

export function StaffRoleStep({
  currentRole,
  onGoToRoles,
}: StaffRoleStepProps) {
  const { field, fieldState } = useController<StaffFormValues, "roleId">({
    name: "roleId",
    rules: { validate: (roleId) => roleId !== null || REQUIRED_MESSAGE },
  });
  const query = useApiQuery<Page<AdminRole>>(
    withQuery(ROLES_PATH, { pageSize: MAX_PAGE_SIZE }),
  );
  if (query.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex flex-col items-start gap-3">
          {query.error.message}
          <Button type="button" variant="secondary" onClick={query.reload}>
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  if (!query.data) {
    return (
      <div aria-busy className="flex flex-col gap-3">
        {Array.from({ length: LOADING_PLACES }, (_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  const choices = query.data.data.map(toChoice);
  if (currentRole && !choices.some(({ value }) => value === currentRole.id)) {
    choices.unshift({
      value: currentRole.id,
      label: `${currentRole.name} (inativo)`,
      description: "Cargo atual do funcionário.",
    });
  }
  if (choices.length === 0) {
    return (
      <Alert role="status">
        <AlertDescription className="flex flex-col items-start gap-3">
          Não há cargo ativo. Cadastre um cargo antes de cadastrar funcionários.
          {onGoToRoles && (
            <Button type="button" variant="secondary" onClick={onGoToRoles}>
              Ir para Cargos
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <ChoiceGroup
      legend="Escolha o cargo do sistema."
      choices={choices}
      value={field.value}
      onChange={field.onChange}
      onBlur={field.onBlur}
      firstChoiceRef={field.ref}
      error={fieldState.error?.message}
    />
  );
}
