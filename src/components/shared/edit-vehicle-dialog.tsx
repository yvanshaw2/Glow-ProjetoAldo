"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { InfoIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import {
  PlateField,
  VehicleDetailFields,
  VehicleTypeField,
  type VehicleFormValues,
} from "@/components/shared/vehicle-fields";
import { FormAlert } from "@/components/shared/form-alert";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useFormFailure } from "@/hooks/use-form-failure";
import { ApiError, apiRequest } from "@/lib/api-client";
import type { ClientVehicle } from "@/shared/api/vehicles";
import { formatPlate } from "@/shared/format/plate";
import { vehicleFormSchema } from "@/shared/validation/vehicles";

// UC05 FA02 (docs/clientes/area-do-cliente.md) and UC18 FA02 (docs/clientes/
// clientes-do-painel.md): the edit of a vehicle. The client area offers it
// only when no other account has the vehicle (FE03, RN036); the panel always
// does, with a notice on a shared one. The form is checked by the schema of
// src/shared/validation/vehicles.ts.

function toFormValues({
  plate,
  type,
  brand,
  model,
  color,
  year,
}: ClientVehicle): VehicleFormValues {
  return {
    plate: formatPlate(plate),
    type,
    brand,
    model,
    color,
    year: String(year),
  };
}

type EditVehicleDialogProps = {
  vehicle: ClientVehicle;
  // The route of the vehicles, which takes the id: the PATCH is on it.
  vehiclesPath: string;
  // RN036: tells the edit is for every account of a shared vehicle.
  warnWhenShared?: boolean;
  onSaved: () => void;
  onConflict: () => void;
};

export function EditVehicleDialog({
  vehicle,
  vehiclesPath,
  warnWhenShared = false,
  onSaved,
  onConflict,
}: EditVehicleDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  // The values stay as typed (raw), the route normalizes them again.
  const resolver = zodResolver(vehicleFormSchema(), undefined, {
    raw: true,
  }) as unknown as Resolver<VehicleFormValues>;
  const { control, handleSubmit, setError, clearErrors, reset, formState } =
    useForm<VehicleFormValues>({
      resolver,
      mode: "onTouched",
      defaultValues: toFormValues(vehicle),
    });
  const { failure, showFailure, clearFailure } = useFormFailure(setError);

  // RNF011: after a version conflict the list is read again, and the
  // current data of the vehicle replaces what was typed.
  useEffect(() => {
    reset(toFormValues(vehicle));
  }, [vehicle, reset]);

  // docs/padroes/componentes.md, Diálogos: the dialog does not close during
  // the call. Each opening starts from the data of the vehicle.
  function changeOpen(open: boolean) {
    if (formState.isSubmitting) return;
    if (open) {
      reset(toFormValues(vehicle));
      clearFailure();
    }
    setIsOpen(open);
  }

  async function submit({
    type,
    plate,
    brand,
    model,
    color,
    year,
  }: VehicleFormValues) {
    // The route can answer for a field the person has corrected since.
    clearErrors();
    clearFailure();
    try {
      await apiRequest<ClientVehicle>(`${vehiclesPath}/${vehicle.id}`, {
        method: "PATCH",
        body: {
          type,
          plate,
          brand,
          model,
          color,
          year: Number(year),
          updatedAt: vehicle.updatedAt,
        },
      });
      setIsOpen(false);
      onSaved();
    } catch (error) {
      showFailure(error);
      if (error instanceof ApiError && error.code === "VERSION_CONFLICT") {
        onConflict();
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={changeOpen}>
      <DialogTrigger
        render={
          <Button
            variant="secondary"
            className="w-full sm:w-auto sm:self-start"
          />
        }
      >
        Editar
        {/* Each card has one: the name tells them apart. */}
        <span className="sr-only">
          {" "}
          {vehicle.brand} {vehicle.model}
        </span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar veículo</DialogTitle>
        </DialogHeader>
        {failure && (
          <FormAlert key={failure.key}>{failure.error.message}</FormAlert>
        )}
        <form
          noValidate
          onSubmit={handleSubmit(submit)}
          className="flex flex-col gap-5"
        >
          {warnWhenShared && vehicle.isShared && (
            <p className="flex gap-2 text-muted-foreground">
              <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
              As alterações valem para todas as contas vinculadas a este
              veículo.
            </p>
          )}
          <VehicleTypeField control={control} />
          <PlateField control={control} />
          <VehicleDetailFields control={control} />
          <DialogFooter>
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="ghost"
                  disabled={formState.isSubmitting}
                />
              }
            >
              Cancelar
            </DialogClose>
            <SubmitButton
              isLoading={formState.isSubmitting}
              loadingLabel="Salvando…"
            >
              Salvar alterações
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
