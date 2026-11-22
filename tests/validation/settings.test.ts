import { describe, expect, it } from "vitest";
import type { z } from "zod";
import {
  businessHoursSchema,
  companySettingsSchema,
  paymentFeesSchema,
} from "@/shared/validation/settings";

// Body of PUT /api/admin/settings/company and the company form (UC22): the
// formats of RN035, with every field optional but the company name.

// Messages from docs/plataforma/mensagens-de-validacao.md.
const REQUIRED = "Preencha este campo.";
const EMAIL = "Informe um e-mail válido, como maria@email.com.";
const MOBILE_PHONE = "Informe um celular com DDD, como (82) 99999-8888.";
const CNPJ = "Informe um CNPJ válido.";
const INSTAGRAM =
  "Informe o endereço do perfil no Instagram, começando por https://.";
const STALE_VERSION = "Atualize a página e tente novamente.";

const UPDATED_AT = "2026-10-20T13:45:12.345678+00:00";

const OPTIONAL_FIELDS = [
  "cnpj",
  "email",
  "phone",
  "address",
  "instagramUrl",
  "facebookUrl",
  "whatsapp",
] as const;

const filledInput = {
  companyName: "  Glow   Estética ",
  cnpj: "12.abc.345/01de-35",
  email: " Contato@Glow.COM ",
  phone: "(82) 3333-4444",
  address: "Rua  Exemplo,   100 –  Maceió",
  instagramUrl: "https://instagram.com/glow",
  facebookUrl: "https://www.facebook.com/glow",
  whatsapp: "(82) 99999-8888",
  updatedAt: UPDATED_AT,
};

function messagesOf(value: unknown): Record<string, string> {
  const result = companySettingsSchema.safeParse(value);
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map(({ path, message }) => [String(path[0]), message]),
  );
}

describe("companySettingsSchema", () => {
  it("normalizes every field of the company data", () => {
    expect(companySettingsSchema.parse(filledInput)).toEqual({
      companyName: "Glow Estética",
      cnpj: "12ABC34501DE35",
      email: "contato@glow.com",
      phone: "8233334444",
      address: "Rua Exemplo, 100 – Maceió",
      instagramUrl: "https://instagram.com/glow",
      facebookUrl: "https://www.facebook.com/glow",
      whatsapp: "82999998888",
      updatedAt: UPDATED_AT,
    });
  });

  it("accepts the company name alone, with every optional field empty", () => {
    const emptyValues = ["", null, undefined];
    for (const emptyValue of emptyValues) {
      const input = Object.fromEntries(
        OPTIONAL_FIELDS.map((field) => [field, emptyValue]),
      );
      expect(
        companySettingsSchema.parse({
          ...input,
          companyName: "Glow",
          updatedAt: UPDATED_AT,
        }),
      ).toEqual({
        companyName: "Glow",
        cnpj: null,
        email: null,
        phone: null,
        address: null,
        instagramUrl: null,
        facebookUrl: null,
        whatsapp: null,
        updatedAt: UPDATED_AT,
      });
    }
  });

  it("accepts the company name alone, with the optional fields absent", () => {
    expect(
      companySettingsSchema.parse({
        companyName: "Glow",
        updatedAt: UPDATED_AT,
      }),
    ).toEqual({
      companyName: "Glow",
      cnpj: null,
      email: null,
      phone: null,
      address: null,
      instagramUrl: null,
      facebookUrl: null,
      whatsapp: null,
      updatedAt: UPDATED_AT,
    });
  });

  it("requires the company name", () => {
    for (const companyName of ["", "   ", undefined]) {
      expect(messagesOf({ ...filledInput, companyName }).companyName).toBe(
        REQUIRED,
      );
    }
  });

  it("rejects a company name over 100 characters", () => {
    const companyName = "a".repeat(101);
    expect(messagesOf({ ...filledInput, companyName }).companyName).toBe(
      "Use até 100 caracteres.",
    );
  });

  it("rejects a CNPJ with a wrong check digit", () => {
    const cnpj = "12.345.678/0001-96";
    expect(messagesOf({ ...filledInput, cnpj }).cnpj).toBe(CNPJ);
  });

  it("rejects an e-mail without a domain", () => {
    for (const email of ["maria@", "maria@email"]) {
      expect(messagesOf({ ...filledInput, email }).email).toBe(EMAIL);
    }
  });

  it("rejects a landline as the WhatsApp", () => {
    const whatsapp = "(82) 3333-4444";
    expect(messagesOf({ ...filledInput, whatsapp }).whatsapp).toBe(
      MOBILE_PHONE,
    );
  });

  it("rejects an Instagram address on another site", () => {
    const instagramUrl = "https://glow.com/instagram";
    expect(messagesOf({ ...filledInput, instagramUrl }).instagramUrl).toBe(
      INSTAGRAM,
    );
  });

  it("rejects an address over 200 characters", () => {
    const address = "a".repeat(201);
    expect(messagesOf({ ...filledInput, address }).address).toBe(
      "Use até 200 caracteres.",
    );
  });

  it("requires the updatedAt", () => {
    const withoutVersion = { ...filledInput, updatedAt: undefined };
    expect(messagesOf(withoutVersion).updatedAt).toBe(STALE_VERSION);
  });

  it("discards unknown fields", () => {
    const settings = companySettingsSchema.parse({
      ...filledInput,
      id: 2,
      createdAt: UPDATED_AT,
    });
    expect(settings).not.toHaveProperty("id");
    expect(settings).not.toHaveProperty("createdAt");
  });
});

// Bodies of PUT /api/admin/settings/business-hours and payment-fees (UC23,
// UC24): lists whose errors go to the field of the item, as <index>.<field>.
const HALF_HOUR = "Escolha um horário em hora cheia ou meia hora.";
const CLOSING = "O encerramento deve ser depois da abertura.";
const BREAK_START = "A pausa deve começar a partir da abertura.";
const BREAK_END = "A pausa deve terminar até o encerramento.";
const BREAK_ORDER = "O fim da pausa deve ser depois do início.";
const SEVEN_DAYS = "Informe os sete dias da semana, sem repetir.";
const FOUR_METHODS = "Informe as quatro formas de pagamento, sem repetir.";
const PERCENT =
  "Informe um percentual de 0 a 100, com até duas casas decimais.";

function weekdayInput(weekday: number) {
  if (weekday === 0) {
    return { weekday, isOpen: false };
  }
  return {
    weekday,
    isOpen: true,
    opensAt: "08:00",
    closesAt: weekday === 6 ? "12:00" : "18:00",
    breakStartsAt: weekday === 6 ? null : "12:00",
    breakEndsAt: weekday === 6 ? null : "13:00",
  };
}

const seededWeek = [0, 1, 2, 3, 4, 5, 6].map(weekdayInput);

function withDay(weekday: number, change: Record<string, unknown>) {
  return seededWeek.map((day) =>
    day.weekday === weekday ? { ...day, ...change } : day,
  );
}

function pathMessages(result: {
  success: boolean;
  error?: { issues: z.core.$ZodIssue[] };
}): Record<string, string> {
  if (result.success || !result.error) return {};
  return Object.fromEntries(
    [...result.error.issues]
      .reverse()
      .map(({ path, message }) => [path.join("."), message]),
  );
}

// UC23: the body is the seven days and the simultaneous slots (RN044).
function hours(days: unknown, simultaneousSlots: unknown = 3) {
  return { days, simultaneousSlots };
}

function hoursMessages(value: unknown): Record<string, string> {
  return pathMessages(businessHoursSchema.safeParse(hours(value)));
}

function bodyMessages(
  schema: typeof businessHoursSchema | typeof paymentFeesSchema,
  value: unknown,
) {
  const result = schema.safeParse(value);
  return {
    success: result.success,
    messages: result.error?.issues.map((issue) => issue.message),
    paths: result.error?.issues.map((issue) => issue.path),
  };
}

describe("businessHoursSchema", () => {
  it("accepts the seven days of the seed", () => {
    expect(businessHoursSchema.parse(hours(seededWeek)).days).toEqual([
      {
        weekday: 0,
        isOpen: false,
        opensAt: null,
        closesAt: null,
        breakStartsAt: null,
        breakEndsAt: null,
      },
      ...[1, 2, 3, 4, 5].map((weekday) => ({
        weekday,
        isOpen: true,
        opensAt: "08:00",
        closesAt: "18:00",
        breakStartsAt: "12:00",
        breakEndsAt: "13:00",
      })),
      {
        weekday: 6,
        isOpen: true,
        opensAt: "08:00",
        closesAt: "12:00",
        breakStartsAt: null,
        breakEndsAt: null,
      },
    ]);
  });

  it("discards the times of a closed day and the unknown fields", () => {
    const week = withDay(2, {
      isOpen: false,
      updatedAt: "2026-10-20T13:45:12.345678+00:00",
    });
    expect(businessHoursSchema.parse(hours(week)).days[2]).toEqual({
      weekday: 2,
      isOpen: false,
      opensAt: null,
      closesAt: null,
      breakStartsAt: null,
      breakEndsAt: null,
    });
  });

  it("requires the times of an open day", () => {
    for (const missing of [null, undefined]) {
      expect(
        hoursMessages(withDay(1, { opensAt: missing, closesAt: missing })),
      ).toEqual({ "days.1.opensAt": REQUIRED, "days.1.closesAt": REQUIRED });
    }
  });

  it("requires isOpen", () => {
    expect(hoursMessages(withDay(1, { isOpen: undefined }))).toEqual({
      "days.1.isOpen": REQUIRED,
    });
  });

  it("rejects a time that is not a whole or half hour", () => {
    for (const opensAt of ["08:15", "8:00", "24:00"]) {
      expect(hoursMessages(withDay(0, { isOpen: true, opensAt }))).toEqual({
        "days.0.opensAt": HALF_HOUR,
        "days.0.closesAt": REQUIRED,
      });
    }
  });

  it("rejects closing at or before opening (UC23 FE01)", () => {
    for (const closesAt of ["08:00", "07:30"]) {
      const week = withDay(2, {
        closesAt,
        breakStartsAt: null,
        breakEndsAt: null,
      });
      expect(hoursMessages(week)).toEqual({ "days.2.closesAt": CLOSING });
    }
  });

  it("rejects a break outside the working hours or inverted (UC23 FE02)", () => {
    expect(hoursMessages(withDay(2, { breakStartsAt: "07:30" }))).toEqual({
      "days.2.breakStartsAt": BREAK_START,
    });
    expect(hoursMessages(withDay(2, { breakEndsAt: "18:30" }))).toEqual({
      "days.2.breakEndsAt": BREAK_END,
    });
    for (const breakEndsAt of ["12:00", "11:30"]) {
      expect(hoursMessages(withDay(2, { breakEndsAt }))).toEqual({
        "days.2.breakEndsAt": BREAK_ORDER,
      });
    }
  });

  it("rejects a break with only one time", () => {
    expect(hoursMessages(withDay(2, { breakEndsAt: null }))).toEqual({
      "days.2.breakEndsAt": REQUIRED,
    });
    expect(hoursMessages(withDay(2, { breakStartsAt: undefined }))).toEqual({
      "days.2.breakStartsAt": REQUIRED,
    });
  });

  it("accepts a break that touches the opening or the closing", () => {
    const week = withDay(2, { breakStartsAt: "08:00", breakEndsAt: "18:00" });
    expect(businessHoursSchema.parse(hours(week)).days[2].breakEndsAt).toBe(
      "18:00",
    );
  });

  it("requires the seven days once each", () => {
    const bodies = [
      seededWeek.slice(1),
      [...seededWeek, weekdayInput(1)],
      withDay(6, { weekday: 1 }),
      withDay(6, { weekday: 7 }),
      withDay(6, { weekday: "6" }),
      {},
    ];
    for (const body of bodies) {
      expect(bodyMessages(businessHoursSchema, hours(body))).toEqual({
        success: false,
        messages: [SEVEN_DAYS],
        paths: [[]],
      });
    }
  });

  it("reports the first message of a field first", () => {
    const issues = businessHoursSchema.safeParse(
      hours(withDay(2, { opensAt: "08:15", closesAt: "07:00" })),
    ).error?.issues;
    expect(issues?.[0]).toMatchObject({
      path: ["days", 2, "opensAt"],
      message: HALF_HOUR,
    });
  });
});

const noAdjustment = [
  { paymentMethod: "credit", percent: 0 },
  { paymentMethod: "debit", percent: 0 },
  { paymentMethod: "pix", percent: 0 },
  { paymentMethod: "cash", percent: 0 },
];

describe("paymentFeesSchema", () => {
  it("accepts a surcharge, a discount and no adjustment (UC24, FA01)", () => {
    const fees = [
      { paymentMethod: "credit", percent: 5 },
      { paymentMethod: "debit", percent: 0 },
      { paymentMethod: "pix", percent: -3 },
      { paymentMethod: "cash", percent: 0 },
    ];
    expect(paymentFeesSchema.parse(fees)).toEqual(fees);
  });

  it("requires the four methods once each", () => {
    const bodies = [
      noAdjustment.slice(1),
      [...noAdjustment, noAdjustment[0]],
      [...noAdjustment.slice(0, 3), { paymentMethod: "boleto", percent: 0 }],
      [...noAdjustment.slice(0, 3), noAdjustment[0]],
      "credit",
    ];
    for (const body of bodies) {
      expect(bodyMessages(paymentFeesSchema, body)).toEqual({
        success: false,
        messages: [FOUR_METHODS],
        paths: [[]],
      });
    }
  });

  it("reports an invalid percent in the item (UC24 FE01)", () => {
    for (const percent of [150, -150, "abc"]) {
      const fees = noAdjustment.map((fee) =>
        fee.paymentMethod === "pix" ? { ...fee, percent } : fee,
      );
      expect(pathMessages(paymentFeesSchema.safeParse(fees))).toEqual({
        "2.percent": PERCENT,
      });
    }
  });

  it("requires the percent", () => {
    const fees = noAdjustment.map((fee) =>
      fee.paymentMethod === "cash" ? { paymentMethod: "cash" } : fee,
    );
    expect(pathMessages(paymentFeesSchema.safeParse(fees))).toEqual({
      "3.percent": REQUIRED,
    });
  });

  it("discards the unknown fields", () => {
    const fees = noAdjustment.map((fee) => ({ ...fee, updatedAt: "x" }));
    expect(paymentFeesSchema.parse(fees)).toEqual(noAdjustment);
  });
});

describe("businessHoursSchema, simultaneous slots (RN044)", () => {
  const SLOTS = "Informe de 1 a 20 atendimentos simultâneos.";

  it("accepts a whole number from 1 to 20", () => {
    for (const slots of [1, 3, 20]) {
      expect(
        businessHoursSchema.parse(hours(seededWeek, slots)).simultaneousSlots,
      ).toBe(slots);
    }
  });

  it("rejects no number, 0, 21, a fraction and a text in its field", () => {
    const bodies = [
      { days: seededWeek },
      ...[null, 0, 21, 2.5, "3"].map((slots) => hours(seededWeek, slots)),
    ];
    for (const body of bodies) {
      expect(pathMessages(businessHoursSchema.safeParse(body))).toEqual({
        simultaneousSlots: SLOTS,
      });
    }
  });

  it("rejects the list of days alone, as before", () => {
    const result = businessHoursSchema.safeParse(seededWeek);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: [],
      message: SEVEN_DAYS,
    });
  });
});
