import { z } from "zod";
import { formatYear } from "@/shared/format/date";
import { VEHICLE_TYPES } from "@/shared/constants/vehicle-types";
import {
  plateSchema,
  vehicleBrandModelSchema,
  vehicleColorSchema,
  vehicleYearSchema,
} from "@/shared/validation/formats";
import { updatedAtSchema } from "@/shared/validation/params";

// Bodies and query of the vehicle routes of the panel (docs/clientes/
// rotas.md), also used by the vehicle forms. Unknown fields are discarded
// (RS013). The size is never an input: the database derives it from the type
// (RN002).

const NO_TYPE_MESSAGE = "Escolha o tipo do veículo.";
const NO_FIELD_MESSAGE = "Informe ao menos um campo para alterar.";

// The current year of the company, from which the latest model year follows
// (RN035). The server and the forms use the same clock.
export function currentVehicleYear(): number {
  return Number(formatYear(new Date().toISOString()));
}

// Absent, null or outside the four types is the same missing choice.
export const vehicleTypeSchema = z.enum(VEHICLE_TYPES, {
  error: NO_TYPE_MESSAGE,
});

// The data a new plate needs (UC18 step 4).
export function vehicleDataSchema(currentYear = currentVehicleYear()) {
  return z.object({
    type: vehicleTypeSchema,
    brand: vehicleBrandModelSchema,
    model: vehicleBrandModelSchema,
    color: vehicleColorSchema,
    year: vehicleYearSchema(currentYear),
  });
}

export type VehicleData = z.output<ReturnType<typeof vehicleDataSchema>>;

// POST: the plate alone links the vehicle that is already registered (RN036);
// the data are kept as they came, and the service checks them with
// vehicleDataSchema only when the plate is new.
export const vehicleInputSchema = z.object({
  plate: plateSchema,
  type: z.unknown().optional(),
  brand: z.unknown().optional(),
  model: z.unknown().optional(),
  color: z.unknown().optional(),
  year: z.unknown().optional(),
});

export type VehicleInput = z.output<typeof vehicleInputSchema>;

// PATCH: only what came is changed, and at least one field must come, so
// nothing is saved without a reason (RNF011).
export function vehicleUpdateSchema(currentYear = currentVehicleYear()) {
  return z
    .object({
      type: vehicleTypeSchema.optional(),
      plate: plateSchema.optional(),
      brand: vehicleBrandModelSchema.optional(),
      model: vehicleBrandModelSchema.optional(),
      color: vehicleColorSchema.optional(),
      year: vehicleYearSchema(currentYear).optional(),
      updatedAt: updatedAtSchema,
    })
    .refine(
      ({ type, plate, brand, model, color, year }) =>
        [type, plate, brand, model, color, year].some(
          (value) => value !== undefined,
        ),
      { error: NO_FIELD_MESSAGE },
    );
}

export type VehicleUpdate = z.output<ReturnType<typeof vehicleUpdateSchema>>;

export const vehicleLookupQuerySchema = z.object({ plate: plateSchema });

// The year of the forms is the text of the field.
const yearTextSchema = (currentYear: number) =>
  z
    .string()
    .transform((text) => {
      const trimmed = text.trim();
      if (trimmed === "") return undefined;
      return /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN;
    })
    .pipe(vehicleYearSchema(currentYear));

// The vehicle forms: the plate with the mask, the type none while nothing is
// picked and the year as text.
export function vehicleFormSchema(currentYear = currentVehicleYear()) {
  return vehicleDataSchema(currentYear)
    .omit({ year: true })
    .extend({ plate: plateSchema, year: yearTextSchema(currentYear) });
}

export type VehicleFormInput = z.input<ReturnType<typeof vehicleFormSchema>>;

// The first step of the register looks the plate up before the rest.
export const vehiclePlateFormSchema = z.object({ plate: plateSchema });
