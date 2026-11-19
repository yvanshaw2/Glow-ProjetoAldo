"use client";

import { useId } from "react";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CANCELLATION_REASON_LABELS,
  type CancellationReason,
} from "@/shared/constants/cancellation-reasons";

// RN041: the reason of a cancellation, required, in the confirmation of the
// panel and of the portal, each with the reasons of its actor
// (docs/agendamento/agendamentos-do-painel.md, meus-agendamentos.md).
export function CancellationReasonField({
  reasons,
  value,
  onChange,
  error,
}: {
  reasons: readonly CancellationReason[];
  value: CancellationReason | null;
  onChange: (reason: CancellationReason) => void;
  error: string | null;
}) {
  const triggerId = useId();
  const errorId = `${triggerId}-error`;
  const items = reasons.map((reason) => ({
    value: reason,
    label: CANCELLATION_REASON_LABELS[reason],
  }));
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={triggerId}>Motivo do cancelamento</FieldLabel>
      <Select
        items={items}
        value={value}
        onValueChange={(next) => {
          if (next !== null) onChange(next);
        }}
      >
        <SelectTrigger
          id={triggerId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="w-full"
        >
          <SelectValue placeholder="Escolha o motivo" />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  );
}
