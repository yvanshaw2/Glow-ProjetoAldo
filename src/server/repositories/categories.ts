import "server-only";
import { getServiceClient } from "@/server/supabase/clients";
import type { AdminCategory } from "@/shared/api/catalog";
import { AppError } from "@/shared/errors/app-error";

// Table categories (docs/catalogo/dados.md). A category is never deleted
// (RN030); the inactive ones are listed on request.

const UNIQUE_VIOLATION = "23505";
const NAME_CONSTRAINT = "uq_categories_name";

type CategoryRow = {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  updated_at: string;
};

const CATEGORY_COLUMNS = "id, name, description, is_active, updated_at";

export type NewCategory = { name: string; description: string };

export type CategoryChanges = {
  name?: string;
  description?: string;
  isActive?: boolean;
};

function toAdminCategory(row: CategoryRow): AdminCategory {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
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

export async function listCategories(
  includeInactive: boolean,
  page: number,
  pageSize: number,
): Promise<{ categories: AdminCategory[]; total: number }> {
  const from = (page - 1) * pageSize;
  let query = getServiceClient()
    .from("categories")
    .select(CATEGORY_COLUMNS, { count: "exact" });
  if (!includeInactive) {
    query = query.eq("is_active", true);
  }
  const { data, error, count } = await query
    .order("name")
    .range(from, from + pageSize - 1)
    .returns<CategoryRow[]>();
  if (error) {
    throw error;
  }
  return { categories: data.map(toAdminCategory), total: count ?? 0 };
}

export async function findCategory(id: string): Promise<AdminCategory | null> {
  const { data, error } = await getServiceClient()
    .from("categories")
    .select(CATEGORY_COLUMNS)
    .eq("id", id)
    .maybeSingle<CategoryRow>();
  if (error) {
    throw error;
  }
  return data === null ? null : toAdminCategory(data);
}

// UC15: a new category is active (the column default).
export async function insertCategory(
  category: NewCategory,
): Promise<AdminCategory> {
  const { data, error } = await getServiceClient()
    .from("categories")
    .insert(category)
    .select(CATEGORY_COLUMNS)
    .single<CategoryRow>();
  if (error) {
    throw toFailure(error);
  }
  return toAdminCategory(data);
}

// RNF011, decision 0009: the version is checked by the update itself, so a
// change saved in between is never overwritten. Null when the row has no such
// id or no longer has that updated_at; trg_categories_updated_at writes the
// new one.
export async function updateCategory(
  id: string,
  changes: CategoryChanges,
  updatedAt: string,
): Promise<AdminCategory | null> {
  const { data, error } = await getServiceClient()
    .from("categories")
    .update({
      name: changes.name,
      description: changes.description,
      is_active: changes.isActive,
    })
    .eq("id", id)
    .eq("updated_at", updatedAt)
    .select(CATEGORY_COLUMNS)
    .maybeSingle<CategoryRow>();
  if (error) {
    throw toFailure(error);
  }
  return data === null ? null : toAdminCategory(data);
}
