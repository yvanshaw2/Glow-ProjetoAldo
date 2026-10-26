import "server-only";
import { isAuthError } from "@supabase/supabase-js";
import { createAccount, deleteAccount } from "@/server/auth/accounts";
import { logger } from "@/server/http/logger";
import { findRole } from "@/server/repositories/roles";
import {
  findStaffMember,
  insertStaff,
  listStaff as selectStaff,
  updateStaff as saveStaff,
} from "@/server/repositories/staff";
import type { AdminStaffMember } from "@/shared/api/staff";
import { AppError } from "@/shared/errors/app-error";
import type {
  StaffInput,
  StaffListQuery,
  StaffUpdate,
} from "@/shared/validation/staff";

// Module staff (docs/equipe/): the staff members in the panel (UC19, UC20).

// UC19 FE02: the panel tells the staff the e-mail is taken, by a client or by
// staff, which Supabase Auth does not tell apart (RN022).
const PANEL_EMAIL_IN_USE_MESSAGE = "Já existe uma conta com este e-mail.";

const INACTIVE_ROLE_MESSAGE = "Escolha um cargo ativo.";

// RF077, RF078: by name, the inactive ones only on request, never the admin.
export async function listStaff({
  includeInactive,
  page,
  pageSize,
}: StaffListQuery): Promise<{ staff: AdminStaffMember[]; total: number }> {
  return selectStaff(includeInactive, page, pageSize);
}

// RN026: a role that does not exist or is inactive cannot be given to a staff
// member (RN024).
async function requireActiveRole(roleId: string): Promise<void> {
  const role = await findRole(roleId);
  if (role === null || !role.isActive) {
    throw new AppError("VALIDATION_ERROR", {
      fields: { roleId: INACTIVE_ROLE_MESSAGE },
    });
  }
}

async function getStaffMember(id: string): Promise<AdminStaffMember> {
  const member = await findStaffMember(id);
  if (member === null) {
    throw new AppError("NOT_FOUND");
  }
  return member;
}

// UC19, RN023, RN024, RS004: the role is checked first, then the account in
// Supabase Auth, then the profile with the same id and a pending password
// change. An account without its profile is removed (docs/padroes/backend.md).
export async function createStaff({
  password,
  ...member
}: StaffInput): Promise<AdminStaffMember> {
  await requireActiveRole(member.roleId);
  try {
    const id = await createAccount({ email: member.email, password });
    try {
      await insertStaff({ id, ...member });
    } catch (error) {
      await discardAccount(id);
      throw error;
    }
    return await getStaffMember(id);
  } catch (error) {
    if (error instanceof AppError && error.code === "EMAIL_IN_USE") {
      throw new AppError("EMAIL_IN_USE", {
        message: PANEL_EMAIL_IN_USE_MESSAGE,
      });
    }
    throw error;
  }
}

// UC20 steps 5 and 6, FA02, RNF011: the change is saved only if nobody saved
// after the given version. The member was read first, so a save that changes
// nothing means a conflict. Keeping the current role is allowed even when it
// is inactive; a new one must be active (RN026). The admin is as missing as an
// id that does not exist (RN027). RS011: the access follows on the next
// request, because the guard reads the member every time.
export async function updateStaff(
  id: string,
  { updatedAt, ...changes }: StaffUpdate,
): Promise<AdminStaffMember> {
  const current = await getStaffMember(id);
  if (changes.roleId !== undefined && changes.roleId !== current.roleId) {
    await requireActiveRole(changes.roleId);
  }
  const member = await saveStaff(id, changes, updatedAt);
  if (member === null) {
    throw new AppError("VERSION_CONFLICT");
  }
  return member;
}

// docs/padroes/backend.md: if the removal fails too, the id goes to the log,
// so the account can be removed later, and the response is the one of the
// profile's error.
async function discardAccount(accountId: string): Promise<void> {
  try {
    await deleteAccount(accountId);
  } catch (removalError) {
    logger.error("account_removal_failed", {
      accountId,
      authCode: isAuthError(removalError) ? (removalError.code ?? null) : null,
      authStatus: isAuthError(removalError)
        ? (removalError.status ?? null)
        : null,
    });
  }
}
