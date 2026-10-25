import { z } from "zod";
import { ADMIN_LIST_PAGE_SIZE } from "@/shared/constants/pagination";
import { PRICING_MODES } from "@/shared/constants/pricing-modes";
import { SERVICE_TYPES } from "@/shared/constants/service-types";
import { VEHICLE_SIZES } from "@/shared/constants/vehicle-sizes";
import {
  DESCRIPTION_MAX_LENGTH,
  REQUIRED_MESSAGE,
  durationMinutesSchema,
  entityNameSchema,
  moneySchema,
  plainTextSchema,
  searchTermSchema,
} from "@/shared/validation/formats";
import {
  booleanQuerySchema,
  paginationSchema,
  updatedAtSchema,
} from "@/shared/validation/params";

// Bodies and query of the category and service routes (docs/catalogo/rotas.md),
// also used by their forms. Unknown fields are discarded (RS013).

// UC15: the name and the description, both required (RN035).
export const categoryInputSchema = z.object({
  name: entityNameSchema,
  description: plainTextSchema(DESCRIPTION_MAX_LENGTH),
});

export type CategoryInput = z.output<typeof categoryInputSchema>;

export type CategoryFormInput = z.input<typeof categoryInputSchema>;

// PATCH: edits, deactivates or reactivates; only what came is changed, and at
// least one field must come, so nothing is saved without a reason (RNF011).
export const categoryUpdateSchema = z
  .object({
    name: entityNameSchema.optional(),
    description: plainTextSchema(DESCRIPTION_MAX_LENGTH).optional(),
    isActive: z.boolean().optional(),
    updatedAt: updatedAtSchema,
  })
  .refine(
    ({ name, description, isActive }) =>
      name !== undefined || description !== undefined || isActive !== undefined,
    { error: "Informe ao menos um campo para alterar." },
  );

export type CategoryUpdate = z.output<typeof categoryUpdateSchema>;

export const categoryListQuerySchema = paginationSchema(
  ADMIN_LIST_PAGE_SIZE,
).extend({
  includeInactive: booleanQuerySchema.default(false),
});

export type CategoryListQuery = z.output<typeof categoryListQuerySchema>;

const CATEGORY_MESSAGE = "Escolha uma categoria ativa.";
const LINKED_MESSAGE = "Escolha serviços cadastrados.";
const NO_FIELD_MESSAGE = "Informe ao menos um campo para alterar.";

// An id of the body: absent or empty is missing, anything else that is not an
// id gets the message of the field. Whether it exists is the service's.
function idField(message: string) {
  return z.guid({
    error: (issue) =>
      issue.input === undefined || issue.input === ""
        ? REQUIRED_MESSAGE
        : message,
  });
}

// RN006: the links of a service, without repetition.
const linkedIdsSchema = z
  .array(idField(LINKED_MESSAGE), { error: LINKED_MESSAGE })
  .transform((ids) => [...new Set(ids)]);

// RN009: one price for each size.
const pricesSchema = z.object(
  Object.fromEntries(
    VEHICLE_SIZES.map((size) => [size, moneySchema]),
  ) as Record<(typeof VEHICLE_SIZES)[number], typeof moneySchema>,
  { error: () => REQUIRED_MESSAGE },
);

const serviceFields = {
  name: entityNameSchema,
  avgDurationMinutes: durationMinutesSchema,
};

// RN007 and RN009: main and complementary services have a category and a
// description, and a fixed price or one price for each size.
function pricedService<
  Type extends "main" | "complementary",
  Extra extends z.ZodRawShape,
>(type: Type, extra: Extra) {
  const shared = {
    type: z.literal(type),
    categoryId: idField(CATEGORY_MESSAGE),
    description: plainTextSchema(DESCRIPTION_MAX_LENGTH),
    ...serviceFields,
    ...extra,
  };
  return z.discriminatedUnion(
    "pricingMode",
    [
      z.object({
        ...shared,
        pricingMode: z.literal("fixed"),
        fixedPrice: moneySchema,
      }),
      z.object({
        ...shared,
        pricingMode: z.literal("by_size"),
        prices: pricesSchema,
      }),
    ],
    { error: () => REQUIRED_MESSAGE },
  );
}

// UC13: the body of POST. The additional service has only a fixed price and
// no category, description or image (FA01); the complementary has no
// additionals (FA02). The fields of another type are discarded (RS013), and
// the image comes by its own route.
export const serviceInputSchema = z.discriminatedUnion(
  "type",
  [
    pricedService("main", { additionalIds: linkedIdsSchema.default([]) }),
    pricedService("complementary", {}),
    z.object({
      type: z.literal("additional"),
      ...serviceFields,
      fixedPrice: moneySchema,
      mainServiceIds: linkedIdsSchema.default([]),
    }),
  ],
  { error: () => REQUIRED_MESSAGE },
);

export type ServiceInput = z.output<typeof serviceInputSchema>;

// PATCH: edits, deactivates or reactivates (UC14). Only what came is changed,
// and at least one field must come; the service merges it with the current
// one and validates the result as a registration. The type does not change.
export const serviceUpdateSchema = z
  .object({
    categoryId: idField(CATEGORY_MESSAGE).optional(),
    description: plainTextSchema(DESCRIPTION_MAX_LENGTH).optional(),
    pricingMode: z.enum(PRICING_MODES, { error: REQUIRED_MESSAGE }).optional(),
    fixedPrice: moneySchema.optional(),
    prices: pricesSchema.optional(),
    additionalIds: linkedIdsSchema.optional(),
    mainServiceIds: linkedIdsSchema.optional(),
    name: serviceFields.name.optional(),
    avgDurationMinutes: serviceFields.avgDurationMinutes.optional(),
    isActive: z.boolean().optional(),
    updatedAt: updatedAtSchema,
  })
  .refine(
    (fields) =>
      Object.entries(fields).some(
        ([key, value]) => key !== "updatedAt" && value !== undefined,
      ),
    { error: NO_FIELD_MESSAGE },
  );

export type ServiceUpdate = z.output<typeof serviceUpdateSchema>;

export const serviceListQuerySchema = paginationSchema(
  ADMIN_LIST_PAGE_SIZE,
).extend({
  type: z.enum(SERVICE_TYPES).optional(),
  includeInactive: booleanQuerySchema.default(false),
  // UC14 step 3: an empty search is no filter.
  search: searchTermSchema.optional().transform((term) => term || undefined),
});

export type ServiceListQuery = z.output<typeof serviceListQuerySchema>;
