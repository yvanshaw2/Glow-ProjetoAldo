import { requirePermission } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondCreated, respondPage } from "@/server/http/respond";
import { createStaff, listStaff } from "@/server/services/staff";
import {
  staffInputSchema,
  staffListQuerySchema,
} from "@/shared/validation/staff";

// UC19 and UC20: staff with the staff permission (RS008, RS010).
export const GET = handleRoute(async ({ request }) => {
  await requirePermission("staff");
  const query = staffListQuerySchema.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  const { staff, total } = await listStaff(query);
  return respondPage(staff, query, total);
});

export const POST = handleRoute(async ({ body }) => {
  await requirePermission("staff");
  const input = staffInputSchema.parse(body);
  return respondCreated(await createStaff(input));
});
