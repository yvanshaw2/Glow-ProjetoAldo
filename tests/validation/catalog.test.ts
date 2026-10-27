import { describe, expect, it } from "vitest";
import {
  categoryInputSchema,
  categoryListQuerySchema,
  categoryUpdateSchema,
  serviceInputSchema,
  serviceListQuerySchema,
  serviceUpdateSchema,
} from "@/shared/validation/catalog";

// Bodies and query of the category routes (UC15) and of the service routes
// (UC13, UC14), with the category and service forms: RN006, RN009 and the
// formats of RN035.

// Messages from docs/plataforma/mensagens-de-validacao.md.
const REQUIRED = "Preencha este campo.";
const NAME_LENGTH = "Use de 2 a 60 caracteres.";
const DESCRIPTION_LENGTH = "Use até 500 caracteres.";
const STALE_VERSION = "Atualize a página e tente novamente.";
const PAGINATION = "Informe um número inteiro a partir de 1.";
const BOOLEAN = "Informe true ou false.";
const MONEY = "Informe um valor maior que zero e de até R$ 99.999,99.";
const DURATION = "Informe a duração em minutos, de 5 a 2.400.";
const SEARCH_LENGTH = "Use até 100 caracteres.";
const CATEGORY = "Escolha uma categoria ativa.";
const LINKED = "Escolha serviços cadastrados.";
const NO_FIELD = "Informe ao menos um campo para alterar.";

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

const CATEGORY_ID = "11111111-1111-4111-8111-111111111111";
const ID_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ID_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const PRICES = { small: 50, medium: 60, large: 70, extra_large: 80 };

const MAIN_BY_SIZE = {
  type: "main",
  categoryId: CATEGORY_ID,
  name: "  lavagem   completa ",
  description: " Lavagem externa e interna. ",
  avgDurationMinutes: 90,
  pricingMode: "by_size",
  prices: PRICES,
  additionalIds: [ID_A, ID_B],
};

const ADDITIONAL = {
  type: "additional",
  name: "cera de carnaúba",
  avgDurationMinutes: 20,
  fixedPrice: 35,
  mainServiceIds: [ID_A],
};

describe("serviceInputSchema", () => {
  it("accepts a main service priced by size and normalizes it", () => {
    expect(serviceInputSchema.parse(MAIN_BY_SIZE)).toEqual({
      ...MAIN_BY_SIZE,
      name: "Lavagem completa",
      description: "Lavagem externa e interna.",
    });
  });

  it("accepts a main service with a fixed price and discards the prices", () => {
    expect(
      serviceInputSchema.parse({
        ...MAIN_BY_SIZE,
        pricingMode: "fixed",
        fixedPrice: 120.5,
      }),
    ).toEqual({
      ...MAIN_BY_SIZE,
      prices: undefined,
      name: "Lavagem completa",
      description: "Lavagem externa e interna.",
      pricingMode: "fixed",
      fixedPrice: 120.5,
    });
  });

  it("accepts a complementary service and discards the additionals", () => {
    const result = serviceInputSchema.parse({
      ...MAIN_BY_SIZE,
      type: "complementary",
    });
    expect(result.type).toBe("complementary");
    expect(result).not.toHaveProperty("additionalIds");
  });

  it("defaults the additionals of a main service to none", () => {
    expect(
      serviceInputSchema.parse({ ...MAIN_BY_SIZE, additionalIds: undefined }),
    ).toMatchObject({
      additionalIds: [],
    });
  });

  it("accepts an additional service with a fixed price and no category", () => {
    expect(
      serviceInputSchema.parse({
        ...ADDITIONAL,
        categoryId: CATEGORY_ID,
        description: "Descrição",
        pricingMode: "by_size",
        prices: PRICES,
        additionalIds: [ID_B],
      }),
    ).toEqual({ ...ADDITIONAL, name: "Cera de carnaúba" });
  });

  it("defaults the main services of an additional service to none", () => {
    expect(
      serviceInputSchema.parse({ ...ADDITIONAL, mainServiceIds: undefined }),
    ).toMatchObject({
      mainServiceIds: [],
    });
  });

  it.each([undefined, null, ""])("requires the category: %j", (categoryId) => {
    expect(
      messagesOf(serviceInputSchema, { ...MAIN_BY_SIZE, categoryId }),
    ).toEqual({ categoryId: REQUIRED });
  });

  it("rejects a category that is not an id", () => {
    expect(
      messagesOf(serviceInputSchema, { ...MAIN_BY_SIZE, categoryId: "abc" }),
    ).toEqual({ categoryId: CATEGORY });
  });

  it("requires the four prices of a service priced by size, each in its path", () => {
    expect(
      messagesOf(serviceInputSchema, {
        ...MAIN_BY_SIZE,
        prices: { small: 50 },
      }),
    ).toEqual({
      "prices.medium": REQUIRED,
      "prices.large": REQUIRED,
      "prices.extra_large": REQUIRED,
    });
    expect(
      messagesOf(serviceInputSchema, { ...MAIN_BY_SIZE, prices: undefined }),
    ).toEqual({ prices: REQUIRED });
  });

  it("requires the fixed price of a fixed-price service", () => {
    expect(
      messagesOf(serviceInputSchema, {
        ...MAIN_BY_SIZE,
        pricingMode: "fixed",
      }),
    ).toEqual({ fixedPrice: REQUIRED });
    expect(
      messagesOf(serviceInputSchema, { ...ADDITIONAL, fixedPrice: undefined }),
    ).toEqual({ fixedPrice: REQUIRED });
  });

  it("requires the pricing mode of a main service", () => {
    expect(
      messagesOf(serviceInputSchema, {
        ...MAIN_BY_SIZE,
        pricingMode: undefined,
      }),
    ).toEqual({ pricingMode: REQUIRED });
  });

  it.each([0, -1, 100000, 10.005])("rejects the price %j", (price) => {
    expect(
      messagesOf(serviceInputSchema, { ...ADDITIONAL, fixedPrice: price }),
    ).toEqual({ fixedPrice: MONEY });
    expect(
      messagesOf(serviceInputSchema, {
        ...MAIN_BY_SIZE,
        prices: { ...PRICES, large: price },
      }),
    ).toEqual({ "prices.large": MONEY });
  });

  it("accepts the price limits of RN035", () => {
    for (const fixedPrice of [0.01, 99999.99]) {
      expect(
        serviceInputSchema.safeParse({ ...ADDITIONAL, fixedPrice }).success,
      ).toBe(true);
    }
  });

  it.each([4, 2401, 10.5, 0, -5])("rejects the duration %j", (minutes) => {
    expect(
      messagesOf(serviceInputSchema, {
        ...MAIN_BY_SIZE,
        avgDurationMinutes: minutes,
      }),
    ).toEqual({ avgDurationMinutes: DURATION });
  });

  it("accepts a duration of 5 and of 2400 minutes", () => {
    for (const avgDurationMinutes of [5, 2400]) {
      expect(
        serviceInputSchema.safeParse({ ...ADDITIONAL, avgDurationMinutes })
          .success,
      ).toBe(true);
    }
  });

  it("requires the duration, the name and the description", () => {
    expect(
      messagesOf(serviceInputSchema, {
        ...MAIN_BY_SIZE,
        avgDurationMinutes: undefined,
        name: "  ",
        description: "",
      }),
    ).toEqual({
      avgDurationMinutes: REQUIRED,
      name: REQUIRED,
      description: REQUIRED,
    });
  });

  it("limits the name to 2 to 60 characters and the description to 500", () => {
    expect(
      messagesOf(serviceInputSchema, { ...ADDITIONAL, name: "A" }),
    ).toEqual({ name: NAME_LENGTH });
    expect(
      messagesOf(serviceInputSchema, { ...ADDITIONAL, name: "A".repeat(61) }),
    ).toEqual({ name: NAME_LENGTH });
    expect(
      messagesOf(serviceInputSchema, {
        ...MAIN_BY_SIZE,
        description: "a".repeat(501),
      }),
    ).toEqual({ description: DESCRIPTION_LENGTH });
    expect(
      serviceInputSchema.safeParse({
        ...MAIN_BY_SIZE,
        description: "a".repeat(500),
      }).success,
    ).toBe(true);
  });

  it("removes repeated ids from the links", () => {
    expect(
      serviceInputSchema.parse({
        ...MAIN_BY_SIZE,
        additionalIds: [ID_A, ID_B, ID_A],
      }),
    ).toMatchObject({ additionalIds: [ID_A, ID_B] });
    expect(
      serviceInputSchema.parse({ ...ADDITIONAL, mainServiceIds: [ID_B, ID_B] }),
    ).toMatchObject({ mainServiceIds: [ID_B] });
  });

  it("rejects a link that is not an id", () => {
    expect(
      messagesOf(serviceInputSchema, {
        ...MAIN_BY_SIZE,
        additionalIds: [ID_A, "abc"],
      }),
    ).toEqual({ "additionalIds.1": LINKED });
    expect(
      messagesOf(serviceInputSchema, { ...ADDITIONAL, mainServiceIds: ["x"] }),
    ).toEqual({ "mainServiceIds.0": LINKED });
  });

  it("rejects a missing or unknown type", () => {
    for (const type of [undefined, "other"]) {
      const messages = messagesOf(serviceInputSchema, {
        ...MAIN_BY_SIZE,
        type,
      });
      expect(Object.keys(messages)).toEqual(["type"]);
    }
  });

  it("discards the fields that are not expected", () => {
    const result = serviceInputSchema.parse({
      ...ADDITIONAL,
      id: "x",
      isActive: false,
      deletedAt: "2026-10-25",
      imagePath: "a.png",
      createdAt: "y",
    });
    expect(result).toEqual({ ...ADDITIONAL, name: "Cera de carnaúba" });
  });
});

describe("serviceUpdateSchema", () => {
  it.each([
    [{ isActive: false }],
    [{ name: "Polimento" }],
    [{ prices: PRICES }],
    [{ additionalIds: [] }],
  ])("accepts one field with the version: %j", (fields) => {
    expect(
      serviceUpdateSchema.safeParse({ ...fields, updatedAt: UPDATED_AT })
        .success,
    ).toBe(true);
  });

  it("requires the version and keeps it as text", () => {
    expect(messagesOf(serviceUpdateSchema, { isActive: true })).toEqual({
      updatedAt: STALE_VERSION,
    });
    expect(
      serviceUpdateSchema.parse({ isActive: true, updatedAt: UPDATED_AT }),
    ).toEqual({ isActive: true, updatedAt: UPDATED_AT });
  });

  it("applies the formats of the service to the fields sent", () => {
    expect(
      serviceUpdateSchema.parse({ name: " polimento ", updatedAt: UPDATED_AT }),
    ).toEqual({ name: "Polimento", updatedAt: UPDATED_AT });
    expect(
      messagesOf(serviceUpdateSchema, {
        name: "",
        avgDurationMinutes: 3,
        prices: { ...PRICES, small: 0 },
        updatedAt: UPDATED_AT,
      }),
    ).toEqual({
      name: REQUIRED,
      avgDurationMinutes: DURATION,
      "prices.small": MONEY,
    });
  });

  it("rejects a body with only the version", () => {
    const result = serviceUpdateSchema.safeParse({ updatedAt: UPDATED_AT });
    expect(result.success).toBe(false);
    expect(
      !result.success && result.error.issues.map(({ message }) => message),
    ).toEqual([NO_FIELD]);
  });

  it("discards the type and the fields that are not expected", () => {
    expect(
      serviceUpdateSchema.parse({
        type: "additional",
        isActive: true,
        id: "x",
        imageUrl: "a.png",
        updatedAt: UPDATED_AT,
      }),
    ).toEqual({ isActive: true, updatedAt: UPDATED_AT });
  });
});

describe("serviceListQuerySchema", () => {
  it("uses the first page of 20, any type and no inactive ones", () => {
    expect(serviceListQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
      includeInactive: false,
    });
  });

  it.each(["main", "additional", "complementary"])(
    "accepts the type %s",
    (type) => {
      expect(serviceListQuerySchema.parse({ type })).toMatchObject({ type });
    },
  );

  it("rejects another type", () => {
    expect(
      Object.keys(messagesOf(serviceListQuerySchema, { type: "x" })),
    ).toEqual(["type"]);
  });

  it("trims the search and treats an empty one as no filter", () => {
    expect(
      serviceListQuerySchema.parse({ search: "  lavagem  " }),
    ).toMatchObject({ search: "lavagem" });
    expect(
      serviceListQuerySchema.parse({ search: "   " }).search,
    ).toBeUndefined();
  });

  it("rejects a search of 101 characters", () => {
    expect(
      messagesOf(serviceListQuerySchema, { search: "a".repeat(101) }),
    ).toEqual({ search: SEARCH_LENGTH });
  });

  it("reads the flag and limits the page size to 50", () => {
    expect(
      serviceListQuerySchema.parse({
        includeInactive: "true",
        pageSize: "100",
      }),
    ).toMatchObject({ includeInactive: true, pageSize: 50 });
    expect(
      messagesOf(serviceListQuerySchema, { includeInactive: "abc" }),
    ).toEqual({ includeInactive: BOOLEAN });
  });
});

// UC13, UC14, RS015: the path of the image is the one the upload generated.
const IMAGE_ID = "3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b";
const IMAGE_PATH = `services/${IMAGE_ID}.jpg`;
const INVALID_IMAGE = "Informe uma imagem válida.";

describe("imagePath of the service", () => {
  it.each(["jpg", "png", "webp"])(
    "accepts the path the upload generates (%s)",
    (extension) => {
      const imagePath = `services/${IMAGE_ID}.${extension}`;
      expect(
        serviceInputSchema.parse({ ...MAIN_BY_SIZE, imagePath }),
      ).toMatchObject({ imagePath });
    },
  );

  it.each([
    "other-bucket/3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b.jpg",
    "services/../3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b.jpg",
    `services/${IMAGE_ID}.gif`,
    `services/${IMAGE_ID}.jpg.exe`,
    "services/photo.jpg",
    `/services/${IMAGE_ID}.jpg`,
    "",
  ])("rejects the path %j", (imagePath) => {
    expect(
      messagesOf(serviceInputSchema, { ...MAIN_BY_SIZE, imagePath }),
    ).toEqual({ imagePath: INVALID_IMAGE });
  });

  it("does not require the image", () => {
    expect(serviceInputSchema.safeParse(MAIN_BY_SIZE).success).toBe(true);
  });

  it("discards the image of an additional service (RS013)", () => {
    const parsed = serviceInputSchema.parse({
      ...ADDITIONAL,
      imagePath: IMAGE_PATH,
    });
    expect(parsed).not.toHaveProperty("imagePath");
  });

  it("accepts null in the update, which removes the image", () => {
    expect(
      serviceUpdateSchema.parse({ imagePath: null, updatedAt: UPDATED_AT }),
    ).toEqual({ imagePath: null, updatedAt: UPDATED_AT });
  });

  it("accepts the image as the only field of the update", () => {
    expect(
      serviceUpdateSchema.safeParse({
        imagePath: IMAGE_PATH,
        updatedAt: UPDATED_AT,
      }).success,
    ).toBe(true);
  });
});
