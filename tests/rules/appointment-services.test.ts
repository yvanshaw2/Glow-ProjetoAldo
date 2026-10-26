import { describe, expect, it } from "vitest";
import { sortAppointmentServices } from "@/server/rules/appointment-services";

// The order of the services of an appointment in the listing and in the
// detail of the panel (docs/agendamento/rotas.md): by type, main first, then
// complementary, then additional, and by name inside the type.

describe("sortAppointmentServices", () => {
  it("puts main before complementary and complementary before additional", () => {
    const sorted = sortAppointmentServices([
      { name: "Pretinho nos pneus", type: "additional" },
      { name: "Hidratação de couro", type: "complementary" },
      { name: "Lavagem completa", type: "main" },
    ]);
    expect(sorted.map(({ name }) => name)).toEqual([
      "Lavagem completa",
      "Hidratação de couro",
      "Pretinho nos pneus",
    ]);
  });

  it("orders by name inside the type, as Portuguese sorts it", () => {
    const sorted = sortAppointmentServices([
      { name: "Vitrificação", type: "main" },
      { name: "Álcool", type: "main" },
      { name: "Lavagem", type: "main" },
    ]);
    expect(sorted.map(({ name }) => name)).toEqual([
      "Álcool",
      "Lavagem",
      "Vitrificação",
    ]);
  });

  it("does not change the list it receives", () => {
    const services = [
      { name: "B", type: "additional" as const },
      { name: "A", type: "main" as const },
    ];
    sortAppointmentServices(services);
    expect(services[0].name).toBe("B");
  });
});
