// RN041: the reasons of a cancellation, as the enum cancellation_reason of the
// database (docs/agendamento/dados.md), in the order of the rule.
export const CANCELLATION_REASONS = [
  "client_gave_up",
  "client_unavailable",
  "weather",
  "no_show",
  "business_unavailable",
  "other",
] as const;

export type CancellationReason = (typeof CANCELLATION_REASONS)[number];

// The ones the client may choose; the staff chooses any.
export const CLIENT_CANCELLATION_REASONS = [
  "client_gave_up",
  "client_unavailable",
  "weather",
  "other",
] as const satisfies readonly CancellationReason[];

export const CANCELLATION_REASON_LABELS = {
  client_gave_up: "Desistência do cliente",
  client_unavailable: "Imprevisto do cliente",
  weather: "Condições do tempo",
  no_show: "Não comparecimento",
  business_unavailable: "Indisponibilidade da empresa",
  other: "Outro",
} as const satisfies Record<CancellationReason, string>;

// A cancellation from before the rule has no reason.
export const NOT_INFORMED_REASON_LABEL = "Não informado";
