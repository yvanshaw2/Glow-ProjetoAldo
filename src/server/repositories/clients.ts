import "server-only";
import { getServiceClient } from "@/server/supabase/clients";
import { clientSearchFilters } from "@/server/repositories/client-search";
import type { AdminClient } from "@/shared/api/clients";
import { AppError } from "@/shared/errors/app-error";

// Table clients (docs/clientes/dados.md). A deleted client is left out of
// every selection (RN030).

const UNIQUE_VIOLATION = "23505";
const EMAIL_CONSTRAINT = "uq_clients_email";

type ClientAccountRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  must_change_password: boolean;
};

export type ClientAccount = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mustChangePassword: boolean;
};

export type NewClient = {
  // The id of the Supabase Auth account.
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  // RN023, RS004: the client created by the staff changes the initial
  // password at the first access; the public sign-up has no pending change.
  mustChangePassword?: boolean;
};

type AdminClientRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  updated_at: string;
};

const ADMIN_CLIENT_COLUMNS =
  "id, first_name, last_name, email, phone, updated_at";

export type ClientChanges = {
  firstName?: string;
  lastName?: string;
  phone?: string;
};

function toAdminClient(row: AdminClientRow): AdminClient {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    updatedAt: row.updated_at,
  };
}

const CLIENT_ACCOUNT_COLUMNS =
  "id, first_name, last_name, email, must_change_password";

function toClientAccount(row: ClientAccountRow): ClientAccount {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    mustChangePassword: row.must_change_password,
  };
}

export async function findClientAccount(
  id: string,
): Promise<ClientAccount | null> {
  const { data, error } = await getServiceClient()
    .from("clients")
    .select(CLIENT_ACCOUNT_COLUMNS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle<ClientAccountRow>();
  if (error) {
    throw error;
  }
  return data === null ? null : toClientAccount(data);
}

export async function insertClient({
  id,
  firstName,
  lastName,
  email,
  phone,
  mustChangePassword = false,
}: NewClient): Promise<void> {
  const { error } = await getServiceClient().from("clients").insert({
    id,
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    must_change_password: mustChangePassword,
  });
  if (!error) {
    return;
  }
  // RN022: another client that was not deleted has the e-mail.
  if (
    error.code === UNIQUE_VIOLATION &&
    error.message.includes(EMAIL_CONSTRAINT)
  ) {
    throw new AppError("EMAIL_IN_USE");
  }
  throw error;
}

// RS004: only a pending change is cleared, so updated_at does not change
// without a reason (RNF011).
export async function clearClientPasswordChange(id: string): Promise<void> {
  const { error } = await getServiceClient()
    .from("clients")
    .update({ must_change_password: false })
    .eq("id", id)
    .eq("must_change_password", true);
  if (error) {
    throw error;
  }
}

// RF069, RF070: by full name, the deleted ones left out (RN030). The words of
// the search are chained filters, so all of them apply.
export async function listClients(
  search: string | undefined,
  page: number,
  pageSize: number,
): Promise<{ clients: AdminClient[]; total: number }> {
  const from = (page - 1) * pageSize;
  let query = getServiceClient()
    .from("clients")
    .select(ADMIN_CLIENT_COLUMNS, { count: "exact" })
    .is("deleted_at", null);
  for (const filter of clientSearchFilters(search ?? "")) {
    query = query.or(filter);
  }
  const { data, error, count } = await query
    .order("first_name")
    .order("last_name")
    .order("id")
    .range(from, from + pageSize - 1)
    .returns<AdminClientRow[]>();
  if (error) {
    throw error;
  }
  return { clients: data.map(toAdminClient), total: count ?? 0 };
}

export async function findAdminClient(id: string): Promise<AdminClient | null> {
  const { data, error } = await getServiceClient()
    .from("clients")
    .select(ADMIN_CLIENT_COLUMNS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle<AdminClientRow>();
  if (error) {
    throw error;
  }
  return data === null ? null : toAdminClient(data);
}

// RNF011, decision 0009: the version is checked by the update itself, so a
// change saved in between is never overwritten. Null when the client has no
// such id, was deleted or no longer has that updated_at;
// trg_clients_updated_at writes the new one.
export async function updateClient(
  id: string,
  changes: ClientChanges,
  updatedAt: string,
): Promise<AdminClient | null> {
  const { data, error } = await getServiceClient()
    .from("clients")
    .update({
      first_name: changes.firstName,
      last_name: changes.lastName,
      phone: changes.phone,
    })
    .eq("id", id)
    .eq("updated_at", updatedAt)
    .is("deleted_at", null)
    .select(ADMIN_CLIENT_COLUMNS)
    .maybeSingle<AdminClientRow>();
  if (error) {
    throw error;
  }
  return data === null ? null : toAdminClient(data);
}

// RN030: false when the client does not exist or was already deleted.
export async function markClientDeleted(id: string): Promise<boolean> {
  const { data, error } = await getServiceClient()
    .from("clients")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data !== null;
}

// The deletion of the account failed, so the client is back.
export async function restoreClient(id: string): Promise<void> {
  const { error } = await getServiceClient()
    .from("clients")
    .update({ deleted_at: null })
    .eq("id", id);
  if (error) {
    throw error;
  }
}
