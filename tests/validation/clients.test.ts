import { describe, expect, it } from "vitest";
import {
  clientEditSchema,
  clientInputSchema,
  clientListQuerySchema,
  clientUpdateSchema,
} from "@/shared/validation/clients";

// Bodies and query of the client routes of the panel (UC16, UC17) and the
// client forms: RN023 and the formats of RN035.

// Messages from docs/plataforma/mensagens-de-validacao.md.
const REQUIRED = "Preencha este campo.";
const EMAIL = "Informe um e-mail válido, como maria@email.com.";
const PHONE = "Informe um celular com DDD, como (82) 99999-8888.";
const PASSWORD =
  "A senha deve ter de 8 a 72 caracteres, com letra maiúscula, número e caractere especial.";
const SEARCH_LENGTH = "Use até 100 caracteres.";
const STALE_VERSION = "Atualize a página e tente novamente.";
const NO_FIELD = "Informe ao menos um campo para alterar.";

const UPDATED_AT = "2026-10-25T13:45:12.345678+00:00";

const VALID_INPUT = {
  email: "Maria.Souza@Email.com",
  firstName: "maria de",
  lastName: "souza",
  phone: "(82) 99999-8888",
  password: "Senha#2026",
};

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

describe("clientInputSchema", () => {
  it("accepts a valid client and normalizes it", () => {
    expect(clientInputSchema.parse(VALID_INPUT)).toEqual({
      email: "maria.souza@email.com",
      firstName: "Maria de",
      lastName: "Souza",
      phone: "82999998888",
      password: "Senha#2026",
    });
  });

  it("requires each of the five fields", () => {
    const allRequired = {
      email: REQUIRED,
      firstName: REQUIRED,
      lastName: REQUIRED,
      phone: REQUIRED,
      password: REQUIRED,
    };
    expect(messagesOf(clientInputSchema, {})).toEqual(allRequired);
    expect(
      messagesOf(clientInputSchema, {
        email: "  ",
        firstName: " ",
        lastName: "",
        phone: " ",
        password: "",
      }),
    ).toEqual(allRequired);
  });

  it("rejects an invalid e-mail, a landline and an unknown area code", () => {
    expect(
      messagesOf(clientInputSchema, { ...VALID_INPUT, email: "maria@" }),
    ).toEqual({ email: EMAIL });
    expect(
      messagesOf(clientInputSchema, {
        ...VALID_INPUT,
        phone: "(82) 3333-4444",
      }),
    ).toEqual({ phone: PHONE });
    expect(
      messagesOf(clientInputSchema, {
        ...VALID_INPUT,
        phone: "(10) 99999-8888",
      }),
    ).toEqual({ phone: PHONE });
  });

  it("rejects a password outside RN023", () => {
    for (const password of [
      "Ab#1xyz",
      "senha#2026",
      "Senha#abcd",
      "Senha2026x",
      `Aa#1${"x".repeat(70)}`,
    ]) {
      expect(
        messagesOf(clientInputSchema, { ...VALID_INPUT, password }),
      ).toEqual({ password: PASSWORD });
    }
  });

  it("discards the unknown fields", () => {
    const parsed = clientInputSchema.parse({
      ...VALID_INPUT,
      id: "x",
      mustChangePassword: false,
      deletedAt: "2026-01-01",
      updatedAt: UPDATED_AT,
    });
    expect(Object.keys(parsed).sort()).toEqual([
      "email",
      "firstName",
      "lastName",
      "password",
      "phone",
    ]);
  });
});

describe("clientEditSchema", () => {
  it("normalizes the name and keeps only the 11 digits of the phone", () => {
    expect(
      clientEditSchema.parse({
        firstName: "maria de",
        lastName: "souza",
        phone: "(82) 99999-8888",
      }),
    ).toEqual({
      firstName: "Maria de",
      lastName: "Souza",
      phone: "82999998888",
    });
  });

  it("requires the three fields", () => {
    expect(messagesOf(clientEditSchema, {})).toEqual({
      firstName: REQUIRED,
      lastName: REQUIRED,
      phone: REQUIRED,
    });
  });

  it("rejects an incomplete phone", () => {
    expect(
      messagesOf(clientEditSchema, {
        firstName: "Maria",
        lastName: "Souza",
        phone: "(82) 9999",
      }),
    ).toEqual({ phone: PHONE });
  });

  it("discards the e-mail, the id and the version", () => {
    expect(
      clientEditSchema.parse({
        firstName: "Maria",
        lastName: "Souza",
        phone: "82999998888",
        email: "outra@email.com",
        id: "x",
        updatedAt: UPDATED_AT,
      }),
    ).toEqual({
      firstName: "Maria",
      lastName: "Souza",
      phone: "82999998888",
    });
  });
});

describe("clientUpdateSchema", () => {
  it("requires updatedAt and keeps it as text", () => {
    expect(messagesOf(clientUpdateSchema, { phone: "82999998888" })).toEqual({
      updatedAt: STALE_VERSION,
    });
    expect(
      clientUpdateSchema.parse({
        phone: "82999998888",
        updatedAt: UPDATED_AT,
      }).updatedAt,
    ).toBe(UPDATED_AT);
  });

  it("accepts a single field", () => {
    expect(
      clientUpdateSchema.parse({
        phone: "(82) 99999-8888",
        updatedAt: UPDATED_AT,
      }),
    ).toEqual({ phone: "82999998888", updatedAt: UPDATED_AT });
    expect(
      clientUpdateSchema.parse({ firstName: "ana", updatedAt: UPDATED_AT }),
    ).toEqual({ firstName: "Ana", updatedAt: UPDATED_AT });
    expect(
      clientUpdateSchema.parse({ lastName: "lima", updatedAt: UPDATED_AT }),
    ).toEqual({ lastName: "Lima", updatedAt: UPDATED_AT });
  });

  it("rejects a body with only updatedAt", () => {
    expect(messagesOf(clientUpdateSchema, { updatedAt: UPDATED_AT })).toEqual({
      "": NO_FIELD,
    });
  });

  it("discards the e-mail and the password and keeps the formats", () => {
    expect(
      clientUpdateSchema.parse({
        email: "outro@email.com",
        password: "Senha#2026",
        firstName: "ana",
        updatedAt: UPDATED_AT,
      }),
    ).toEqual({ firstName: "Ana", updatedAt: UPDATED_AT });
    expect(
      messagesOf(clientUpdateSchema, { phone: "123", updatedAt: UPDATED_AT }),
    ).toEqual({ phone: PHONE });
    expect(
      messagesOf(clientUpdateSchema, { firstName: " ", updatedAt: UPDATED_AT }),
    ).toEqual({ firstName: REQUIRED });
  });
});

describe("clientListQuerySchema", () => {
  it("defaults to page 1 and 20 per page and trims the search", () => {
    expect(clientListQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
    expect(clientListQuerySchema.parse({ search: "  silva " })).toEqual({
      page: 1,
      pageSize: 20,
      search: "silva",
    });
  });

  it("treats an empty search as no filter", () => {
    expect(
      clientListQuerySchema.parse({ search: "  " }).search,
    ).toBeUndefined();
  });

  it("rejects a search over 100 characters and caps the page size", () => {
    expect(
      messagesOf(clientListQuerySchema, { search: "a".repeat(101) }),
    ).toEqual({ search: SEARCH_LENGTH });
    expect(clientListQuerySchema.parse({ pageSize: "100" }).pageSize).toBe(50);
  });
});
