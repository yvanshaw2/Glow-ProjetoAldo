import { z } from "zod";
import { ADMIN_LIST_PAGE_SIZE } from "@/shared/constants/pagination";
import {
  emailSchema,
  mobilePhoneSchema,
  passwordSchema,
  personNameSchema,
  searchTermSchema,
} from "@/shared/validation/formats";
import { paginationSchema, updatedAtSchema } from "@/shared/validation/params";

// Bodies and query of the client routes of the panel (docs/clientes/rotas.md),
// also used by the client forms. Unknown fields are discarded (RS013).

// UC16, RN023: the password is the initial one, changed at the first access.
export const clientInputSchema = z.object({
  email: emailSchema,
  firstName: personNameSchema,
  lastName: personNameSchema,
  phone: mobilePhoneSchema,
  password: passwordSchema,
});

export type ClientInput = z.output<typeof clientInputSchema>;

export type ClientFormInput = z.input<typeof clientInputSchema>;

// The fields of the edit form: the e-mail and the password are not edited.
export const clientEditSchema = clientInputSchema.pick({
  firstName: true,
  lastName: true,
  phone: true,
});

export type ClientEditInput = z.input<typeof clientEditSchema>;

// PATCH: only what came is changed, and at least one field must come, so
// nothing is saved without a reason (RNF011).
export const clientUpdateSchema = clientEditSchema
  .partial()
  .extend({ updatedAt: updatedAtSchema })
  .refine(
    ({ firstName, lastName, phone }) =>
      firstName !== undefined || lastName !== undefined || phone !== undefined,
    { error: "Informe ao menos um campo para alterar." },
  );

export type ClientUpdate = z.output<typeof clientUpdateSchema>;

// UC17 step 3: an empty search is no filter.
export const clientListQuerySchema = paginationSchema(
  ADMIN_LIST_PAGE_SIZE,
).extend({
  search: searchTermSchema.optional().transform((term) => term || undefined),
});

export type ClientListQuery = z.output<typeof clientListQuerySchema>;
