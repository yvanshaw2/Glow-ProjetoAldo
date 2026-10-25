import "server-only";
import {
  findCategory,
  insertCategory,
  listCategories as selectCategories,
  updateCategory as saveCategory,
} from "@/server/repositories/categories";
import {
  findService,
  findServicesByIds,
  listServices as selectServices,
  markServiceDeleted,
  saveService,
  type ServiceValues,
} from "@/server/repositories/services";
import { mergeServiceUpdate } from "@/server/rules/services";
import type {
  AdminCategory,
  AdminService,
  AdminServiceSummary,
} from "@/shared/api/catalog";
import { AppError } from "@/shared/errors/app-error";
import {
  serviceInputSchema,
  type CategoryInput,
  type CategoryListQuery,
  type CategoryUpdate,
  type ServiceInput,
  type ServiceListQuery,
  type ServiceUpdate,
} from "@/shared/validation/catalog";

// Module catalog (docs/catalogo/): the categories (UC15) and the services
// (UC13, UC14) of the panel.

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

const CATEGORY_MESSAGE = "Escolha uma categoria ativa.";
const LINKED_MESSAGE = "Escolha serviços cadastrados.";

// RF058 and RF059: by name, the inactive ones only on request.
export async function listServices(
  query: ServiceListQuery,
): Promise<{ services: AdminServiceSummary[]; total: number }> {
  return selectServices(query);
}

export async function getService(id: string): Promise<AdminService> {
  const service = await findService(id);
  if (service === null) {
    throw new AppError("NOT_FOUND");
  }
  return service;
}

// UC13: a new service is active.
export async function createService(
  input: ServiceInput,
): Promise<AdminService> {
  await checkCategory(input, null);
  await checkLinks(input);
  const id = await saveService(null, toValues(input, true), null);
  return readSavedService(id);
}

// UC14 FA01 to FA03, RNF011: the change is merged with the service as it is,
// validated as a registration of its type and saved only if nobody saved
// after the given version. save_service returns nothing for a stale version,
// and the service was read first, so that means a conflict.
export async function updateService(
  id: string,
  update: ServiceUpdate,
): Promise<AdminService> {
  const current = await getService(id);
  const { input: candidate, isActive } = mergeServiceUpdate(current, update);
  const input = serviceInputSchema.parse(candidate);
  await checkCategory(input, current);
  await checkLinks(input);
  const savedId = await saveService(
    id,
    toValues(input, isActive),
    update.updatedAt,
  );
  if (savedId === null) {
    throw new AppError("VERSION_CONFLICT");
  }
  return readSavedService(savedId);
}

// UC14 FA04, RN030: the service leaves the panel and the portal; its
// appointments keep their own copy of it.
export async function deleteService(id: string): Promise<void> {
  if (!(await markServiceDeleted(id))) {
    throw new AppError("NOT_FOUND");
  }
}

function toValues(input: ServiceInput, isActive: boolean): ServiceValues {
  if (input.type === "additional") {
    return {
      type: input.type,
      categoryId: null,
      name: input.name,
      description: null,
      avgDurationMinutes: input.avgDurationMinutes,
      pricingMode: "fixed",
      fixedPrice: input.fixedPrice,
      isActive,
      prices: null,
      linkedIds: input.mainServiceIds,
    };
  }
  return {
    type: input.type,
    categoryId: input.categoryId,
    name: input.name,
    description: input.description,
    avgDurationMinutes: input.avgDurationMinutes,
    pricingMode: input.pricingMode,
    fixedPrice: input.pricingMode === "fixed" ? input.fixedPrice : null,
    isActive,
    prices: input.pricingMode === "by_size" ? input.prices : null,
    linkedIds: input.type === "main" ? input.additionalIds : [],
  };
}

// RN007 and RN031: a category chosen now is active; keeping the one the
// service has is allowed even if it was deactivated since.
async function checkCategory(
  input: ServiceInput,
  current: AdminService | null,
): Promise<void> {
  if (
    input.type === "additional" ||
    input.categoryId === current?.category?.id
  ) {
    return;
  }
  const category = await findCategory(input.categoryId);
  if (category === null || !category.isActive) {
    throw new AppError("VALIDATION_ERROR", {
      fields: { categoryId: CATEGORY_MESSAGE },
    });
  }
}

// RN006: the links are of services that exist, were not deleted and are of
// the other type; the database checks the type again.
async function checkLinks(input: ServiceInput): Promise<void> {
  if (input.type === "complementary") {
    return;
  }
  const [field, ids, linkedType] =
    input.type === "main"
      ? (["additionalIds", input.additionalIds, "additional"] as const)
      : (["mainServiceIds", input.mainServiceIds, "main"] as const);
  const found = await findServicesByIds(ids);
  const isValid = ids.every((id) =>
    found.some((service) => service.id === id && service.type === linkedType),
  );
  if (!isValid) {
    throw new AppError("VALIDATION_ERROR", {
      fields: { [field]: LINKED_MESSAGE },
    });
  }
}

async function readSavedService(id: string | null): Promise<AdminService> {
  const service = id === null ? null : await findService(id);
  if (service === null) {
    throw new Error("The service saved by save_service was not found");
  }
  return service;
}
