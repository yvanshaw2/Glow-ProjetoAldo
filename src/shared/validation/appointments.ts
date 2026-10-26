import { z } from "zod";
import type { AppointmentStatus } from "@/shared/constants/appointment-statuses";
import {
  APPOINTMENT_SORTS,
  APPOINTMENT_VIEW_STATUSES,
  APPOINTMENT_VIEWS,
} from "@/shared/constants/appointment-views";
import { ADMIN_LIST_PAGE_SIZE } from "@/shared/constants/pagination";
import { searchTermSchema } from "@/shared/validation/formats";
import { paginationSchema } from "@/shared/validation/params";

// Query of the appointment routes of the panel (docs/agendamento/rotas.md).
// Unknown parameters are discarded (RS013).

const VIEW_MESSAGE = "Escolha uma visão válida.";
const STATUS_MESSAGE = "Escolha um status desta visão.";
const SORT_MESSAGE = "Escolha uma ordenação válida.";

// UC10 steps 2 to 4: the view is required; the status, if it comes, is one of
// the statuses of the view (RF046); an empty status or search is no filter.
export const adminAppointmentListQuerySchema = paginationSchema(
  ADMIN_LIST_PAGE_SIZE,
)
  .extend({
    view: z.enum(APPOINTMENT_VIEWS, { error: VIEW_MESSAGE }),
    status: z.string().optional(),
    sort: z.enum(APPOINTMENT_SORTS, { error: SORT_MESSAGE }).default("time"),
    search: searchTermSchema.optional().transform((term) => term || undefined),
  })
  .superRefine(({ view, status }, context) => {
    const statuses: readonly string[] = APPOINTMENT_VIEW_STATUSES[view];
    if (status && !statuses.includes(status)) {
      context.addIssue({
        code: "custom",
        message: STATUS_MESSAGE,
        path: ["status"],
      });
    }
  })
  .transform(({ status, ...query }) => ({
    ...query,
    status: (status || undefined) as AppointmentStatus | undefined,
  }));

export type AdminAppointmentListQuery = z.output<
  typeof adminAppointmentListQuerySchema
>;
