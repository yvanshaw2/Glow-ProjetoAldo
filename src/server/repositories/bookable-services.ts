import "server-only";
import type { ServicePricing } from "@/server/rules/pricing";
import { getServiceClient } from "@/server/supabase/clients";
import type {
  BookableAdditional,
  BookableService,
} from "@/shared/api/appointments";
import type { PricingMode } from "@/shared/constants/pricing-modes";
import type { ServiceType } from "@/shared/constants/service-types";
import {
  VEHICLE_SIZES,
  type VehicleSize,
} from "@/shared/constants/vehicle-sizes";

// Reads of the services that can be booked, over services, service_prices and
// service_additionals (docs/catalogo/dados.md): active and not deleted
// (RN008, RN030), and the main and complementary ones also of an active
// category (RN031). The link of an additional stays in the table when one of
// the two services is inactive or deleted, so both sides are filtered. The
// panel reads of services.ts include the inactive ones.

const PUBLIC_TYPES = ["main", "complementary"];

type PriceRow = { size: VehicleSize; price: number | string };

type ServiceRow = {
  id: string;
  type: ServiceType;
  name: string;
  description: string | null;
  avg_duration_minutes: number;
  pricing_mode: PricingMode;
  fixed_price: number | string | null;
  category: { id: string; name: string; is_active: boolean } | null;
  service_prices: PriceRow[];
};

type AdditionalLinkRow = {
  main_service_id: string;
  additional: {
    id: string;
    name: string;
    avg_duration_minutes: number;
    fixed_price: number | string | null;
    is_active: boolean;
    deleted_at: string | null;
  } | null;
};

const COLUMNS = `id, type, name, description, avg_duration_minutes,
  pricing_mode, fixed_price, service_prices(size, price)`;
const CATEGORY = "category:categories(id, name, is_active)";
// The list keeps only the services of an active category (RN031).
const CATEGORY_INNER = "category:categories!inner(id, name, is_active)";

// A service of an order, as the pure functions of docs/agendamento/
// calculos.md take it.
export type BookableOrderService = {
  id: string;
  type: ServiceType;
  name: string;
  durationMinutes: number;
  pricing: ServicePricing;
  // The main services this one is linked to, when it is an additional.
  linkedMainServiceIds: string[];
};

// numeric(10,2) may come as text; the API gives a number.
function toPricing(row: ServiceRow): ServicePricing {
  if (row.pricing_mode === "fixed") {
    return { pricingMode: "fixed", fixedPrice: Number(row.fixed_price) };
  }
  return {
    pricingMode: "by_size",
    pricesBySize: Object.fromEntries(
      VEHICLE_SIZES.map((size) => [
        size,
        Number(row.service_prices.find((price) => price.size === size)?.price),
      ]),
    ) as Record<VehicleSize, number>,
  };
}

function priceOf(row: ServiceRow, size: VehicleSize): number {
  const pricing = toPricing(row);
  return pricing.pricingMode === "fixed"
    ? pricing.fixedPrice
    : pricing.pricesBySize[size];
}

// By name, the id breaking a tie so the pages do not repeat an item. The
// additionals of the page come in one more query, for all of its main
// services.
export async function listBookableServices(
  vehicleSize: VehicleSize,
  page: number,
  pageSize: number,
): Promise<{ services: BookableService[]; total: number }> {
  const from = (page - 1) * pageSize;
  const { data, error, count } = await getServiceClient()
    .from("services")
    .select(`${COLUMNS}, ${CATEGORY_INNER}`, { count: "exact" })
    .is("deleted_at", null)
    .eq("is_active", true)
    .in("type", PUBLIC_TYPES)
    .eq("categories.is_active", true)
    .order("name")
    .order("id")
    .range(from, from + pageSize - 1)
    .returns<ServiceRow[]>();
  if (error) {
    throw error;
  }
  const additionals = await findAdditionals(
    data.filter(({ type }) => type === "main").map(({ id }) => id),
  );
  return {
    services: data.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      type: row.type as BookableService["type"],
      category: { id: row.category?.id ?? "", name: row.category?.name ?? "" },
      price: priceOf(row, vehicleSize),
      durationMinutes: row.avg_duration_minutes,
      additionals: additionals.get(row.id) ?? [],
    })),
    total: count ?? 0,
  };
}

// The active additionals not deleted of each main service, by name.
async function findAdditionals(
  mainIds: string[],
): Promise<Map<string, BookableAdditional[]>> {
  const additionals = new Map<string, BookableAdditional[]>();
  if (mainIds.length === 0) {
    return additionals;
  }
  const { data, error } = await getServiceClient()
    .from("service_additionals")
    .select(
      "main_service_id, additional:services!fk_service_additionals_additional_service_id(id, name, avg_duration_minutes, fixed_price, is_active, deleted_at)",
    )
    .in("main_service_id", mainIds)
    .returns<AdditionalLinkRow[]>();
  if (error) {
    throw error;
  }
  for (const { main_service_id, additional } of data) {
    if (!additional || !additional.is_active || additional.deleted_at) {
      continue;
    }
    const list = additionals.get(main_service_id) ?? [];
    list.push({
      id: additional.id,
      name: additional.name,
      price: Number(additional.fixed_price),
      durationMinutes: additional.avg_duration_minutes,
    });
    additionals.set(main_service_id, list);
  }
  additionals.forEach((list) =>
    list.sort(
      (first, second) =>
        first.name.localeCompare(second.name, "pt-BR") ||
        first.id.localeCompare(second.id),
    ),
  );
  return additionals;
}

// The services among the given ids that can be booked, with what the price
// and the composition need (RN005, RN006, RN009). The ones that cannot are
// left out.
export async function findBookableOrderServices(
  ids: string[],
): Promise<BookableOrderService[]> {
  const { data, error } = await getServiceClient()
    .from("services")
    .select(`${COLUMNS}, ${CATEGORY}`)
    .in("id", ids)
    .is("deleted_at", null)
    .eq("is_active", true)
    .returns<ServiceRow[]>();
  if (error) {
    throw error;
  }
  const bookable = data.filter(
    (row) => row.type === "additional" || row.category?.is_active === true,
  );
  const additionalIds = bookable
    .filter(({ type }) => type === "additional")
    .map(({ id }) => id);
  const links = await findMainLinks(additionalIds, ids);
  return bookable.map((row) => ({
    id: row.id,
    type: row.type,
    name: row.name,
    durationMinutes: row.avg_duration_minutes,
    pricing: toPricing(row),
    linkedMainServiceIds: links.get(row.id) ?? [],
  }));
}

// The main services among `mainIds` that each additional is linked to.
async function findMainLinks(
  additionalIds: string[],
  mainIds: string[],
): Promise<Map<string, string[]>> {
  const links = new Map<string, string[]>();
  if (additionalIds.length === 0) {
    return links;
  }
  const { data, error } = await getServiceClient()
    .from("service_additionals")
    .select("main_service_id, additional_service_id")
    .in("additional_service_id", additionalIds)
    .in("main_service_id", mainIds)
    .returns<{ main_service_id: string; additional_service_id: string }[]>();
  if (error) {
    throw error;
  }
  for (const { main_service_id, additional_service_id } of data) {
    links.set(additional_service_id, [
      ...(links.get(additional_service_id) ?? []),
      main_service_id,
    ]);
  }
  return links;
}
