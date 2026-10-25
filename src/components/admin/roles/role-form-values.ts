import type { FormStep } from "@/components/shared/step-form";
import type { AdminRole } from "@/shared/api/staff";
import type { Permission } from "@/shared/constants/permissions";

// The values of the form of a role (docs/equipe/equipe-do-painel.md).
export type RoleFormValues = {
  name: string;
  description: string;
  permissionKeys: Permission[];
};

export function getInitialValues(role?: AdminRole): RoleFormValues {
  return {
    name: role?.name ?? "",
    description: role?.description ?? "",
    permissionKeys: role?.permissionKeys ?? [],
  };
}

// RF082: the identification first, then the permissions.
export const ROLE_STEPS: FormStep<RoleFormValues>[] = [
  { title: "Identificação", fields: ["name", "description"] },
  { title: "Permissões", fields: ["permissionKeys"] },
];
