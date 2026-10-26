import { requirePermission } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondPage } from "@/server/http/respond";
import { listAppointments } from "@/server/services/appointments";
import { adminAppointmentListQuerySchema } from "@/shared/validation/appointments";

// UC10: staff with the appointments permission (RS008).
export const GET = handleRoute(async ({ request }) => {
  await requirePermission("appointments");
  const query = adminAppointmentListQuerySchema.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  const { appointments, total } = await listAppointments(query, new Date());
  return respondPage(appointments, query, total);
});
