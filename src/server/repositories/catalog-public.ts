import "server-only";
import { getServiceClient } from "@/server/supabase/clients";
import { getImageUrl } from "@/server/supabase/storage";
import type { PublicCategory, PublicService } from "@/shared/api/catalog";
import type { PublicServiceQuery } from "@/shared/validation/catalog";

// Reads of the public catalog (UC01) over categories and services
// (docs/catalogo/dados.md). Only the main and complementary services that are
// active, not deleted and of an active category are read (RN008, RN031,
// RN030); the panel reads of services.ts and categories.ts include the others.

const PUBLIC_TYPES = ["main", "complementary"];

type PublicServiceRow = {
  id: string;
  name: string;
  description: string | null;
  image_path: string | null;
  avg_duration_minutes: number;
  category: PublicCategory;
};

type PublicCategoryRow = PublicCategory & { services: { id: string }[] };

function toPublicService(row: PublicServiceRow): PublicService {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    imageUrl: row.image_path === null ? null : getImageUrl(row.image_path),
    category: { id: row.category.id, name: row.category.name },
    avgDurationMinutes: row.avg_duration_minutes,
  };
}

// By name, the id breaking a tie so the pages do not repeat an item.
export async function listPublicServices({
  categoryId,
  page,
  pageSize,
}: PublicServiceQuery): Promise<{ services: PublicService[]; total: number }> {
  const from = (page - 1) * pageSize;
  let query = getServiceClient()
    .from("services")
    .select(
      "id, name, description, image_path, avg_duration_minutes, category:categories!inner(id, name)",
      { count: "exact" },
    )
    .is("deleted_at", null)
    .eq("is_active", true)
    .in("type", PUBLIC_TYPES)
    .eq("categories.is_active", true);
  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }
  const { data, error, count } = await query
    .order("name")
    .order("id")
    .range(from, from + pageSize - 1)
    .returns<PublicServiceRow[]>();
  if (error) {
    throw error;
  }
  return { services: data.map(toPublicService), total: count ?? 0 };
}

// The categories with at least one public service, by name, whole: the
// filter needs them all.
export async function listPublicCategories(): Promise<PublicCategory[]> {
  const { data, error } = await getServiceClient()
    .from("categories")
    .select("id, name, services!inner(id)")
    .eq("is_active", true)
    .eq("services.is_active", true)
    .is("services.deleted_at", null)
    .in("services.type", PUBLIC_TYPES)
    .order("name")
    .returns<PublicCategoryRow[]>();
  if (error) {
    throw error;
  }
  return data.map(({ id, name }) => ({ id, name }));
}
