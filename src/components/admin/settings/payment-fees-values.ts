import type { PaymentFee } from "@/shared/api/settings";
import { PAYMENT_METHODS } from "@/shared/constants/payment-methods";

// The values of the form of the payment fees (docs/configuracoes/
// configuracoes-do-painel.md): the screen asks for a surcharge or a discount
// and a percentage from 0 to 100, and the API takes it with a sign (RN012).

export type FeeAdjustment = "surcharge" | "discount";

export type FeeFormValues = {
  adjustment: FeeAdjustment;
  // The text of the field, with a comma as the decimal separator.
  percent: string;
};

export type PaymentFeesFormValues = {
  fees: Record<(typeof PAYMENT_METHODS)[number], FeeFormValues>;
};

const MAX_INTEGER_DIGITS = 3;
const MAX_DECIMAL_DIGITS = 2;

function toFeeValues({ percent }: PaymentFee): FeeFormValues {
  return {
    adjustment: percent < 0 ? "discount" : "surcharge",
    percent: String(Math.abs(percent)).replace(".", ","),
  };
}

export function toFormValues(fees: PaymentFee[]): PaymentFeesFormValues {
  const values = Object.fromEntries(
    PAYMENT_METHODS.map((method) => {
      const fee = fees.find(({ paymentMethod }) => paymentMethod === method);
      return [
        method,
        toFeeValues(fee ?? { paymentMethod: method, percent: 0 }),
      ];
    }),
  );
  return { fees: values as PaymentFeesFormValues["fees"] };
}

// Digits and one comma, with up to three digits before it and two after.
export function sanitizePercentText(text: string): string {
  const [integerPart, ...rest] = text.replace(/[^\d,]/g, "").split(",");
  const integerText = integerPart.slice(0, MAX_INTEGER_DIGITS);
  if (rest.length === 0) return integerText;
  return `${integerText},${rest.join("").slice(0, MAX_DECIMAL_DIGITS)}`;
}

// The body of PUT /api/admin/settings/payment-fees: a discount is negative.
export function toRequestBody({ fees }: PaymentFeesFormValues): PaymentFee[] {
  return PAYMENT_METHODS.map((paymentMethod) => {
    const { adjustment, percent } = fees[paymentMethod];
    const amount = Number(percent.replace(",", "."));
    return {
      paymentMethod,
      percent: adjustment === "discount" ? -amount : amount,
    };
  });
}
