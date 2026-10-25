import { describe, expect, it } from "vitest";
import {
  roleInputSchema,
  roleListQuerySchema,
  roleUpdateSchema,
} from "@/shared/validation/staff";

// Bodies and query of the role routes (UC21) and the role form: RN025 and the
// formats of RN035.

// Messages from docs/plataforma/mensagens-de-validacao.md.
const REQUIRED = "Preencha este campo.";
const NAME_LENGTH = "Use de 2 a 60 caracteres.";
const DESCRIPTION_LENGTH = "Use até 500 caracteres.";
const NO_PERMISSION = "O cargo deve conceder ao menos uma permissão.";
const UNKNOWN_PERMISSION = "Escolha apenas páginas do painel.";
const STALE_VERSION = "Atualize a página e tente novamente.";
const NO_FIELD = "Informe ao menos um campo para alterar.";
const PAGINATION = "Informe um número inteiro a partir de 1.";
const BOOLEAN = "Informe true ou false.";

const UPDATED_AT = "2026-10-25T13:45:12.345678+00:00";

type Issue = { path: PropertyKey[]; message: string };

function messagesOf(
  schema: {
    safeParse: (
      value: unknown,
    ) => { success: true } | { success: false; error: { issues: Issue[] } };
  },
  value: unknown,
): Record<string, string> {
  const result = schema.safeParse(value);
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map(({ path, message }) => [path.join("."), message]),
  );
}

describe("roleInputSchema", () => {
  it("accepts a role with two permissions and keeps the order of RN025", () => {
    expect(
      roleInputSchema.parse({
        name: "recepção",
        description: "Atende o balcão.",
        permissionKeys: ["appointments", "dashboard"],
      }),
    ).toEqual({
      name: "Recepção",
      description: "Atende o balcão.",
      permissionKeys: ["dashboard", "appointments"],
    });
  });

  it("accepts the six permissions", () => {
    const all = [
      "dashboard",
      "appointments",
      "services",
      "clients",
      "staff",
      "settings",
    ];
    expect(
      roleInputSchema.parse({
        name: "Gerente",
        permissionKeys: [...all].reverse(),
      }).permissionKeys,
    ).toEqual(all);
  });

  it("drops the repeated permissions", () => {
    expect(
      roleInputSchema.parse({
        name: "Gerente",
        permissionKeys: ["clients", "clients", "dashboard"],
      }).permissionKeys,
    ).toEqual(["dashboard", "clients"]);
  });

  it("turns an empty or blank description into null and keeps a filled one", () => {
    const body = { name: "Gerente", permissionKeys: ["dashboard"] };
    expect(roleInputSchema.parse(body).description).toBeNull();
    expect(
      roleInputSchema.parse({ ...body, description: "" }).description,
    ).toBeNull();
    expect(
      roleInputSchema.parse({ ...body, description: "   " }).description,
    ).toBeNull();
    expect(
      roleInputSchema.parse({ ...body, description: null }).description,
    ).toBeNull();
    expect(
      roleInputSchema.parse({ ...body, description: " Cuida  da agenda. " })
        .description,
    ).toBe("Cuida da agenda.");
  });

  it("requires the name", () => {
    const body = { permissionKeys: ["dashboard"] };
    expect(messagesOf(roleInputSchema, { ...body, name: "" })).toEqual({
      name: REQUIRED,
    });
    expect(messagesOf(roleInputSchema, { ...body, name: "   " })).toEqual({
      name: REQUIRED,
    });
  });

  it("rejects a name outside the format of RN035", () => {
    const body = { permissionKeys: ["dashboard"] };
    expect(messagesOf(roleInputSchema, { ...body, name: "A" })).toEqual({
      name: NAME_LENGTH,
    });
    expect(
      messagesOf(roleInputSchema, { ...body, name: "a".repeat(61) }),
    ).toEqual({ name: NAME_LENGTH });
  });

  it("rejects a description over 500 characters", () => {
    expect(
      messagesOf(roleInputSchema, {
        name: "Gerente",
        description: "a".repeat(501),
        permissionKeys: ["dashboard"],
      }),
    ).toEqual({ description: DESCRIPTION_LENGTH });
  });

  it("requires at least one permission", () => {
    expect(
      messagesOf(roleInputSchema, { name: "Gerente", permissionKeys: [] }),
    ).toEqual({ permissionKeys: NO_PERMISSION });
    expect(messagesOf(roleInputSchema, { name: "Gerente" })).toEqual({
      permissionKeys: NO_PERMISSION,
    });
    expect(
      messagesOf(roleInputSchema, { name: "Gerente", permissionKeys: null }),
    ).toEqual({ permissionKeys: NO_PERMISSION });
  });

  it("rejects an unknown permission", () => {
    for (const permissionKeys of [
      ["billing"],
      ["dashboard", "billing"],
      [1],
      [null],
      "dashboard",
    ]) {
      expect(
        messagesOf(roleInputSchema, { name: "Gerente", permissionKeys }),
      ).toEqual({ permissionKeys: UNKNOWN_PERMISSION });
    }
  });

  it("discards the unknown fields", () => {
    expect(
      roleInputSchema.parse({
        id: "x",
        isActive: false,
        updatedAt: UPDATED_AT,
        createdAt: UPDATED_AT,
        name: "Gerente",
        permissionKeys: ["dashboard"],
      }),
    ).toEqual({
      name: "Gerente",
      description: null,
      permissionKeys: ["dashboard"],
    });
  });
});

describe("roleUpdateSchema", () => {
  it("requires the updatedAt and keeps it as text", () => {
    expect(messagesOf(roleUpdateSchema, { isActive: false })).toEqual({
      updatedAt: STALE_VERSION,
    });
    expect(
      roleUpdateSchema.parse({ isActive: false, updatedAt: UPDATED_AT })
        .updatedAt,
    ).toBe(UPDATED_AT);
  });

  it("accepts a single field", () => {
    expect(
      roleUpdateSchema.parse({ isActive: false, updatedAt: UPDATED_AT }),
    ).toEqual({ isActive: false, updatedAt: UPDATED_AT });
    expect(
      roleUpdateSchema.parse({ name: " auxiliar ", updatedAt: UPDATED_AT }),
    ).toEqual({ name: "Auxiliar", updatedAt: UPDATED_AT });
    expect(
      roleUpdateSchema.parse({
        permissionKeys: ["clients", "dashboard"],
        updatedAt: UPDATED_AT,
      }),
    ).toEqual({
      permissionKeys: ["dashboard", "clients"],
      updatedAt: UPDATED_AT,
    });
  });

  it("erases the description when it comes empty and keeps it when absent", () => {
    expect(
      roleUpdateSchema.parse({ description: "", updatedAt: UPDATED_AT })
        .description,
    ).toBeNull();
    expect(
      roleUpdateSchema.parse({ name: "Gerente", updatedAt: UPDATED_AT })
        .description,
    ).toBeUndefined();
  });

  it("rejects a body with only the updatedAt", () => {
    expect(messagesOf(roleUpdateSchema, { updatedAt: UPDATED_AT })).toEqual({
      "": NO_FIELD,
    });
  });

  it("rejects an empty permission list and keeps the other rules", () => {
    expect(
      messagesOf(roleUpdateSchema, {
        permissionKeys: [],
        updatedAt: UPDATED_AT,
      }),
    ).toEqual({ permissionKeys: NO_PERMISSION });
    expect(
      messagesOf(roleUpdateSchema, { name: "", updatedAt: UPDATED_AT }),
    ).toEqual({ name: REQUIRED });
    expect(
      messagesOf(roleUpdateSchema, {
        permissionKeys: ["billing"],
        updatedAt: UPDATED_AT,
      }),
    ).toEqual({ permissionKeys: UNKNOWN_PERMISSION });
  });

  it("discards the unknown fields", () => {
    expect(
      roleUpdateSchema.parse({
        id: "x",
        createdAt: UPDATED_AT,
        isActive: true,
        updatedAt: UPDATED_AT,
      }),
    ).toEqual({ isActive: true, updatedAt: UPDATED_AT });
  });
});

describe("roleListQuerySchema", () => {
  it("defaults to the active ones, 20 per page", () => {
    expect(roleListQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
      includeInactive: false,
    });
  });

  it("accepts includeInactive as true or false", () => {
    expect(
      roleListQuerySchema.parse({ includeInactive: "true" }).includeInactive,
    ).toBe(true);
    expect(
      roleListQuerySchema.parse({ includeInactive: "false" }).includeInactive,
    ).toBe(false);
  });

  it("rejects includeInactive that is not true or false and a page below 1", () => {
    expect(messagesOf(roleListQuerySchema, { includeInactive: "abc" })).toEqual(
      { includeInactive: BOOLEAN },
    );
    expect(messagesOf(roleListQuerySchema, { page: "0" })).toEqual({
      page: PAGINATION,
    });
  });

  it("limits the page size to the maximum", () => {
    expect(roleListQuerySchema.parse({ pageSize: "500" }).pageSize).toBe(50);
  });
});
