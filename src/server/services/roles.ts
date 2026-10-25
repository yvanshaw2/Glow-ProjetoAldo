import "server-only";
import {
  findRole,
  listRoles as selectRoles,
  saveRole,
} from "@/server/repositories/roles";
import type { AdminRole } from "@/shared/api/staff";
import { AppError } from "@/shared/errors/app-error";
import type {
  RoleInput,
  RoleListQuery,
  RoleUpdate,
} from "@/shared/validation/staff";

// Module roles (docs/equipe/): the roles of the panel (UC21).

// RF078: by name, the inactive ones only on request (UC21 FA03).
export async function listRoles({
  includeInactive,
  page,
  pageSize,
}: RoleListQuery): Promise<{ roles: AdminRole[]; total: number }> {
  return selectRoles(includeInactive, page, pageSize);
}

// UC21: a new role is active.
export async function createRole(input: RoleInput): Promise<AdminRole> {
  const id = await saveRole(null, { ...input, isActive: true }, null);
  return readSavedRole(id);
}

// UC21 FA01 and FA02, RNF011: the change is merged with the role as it is and
// saved only if nobody saved after the given version. save_role returns
// nothing for a stale version, and the role was read first, so that means a
// conflict. The permissions come as a whole and replace the old ones.
export async function updateRole(
  id: string,
  { updatedAt, ...changes }: RoleUpdate,
): Promise<AdminRole> {
  const current = await findRole(id);
  if (current === null) {
    throw new AppError("NOT_FOUND");
  }
  const savedId = await saveRole(
    id,
    {
      name: changes.name ?? current.name,
      description:
        changes.description === undefined
          ? current.description
          : changes.description,
      isActive: changes.isActive ?? current.isActive,
      permissionKeys: changes.permissionKeys ?? current.permissionKeys,
    },
    updatedAt,
  );
  if (savedId === null) {
    throw new AppError("VERSION_CONFLICT");
  }
  return readSavedRole(savedId);
}

async function readSavedRole(id: string | null): Promise<AdminRole> {
  const role = id === null ? null : await findRole(id);
  if (role === null) {
    throw new Error("The role saved by save_role was not found");
  }
  return role;
}
