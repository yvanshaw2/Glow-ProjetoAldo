import "server-only";
import {
  findCategory,
  insertCategory,
  listCategories as selectCategories,
  updateCategory as saveCategory,
} from "@/server/repositories/categories";
import type { AdminCategory } from "@/shared/api/catalog";
import { AppError } from "@/shared/errors/app-error";
import type {
  CategoryInput,
  CategoryListQuery,
  CategoryUpdate,
} from "@/shared/validation/catalog";

// Module catalog (docs/catalogo/): the categories of the panel (UC15).

// RF067: by name, the inactive ones only on request (UC15 FA03).
export async function listCategories({
  includeInactive,
  page,
  pageSize,
}: CategoryListQuery): Promise<{ categories: AdminCategory[]; total: number }> {
  return selectCategories(includeInactive, page, pageSize);
}

export async function createCategory(
  input: CategoryInput,
): Promise<AdminCategory> {
  return insertCategory(input);
}

// UC15 FA01 and FA02, RNF011: saved only if nobody saved after the given
// version. The update returns nothing for both a missing id and a stale
// version, so the row is read to tell them apart.
export async function updateCategory(
  id: string,
  { updatedAt, ...changes }: CategoryUpdate,
): Promise<AdminCategory> {
  const category = await saveCategory(id, changes, updatedAt);
  if (category !== null) {
    return category;
  }
  if ((await findCategory(id)) === null) {
    throw new AppError("NOT_FOUND");
  }
  throw new AppError("VERSION_CONFLICT");
}
