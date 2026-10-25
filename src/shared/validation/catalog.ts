import { z } from "zod";
import { ADMIN_LIST_PAGE_SIZE } from "@/shared/constants/pagination";
import {
  DESCRIPTION_MAX_LENGTH,
  entityNameSchema,
  plainTextSchema,
} from "@/shared/validation/formats";
import {
  booleanQuerySchema,
  paginationSchema,
  updatedAtSchema,
} from "@/shared/validation/params";

// Bodies and query of the category routes (docs/catalogo/rotas.md), also used
// by the category form. Unknown fields are discarded (RS013).

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
