import "server-only";
import { isAuthError } from "@supabase/supabase-js";
import { createAccount, deleteAccount } from "@/server/auth/accounts";
import { logger } from "@/server/http/logger";
import {
  findAdminClient,
  insertClient,
  listClients as selectClients,
  markClientDeleted,
  restoreClient,
  updateClient as saveClient,
} from "@/server/repositories/clients";
import type { AdminClient, ClientProfile } from "@/shared/api/clients";
import { AppError } from "@/shared/errors/app-error";
import type {
  ClientInput,
  ClientListQuery,
  ClientUpdate,
} from "@/shared/validation/clients";

// Module clients (docs/clientes/): the clients in the panel (UC16, UC17).

// UC16 FE02: the panel tells the staff the e-mail is taken, by a client or by
// staff, which Supabase Auth does not tell apart (RN022).
const PANEL_EMAIL_IN_USE_MESSAGE = "Já existe uma conta com este e-mail.";

// RF069, RF070: by full name, the deleted ones left out (RN030).
export async function listClients({
  search,
  page,
  pageSize,
}: ClientListQuery): Promise<{ clients: AdminClient[]; total: number }> {
  return selectClients(search, page, pageSize);
}

// RF072: a deleted client is as missing as one that never existed.
export async function getClient(id: string): Promise<AdminClient> {
  const client = await findAdminClient(id);
  if (client === null) {
    throw new AppError("NOT_FOUND");
  }
  return client;
}

// UC04 steps 2 and 5, RS009: the account of the session, without the id,
// which the client already has and never sends.
function toProfile({ id: _id, ...profile }: AdminClient): ClientProfile {
  return profile;
}

// RF012: the data of the account of the client.
export async function getProfile(clientId: string): Promise<ClientProfile> {
  return toProfile(await getClient(clientId));
}

// RF013, RNF011: the same change and the same version check as the panel,
// only on the account of the session.
export async function updateProfile(
  clientId: string,
  update: ClientUpdate,
): Promise<ClientProfile> {
  return toProfile(await updateClient(clientId, update));
}

// UC16, RN023, RS004: the account in Supabase Auth, then the client with the
// same id and a pending password change. An account without its profile is
// removed (docs/padroes/backend.md).
export async function createClient({
  password,
  ...client
}: ClientInput): Promise<AdminClient> {
  try {
    const id = await createAccount({ email: client.email, password });
    try {
      await insertClient({ id, ...client, mustChangePassword: true });
    } catch (error) {
      await discardAccount(id);
      throw error;
    }
    return await getClient(id);
  } catch (error) {
    if (error instanceof AppError && error.code === "EMAIL_IN_USE") {
      throw new AppError("EMAIL_IN_USE", {
        message: PANEL_EMAIL_IN_USE_MESSAGE,
      });
    }
    throw error;
  }
}

// UC17 step 7, RNF011: the change is saved only if nobody saved after the
// given version. The client was read first, so a save that changes nothing
// means a conflict.
export async function updateClient(
  id: string,
  { updatedAt, ...changes }: ClientUpdate,
): Promise<AdminClient> {
  await getClient(id);
  const client = await saveClient(id, changes, updatedAt);
  if (client === null) {
    throw new AppError("VERSION_CONFLICT");
  }
  return client;
}

// UC17 FA01, RN030: the client is marked as deleted, which takes it out of
// the list and of the access, and then the account of Supabase Auth is
// removed. If the removal fails the mark is undone, so the deletion can be
// repeated and the e-mail is never held by a client nobody sees.
export async function deleteClient(id: string): Promise<void> {
  if (!(await markClientDeleted(id))) {
    throw new AppError("NOT_FOUND");
  }
  try {
    await deleteAccount(id);
  } catch (error) {
    await undoDeletion(id);
    throw error;
  }
}

async function undoDeletion(id: string): Promise<void> {
  try {
    await restoreClient(id);
  } catch {
    logger.error("client_restore_failed", { clientId: id });
  }
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
