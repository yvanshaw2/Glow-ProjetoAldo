import { requireClient } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondCreated, respondPage } from "@/server/http/respond";
import {
  createMyAppointment,
  listMyAppointments,
} from "@/server/services/appointments";
import {
  myAppointmentInputSchema,
  myAppointmentListQuerySchema,
} from "@/shared/validation/appointments";

// UC07: only the appointments of the client of the session (RS009).
export const GET = handleRoute(async ({ request }) => {
  const account = await requireClient();
  const query = myAppointmentListQuerySchema.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  const { appointments, total } = await listMyAppointments(account.id, query);
  return respondPage(appointments, query, total);
});

// UC06 steps 12 and 13: the client is the one of the session, never of the
// body (RS009).
export const POST = handleRoute(async ({ body }) => {
  const account = await requireClient();
  const input = myAppointmentInputSchema.parse(body);
  return respondCreated(
    await createMyAppointment(account.id, input, new Date()),
  );
});
