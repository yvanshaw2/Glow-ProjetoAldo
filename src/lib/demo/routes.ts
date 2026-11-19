import type { HttpMethod } from "@/lib/api-client";

// Decision 0055: the routes not built yet, answered by the API client with
// the demo data of this folder (docs/padroes/componentes.md, Telas de
// demonstração). The task that builds a route takes it out of this list.

// The parameters of the path, as :id, the query and the body of the call.
export type DemoRequest = {
  params: Record<string, string>;
  query: URLSearchParams;
  // As the screen sent it; a read by POST, like the preview, answers by it.
  body: unknown;
};

// Gives the body of a read, with the type of src/shared/api.
export type DemoAnswer = (request: DemoRequest) => unknown;

export type DemoRoute = {
  method: HttpMethod;
  // As in docs/*/rotas.md, with :name for a parameter of the path.
  path: string;
  // Only a read has it: it loads the data module when a screen asks for it.
  // A write has none and is refused with NOT_IMPLEMENTED.
  load?: () => Promise<DemoAnswer>;
};

// The analysis of the dashboard, the last one, has its route (issue #1); the
// folder leaves in the next PR (decision 0055).
export const DEMO_ROUTES: readonly DemoRoute[] = [];
