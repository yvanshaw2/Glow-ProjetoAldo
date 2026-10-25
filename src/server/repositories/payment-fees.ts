import "server-only";
import { getServiceClient } from "@/server/supabase/clients";
import type { PaymentFee } from "@/shared/api/settings";
import type { PaymentMethod } from "@/shared/constants/payment-methods";

// Table payment_fees, one row per payment method (docs/configuracoes/
// dados.md).

type PaymentFeeRow = {
  payment_method: PaymentMethod;
  percent: number | string;
};

const PAYMENT_FEES_COLUMNS = "payment_method, percent";

// numeric(5,2) may come as text; the API gives a number (RN012).
function toPaymentFee(row: PaymentFeeRow): PaymentFee {
  return {
    paymentMethod: row.payment_method,
    percent: Number(row.percent),
  };
}

// In the order of the payment_method enum: credit, debit, Pix and cash.
export async function listPaymentFees(): Promise<PaymentFee[]> {
  const { data, error } = await getServiceClient()
    .from("payment_fees")
    .select(PAYMENT_FEES_COLUMNS)
    .order("payment_method")
    .overrideTypes<PaymentFeeRow[], { merge: false }>();
  if (error) {
    throw error;
  }
  return data.map(toPaymentFee);
}

// UC24: the four rows are written by one statement.
export async function replacePaymentFees(
  fees: PaymentFee[],
): Promise<PaymentFee[]> {
  const { data, error } = await getServiceClient()
    .from("payment_fees")
    .upsert(
      fees.map((fee) => ({
        payment_method: fee.paymentMethod,
        percent: fee.percent,
      })),
      { onConflict: "payment_method" },
    )
    .select(PAYMENT_FEES_COLUMNS)
    .order("payment_method")
    .overrideTypes<PaymentFeeRow[], { merge: false }>();
  if (error) {
    throw error;
  }
  return data.map(toPaymentFee);
}
