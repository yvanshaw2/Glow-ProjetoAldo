import { z } from "zod";
import { ADMIN_LIST_PAGE_SIZE } from "@/shared/constants/pagination";
import { PERMISSIONS, type Permission } from "@/shared/constants/permissions";
import {
  DESCRIPTION_MAX_LENGTH,
  entityNameSchema,
  optionalFormat,
  plainTextSchema,
} from "@/shared/validation/formats";
import {
  booleanQuerySchema,
  paginationSchema,
  updatedAtSchema,
} from "@/shared/validation/params";

// Bodies and query of the role routes (docs/equipe/rotas.md), also used by the
// role form. Unknown fields are discarded (RS013).

const NO_PERMISSION_MESSAGE = "O cargo deve conceder ao menos uma permissão.";
const UNKNOWN_PERMISSION_MESSAGE = "Escolha apenas páginas do painel.";

// RN025: at least one permission, each one a page of the panel. The repeated
// ones are reduced, and the result keeps the order of RN025. The input is
// typed as what the form holds, but anything can come from a request.
const permissionKeysSchema = z
  .custom<Permission[]>()
  .transform((input: unknown, context) => {
    const value = input;
    if (value === undefined || value === null) {
      context.addIssue({ code: "custom", message: NO_PERMISSION_MESSAGE });
      return z.NEVER;
    }
    if (
      !Array.isArray(value) ||
      value.some((key) => !PERMISSIONS.includes(key as Permission))
    ) {
      context.addIssue({ code: "custom", message: UNKNOWN_PERMISSION_MESSAGE });
      return z.NEVER;
    }
    const keys = PERMISSIONS.filter((permission) => value.includes(permission));
    if (keys.length === 0) {
      context.addIssue({ code: "custom", message: NO_PERMISSION_MESSAGE });
      return z.NEVER;
    }
    return keys;
  });

const descriptionSchema = optionalFormat(
  plainTextSchema(DESCRIPTION_MAX_LENGTH),
);

// On a PATCH an absent description stays as it is, and an empty one erases it.
const descriptionUpdateSchema = z
  .custom<string | null | undefined>()
  .optional()
  .transform((value, context) => {
    if (value === undefined) {
      return undefined;
    }
    const result = descriptionSchema.safeParse(value);
    if (result.success) {
      return result.data;
    }
    result.error.issues.forEach(({ message }) =>
      context.addIssue({ code: "custom", message }),
    );
    return z.NEVER;
  });

// UC21: the name and the permissions are required (RN035, RN025).
export const roleInputSchema = z.object({
  name: entityNameSchema,
  description: descriptionSchema,
  permissionKeys: permissionKeysSchema,
});

export type RoleInput = z.output<typeof roleInputSchema>;

export type RoleFormInput = z.input<typeof roleInputSchema>;

// PATCH: edits, deactivates or reactivates; only what came is changed, and at
// least one field must come, so nothing is saved without a reason (RNF011).
export const roleUpdateSchema = z
  .object({
    name: entityNameSchema.optional(),
    description: descriptionUpdateSchema,
    permissionKeys: permissionKeysSchema.optional(),
    isActive: z.boolean().optional(),
    updatedAt: updatedAtSchema,
  })
  .refine(
    ({ name, description, permissionKeys, isActive }) =>
      name !== undefined ||
      description !== undefined ||
      permissionKeys !== undefined ||
      isActive !== undefined,
    { error: "Informe ao menos um campo para alterar." },
  );

export type RoleUpdate = z.output<typeof roleUpdateSchema>;

export const roleListQuerySchema = paginationSchema(
  ADMIN_LIST_PAGE_SIZE,
).extend({
  includeInactive: booleanQuerySchema.default(false),
});

export type RoleListQuery = z.output<typeof roleListQuerySchema>;
