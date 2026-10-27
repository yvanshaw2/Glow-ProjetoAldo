import type { AdminService } from "@/shared/api/catalog";
import type { ServiceUpdate } from "@/shared/validation/catalog";

// PATCH of a service (UC14, RN006, RN009): the update is applied to the service
// as it is. The result is a candidate registration, left to the schema of the
// POST to accept, so an edit never saves what a registration would refuse.

export type MergedService = {
  // The registration that results, with the fields of the type of the service.
  input: Record<string, unknown>;
  isActive: boolean;
  // The image apart from the registration: undefined keeps it, null removes
  // it, a path replaces it (UC14). The additional service has none.
  imagePath?: string | null;
};

export function mergeServiceUpdate(
  current: AdminService,
  update: ServiceUpdate,
): MergedService {
  const isActive = update.isActive ?? current.isActive;
  const { imagePath } = update;
  const common = {
    type: current.type,
    name: update.name ?? current.name,
    avgDurationMinutes: update.avgDurationMinutes ?? current.avgDurationMinutes,
  };
  if (current.type === "additional") {
    return {
      input: {
        ...common,
        fixedPrice: update.fixedPrice ?? current.fixedPrice ?? undefined,
        mainServiceIds: update.mainServiceIds ?? current.mainServiceIds,
      },
      isActive,
    };
  }
  const pricingMode = update.pricingMode ?? current.pricingMode;
  // Only the values of the mode in force: switching drops the old ones, and
  // the new ones must come with the update (RN009).
  const switched =
    update.pricingMode !== undefined && pricingMode !== current.pricingMode;
  const input: Record<string, unknown> = {
    ...common,
    categoryId: update.categoryId ?? current.category?.id,
    description: update.description ?? current.description ?? undefined,
    pricingMode,
  };
  if (pricingMode === "fixed") {
    input.fixedPrice =
      update.fixedPrice ??
      (switched ? undefined : (current.fixedPrice ?? undefined));
  } else {
    input.prices =
      update.prices ?? (switched ? undefined : (current.prices ?? undefined));
  }
  if (current.type === "main") {
    input.additionalIds = update.additionalIds ?? current.additionalIds;
  }
  return { input, isActive, imagePath };
}
