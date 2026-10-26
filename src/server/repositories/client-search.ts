// The filter of the client search (UC17 step 3, docs/clientes/rotas.md): each
// word of the term must be in the name, the last name, the e-mail or the phone
// of the client, ignoring case. One `or` expression of PostgREST for each
// word; chained, they all apply.

const DIGITS = /\D/g;

// A value inside the quotes of a PostgREST filter: it can hold commas and
// parentheses. The LIKE wildcards are escaped first, then the quote rules.
function quoted(pattern: string): string {
  return `"${pattern.replace(/[\\"]/g, "\\$&")}"`;
}

export function likePattern(text: string): string {
  return quoted(`%${text.replace(/[\\%_]/g, "\\$&")}%`);
}

export function clientSearchFilters(term: string): string[] {
  return term
    .split(/\s+/)
    .filter((word) => word !== "")
    .map((word) => {
      const pattern = likePattern(word);
      const columns = [
        `first_name.ilike.${pattern}`,
        `last_name.ilike.${pattern}`,
        `email.ilike.${pattern}`,
      ];
      // The phone is stored as digits, so only the digits of the word count.
      const digits = word.replace(DIGITS, "");
      if (digits !== "") {
        columns.push(`phone.ilike.${likePattern(digits)}`);
      }
      return columns.join(",");
    });
}
