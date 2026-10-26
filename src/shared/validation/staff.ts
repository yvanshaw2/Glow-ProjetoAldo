import { z } from "zod";
import { ADMIN_LIST_PAGE_SIZE } from "@/shared/constants/pagination";
import { PERMISSIONS, type Permission } from "@/shared/constants/permissions";
import {
  DESCRIPTION_MAX_LENGTH,
  emailSchema,
  entityNameSchema,
  jobTitleSchema,
  optionalFormat,
  passwordSchema,
  personNameSchema,
  plainTextSchema,
} from "@/shared/validation/formats";
import {
  booleanQuerySchema,
  paginationSchema,
  updatedAtSchema,
} from "@/shared/validation/params";

// Bodies and query of the role and staff routes (docs/equipe/rotas.md), also
// used by their forms. Unknown fields are discarded (RS013).

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

const NO_ROLE_MESSAGE = "Escolha o cargo do sistema.";
const INACTIVE_ROLE_MESSAGE = "Escolha um cargo ativo.";

// The role of the staff member: absent or null is missing; anything else that
// is not an id gets the message of an unusable role. Whether it exists and is
// active is the service's (RN026).
const roleIdSchema = z.guid({
  error: (issue) =>
    issue.input === undefined || issue.input === null || issue.input === ""
      ? NO_ROLE_MESSAGE
      : INACTIVE_ROLE_MESSAGE,
});

// UC19 step 3, RN023: the password is the initial one, changed at the first
// access. The job title is optional text and never gives permissions (RN024).
export const staffInputSchema = z.object({
  firstName: personNameSchema,
  lastName: personNameSchema,
  email: emailSchema,
  password: passwordSchema,
  jobTitle: optionalFormat(jobTitleSchema),
  roleId: roleIdSchema,
});

export type StaffInput = z.output<typeof staffInputSchema>;

export type StaffFormInput = z.input<typeof staffInputSchema>;

// The fields of the edit form: the e-mail and the password are not edited.
export const staffEditSchema = staffInputSchema.pick({
  firstName: true,
  lastName: true,
  jobTitle: true,
  roleId: true,
});

export type StaffEditInput = z.input<typeof staffEditSchema>;

// On a PATCH an absent job title stays as it is, and an empty one erases it.
const jobTitleUpdateSchema = z
  .custom<string | null | undefined>()
  .optional()
  .transform((value, context) => {
    if (value === undefined) {
      return undefined;
    }
    const result = optionalFormat(jobTitleSchema).safeParse(value);
    if (result.success) {
      return result.data;
    }
    result.error.issues.forEach(({ message }) =>
      context.addIssue({ code: "custom", message }),
    );
    return z.NEVER;
  });

// PATCH: edits, deactivates or reactivates; only what came is changed, and at
// least one field must come (RNF011). The e-mail, the password and the id are
// not changed by this route and are discarded.
export const staffUpdateSchema = z
  .object({
    firstName: personNameSchema.optional(),
    lastName: personNameSchema.optional(),
    jobTitle: jobTitleUpdateSchema,
    roleId: roleIdSchema.optional(),
    isActive: z.boolean().optional(),
    updatedAt: updatedAtSchema,
  })
  .refine(
    ({ firstName, lastName, jobTitle, roleId, isActive }) =>
      firstName !== undefined ||
      lastName !== undefined ||
      jobTitle !== undefined ||
      roleId !== undefined ||
      isActive !== undefined,
    { error: "Informe ao menos um campo para alterar." },
  );

export type StaffUpdate = z.output<typeof staffUpdateSchema>;

export const staffListQuerySchema = paginationSchema(
  ADMIN_LIST_PAGE_SIZE,
).extend({
  includeInactive: booleanQuerySchema.default(false),
});

export type StaffListQuery = z.output<typeof staffListQuerySchema>;
