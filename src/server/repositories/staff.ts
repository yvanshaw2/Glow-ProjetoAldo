import "server-only";
import { getServiceClient } from "@/server/supabase/clients";
import type { AdminStaffMember } from "@/shared/api/staff";
import type { Permission } from "@/shared/constants/permissions";
import { AppError } from "@/shared/errors/app-error";

// Table staff, with its role and the role's permissions
// (docs/equipe/dados.md).

type StaffAccountRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  must_change_password: boolean;
  roles: {
    is_active: boolean;
    role_permissions: { permission_key: Permission }[];
  } | null;
};

export type StaffAccount = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isAdmin: boolean;
  isActive: boolean;
  mustChangePassword: boolean;
  // Null for the admin, who has no role (RN027).
  role: { isActive: boolean; permissions: Permission[] } | null;
};

const STAFF_ACCOUNT_COLUMNS =
  "id, first_name, last_name, email, is_admin, is_active, must_change_password, roles(is_active, role_permissions(permission_key))";

function toStaffAccount(row: StaffAccountRow): StaffAccount {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    isAdmin: row.is_admin,
    isActive: row.is_active,
    mustChangePassword: row.must_change_password,
    role:
      row.roles === null
        ? null
        : {
            isActive: row.roles.is_active,
            permissions: row.roles.role_permissions.map(
              ({ permission_key }) => permission_key,
            ),
          },
  };
}

// Account, situation, role and permissions in a single query (RS011).
export async function findStaffAccount(
  id: string,
): Promise<StaffAccount | null> {
  const { data, error } = await getServiceClient()
    .from("staff")
    .select(STAFF_ACCOUNT_COLUMNS)
    .eq("id", id)
    .maybeSingle<StaffAccountRow>();
  if (error) {
    throw error;
  }
  return data === null ? null : toStaffAccount(data);
}

// RS004: only a pending change is cleared, so updated_at does not change
// without a reason (RNF011).
export async function clearStaffPasswordChange(id: string): Promise<void> {
  const { error } = await getServiceClient()
    .from("staff")
    .update({ must_change_password: false })
    .eq("id", id)
    .eq("must_change_password", true);
  if (error) {
    throw error;
  }
}

const UNIQUE_VIOLATION = "23505";
const EMAIL_CONSTRAINT = "uq_staff_email";

type AdminStaffRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  job_title: string | null;
  role_id: string;
  is_active: boolean;
  updated_at: string;
  roles: { name: string } | null;
};

const ADMIN_STAFF_COLUMNS =
  "id, first_name, last_name, email, job_title, role_id, is_active, updated_at, roles(name)";

export type NewStaff = {
  // The id of the Supabase Auth account.
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string | null;
  roleId: string;
};

// What a PATCH can change; absent is unchanged, and a null job title erases it.
export type StaffChanges = {
  firstName?: string;
  lastName?: string;
  jobTitle?: string | null;
  roleId?: string;
  isActive?: boolean;
};

function toAdminStaffMember(row: AdminStaffRow): AdminStaffMember {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    jobTitle: row.job_title,
    roleId: row.role_id,
    // Every account but the admin has a role (ck_staff_role_id).
    roleName: row.roles?.name ?? "",
    isActive: row.is_active,
    updatedAt: row.updated_at,
  };
}

// RN027: the admin account is left out of every selection of the panel.
// RF077, RF078: by name, the inactive ones only on request.
export async function listStaff(
  includeInactive: boolean,
  page: number,
  pageSize: number,
): Promise<{ staff: AdminStaffMember[]; total: number }> {
  const from = (page - 1) * pageSize;
  let query = getServiceClient()
    .from("staff")
    .select(ADMIN_STAFF_COLUMNS, { count: "exact" })
    .eq("is_admin", false);
  if (!includeInactive) {
    query = query.eq("is_active", true);
  }
  const { data, error, count } = await query
    .order("first_name")
    .order("last_name")
    .order("id")
    .range(from, from + pageSize - 1)
    .returns<AdminStaffRow[]>();
  if (error) {
    throw error;
  }
  return { staff: data.map(toAdminStaffMember), total: count ?? 0 };
}

export async function findStaffMember(
  id: string,
): Promise<AdminStaffMember | null> {
  const { data, error } = await getServiceClient()
    .from("staff")
    .select(ADMIN_STAFF_COLUMNS)
    .eq("id", id)
    .eq("is_admin", false)
    .maybeSingle<AdminStaffRow>();
  if (error) {
    throw error;
  }
  return data === null ? null : toAdminStaffMember(data);
}

// UC19 step 6: the profile of an account already created in Supabase Auth,
// active and with the password change pending (RN023, RS004).
export async function insertStaff({
  id,
  firstName,
  lastName,
  email,
  jobTitle,
  roleId,
}: NewStaff): Promise<void> {
  const { error } = await getServiceClient().from("staff").insert({
    id,
    first_name: firstName,
    last_name: lastName,
    email,
    job_title: jobTitle,
    role_id: roleId,
    must_change_password: true,
  });
  if (!error) {
    return;
  }
  // RN022: another staff member has the e-mail.
  if (
    error.code === UNIQUE_VIOLATION &&
    error.message.includes(EMAIL_CONSTRAINT)
  ) {
    throw new AppError("EMAIL_IN_USE");
  }
  throw error;
}

// RNF011, decision 0009: the version is checked by the update itself, so a
// change saved in between is never overwritten. Null when the member does not
// exist, is the admin or no longer has that updated_at; trg_staff_updated_at
// writes the new one.
export async function updateStaff(
  id: string,
  changes: StaffChanges,
  updatedAt: string,
): Promise<AdminStaffMember | null> {
  const { data, error } = await getServiceClient()
    .from("staff")
    .update({
      first_name: changes.firstName,
      last_name: changes.lastName,
      job_title: changes.jobTitle,
      role_id: changes.roleId,
      is_active: changes.isActive,
    })
    .eq("id", id)
    .eq("is_admin", false)
    .eq("updated_at", updatedAt)
    .select(ADMIN_STAFF_COLUMNS)
    .maybeSingle<AdminStaffRow>();
  if (error) {
    throw error;
  }
  return data === null ? null : toAdminStaffMember(data);
}
