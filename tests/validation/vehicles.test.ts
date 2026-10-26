import { describe, expect, it } from "vitest";
import {
  vehicleDataSchema,
  vehicleFormSchema,
  vehicleInputSchema,
  vehicleLookupQuerySchema,
  vehiclePlateFormSchema,
  vehicleUpdateSchema,
} from "@/shared/validation/vehicles";

// Bodies and query of the vehicle routes of the panel (UC18) and the vehicle
// forms: RN002, RN035 and RN036.

// Messages from docs/plataforma/mensagens-de-validacao.md.
const REQUIRED = "Preencha este campo.";
const PLATE = "Informe uma placa válida.";
const BRAND_MODEL = "Use de 1 a 40 caracteres.";
const COLOR = "Use de 3 a 30 letras.";
const TYPE = "Escolha o tipo do veículo.";
const STALE_VERSION = "Atualize a página e tente novamente.";
const NO_FIELD = "Informe ao menos um campo para alterar.";

const CURRENT_YEAR = 2026;
const YEAR = `Informe um ano de 1886 a ${CURRENT_YEAR + 1}.`;

const UPDATED_AT = "2026-10-26T13:45:12.345678+00:00";

const VALID_DATA = {
  type: "suv",
  brand: "volkswagen",
  model: "t-cross",
  color: "prata",
  year: 2024,
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

describe("vehicleDataSchema", () => {
  const schema = vehicleDataSchema(CURRENT_YEAR);

  it("accepts the data of a new vehicle and normalizes it", () => {
    expect(schema.parse(VALID_DATA)).toEqual({
      type: "suv",
      brand: "Volkswagen",
      model: "T-cross",
      color: "Prata",
      year: 2024,
    });
  });

  it("requires each of the five fields", () => {
    expect(messagesOf(schema, {})).toEqual({
      type: TYPE,
      brand: REQUIRED,
      model: REQUIRED,
      color: REQUIRED,
      year: REQUIRED,
    });
  });

  it("rejects a type outside the four values", () => {
    expect(messagesOf(schema, { ...VALID_DATA, type: "van" })).toEqual({
      type: TYPE,
    });
    expect(messagesOf(schema, { ...VALID_DATA, type: null })).toEqual({
      type: TYPE,
    });
  });

  it("accepts the four types", () => {
    for (const type of ["hatch", "sedan", "suv", "pickup"]) {
      expect(schema.parse({ ...VALID_DATA, type }).type).toBe(type);
    }
  });

  it("rejects a brand and a model outside 1 to 40 characters", () => {
    expect(
      messagesOf(schema, {
        ...VALID_DATA,
        brand: "A".repeat(41),
        model: "B".repeat(41),
      }),
    ).toEqual({ brand: BRAND_MODEL, model: BRAND_MODEL });
  });

  it("rejects a color with digits and one under 3 letters", () => {
    expect(messagesOf(schema, { ...VALID_DATA, color: "Azul 2" })).toEqual({
      color: COLOR,
    });
    expect(messagesOf(schema, { ...VALID_DATA, color: "az" })).toEqual({
      color: COLOR,
    });
  });

  it("rejects a year before 1886 and after the next one", () => {
    expect(messagesOf(schema, { ...VALID_DATA, year: 1885 })).toEqual({
      year: YEAR,
    });
    expect(
      messagesOf(schema, { ...VALID_DATA, year: CURRENT_YEAR + 2 }),
    ).toEqual({ year: YEAR });
    expect(messagesOf(schema, { ...VALID_DATA, year: "2024" })).toEqual({
      year: YEAR,
    });
  });

  it("accepts the current year plus one", () => {
    expect(schema.parse({ ...VALID_DATA, year: CURRENT_YEAR + 1 }).year).toBe(
      CURRENT_YEAR + 1,
    );
  });
});

describe("vehicleInputSchema", () => {
  it("normalizes the plate", () => {
    expect(vehicleInputSchema.parse({ plate: "abc-1234" }).plate).toBe(
      "ABC1234",
    );
    expect(vehicleInputSchema.parse({ plate: "abc1d23" }).plate).toBe(
      "ABC1D23",
    );
  });

  it("accepts a body with only the plate", () => {
    expect(vehicleInputSchema.parse({ plate: "ABC1D23" })).toEqual({
      plate: "ABC1D23",
    });
  });

  it("keeps the data of a new vehicle as it came, for the service to check", () => {
    expect(
      vehicleInputSchema.parse({ plate: "ABC1D23", ...VALID_DATA }),
    ).toEqual({ plate: "ABC1D23", ...VALID_DATA });
  });

  it("rejects an invalid plate and an absent one", () => {
    expect(messagesOf(vehicleInputSchema, { plate: "ABC12" })).toEqual({
      plate: PLATE,
    });
    expect(messagesOf(vehicleInputSchema, {})).toEqual({ plate: REQUIRED });
  });

  it("discards the unknown fields", () => {
    expect(
      vehicleInputSchema.parse({
        plate: "ABC1D23",
        id: "x",
        size: "large",
        isShared: true,
        clientId: "y",
      }),
    ).toEqual({ plate: "ABC1D23" });
  });
});

describe("vehicleUpdateSchema", () => {
  const schema = vehicleUpdateSchema(CURRENT_YEAR);

  it("requires updatedAt and keeps it as text", () => {
    expect(messagesOf(schema, { type: "sedan" })).toEqual({
      updatedAt: STALE_VERSION,
    });
    expect(
      schema.parse({ type: "sedan", updatedAt: UPDATED_AT }).updatedAt,
    ).toBe(UPDATED_AT);
  });

  it("accepts a single field", () => {
    expect(schema.parse({ type: "pickup", updatedAt: UPDATED_AT })).toEqual({
      type: "pickup",
      updatedAt: UPDATED_AT,
    });
    expect(schema.parse({ plate: "abc-1234", updatedAt: UPDATED_AT })).toEqual({
      plate: "ABC1234",
      updatedAt: UPDATED_AT,
    });
    expect(schema.parse({ year: 2020, updatedAt: UPDATED_AT })).toEqual({
      year: 2020,
      updatedAt: UPDATED_AT,
    });
  });

  it("rejects a body with only updatedAt", () => {
    expect(messagesOf(schema, { updatedAt: UPDATED_AT })).toEqual({
      "": NO_FIELD,
    });
  });

  it("checks the fields that came with the same rules", () => {
    expect(
      messagesOf(schema, {
        type: "van",
        plate: "123",
        brand: "",
        color: "a",
        year: 1800,
        updatedAt: UPDATED_AT,
      }),
    ).toEqual({
      type: TYPE,
      plate: PLATE,
      brand: REQUIRED,
      color: COLOR,
      year: YEAR,
    });
  });

  it("discards id, size and isShared", () => {
    expect(
      schema.parse({
        color: "preto",
        id: "x",
        size: "large",
        isShared: true,
        updatedAt: UPDATED_AT,
      }),
    ).toEqual({ color: "Preto", updatedAt: UPDATED_AT });
  });
});

describe("vehicleLookupQuerySchema", () => {
  it("normalizes the plate", () => {
    expect(vehicleLookupQuerySchema.parse({ plate: "abc-1234" })).toEqual({
      plate: "ABC1234",
    });
  });

  it("rejects an invalid or missing plate", () => {
    expect(messagesOf(vehicleLookupQuerySchema, { plate: "12" })).toEqual({
      plate: PLATE,
    });
    expect(messagesOf(vehicleLookupQuerySchema, {})).toEqual({
      plate: REQUIRED,
    });
  });
});

describe("vehicleFormSchema", () => {
  const schema = vehicleFormSchema(CURRENT_YEAR);

  const FORM_VALUES = {
    plate: "ABC-1234",
    type: "hatch",
    brand: "fiat",
    model: "argo",
    color: "vermelho",
    year: "2022",
  };

  it("turns the text year into a number and accepts the plate with the mask", () => {
    expect(schema.parse(FORM_VALUES)).toEqual({
      plate: "ABC1234",
      type: "hatch",
      brand: "Fiat",
      model: "Argo",
      color: "Vermelho",
      year: 2022,
    });
  });

  it("requires the year when it is empty", () => {
    expect(messagesOf(schema, { ...FORM_VALUES, year: "" })).toEqual({
      year: REQUIRED,
    });
  });

  it("rejects a year with letters", () => {
    expect(messagesOf(schema, { ...FORM_VALUES, year: "20a2" })).toEqual({
      year: YEAR,
    });
  });

  it("requires the type of a new vehicle", () => {
    expect(messagesOf(schema, { ...FORM_VALUES, type: null })).toEqual({
      type: TYPE,
    });
  });
});

describe("vehiclePlateFormSchema", () => {
  it("checks only the plate", () => {
    expect(vehiclePlateFormSchema.parse({ plate: "abc-1234" })).toEqual({
      plate: "ABC1234",
    });
    expect(messagesOf(vehiclePlateFormSchema, { plate: "" })).toEqual({
      plate: REQUIRED,
    });
  });
});
