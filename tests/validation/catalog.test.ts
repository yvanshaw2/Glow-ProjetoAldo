import { describe, expect, it } from "vitest";
import {
  categoryInputSchema,
  categoryListQuerySchema,
  categoryUpdateSchema,
} from "@/shared/validation/catalog";

// Bodies and query of the category routes (UC15) and the category form: the
// formats of RN035.

// Messages from docs/plataforma/mensagens-de-validacao.md.
const REQUIRED = "Preencha este campo.";
const NAME_LENGTH = "Use de 2 a 60 caracteres.";
const DESCRIPTION_LENGTH = "Use até 500 caracteres.";
const STALE_VERSION = "Atualize a página e tente novamente.";
const PAGINATION = "Informe um número inteiro a partir de 1.";
const BOOLEAN = "Informe true ou false.";

const UPDATED_AT = "2026-10-24T13:45:12.345678+00:00";

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

type Issue = { path: PropertyKey[]; message: string };

describe("categoryInputSchema", () => {
  it("normalizes the name and the description", () => {
    expect(
      categoryInputSchema.parse({
        name: "  lavagem   simples ",
        description: " Lavagem\texterna \n e   interna. ",
      }),
    ).toEqual({
      name: "Lavagem simples",
      description: "Lavagem externa e interna.",
    });
  });

  it.each(["", "   ", undefined])(
    "requires the name and the description: %j",
    (value) => {
      expect(
        messagesOf(categoryInputSchema, { name: value, description: value }),
      ).toEqual({ name: REQUIRED, description: REQUIRED });
    },
  );

  it("rejects a name of one or of 61 characters and accepts 2 and 60", () => {
    const base = { description: "Descrição" };
    expect(messagesOf(categoryInputSchema, { ...base, name: "A" })).toEqual({
      name: NAME_LENGTH,
    });
    expect(
      messagesOf(categoryInputSchema, { ...base, name: "A".repeat(61) }),
    ).toEqual({ name: NAME_LENGTH });
    expect(categoryInputSchema.safeParse({ ...base, name: "Ab" }).success).toBe(
      true,
    );
    expect(
      categoryInputSchema.safeParse({ ...base, name: "A".repeat(60) }).success,
    ).toBe(true);
  });

  it("rejects a description of 501 characters and accepts 500", () => {
    const base = { name: "Lavagem" };
    expect(
      messagesOf(categoryInputSchema, {
        ...base,
        description: "a".repeat(501),
      }),
    ).toEqual({ description: DESCRIPTION_LENGTH });
    expect(
      categoryInputSchema.safeParse({ ...base, description: "a".repeat(500) })
        .success,
    ).toBe(true);
  });

  it("discards the fields that are not expected", () => {
    expect(
      categoryInputSchema.parse({
        name: "Lavagem",
        description: "Descrição",
        isActive: false,
        id: "x",
        updatedAt: UPDATED_AT,
      }),
    ).toEqual({ name: "Lavagem", description: "Descrição" });
  });
});

describe("categoryUpdateSchema", () => {
  it.each([
    [{ isActive: false }],
    [{ name: "Polimento" }],
    [{ description: "Nova descrição" }],
  ])("accepts one field with the version: %j", (fields) => {
    const result = categoryUpdateSchema.safeParse({
      ...fields,
      updatedAt: UPDATED_AT,
    });
    expect(result.success).toBe(true);
  });

  it("applies the formats of the category to the fields sent", () => {
    expect(
      categoryUpdateSchema.parse({
        name: "  polimento  ",
        updatedAt: UPDATED_AT,
      }),
    ).toEqual({ name: "Polimento", updatedAt: UPDATED_AT });
    expect(
      messagesOf(categoryUpdateSchema, { name: "", updatedAt: UPDATED_AT }),
    ).toEqual({ name: REQUIRED });
  });

  it.each([undefined, "", "abc"])("requires the version: %j", (updatedAt) => {
    expect(
      messagesOf(categoryUpdateSchema, { isActive: true, updatedAt }),
    ).toEqual({ updatedAt: STALE_VERSION });
  });

  it("rejects a body with no field to change", () => {
    expect(
      categoryUpdateSchema.safeParse({ updatedAt: UPDATED_AT }).success,
    ).toBe(false);
  });

  it("discards the fields that are not expected", () => {
    expect(
      categoryUpdateSchema.parse({
        isActive: true,
        id: "x",
        createdAt: "y",
        updatedAt: UPDATED_AT,
      }),
    ).toEqual({ isActive: true, updatedAt: UPDATED_AT });
  });
});

describe("categoryListQuerySchema", () => {
  it("uses the first page of 20 and no inactive ones when the query is empty", () => {
    expect(categoryListQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
      includeInactive: false,
    });
  });

  it("reads the inactive flag and the page", () => {
    expect(
      categoryListQuerySchema.parse({
        includeInactive: "true",
        page: "2",
        pageSize: "10",
      }),
    ).toEqual({ page: 2, pageSize: 10, includeInactive: true });
  });

  it("limits the page size to 50 and discards unknown parameters", () => {
    expect(
      categoryListQuerySchema.parse({ pageSize: "100", other: "x" }),
    ).toEqual({ page: 1, pageSize: 50, includeInactive: false });
  });

  it("rejects an invalid flag or page", () => {
    expect(
      messagesOf(categoryListQuerySchema, {
        includeInactive: "abc",
        page: "0",
      }),
    ).toEqual({ includeInactive: BOOLEAN, page: PAGINATION });
  });
});
