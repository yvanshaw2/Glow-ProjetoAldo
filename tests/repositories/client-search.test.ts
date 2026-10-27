import { describe, expect, it } from "vitest";
import { clientSearchFilters } from "@/server/repositories/client-search";

// The filter of GET /api/admin/clients?search (UC17 step 3, docs/clientes/
// rotas.md): one `or` expression per word, all of them required.

describe("clientSearchFilters", () => {
  it("returns no filter for an empty term", () => {
    expect(clientSearchFilters("")).toEqual([]);
    expect(clientSearchFilters("   ")).toEqual([]);
  });

  it("asks each word of the name, last name and e-mail", () => {
    expect(clientSearchFilters("silva")).toEqual([
      'first_name.ilike."%silva%",last_name.ilike."%silva%",email.ilike."%silva%"',
    ]);
  });

  it("splits the term into words, one expression for each", () => {
    const filters = clientSearchFilters("ana  souza");
    expect(filters).toHaveLength(2);
    expect(filters[0]).toContain('first_name.ilike."%ana%"');
    expect(filters[1]).toContain('last_name.ilike."%souza%"');
  });

  it("uses only the digits of a word for the phone", () => {
    const [filter] = clientSearchFilters("90000-0001");
    expect(filter).toContain(',phone.ilike."%900000001%"');
    const [masked] = clientSearchFilters("(82)");
    expect(masked).toContain(',phone.ilike."%82%"');
  });

  it("skips the phone when the word has no digit", () => {
    const [filter] = clientSearchFilters("souza");
    expect(filter).not.toContain("phone");
  });

  it("escapes % and _ so they are not wildcards", () => {
    const [filter] = clientSearchFilters("a%b_c");
    expect(filter).toContain('email.ilike."%a\\\\%b\\\\_c%"');
  });

  it("keeps commas, parentheses and quotes inside the value", () => {
    const [comma] = clientSearchFilters("a,b)");
    expect(comma).toContain('first_name.ilike."%a,b)%"');
    const [quote] = clientSearchFilters('x"y');
    expect(quote).toContain('first_name.ilike."%x\\"y%"');
  });
});

// The search of the client in a new appointment (UC11 step 2) compares only the
// name, the last name and the e-mail.
describe("clientSearchFilters without the phone", () => {
  it("leaves the phone out, even for a word of digits", () => {
    const [filter] = clientSearchFilters("90000-0001", { withPhone: false });
    expect(filter).not.toContain("phone");
    expect(filter).toContain('email.ilike."%90000-0001%"');
  });

  it("still splits the term into words", () => {
    expect(clientSearchFilters("ana souza", { withPhone: false })).toHaveLength(
      2,
    );
  });
});
