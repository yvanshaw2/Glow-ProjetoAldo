import { describe, expect, it } from "vitest";
import { mergeServiceUpdate } from "@/server/rules/services";
import type { AdminService } from "@/shared/api/catalog";
import { serviceInputSchema } from "@/shared/validation/catalog";

// PATCH of a service (UC14, RN006, RN009): the update is applied to the
// service as it is, and the result must be a registration the POST accepts.

const UPDATED_AT = "2026-10-25T13:45:12.345678+00:00";
const CATEGORY = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Lavagem",
};
const ID_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ID_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PRICES = { small: 50, medium: 60, large: 70, extra_large: 80 };

const BASE = {
  id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  description: null,
  category: null,
  isCategoryActive: null,
  isActive: true,
  updatedAt: UPDATED_AT,
  imageUrl: null,
  additionalIds: [] as string[],
  mainServiceIds: [] as string[],
};

const MAIN_BY_SIZE: AdminService = {
  ...BASE,
  type: "main",
  name: "Lavagem completa",
  description: "Lavagem externa e interna.",
  category: CATEGORY,
  isCategoryActive: true,
  avgDurationMinutes: 90,
  pricingMode: "by_size",
  fixedPrice: null,
  startingPrice: 50,
  prices: PRICES,
  additionalIds: [ID_A],
};

const MAIN_FIXED: AdminService = {
  ...MAIN_BY_SIZE,
  pricingMode: "fixed",
  fixedPrice: 120,
  startingPrice: null,
  prices: null,
};

const ADDITIONAL: AdminService = {
  ...BASE,
  type: "additional",
  name: "Cera de carnaúba",
  avgDurationMinutes: 20,
  pricingMode: "fixed",
  fixedPrice: 35,
  startingPrice: null,
  prices: null,
  mainServiceIds: [ID_A],
};

describe("mergeServiceUpdate", () => {
  it("keeps the current values for what did not come", () => {
    const { input, isActive } = mergeServiceUpdate(MAIN_BY_SIZE, {
      isActive: false,
      updatedAt: UPDATED_AT,
    });
    expect(isActive).toBe(false);
    expect(input).toEqual({
      type: "main",
      categoryId: CATEGORY.id,
      name: "Lavagem completa",
      description: "Lavagem externa e interna.",
      avgDurationMinutes: 90,
      pricingMode: "by_size",
      prices: PRICES,
      additionalIds: [ID_A],
    });
    expect(serviceInputSchema.safeParse(input).success).toBe(true);
  });

  it("keeps the situation when isActive did not come", () => {
    const inactive = { ...MAIN_BY_SIZE, isActive: false };
    expect(
      mergeServiceUpdate(inactive, { name: "Outro", updatedAt: UPDATED_AT })
        .isActive,
    ).toBe(false);
  });

  it("replaces only the fields that came", () => {
    const { input } = mergeServiceUpdate(MAIN_BY_SIZE, {
      name: "Lavagem premium",
      avgDurationMinutes: 120,
      updatedAt: UPDATED_AT,
    });
    expect(input).toMatchObject({
      name: "Lavagem premium",
      avgDurationMinutes: 120,
      description: "Lavagem externa e interna.",
      prices: PRICES,
    });
  });

  it("drops the prices by size when switching to a fixed price", () => {
    const { input } = mergeServiceUpdate(MAIN_BY_SIZE, {
      pricingMode: "fixed",
      fixedPrice: 99,
      updatedAt: UPDATED_AT,
    });
    expect(input).toMatchObject({ pricingMode: "fixed", fixedPrice: 99 });
    expect(input).not.toHaveProperty("prices");
    expect(serviceInputSchema.safeParse(input).success).toBe(true);
  });

  it("drops the fixed price when switching to prices by size", () => {
    const { input } = mergeServiceUpdate(MAIN_FIXED, {
      pricingMode: "by_size",
      prices: PRICES,
      updatedAt: UPDATED_AT,
    });
    expect(input).toMatchObject({ pricingMode: "by_size", prices: PRICES });
    expect(input).not.toHaveProperty("fixedPrice");
    expect(serviceInputSchema.safeParse(input).success).toBe(true);
  });

  it("leaves the new values missing when the mode switches without them", () => {
    const toFixed = mergeServiceUpdate(MAIN_BY_SIZE, {
      pricingMode: "fixed",
      updatedAt: UPDATED_AT,
    }).input;
    const toSize = mergeServiceUpdate(MAIN_FIXED, {
      pricingMode: "by_size",
      updatedAt: UPDATED_AT,
    }).input;
    expect(serviceInputSchema.safeParse(toFixed).success).toBe(false);
    expect(serviceInputSchema.safeParse(toSize).success).toBe(false);
  });

  it("keeps the type of the service", () => {
    const { input } = mergeServiceUpdate(MAIN_BY_SIZE, {
      name: "Outro",
      updatedAt: UPDATED_AT,
    });
    expect(input).toMatchObject({ type: "main" });
  });

  it("merges the main services of an additional service without a category", () => {
    const { input } = mergeServiceUpdate(ADDITIONAL, {
      fixedPrice: 40,
      mainServiceIds: [ID_B],
      categoryId: CATEGORY.id,
      description: "Não se aplica",
      updatedAt: UPDATED_AT,
    });
    expect(input).toEqual({
      type: "additional",
      name: "Cera de carnaúba",
      avgDurationMinutes: 20,
      fixedPrice: 40,
      mainServiceIds: [ID_B],
    });
  });

  it("keeps the links when they did not come", () => {
    expect(
      mergeServiceUpdate(MAIN_BY_SIZE, { name: "Outro", updatedAt: UPDATED_AT })
        .input,
    ).toMatchObject({ additionalIds: [ID_A] });
    expect(
      mergeServiceUpdate(ADDITIONAL, { name: "Outro", updatedAt: UPDATED_AT })
        .input,
    ).toMatchObject({ mainServiceIds: [ID_A] });
  });

  it("replaces the links when they came, an empty list included", () => {
    expect(
      mergeServiceUpdate(MAIN_BY_SIZE, {
        additionalIds: [],
        updatedAt: UPDATED_AT,
      }).input,
    ).toMatchObject({ additionalIds: [] });
    expect(
      mergeServiceUpdate(MAIN_BY_SIZE, {
        additionalIds: [ID_B],
        updatedAt: UPDATED_AT,
      }).input,
    ).toMatchObject({ additionalIds: [ID_B] });
  });

  it("gives a complementary service no additionals", () => {
    const complementary: AdminService = {
      ...MAIN_BY_SIZE,
      type: "complementary",
      additionalIds: [],
    };
    const { input } = mergeServiceUpdate(complementary, {
      additionalIds: [ID_A],
      updatedAt: UPDATED_AT,
    });
    expect(input).not.toHaveProperty("additionalIds");
  });
});
