import { describe, expect, it } from "vitest";
import { describeInvalidStatus } from "@/server/rules/appointment-editing";

// UC12 FE01: the refusal of a transition names the current status, with the
// names of RN017.

describe("describeInvalidStatus", () => {
  it("names the status in execution", () => {
    expect(describeInvalidStatus("in_progress")).toBe(
      "Este agendamento está Em execução. Esta ação não está disponível para esse status.",
    );
  });

  it.each([
    ["scheduled", "Agendado"],
    ["checked_in", "Em espera"],
    ["awaiting_payment", "Finalizado"],
    ["completed", "Concluído"],
    ["cancelled", "Cancelado"],
    ["rescheduled", "Reagendado"],
  ] as const)("names the status %s as %s", (status, name) => {
    expect(describeInvalidStatus(status)).toContain(`está ${name}.`);
  });
});
