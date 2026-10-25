"use client";

import { useState } from "react";
import { Controller, useForm, type Control } from "react-hook-form";
import {
  sanitizePercentText,
  toFormValues,
  toRequestBody,
  type FeeAdjustment,
  type PaymentFeesFormValues,
} from "@/components/admin/settings/payment-fees-values";
import { SettingsNotices } from "@/components/admin/settings/settings-notices";
import { SettingsSection } from "@/components/admin/settings/settings-section";
import { ChoiceGroup, type Choice } from "@/components/shared/choice-group";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFormFailure } from "@/hooks/use-form-failure";
import { apiRequest } from "@/lib/api-client";
import type { PaymentFee } from "@/shared/api/settings";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  type PaymentMethod,
} from "@/shared/constants/payment-methods";

// UC24 (docs/configuracoes/configuracoes-do-painel.md): the surcharge or
// discount of each payment method, in the Formas de pagamento tab. The four
// are saved together.

const PAYMENT_FEES_PATH = "/api/admin/settings/payment-fees";

const ADJUSTMENT_CHOICES: Choice<FeeAdjustment>[] = [
  {
    value: "surcharge",
    label: "Acréscimo",
    description: "Soma ao valor do agendamento.",
  },
  {
    value: "discount",
    label: "Desconto",
    description: "Reduz o valor do agendamento.",
  },
];

export function PaymentFeesForm() {
  return (
    <SettingsSection<PaymentFee[]>
      path={PAYMENT_FEES_PATH}
      skeletonCount={PAYMENT_METHODS.length}
    >
      {(fees) => <PaymentFeesFields fees={fees} />}
    </SettingsSection>
  );
}

function PaymentFeesFields({ fees }: { fees: PaymentFee[] }) {
  const { control, handleSubmit, setError, reset, formState } =
    useForm<PaymentFeesFormValues>({ defaultValues: toFormValues(fees) });
  const { failure, showFailure, clearFailure } = useFormFailure(setError);
  const [isSaved, setIsSaved] = useState(false);

  async function submit(values: PaymentFeesFormValues) {
    clearFailure();
    setIsSaved(false);
    try {
      const saved = await apiRequest<PaymentFee[]>(PAYMENT_FEES_PATH, {
        method: "PUT",
        body: toRequestBody(values),
      });
      reset(toFormValues(saved));
      setIsSaved(true);
    } catch (error) {
      showFailure(error);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground">
        Defina o acréscimo ou o desconto aplicado ao valor do agendamento em
        cada forma de pagamento.
      </p>
      <SettingsNotices
        savedMessage={isSaved ? "Percentuais salvos." : null}
        failure={failure}
      />
      <form
        noValidate
        onSubmit={handleSubmit(submit)}
        onChange={() => setIsSaved(false)}
        className="flex flex-col gap-5"
      >
        <ul className="grid gap-5 lg:grid-cols-2">
          {PAYMENT_METHODS.map((method) => (
            <li key={method}>
              <FeeFields control={control} method={method} />
            </li>
          ))}
        </ul>
        <SubmitButton
          isLoading={formState.isSubmitting}
          loadingLabel="Salvando…"
          className="w-full sm:w-auto sm:self-end"
        >
          Salvar percentuais
        </SubmitButton>
      </form>
    </div>
  );
}

type FeeFieldsProps = {
  control: Control<PaymentFeesFormValues>;
  method: PaymentMethod;
};

function FeeFields({ control, method }: FeeFieldsProps) {
  return (
    <FieldSet className="h-full gap-4 rounded-xl bg-background p-5 shadow-neu-md">
      <legend className="font-semibold">{PAYMENT_METHOD_LABELS[method]}</legend>
      <Controller
        control={control}
        name={`fees.${method}.adjustment`}
        render={({ field }) => (
          <ChoiceGroup
            legend="Ajuste"
            choices={ADJUSTMENT_CHOICES}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
          />
        )}
      />
      <FormField
        control={control}
        name={`fees.${method}.percent`}
        label="Percentual"
        description="De 0 a 100. Com 0, não há ajuste."
        rules={{ required: "Informe o percentual." }}
        renderInput={(field) => (
          <div className="flex items-center gap-2">
            <Input
              {...field}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              className="max-w-32"
              onChange={(event) =>
                field.onChange(sanitizePercentText(event.target.value))
              }
            />
            <span aria-hidden>%</span>
          </div>
        )}
      />
    </FieldSet>
  );
}
