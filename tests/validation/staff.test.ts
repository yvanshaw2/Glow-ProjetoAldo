import { describe, expect, it } from "vitest";
import {
  roleInputSchema,
  roleListQuerySchema,
  roleUpdateSchema,
  staffEditSchema,
  staffInputSchema,
  staffListQuerySchema,
  staffUpdateSchema,
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
const PERSON_NAME =
  "Use de 2 a 60 letras; espaço, hífen e apóstrofo também valem.";
const EMAIL = "Informe um e-mail válido, como maria@email.com.";
const PASSWORD =
  "A senha deve ter de 8 a 72 caracteres, com letra maiúscula, número e caractere especial.";
const NO_ROLE = "Escolha o cargo do sistema.";
const INACTIVE_ROLE = "Escolha um cargo ativo.";

const ROLE_ID = "19e290c2-796d-e34e-8670-c7c3f3f5de44";

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

const NEW_STAFF = {
  firstName: "maria",
  lastName: "da silva",
  email: " Maria@Email.com ",
  password: "Senha@123",
  jobTitle: "supervisor de lavagem",
  roleId: ROLE_ID,
};

describe("staffInputSchema", () => {
  it("accepts a staff member and normalizes it", () => {
    expect(staffInputSchema.parse(NEW_STAFF)).toEqual({
      firstName: "Maria",
      lastName: "da Silva",
      email: "maria@email.com",
      password: "Senha@123",
      jobTitle: "Supervisor de lavagem",
      roleId: ROLE_ID,
    });
  });

  it("turns an empty or absent job title into null", () => {
    expect(
      staffInputSchema.parse({ ...NEW_STAFF, jobTitle: "  " }).jobTitle,
    ).toBe(null);
    expect(
      staffInputSchema.parse({ ...NEW_STAFF, jobTitle: undefined }).jobTitle,
    ).toBe(null);
  });

  it("requires first name, last name, e-mail, password and role", () => {
    expect(messagesOf(staffInputSchema, {})).toEqual({
      firstName: REQUIRED,
      lastName: REQUIRED,
      email: REQUIRED,
      password: REQUIRED,
      roleId: NO_ROLE,
    });
  });

  it("rejects an e-mail without @, with spaces inside or over 254 characters", () => {
    for (const email of [
      "maria.email.com",
      "ma ria@email.com",
      `${"a".repeat(250)}@e.com`,
    ]) {
      expect(messagesOf(staffInputSchema, { ...NEW_STAFF, email })).toEqual({
        email: EMAIL,
      });
    }
  });

  it("rejects a password outside the rule of RN023", () => {
    for (const password of [
      "Ab@1",
      "senha@123",
      "Senha@abc",
      "Senha1234",
      `Ab@1${"a".repeat(69)}`,
    ]) {
      expect(messagesOf(staffInputSchema, { ...NEW_STAFF, password })).toEqual({
        password: PASSWORD,
      });
    }
  });

  it("accepts a password of 72 characters", () => {
    expect(
      staffInputSchema.parse({
        ...NEW_STAFF,
        password: `Ab@1${"a".repeat(68)}`,
      }).password,
    ).toHaveLength(72);
  });

  it("rejects a name with digits or a single letter", () => {
    expect(
      messagesOf(staffInputSchema, {
        ...NEW_STAFF,
        firstName: "Maria2",
        lastName: "S",
      }),
    ).toEqual({ firstName: PERSON_NAME, lastName: PERSON_NAME });
  });

  it("rejects a job title of one letter or over 60 characters", () => {
    for (const jobTitle of ["a", "a".repeat(61)]) {
      expect(messagesOf(staffInputSchema, { ...NEW_STAFF, jobTitle })).toEqual({
        jobTitle: NAME_LENGTH,
      });
    }
  });

  it("rejects a role that is null or not an id", () => {
    expect(
      messagesOf(staffInputSchema, { ...NEW_STAFF, roleId: null }),
    ).toEqual({ roleId: NO_ROLE });
    expect(
      messagesOf(staffInputSchema, { ...NEW_STAFF, roleId: "gerente" }),
    ).toEqual({ roleId: INACTIVE_ROLE });
  });

  it("discards the fields that are not part of the body", () => {
    expect(
      Object.keys(
        staffInputSchema.parse({
          ...NEW_STAFF,
          id: ROLE_ID,
          isActive: false,
          isAdmin: true,
          mustChangePassword: false,
          roleName: "Gerente",
        }),
      ).sort(),
    ).toEqual(
      [
        "email",
        "firstName",
        "jobTitle",
        "lastName",
        "password",
        "roleId",
      ].sort(),
    );
  });
});

describe("staffEditSchema", () => {
  it("accepts the four fields and discards the e-mail and the password", () => {
    expect(
      staffEditSchema.parse({
        firstName: "joão",
        lastName: "souza",
        jobTitle: "",
        roleId: ROLE_ID,
        email: "outro@email.com",
        password: "Senha@123",
      }),
    ).toEqual({
      firstName: "João",
      lastName: "Souza",
      jobTitle: null,
      roleId: ROLE_ID,
    });
  });

  it("requires first name, last name and role, but not the job title", () => {
    expect(messagesOf(staffEditSchema, {})).toEqual({
      firstName: REQUIRED,
      lastName: REQUIRED,
      roleId: NO_ROLE,
    });
  });
});

describe("staffUpdateSchema", () => {
  it("requires updatedAt and keeps it as text", () => {
    expect(messagesOf(staffUpdateSchema, { isActive: false })).toEqual({
      updatedAt: STALE_VERSION,
    });
    expect(
      staffUpdateSchema.parse({ isActive: false, updatedAt: UPDATED_AT })
        .updatedAt,
    ).toBe(UPDATED_AT);
  });

  it("accepts a single field", () => {
    expect(
      staffUpdateSchema.parse({ isActive: false, updatedAt: UPDATED_AT }),
    ).toEqual({ isActive: false, updatedAt: UPDATED_AT });
    expect(
      staffUpdateSchema.parse({ roleId: ROLE_ID, updatedAt: UPDATED_AT }),
    ).toEqual({ roleId: ROLE_ID, updatedAt: UPDATED_AT });
    expect(
      staffUpdateSchema.parse({ firstName: "ana", updatedAt: UPDATED_AT }),
    ).toEqual({ firstName: "Ana", updatedAt: UPDATED_AT });
  });

  it("rejects a body with only updatedAt", () => {
    expect(messagesOf(staffUpdateSchema, { updatedAt: UPDATED_AT })).toEqual({
      "": NO_FIELD,
    });
  });

  it("erases the job title when it comes empty and keeps it when absent", () => {
    expect(
      staffUpdateSchema.parse({ jobTitle: " ", updatedAt: UPDATED_AT })
        .jobTitle,
    ).toBe(null);
    expect(
      staffUpdateSchema.parse({ isActive: true, updatedAt: UPDATED_AT }),
    ).not.toHaveProperty("jobTitle");
  });

  it("rejects a role that is not an id", () => {
    expect(
      messagesOf(staffUpdateSchema, { roleId: "x", updatedAt: UPDATED_AT }),
    ).toEqual({ roleId: INACTIVE_ROLE });
  });

  it("discards the e-mail, the password, the id and isAdmin", () => {
    expect(
      staffUpdateSchema.parse({
        firstName: "Ana",
        email: "x@email.com",
        password: "Senha@123",
        id: ROLE_ID,
        isAdmin: true,
        updatedAt: UPDATED_AT,
      }),
    ).toEqual({ firstName: "Ana", updatedAt: UPDATED_AT });
  });
});

describe("staffListQuerySchema", () => {
  it("defaults to the active ones, 20 per page", () => {
    expect(staffListQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
      includeInactive: false,
    });
  });

  it("reads includeInactive only as true or false", () => {
    expect(
      staffListQuerySchema.parse({ includeInactive: "true" }).includeInactive,
    ).toBe(true);
    expect(messagesOf(staffListQuerySchema, { includeInactive: "1" })).toEqual({
      includeInactive: BOOLEAN,
    });
  });

  it("limits the page size to the maximum and rejects a page below 1", () => {
    expect(staffListQuerySchema.parse({ pageSize: "100" }).pageSize).toBe(50);
    expect(messagesOf(staffListQuerySchema, { page: "0" })).toEqual({
      page: PAGINATION,
    });
  });
});
