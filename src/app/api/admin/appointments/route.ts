import { requirePermission } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondCreated, respondPage } from "@/server/http/respond";
import {
  createAppointment,
  listAppointments,
} from "@/server/services/appointments";
import {
  adminAppointmentListQuerySchema,
  appointmentInputSchema,
} from "@/shared/validation/appointments";

// UC10 and UC11: staff with the appointments permission (RS008).
export const GET = handleRoute(async ({ request }) => {
  await requirePermission("appointments");
  const query = adminAppointmentListQuerySchema.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  const { appointments, total } = await listAppointments(query, new Date());
  return respondPage(appointments, query, total);
});

// The staff member of the session is the one who registered it.
export const POST = handleRoute(async ({ body }) => {
  const account = await requirePermission("appointments");
  const input = appointmentInputSchema.parse(body);
  return respondCreated(await createAppointment(input, account.id, new Date()));
});
