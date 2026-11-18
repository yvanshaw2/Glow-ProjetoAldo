// Who may edit a vehicle in the client area (UC05 FA02 and FE03, RF018,
// RN036, RS009). Pure: the accounts linked to the vehicle come as a parameter.

export type ClientVehicleAccess =
  // The vehicle is in the account and in no other: the client edits it.
  | "editable"
  // The vehicle is not in the account, or does not exist: the same answer, so
  // nothing is told about the vehicles of other accounts.
  | "missing"
  // The vehicle is also in another account: only the company edits it.
  | "shared";

export function findClientVehicleAccess(
  clientId: string,
  accountIds: readonly string[],
): ClientVehicleAccess {
  if (!accountIds.includes(clientId)) {
    return "missing";
  }
  return accountIds.length > 1 ? "shared" : "editable";
}
