import "server-only";
import { getServiceClient } from "@/server/supabase/clients";
import { getImageUrl } from "@/server/supabase/storage";
import type { AdminService, AdminServiceSummary } from "@/shared/api/catalog";
import type { PricingMode } from "@/shared/constants/pricing-modes";
import type { ServiceType } from "@/shared/constants/service-types";
import {
  VEHICLE_SIZES,
  type VehicleSize,
} from "@/shared/constants/vehicle-sizes";
import { AppError } from "@/shared/errors/app-error";
import type { ServiceListQuery } from "@/shared/validation/catalog";

// Tables services, service_prices and service_additionals
// (docs/catalogo/dados.md). A deleted service is left out of every selection
// (RN030), and so are its links in the services it was linked to.

const UNIQUE_VIOLATION = "23505";
const NAME_CONSTRAINT = "uq_services_name";

type ServiceRow = {
  id: string;
  type: ServiceType;
  name: string;
  description: string | null;
  image_path: string | null;
  avg_duration_minutes: number;
  pricing_mode: PricingMode;
  fixed_price: number | null;
  is_active: boolean;
  updated_at: string;
  category: { id: string; name: string; is_active: boolean } | null;
  service_prices: { size: VehicleSize; price: number }[];
};

const SERVICE_COLUMNS =
  "id, type, name, description, image_path, avg_duration_minutes, pricing_mode, fixed_price, is_active, updated_at, category:categories(id, name, is_active), service_prices(size, price)";

// The whole service, as save_service takes it. The prices and the links that
// do not belong to the type or to the pricing mode are not sent.
export type ServiceValues = {
  type: ServiceType;
  categoryId: string | null;
  name: string;
  description: string | null;
  avgDurationMinutes: number;
  pricingMode: PricingMode;
  fixedPrice: number | null;
  isActive: boolean;
  prices: Record<VehicleSize, number> | null;
  linkedIds: string[];
};

function toSummary(row: ServiceRow): AdminServiceSummary {
  const prices = row.service_prices.map(({ price }) => price);
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    description: row.description,
    category: row.category && { id: row.category.id, name: row.category.name },
    avgDurationMinutes: row.avg_duration_minutes,
    pricingMode: row.pricing_mode,
    fixedPrice: row.fixed_price,
    startingPrice: prices.length > 0 ? Math.min(...prices) : null,
    isActive: row.is_active,
    isCategoryActive: row.category?.is_active ?? null,
    updatedAt: row.updated_at,
  };
}

function imageUrlOf(path: string | null): string | null {
  if (path === null) {
    return null;
  }
  return getImageUrl(path);
}

// RN009: one price for each size, or none.
function toPrices(
  rows: ServiceRow["service_prices"],
): Record<VehicleSize, number> | null {
  if (rows.length === 0) {
    return null;
  }
  return Object.fromEntries(
    VEHICLE_SIZES.map((size) => [
      size,
      rows.find((row) => row.size === size)?.price,
    ]),
  ) as Record<VehicleSize, number>;
}

// RN035: the name is unique without regard to case among the services that
// were not deleted; the database decides, so two saves at once never both
// succeed.
function toFailure(error: { code?: string; message: string }): unknown {
  if (
    error.code === UNIQUE_VIOLATION &&
    error.message.includes(NAME_CONSTRAINT)
  ) {
    return new AppError("NAME_IN_USE");
  }
  return error;
}

// The LIKE wildcards of the term are plain characters.
function containsPattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, "\\$&")}%`;
}

export async function listServices({
  type,
  includeInactive,
  search,
  page,
  pageSize,
}: ServiceListQuery): Promise<{
  services: AdminServiceSummary[];
  total: number;
}> {
  const from = (page - 1) * pageSize;
  let query = getServiceClient()
    .from("services")
    .select(SERVICE_COLUMNS, { count: "exact" })
    .is("deleted_at", null);
  if (!includeInactive) {
    query = query.eq("is_active", true);
  }
  if (type) {
    query = query.eq("type", type);
  }
  if (search) {
    query = query.ilike("name", containsPattern(search));
  }
  const { data, error, count } = await query
    .order("name")
    .range(from, from + pageSize - 1)
    .returns<ServiceRow[]>();
  if (error) {
    throw error;
  }
  return { services: data.map(toSummary), total: count ?? 0 };
}

// The ids among the given ones that are services not deleted, with their
// type, to check the links before they are saved (RN006).
export async function findServicesByIds(
  ids: string[],
): Promise<{ id: string; type: ServiceType }[]> {
  if (ids.length === 0) {
    return [];
  }
  const { data, error } = await getServiceClient()
    .from("services")
    .select("id, type")
    .in("id", ids)
    .is("deleted_at", null)
    .returns<{ id: string; type: ServiceType }[]>();
  if (error) {
    throw error;
  }
  return data;
}

// The services linked to the given one, on the side of its type (RN006),
// without the deleted ones.
async function findLinkedIds(id: string, type: ServiceType): Promise<string[]> {
  if (type === "complementary") {
    return [];
  }
  const own = type === "main" ? "main_service_id" : "additional_service_id";
  const other = type === "main" ? "additional_service_id" : "main_service_id";
  const { data, error } = await getServiceClient()
    .from("service_additionals")
    .select(other)
    .eq(own, id)
    .returns<Record<string, string>[]>();
  if (error) {
    throw error;
  }
  const alive = await findServicesByIds(data.map((link) => link[other]));
  return alive.map((service) => service.id).sort();
}

export async function findService(id: string): Promise<AdminService | null> {
  const { data, error } = await getServiceClient()
    .from("services")
    .select(SERVICE_COLUMNS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle<ServiceRow>();
  if (error) {
    throw error;
  }
  if (data === null) {
    return null;
  }
  const linkedIds = await findLinkedIds(data.id, data.type);
  return {
    ...toSummary(data),
    imageUrl: imageUrlOf(data.image_path),
    prices: toPrices(data.service_prices),
    additionalIds: data.type === "main" ? linkedIds : [],
    mainServiceIds: data.type === "additional" ? linkedIds : [],
  };
}

// RNF010: the service, its prices and its links are written by save_service,
// in one transaction. Without an id it creates the service; with one it
// changes it only if the service still has the updated_at the caller read
// (RNF011, decision 0009), and returns null when it does not. Returns the id
// of the saved service.
export async function saveService(
  id: string | null,
  values: ServiceValues,
  updatedAt: string | null,
): Promise<string | null> {
  const { data, error } = await getServiceClient().rpc("save_service", {
    p_id: id,
    p_type: values.type,
    p_category_id: values.categoryId,
    p_name: values.name,
    p_description: values.description,
    p_avg_duration_minutes: values.avgDurationMinutes,
    p_pricing_mode: values.pricingMode,
    p_fixed_price: values.fixedPrice,
    p_is_active: values.isActive,
    p_prices: values.prices,
    p_linked_ids: values.linkedIds,
    p_updated_at: updatedAt,
  });
  if (error) {
    throw toFailure(error);
  }
  return (data as string | null) ?? null;
}

// UC13, UC14: the path of the image, apart from save_service, which does not
// take it. null removes the image. False when there is no such service.
export async function setServiceImage(
  id: string,
  path: string | null,
): Promise<boolean> {
  const { data, error } = await getServiceClient()
    .from("services")
    .update({ image_path: path })
    .eq("id", id)
    .is("deleted_at", null)
    .select("id");
  if (error) {
    throw toFailure(error);
  }
  return data.length > 0;
}

// RN030, UC14 FA04: only the mark; the prices and the links stay. False when
// there is no such service or it was already deleted.
export async function markServiceDeleted(id: string): Promise<boolean> {
  const { data, error } = await getServiceClient()
    .from("services")
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
