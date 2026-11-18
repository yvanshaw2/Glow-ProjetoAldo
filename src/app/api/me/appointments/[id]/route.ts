import { requireClient } from "@/server/auth/guards";
import { handleRoute } from "@/server/http/handler";
import { respondOk } from "@/server/http/respond";
import {
  editMyAppointment,
  getMyAppointment,
} from "@/server/services/appointments";
import { AppError } from "@/shared/errors/app-error";
import { appointmentEditSchema } from "@/shared/validation/appointments";
import { idSchema } from "@/shared/validation/params";

type Context = { body: unknown; params: { id: string } };

// An id that is not a UUID gets the 404 of a missing appointment, and so does
// the appointment of another client (RS009).
function parseId(id: string): string {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) {
    throw new AppError("NOT_FOUND");
  }
  return parsed.data;
}

// UC07: an appointment of the client of the session.
export const GET = handleRoute(async ({ params }: Context) => {
  const account = await requireClient();
  return respondOk(await getMyAppointment(account.id, parseId(params.id)));
});

// UC26: the client edits only a scheduled appointment of theirs (RN032).
export const PATCH = handleRoute(async ({ body, params }: Context) => {
  const account = await requireClient();
  const id = parseId(params.id);
  const input = appointmentEditSchema.parse(body);
  return respondOk(await editMyAppointment(account.id, id, input, new Date()));
});
