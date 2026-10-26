import type { ServiceType } from "@/shared/constants/service-types";

// docs/agendamento/rotas.md, services of an appointment in the listing and in
// the detail of the panel: by type, main first, then complementary, then
// additional, and by the name copied in the appointment inside the type.

const TYPE_ORDER: Record<ServiceType, number> = {
  main: 0,
  complementary: 1,
  additional: 2,
};

export function sortAppointmentServices<
  T extends { name: string; type: ServiceType },
>(services: readonly T[]): T[] {
  return [...services].sort(
    (first, second) =>
      TYPE_ORDER[first.type] - TYPE_ORDER[second.type] ||
      first.name.localeCompare(second.name, "pt-BR"),
  );
}
