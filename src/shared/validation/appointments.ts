import { z } from "zod";
import type { AppointmentStatus } from "@/shared/constants/appointment-statuses";
import {
  APPOINTMENT_SORTS,
  APPOINTMENT_VIEW_STATUSES,
  APPOINTMENT_VIEWS,
} from "@/shared/constants/appointment-views";
import {
  ADMIN_LIST_PAGE_SIZE,
  CATALOG_PAGE_SIZE,
  SHORT_LIST_PAGE_SIZE,
} from "@/shared/constants/pagination";
import { PAYMENT_METHODS } from "@/shared/constants/payment-methods";
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

// The routes of the form of a new appointment and of its preview (UC11,
// docs/agendamento/rotas.md). The values calculated by the system (prices,
// totals, status, end, copies) are never read from the body (RS013).

const SEARCH_REQUIRED_MESSAGE =
  "Digite o nome ou o e-mail para buscar o cliente.";
const CLIENT_MESSAGE = "Escolha o cliente.";
const VEHICLE_MESSAGE = "Escolha o veículo.";
const SERVICES_COUNT_MESSAGE = "Escolha de 1 a 20 serviços, sem repetir.";
const SERVICE_ID_MESSAGE = "Escolha serviços cadastrados.";
const SERVICES_REQUIRED_MESSAGE =
  "Escolha ao menos um serviço principal ou complementar.";
const PAYMENT_MESSAGE = "Escolha a forma de pagamento.";
const SCHEDULED_AT_MESSAGE = "Escolha a data e o horário.";
const DATE_MESSAGE = "Escolha a data.";
const TIME_MESSAGE = "Escolha o horário.";
const APPOINTMENT_ID_MESSAGE = "Informe um agendamento válido.";

export const MAX_ORDER_SERVICES = 20;

const clientIdSchema = z.guid({ error: CLIENT_MESSAGE });
const vehicleIdSchema = z.guid({ error: VEHICLE_MESSAGE });
const paymentMethodSchema = z.enum(PAYMENT_METHODS, {
  error: PAYMENT_MESSAGE,
});

// An instant with its offset, such as 2026-11-03T09:00:00-03:00.
const scheduledAtSchema = z.iso.datetime({
  offset: true,
  error: SCHEDULED_AT_MESSAGE,
});

// From 1 to 20 distinct services (main, complementary and additional ones
// together).
const serviceIdsSchema = z
  .array(z.guid({ error: SERVICE_ID_MESSAGE }), {
    error: SERVICES_COUNT_MESSAGE,
  })
  .min(1, { error: SERVICES_COUNT_MESSAGE })
  .max(MAX_ORDER_SERVICES, { error: SERVICES_COUNT_MESSAGE })
  .refine((ids) => new Set(ids).size === ids.length, {
    error: SERVICES_COUNT_MESSAGE,
  });

// UC11 step 2: the search is required, and the route reads nothing without it.
export const clientLookupQuerySchema = paginationSchema(
  SHORT_LIST_PAGE_SIZE,
).extend({
  search: z
    .string({ error: SEARCH_REQUIRED_MESSAGE })
    .pipe(searchTermSchema)
    .refine((term) => term !== "", { error: SEARCH_REQUIRED_MESSAGE }),
});

export const vehicleLookupQuerySchema = paginationSchema(
  SHORT_LIST_PAGE_SIZE,
).extend({ clientId: clientIdSchema });

export const serviceLookupQuerySchema = paginationSchema(
  CATALOG_PAGE_SIZE,
).extend({ vehicleId: vehicleIdSchema });

// The appointmentId of an edition (UC26) is checked and does not change the
// calculation (docs/agendamento/rotas.md).
export const appointmentPreviewSchema = z.object({
  vehicleId: vehicleIdSchema,
  serviceIds: serviceIdsSchema,
  paymentMethod: paymentMethodSchema.optional(),
  scheduledAt: scheduledAtSchema.optional(),
  appointmentId: z.guid({ error: APPOINTMENT_ID_MESSAGE }).optional(),
});

export const appointmentInputSchema = z.object({
  clientId: clientIdSchema,
  vehicleId: vehicleIdSchema,
  serviceIds: serviceIdsSchema,
  paymentMethod: paymentMethodSchema,
  scheduledAt: scheduledAtSchema,
});

export type AppointmentPreviewInput = z.output<typeof appointmentPreviewSchema>;
export type AppointmentInput = z.output<typeof appointmentInputSchema>;

// The form of the panel (UC11, RNF003): the choice of each step, with the
// message of the step. The objects are the options the steps show, of which
// only the id is read.
export const bookingFormSchema = z.looseObject({
  client: z.looseObject({ id: z.string() }, { error: CLIENT_MESSAGE }),
  vehicle: z.looseObject({ id: z.string() }, { error: VEHICLE_MESSAGE }),
  serviceIds: z.array(z.string()).min(1, { error: SERVICES_REQUIRED_MESSAGE }),
  additionalIds: z.array(z.string()),
  date: z.string({ error: DATE_MESSAGE }).min(1, { error: DATE_MESSAGE }),
  time: z.string({ error: TIME_MESSAGE }).min(1, { error: TIME_MESSAGE }),
  paymentMethod: paymentMethodSchema,
});
