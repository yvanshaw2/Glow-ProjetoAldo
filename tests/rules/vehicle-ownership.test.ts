import { describe, expect, it } from "vitest";
import { findClientVehicleAccess } from "@/server/rules/vehicle-ownership";

// Who may edit a vehicle in the client area (UC05 FA02 and FE03, RF018,
// RN036, RS009): the vehicle must be in the client's account, and alone in it.

const CLIENT = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const ANOTHER = "33333333-3333-4333-8333-333333333333";

describe("findClientVehicleAccess", () => {
  it("lets the client edit a vehicle linked only to the account", () => {
    expect(findClientVehicleAccess(CLIENT, [CLIENT])).toBe("editable");
  });

  it("treats a vehicle linked to no account as missing", () => {
    expect(findClientVehicleAccess(CLIENT, [])).toBe("missing");
  });

  it("treats the vehicle of another account as missing", () => {
    expect(findClientVehicleAccess(CLIENT, [OTHER])).toBe("missing");
  });

  it("marks a vehicle linked to the account and to another as shared", () => {
    expect(findClientVehicleAccess(CLIENT, [OTHER, CLIENT])).toBe("shared");
  });

  it("never tells a vehicle of other accounts from a missing one", () => {
    expect(findClientVehicleAccess(CLIENT, [OTHER, ANOTHER])).toBe("missing");
  });
});
