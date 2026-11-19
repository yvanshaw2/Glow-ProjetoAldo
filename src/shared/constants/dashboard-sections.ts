// RN039: the five sections of the detailed analysis, in the order of the
// screen (docs/agendamento/dashboard-do-painel.md).
export const DASHBOARD_SECTIONS = [
  "revenue",
  "services",
  "clients",
  "operation",
  "payments",
] as const;

export type DashboardSection = (typeof DASHBOARD_SECTIONS)[number];

export const DASHBOARD_SECTION_LABELS = {
  revenue: "Receita",
  services: "Serviços",
  clients: "Clientes e veículos",
  operation: "Operação",
  payments: "Pagamentos",
} as const satisfies Record<DashboardSection, string>;
