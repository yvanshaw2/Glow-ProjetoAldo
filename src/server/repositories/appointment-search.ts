import { likePattern } from "@/server/repositories/client-search";

// The filter of the appointment search (UC10 FA03, docs/agendamento/rotas.md):
// each word of the term must be in the client name, the plate, the brand or
// the model copied in the appointment, ignoring case. One `or` expression of
// PostgREST for each word; chained, they all apply.

const NOT_ALPHANUMERIC = /[^a-z0-9]/gi;

export function appointmentSearchFilters(term: string): string[] {
  return term
    .split(/\s+/)
    .filter((word) => word !== "")
    .map((word) => {
      const pattern = likePattern(word);
      const columns = [
        `client_name.ilike.${pattern}`,
        // The plate is stored without the hyphen.
        ...plateFilter(word),
        `vehicle_brand.ilike.${pattern}`,
        `vehicle_model.ilike.${pattern}`,
      ];
      return columns.join(",");
    });
}

function plateFilter(word: string): string[] {
  const plate = word.replace(NOT_ALPHANUMERIC, "");
  return plate === "" ? [] : [`vehicle_plate.ilike.${likePattern(plate)}`];
}
