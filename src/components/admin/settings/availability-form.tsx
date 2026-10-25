"use client";

import { useState } from "react";
import { Controller, useForm, useWatch, type Control } from "react-hook-form";
import {
  toFormValues,
  toRequestBody,
  TIME_OPTIONS,
  type AvailabilityFormValues,
} from "@/components/admin/settings/availability-values";
import { SettingsNotices } from "@/components/admin/settings/settings-notices";
import { SettingsSection } from "@/components/admin/settings/settings-section";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { FieldSet } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useFormFailure } from "@/hooks/use-form-failure";
import { apiRequest } from "@/lib/api-client";
import type { BusinessDay } from "@/shared/api/settings";
import { WEEKDAY_LABELS } from "@/shared/constants/weekdays";

// UC23 (docs/configuracoes/configuracoes-do-painel.md): the seven days with
// their opening, closing and optional break, in the Disponibilidade tab.

const BUSINESS_HOURS_PATH = "/api/admin/settings/business-hours";
const DAY_COUNT = WEEKDAY_LABELS.length;

// The API reports an error of the list as <index>.<field>; the form keeps the
// days under `days`, with the index equal to the weekday.
function toFieldName(field: string): string {
  return `days.${field}`;
}

export function AvailabilityForm() {
  return (
    <SettingsSection<BusinessDay[]>
      path={BUSINESS_HOURS_PATH}
      skeletonCount={DAY_COUNT}
    >
      {(days) => <AvailabilityFields days={days} />}
    </SettingsSection>
  );
}

function AvailabilityFields({ days }: { days: BusinessDay[] }) {
  const { control, handleSubmit, setError, clearErrors, reset, formState } =
    useForm<AvailabilityFormValues>({ defaultValues: toFormValues(days) });
  const { failure, showFailure, clearFailure } = useFormFailure(
    setError,
    toFieldName,
  );
  const [isSaved, setIsSaved] = useState(false);

  async function submit(values: AvailabilityFormValues) {
    clearFailure();
    setIsSaved(false);
    try {
      const saved = await apiRequest<BusinessDay[]>(BUSINESS_HOURS_PATH, {
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
        Defina os dias e os horários em que a empresa atende.
      </p>
      <SettingsNotices
        savedMessage={isSaved ? "Disponibilidade salva." : null}
        failure={failure}
      />
      <form
        noValidate
        onSubmit={(event) => {
          // A message from the route may be about a field the person already
          // fixed through another one, such as the closing and a break; it would
          // keep the form from being sent.
          clearErrors();
          return handleSubmit(submit)(event);
        }}
        onChange={() => setIsSaved(false)}
        className="flex flex-col gap-5"
      >
        <ul className="grid gap-5 lg:grid-cols-2">
          {WEEKDAY_LABELS.map((label, index) => (
            <li key={label}>
              <DayFields control={control} index={index} label={label} />
            </li>
          ))}
        </ul>
        <SubmitButton
          isLoading={formState.isSubmitting}
          loadingLabel="Salvando…"
          className="w-full sm:w-auto sm:self-end"
        >
          Salvar disponibilidade
        </SubmitButton>
      </form>
    </div>
  );
}

type DayFieldsProps = {
  control: Control<AvailabilityFormValues>;
  index: number;
  label: string;
};

// One day: open or closed, and the times of the open day. The switches keep
// the times of the fields while they are off.
function DayFields({ control, index, label }: DayFieldsProps) {
  const isOpen = useWatch({ control, name: `days.${index}.isOpen` });
  const hasBreak = useWatch({ control, name: `days.${index}.hasBreak` });
  return (
    <FieldSet className="h-full gap-4 rounded-xl bg-background p-5 shadow-neu-md">
      <legend className="sr-only">{label}</legend>
      <DaySwitch
        control={control}
        name={`days.${index}.isOpen`}
        label={`${label} aberto`}
        title={label}
        stateText={isOpen ? "Aberto" : "Fechado"}
      />
      {isOpen && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <TimeField
              control={control}
              name={`days.${index}.opensAt`}
              label="Abre às"
              dayLabel={label}
            />
            <TimeField
              control={control}
              name={`days.${index}.closesAt`}
              label="Fecha às"
              dayLabel={label}
            />
          </div>
          <DaySwitch
            control={control}
            name={`days.${index}.hasBreak`}
            label={`${label}: pausa`}
            title="Pausa"
            stateText={hasBreak ? "Com pausa" : "Sem pausa"}
          />
          {hasBreak && (
            <div className="grid grid-cols-2 gap-4">
              <TimeField
                control={control}
                name={`days.${index}.breakStartsAt`}
                label="Início da pausa"
                dayLabel={label}
              />
              <TimeField
                control={control}
                name={`days.${index}.breakEndsAt`}
                label="Fim da pausa"
                dayLabel={label}
              />
            </div>
          )}
        </>
      )}
    </FieldSet>
  );
}

type DaySwitchProps = {
  control: Control<AvailabilityFormValues>;
  name: `days.${number}.isOpen` | `days.${number}.hasBreak`;
  // The name the screen reader gives the switch.
  label: string;
  // The text beside the switch.
  title: string;
  stateText: string;
};

function DaySwitch({ control, name, label, title, stateText }: DaySwitchProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="flex items-center justify-between gap-3">
          <Label className="font-semibold" htmlFor={`${name}-switch`}>
            {title}
          </Label>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">{stateText}</span>
            <Switch
              id={`${name}-switch`}
              aria-label={label}
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          </div>
        </div>
      )}
    />
  );
}

type TimeFieldProps = {
  control: Control<AvailabilityFormValues>;
  name:
    | `days.${number}.opensAt`
    | `days.${number}.closesAt`
    | `days.${number}.breakStartsAt`
    | `days.${number}.breakEndsAt`;
  label: string;
  dayLabel: string;
};

// The combobox has no name from the label, so it gets one that holds the
// visible text. The message of the route for the time is tied to it.
function TimeField({ control, name, label, dayLabel }: TimeFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      label={label}
      renderInput={(field) => (
        <Select
          items={TIME_OPTIONS}
          value={field.value}
          onValueChange={(next) => {
            if (next !== null) field.onChange(next);
          }}
        >
          <SelectTrigger
            id={field.id}
            aria-label={`${dayLabel}: ${label.toLowerCase()}`}
            aria-invalid={field["aria-invalid"]}
            aria-describedby={field["aria-describedby"]}
            className="w-full"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {TIME_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
}
