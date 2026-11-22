"use client";

import { useFormContext, useWatch } from "react-hook-form";
import type { ServiceFormValues } from "@/components/admin/catalog/service-form-values";
import { FormField } from "@/components/shared/form-field";
import { MoneyInput } from "@/components/shared/money-input";
import {
  VEHICLE_SIZE_LABELS,
  VEHICLE_SIZES,
} from "@/shared/constants/vehicle-sizes";

// UC13 steps 6 and 7 (docs/catalogo/servicos-do-painel.md, RN009): the fixed
// price, or one for each size, as the pricing mode of the first step. Every
// value is greater than zero, checked by the schema of the service (RN009).
// Beside each value, the optional cost of the supplies (RN042), internal data
// that the client never sees (RS021); empty is no cost.

export const COST_DESCRIPTION =
  "Produtos e materiais gastos em um atendimento. Não aparece para o cliente.";

const SIZE_NAMES = {
  small: "Pequeno",
  medium: "Médio",
  large: "Grande",
  extra_large: "Extra grande",
} as const;

export function ServicePricesStep() {
  const { control } = useFormContext<ServiceFormValues>();
  const pricingMode = useWatch<ServiceFormValues, "pricingMode">({
    name: "pricingMode",
  });
  if (pricingMode === "fixed") {
    return (
      <div className="grid gap-5 @md:grid-cols-2">
        <FormField
          control={control}
          name="fixedPrice"
          label="Valor fixo"
          description="O mesmo valor para qualquer veículo."
          renderInput={(field) => <MoneyInput {...field} />}
        />
        <FormField
          control={control}
          name="fixedCost"
          label="Custo dos insumos (opcional)"
          description={COST_DESCRIPTION}
          renderInput={(field) => <MoneyInput {...field} />}
        />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        Custo dos insumos (opcional): {COST_DESCRIPTION}
      </p>
      {VEHICLE_SIZES.map((size) => (
        <div key={size} className="grid gap-5 @md:grid-cols-2">
          <FormField
            control={control}
            name={`prices.${size}`}
            label={`${SIZE_NAMES[size]} (${VEHICLE_SIZE_LABELS[size]})`}
            renderInput={(field) => <MoneyInput {...field} />}
          />
          <FormField
            control={control}
            name={`costs.${size}`}
            label={`Custo dos insumos, ${SIZE_NAMES[size].toLowerCase()} (opcional)`}
            renderInput={(field) => <MoneyInput {...field} />}
          />
        </div>
      ))}
    </div>
  );
}
