import "server-only";

// The AI service of the product (decision 0054; docs/plataforma/
// servico-de-ia.md): one call in the Chat Completions format, with fetch and
// no SDK, answered by a strict JSON schema. It does not know the dashboard:
// it takes the messages, the schema and the output limit and gives the text
// of the answer and the tokens used, or the reason of the failure. The
// address, the model and the key are read at each call, never at the build;
// the key goes only in the authorization header (RS016, RS019). Nothing is
// repeated and nothing is logged here: the caller logs the reason, never the
// key, the messages or the answer (RS018).

// RNF018: the call is interrupted after this long.
const TIMEOUT_MS = 15_000;
const TEMPERATURE = 0.3;
const RATE_LIMITED_STATUS = 429;

export type ChatMessage = { role: "system" | "user"; content: string };

export type ChatCompletionRequest = {
  messages: ChatMessage[];
  // A name for the schema, as the format asks.
  schemaName: string;
  schema: Record<string, unknown>;
  // max_completion_tokens; with the gpt-oss models it also holds the
  // reasoning, which goes in a field of its own and is not read.
  maxTokens: number;
};

export type ChatCompletionFailure =
  "not_configured" | "timeout" | "rate_limited" | "provider_error";

export type ChatCompletionResult =
  | {
      ok: true;
      text: string;
      model: string;
      inputTokens: number | null;
      outputTokens: number | null;
      durationMs: number;
    }
  | {
      ok: false;
      reason: ChatCompletionFailure;
      // The HTTP status of the provider, when it answered.
      providerStatus: number | null;
      durationMs: number;
    };

type ProviderAnswer = {
  model?: unknown;
  choices?: { message?: { content?: unknown } }[];
  usage?: { prompt_tokens?: unknown; completion_tokens?: unknown };
};

function readConfig(): {
  baseUrl: string;
  model: string;
  apiKey: string;
} | null {
  const baseUrl = process.env.AI_BASE_URL?.trim();
  const model = process.env.AI_MODEL?.trim();
  const apiKey = process.env.AI_API_KEY?.trim();
  if (!baseUrl || !model || !apiKey) return null;
  return { baseUrl: baseUrl.replace(/\/+$/, ""), model, apiKey };
}

function readCount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function requestChatCompletion({
  messages,
  schemaName,
  schema,
  maxTokens,
}: ChatCompletionRequest): Promise<ChatCompletionResult> {
  const startedAt = performance.now();
  const elapsed = () => Math.round(performance.now() - startedAt);
  const fail = (
    reason: ChatCompletionFailure,
    providerStatus: number | null = null,
  ): ChatCompletionResult => ({
    ok: false,
    reason,
    providerStatus,
    durationMs: elapsed(),
  });

  const config = readConfig();
  if (!config) return fail("not_configured");

  let response: Response;
  let answer: ProviderAnswer;
  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        response_format: {
          type: "json_schema",
          json_schema: { name: schemaName, strict: true, schema },
        },
        temperature: TEMPERATURE,
        max_completion_tokens: maxTokens,
        reasoning_effort: "low",
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) {
      // The body of an error is not read: it may repeat the request.
      await response.body?.cancel().catch(() => undefined);
      return fail(
        response.status === RATE_LIMITED_STATUS
          ? "rate_limited"
          : "provider_error",
        response.status,
      );
    }
    answer = (await response.json()) as ProviderAnswer;
  } catch (error) {
    const isTimeout =
      error instanceof DOMException &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    return fail(isTimeout ? "timeout" : "provider_error");
  }

  const text = answer.choices?.[0]?.message?.content;
  if (typeof text !== "string") {
    return fail("provider_error", response.status);
  }
  return {
    ok: true,
    text,
    model: typeof answer.model === "string" ? answer.model : config.model,
    inputTokens: readCount(answer.usage?.prompt_tokens),
    outputTokens: readCount(answer.usage?.completion_tokens),
    durationMs: elapsed(),
  };
}
