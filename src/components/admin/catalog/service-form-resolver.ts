import type { FieldErrors, Resolver } from "react-hook-form";
import {
  toRequestBody,
  type ServiceFormValues,
} from "@/components/admin/catalog/service-form-values";
import type { ServiceType } from "@/shared/constants/service-types";
import { serviceInputSchema } from "@/shared/validation/catalog";

// UC13 and UC14 (docs/catalogo/servicos-do-painel.md): the form checks what
// the route checks, with the same schema (decision 0008). The schema reads
// the body of the route, so the resolver builds it from the values and takes
// each message back to the field of the form that holds the value.

// The field of the form for a path of the body, also used for the `fields` of
// the API errors.
export function toFormField(path: string): string {
  if (path === "avgDurationMinutes") return "durationMinutes";
  if (/^(additionalIds|mainServiceIds)(\.|$)/.test(path)) return "linkedIds";
  // The upload answers on `file`, and the body on `imagePath`.
  if (path === "file" || path === "imagePath") return "image";
  return path;
}

type ErrorNode = Record<string, unknown>;

// "prices.small" becomes errors.prices.small, as React Hook Form reads it.
function setError(errors: ErrorNode, path: string, message: string) {
  const keys = path.split(".");
  let node = errors;
  for (const key of keys.slice(0, -1)) {
    node[key] ??= {};
    node = node[key] as ErrorNode;
  }
  const last = keys[keys.length - 1];
  node[last] ??= { type: "validation", message };
}

export function serviceResolver(
  type: ServiceType,
): Resolver<ServiceFormValues> {
  return (values) => {
    const result = serviceInputSchema.safeParse(toRequestBody(type, values));
    if (result.success) return { values, errors: {} };
    const errors: ErrorNode = {};
    for (const { path, message } of result.error.issues) {
      const field = toFormField(path.join("."));
      // The type is chosen before the form, so it has no field.
      if (field !== "" && field !== "type") setError(errors, field, message);
    }
    return {
      values: {},
      errors: errors as FieldErrors<ServiceFormValues>,
    };
  };
}
