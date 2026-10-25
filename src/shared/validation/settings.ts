import { z } from "zod";
import {
  ADDRESS_MAX_LENGTH,
  cnpjSchema,
  COMPANY_NAME_MAX_LENGTH,
  companyPhoneSchema,
  emailSchema,
  facebookUrlSchema,
  halfHourTimeSchema,
  instagramUrlSchema,
  mobilePhoneSchema,
  optionalFormat,
  plainTextSchema,
  signedPercentSchema,
} from "@/shared/validation/formats";
import { PAYMENT_METHODS } from "@/shared/constants/payment-methods";
import { updatedAtSchema } from "@/shared/validation/params";

// Bodies of the routes of /api/admin/settings (docs/configuracoes/rotas.md),
// also used by the forms of /admin/settings. Unknown fields are discarded
// (RS013).

// UC22: only the company name is required (RN035).
export const companySettingsSchema = z.object({
  companyName: plainTextSchema(COMPANY_NAME_MAX_LENGTH),
  cnpj: optionalFormat(cnpjSchema),
  email: optionalFormat(emailSchema),
  phone: optionalFormat(companyPhoneSchema),
  address: optionalFormat(plainTextSchema(ADDRESS_MAX_LENGTH)),
  instagramUrl: optionalFormat(instagramUrlSchema),
  facebookUrl: optionalFormat(facebookUrlSchema),
  whatsapp: optionalFormat(mobilePhoneSchema),
  updatedAt: updatedAtSchema,
});

// UC23 and UC24 bodies are lists, so an error of an item goes to the field as
// <index>.<field> (docs/configuracoes/rotas.md); one of the whole list has no
// field.
const REQUIRED_MESSAGE = "Preencha este campo.";
const SEVEN_DAYS_MESSAGE = "Informe os sete dias da semana, sem repetir.";
const FOUR_METHODS_MESSAGE =
  "Informe as quatro formas de pagamento, sem repetir.";
const CLOSING_MESSAGE = "O encerramento deve ser depois da abertura.";
const BREAK_START_MESSAGE = "A pausa deve começar a partir da abertura.";
const BREAK_END_MESSAGE = "A pausa deve terminar até o encerramento.";
const BREAK_ORDER_MESSAGE = "O fim da pausa deve ser depois do início.";

type TimeField = "opensAt" | "closesAt" | "breakStartsAt" | "breakEndsAt";

const dayInputSchema = z.object({
  weekday: z.number(),
  isOpen: z.boolean({ error: REQUIRED_MESSAGE }),
  opensAt: z.unknown().optional(),
  closesAt: z.unknown().optional(),
  breakStartsAt: z.unknown().optional(),
  breakEndsAt: z.unknown().optional(),
});

function isAbsent(value: unknown): boolean {
  return value === undefined || value === null;
}

// UC23: a closed day keeps no time (ck_business_hours_open). The times are
// HH:MM, so comparing the texts compares the hours.
const businessDaySchema = dayInputSchema.transform((day, context) => {
  const fail = (field: string, message: string) =>
    context.addIssue({ code: "custom", message, path: [field] });
  const readTime = (field: TimeField) => {
    const result = halfHourTimeSchema.safeParse(day[field]);
    if (result.success) return result.data;
    fail(field, result.error.issues[0]?.message ?? REQUIRED_MESSAGE);
    return null;
  };
  const closed = {
    weekday: day.weekday,
    isOpen: false,
    opensAt: null,
    closesAt: null,
    breakStartsAt: null,
    breakEndsAt: null,
  };
  if (!day.isOpen) return closed;

  const opensAt = readTime("opensAt");
  const closesAt = readTime("closesAt");
  if (opensAt !== null && closesAt !== null && closesAt <= opensAt) {
    fail("closesAt", CLOSING_MESSAGE);
  }

  const hasBreak = !(isAbsent(day.breakStartsAt) && isAbsent(day.breakEndsAt));
  const breakStartsAt = hasBreak ? readTime("breakStartsAt") : null;
  const breakEndsAt = hasBreak ? readTime("breakEndsAt") : null;
  if (opensAt !== null && breakStartsAt !== null && breakStartsAt < opensAt) {
    fail("breakStartsAt", BREAK_START_MESSAGE);
  }
  if (
    breakStartsAt !== null &&
    breakEndsAt !== null &&
    breakEndsAt <= breakStartsAt
  ) {
    fail("breakEndsAt", BREAK_ORDER_MESSAGE);
  }
  if (closesAt !== null && breakEndsAt !== null && breakEndsAt > closesAt) {
    fail("breakEndsAt", BREAK_END_MESSAGE);
  }
  return {
    ...closed,
    isOpen: true,
    opensAt,
    closesAt,
    breakStartsAt,
    breakEndsAt,
  };
});

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

function readProperty(item: unknown, key: string): unknown {
  return typeof item === "object" && item !== null
    ? (item as Record<string, unknown>)[key]
    : undefined;
}

// The list holds every key once: with seven items and each key present, none
// repeats. The error of the whole list comes before any of an item.
function hasEveryKey(items: unknown[], key: string, keys: readonly unknown[]) {
  return (
    items.length === keys.length &&
    keys.every((expected) =>
      items.some((item) => readProperty(item, key) === expected),
    )
  );
}

// Parses each item with its schema and reports the issues under its index.
function parseItems<Item>(
  items: unknown[],
  itemSchema: z.ZodType<Item>,
  context: z.RefinementCtx,
): Item[] {
  return items.flatMap((item, index) => {
    const result = itemSchema.safeParse(item);
    if (result.success) return [result.data];
    result.error.issues.forEach(({ message, path }) =>
      context.addIssue({ code: "custom", message, path: [index, ...path] }),
    );
    return [];
  });
}

// UC23, RN013: the seven weekdays, from Sunday (0) to Saturday (6).
export const businessHoursSchema = z
  .array(z.unknown(), { error: SEVEN_DAYS_MESSAGE })
  .transform((items, context) => {
    if (!hasEveryKey(items, "weekday", WEEKDAYS)) {
      context.addIssue({ code: "custom", message: SEVEN_DAYS_MESSAGE });
      return z.NEVER;
    }
    return parseItems(items, businessDaySchema, context);
  });

const paymentFeeInputSchema = z.object({
  paymentMethod: z.enum(PAYMENT_METHODS),
  percent: signedPercentSchema,
});

// UC24, RN012: the four payment methods, with the percent signed.
export const paymentFeesSchema = z
  .array(z.unknown(), { error: FOUR_METHODS_MESSAGE })
  .transform((items, context) => {
    if (!hasEveryKey(items, "paymentMethod", PAYMENT_METHODS)) {
      context.addIssue({ code: "custom", message: FOUR_METHODS_MESSAGE });
      return z.NEVER;
    }
    return parseItems(items, paymentFeeInputSchema, context);
  });

export type CompanySettingsInput = z.output<typeof companySettingsSchema>;

export type CompanySettingsFormInput = z.input<typeof companySettingsSchema>;
