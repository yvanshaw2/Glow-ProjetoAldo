import { describe, expect, it } from "vitest";
import { appointmentSearchFilters } from "@/server/repositories/appointment-search";

// The filter of GET /api/admin/appointments?search (UC10 FA03, docs/
// agendamento/rotas.md): one `or` expression per word, all of them required.

describe("appointmentSearchFilters", () => {
  it("returns no filter for an empty term", () => {
    expect(appointmentSearchFilters("")).toEqual([]);
    expect(appointmentSearchFilters("   ")).toEqual([]);
  });

  it("asks each word of the client, the plate, the brand and the model", () => {
    expect(appointmentSearchFilters("silva")).toEqual([
      'client_name.ilike."%silva%",vehicle_plate.ilike."%silva%",vehicle_brand.ilike."%silva%",vehicle_model.ilike."%silva%"',
    ]);
  });

  it("splits the term into words, one expression for each", () => {
    const filters = appointmentSearchFilters("ana  gol");
    expect(filters).toHaveLength(2);
    expect(filters[0]).toContain('client_name.ilike."%ana%"');
    expect(filters[1]).toContain('vehicle_model.ilike."%gol%"');
  });

  it("looks for the plate without the hyphen", () => {
    const [filter] = appointmentSearchFilters("glw-1a01");
    expect(filter).toContain('vehicle_plate.ilike."%glw1a01%"');
    expect(filter).toContain('vehicle_model.ilike."%glw-1a01%"');
  });

  it("skips the plate when the word has only symbols", () => {
    const [filter] = appointmentSearchFilters("--");
    expect(filter).not.toContain("vehicle_plate");
  });

  it("escapes % and _ so they are not wildcards", () => {
    const [filter] = appointmentSearchFilters("a%b_c");
    expect(filter).toContain('client_name.ilike."%a\\\\%b\\\\_c%"');
  });

  it("keeps commas, parentheses and quotes inside the value", () => {
    const [comma] = appointmentSearchFilters("a,b)");
    expect(comma).toContain('client_name.ilike."%a,b)%"');
    const [quote] = appointmentSearchFilters('x"y');
    expect(quote).toContain('client_name.ilike."%x\\"y%"');
  });
});
