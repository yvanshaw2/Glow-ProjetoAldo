import "server-only";
import { getServiceClient } from "@/server/supabase/clients";
import type { AdminRole } from "@/shared/api/staff";
import { PERMISSIONS, type Permission } from "@/shared/constants/permissions";
import { AppError } from "@/shared/errors/app-error";

// Tables roles and role_permissions (docs/equipe/dados.md). A role is never
// deleted (RN026); the inactive ones are listed on request.

const UNIQUE_VIOLATION = "23505";
const NAME_CONSTRAINT = "uq_roles_name";

type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  updated_at: string;
  role_permissions: { permission_key: Permission }[];
};

const ROLE_COLUMNS =
  "id, name, description, is_active, updated_at, role_permissions(permission_key)";

// The whole role, as save_role takes it.
export type RoleValues = {
  name: string;
  description: string | null;
  isActive: boolean;
  permissionKeys: Permission[];
};

function toAdminRole(row: RoleRow): AdminRole {
  const keys = row.role_permissions.map(({ permission_key }) => permission_key);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    // RN025: the order of the panel, whatever order the database answers in.
    permissionKeys: PERMISSIONS.filter((permission) =>
      keys.includes(permission),
    ),
    isActive: row.is_active,
    updatedAt: row.updated_at,
  };
}

// RN035: the name is unique without regard to case; the database decides, so
// two saves at once never both succeed.
function toFailure(error: { code?: string; message: string }): unknown {
  if (
    error.code === UNIQUE_VIOLATION &&
    error.message.includes(NAME_CONSTRAINT)
  ) {
    return new AppError("NAME_IN_USE");
  }
  return error;
}

export async function listRoles(
  includeInactive: boolean,
  page: number,
  pageSize: number,
): Promise<{ roles: AdminRole[]; total: number }> {
  const from = (page - 1) * pageSize;
  let query = getServiceClient()
    .from("roles")
    .select(ROLE_COLUMNS, { count: "exact" });
  if (!includeInactive) {
    query = query.eq("is_active", true);
  }
  const { data, error, count } = await query
    .order("name")
    .range(from, from + pageSize - 1)
    .returns<RoleRow[]>();
  if (error) {
    throw error;
  }
  return { roles: data.map(toAdminRole), total: count ?? 0 };
}

export async function findRole(id: string): Promise<AdminRole | null> {
  const { data, error } = await getServiceClient()
    .from("roles")
    .select(ROLE_COLUMNS)
    .eq("id", id)
    .maybeSingle<RoleRow>();
  if (error) {
    throw error;
  }
  return data === null ? null : toAdminRole(data);
}

// RNF010: the role and its permissions are written by save_role, in one
// transaction. Without an id it creates the role; with one it changes it only
// if the role still has the updated_at the caller read (RNF011, decision
// 0009), and returns null when it does not. Returns the id of the saved role.
export async function saveRole(
  id: string | null,
  values: RoleValues,
  updatedAt: string | null,
): Promise<string | null> {
  const { data, error } = await getServiceClient().rpc("save_role", {
    p_id: id,
    p_name: values.name,
    p_description: values.description,
    p_is_active: values.isActive,
    p_permission_keys: values.permissionKeys,
    p_updated_at: updatedAt,
  });
  if (error) {
    throw toFailure(error);
  }
  return (data as string | null) ?? null;
}
