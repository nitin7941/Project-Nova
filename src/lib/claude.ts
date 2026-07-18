import Anthropic from "@anthropic-ai/sdk";

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
export const hasGroq = Boolean(process.env.GROQ_API_KEY?.trim());

/** True when any real LLM provider is configured. */
export const isLiveMode = hasAnthropic || hasGroq;

export type LlmProviderId = "auto" | "anthropic" | "groq";
export type ResolvedProvider = "anthropic" | "groq";

export type ProviderAvailability = {
  anthropic: boolean;
  groq: boolean;
};

export function getAvailableProviders(): ProviderAvailability {
  return {
    anthropic: hasAnthropic,
    groq: hasGroq,
  };
}

export function providerLabel(): string {
  if (hasAnthropic && hasGroq) return "Claude + Groq available";
  if (hasAnthropic) return "Live · Claude";
  if (hasGroq) return "Free · Groq";
  return "No LLM configured";
}

export function parseProviderChoice(value: unknown): LlmProviderId {
  if (value === "anthropic" || value === "groq" || value === "auto") {
    return value;
  }
  return "auto";
}

/**
 * Resolve which backend to call. Throws if nothing is configured or the
 * chosen provider's key is missing.
 */
export function resolveProvider(choice: LlmProviderId = "auto"): ResolvedProvider {
  if (choice === "anthropic") {
    if (!hasAnthropic) {
      throw new Error("Anthropic is not configured. Add ANTHROPIC_API_KEY to .env.local.");
    }
    return "anthropic";
  }
  if (choice === "groq") {
    if (!hasGroq) {
      throw new Error("Groq is not configured. Add GROQ_API_KEY to .env.local.");
    }
    return "groq";
  }

  // auto — prefer free Groq when available
  if (hasGroq) return "groq";
  if (hasAnthropic) return "anthropic";
  throw new Error(
    "No LLM provider configured. Add GROQ_API_KEY (free) or ANTHROPIC_API_KEY to .env.local.",
  );
}

let client: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

export interface CompletionOptions {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  /** Prior turns for multi-turn refinement (before the current user message). */
  history?: ChatMessage[];
  /** User-selected provider (auto picks Groq when available, else Anthropic). */
  provider?: LlmProviderId;
  /**
   * Optional offline stub used only by streaming callers when no LLM key is set.
   * Preferred path is always a real provider.
   */
  mock?: string;
}

export type CompletionMode = "live" | "free";

export interface CompletionResult {
  text: string;
  mode: CompletionMode;
  model: string;
  provider: ResolvedProvider;
}

/**
 * Single entry point every feature module uses for LLM completions.
 */
export async function complete(opts: CompletionOptions): Promise<CompletionResult> {
  const prior = opts.history ?? [];
  const maxTokens = opts.maxTokens ?? 2048;
  const temperature = opts.temperature ?? 0.2;
  const target = resolveProvider(opts.provider ?? "auto");

  if (target === "anthropic") {
    const message = await getAnthropic().messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      temperature,
      system: opts.system,
      messages: [
        ...prior.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: opts.user },
      ],
    });

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return { text, mode: "live", model: ANTHROPIC_MODEL, provider: "anthropic" };
  }

  const text = await completeWithGroq({
    system: opts.system,
    user: opts.user,
    history: prior,
    maxTokens,
    temperature,
  });
  return { text, mode: "free", model: GROQ_MODEL, provider: "groq" };
}

/**
 * Streaming variant of {@link complete}. Yields text deltas as they arrive.
 */
export async function* completeStream(
  opts: CompletionOptions,
): AsyncGenerator<string, void, unknown> {
  if (!isLiveMode) {
    const stub = opts.mock ?? "No LLM provider configured. Add GROQ_API_KEY or ANTHROPIC_API_KEY.";
    for (const word of stub.match(/\S+\s*/g) ?? [stub]) {
      yield word;
      await new Promise((r) => setTimeout(r, 12));
    }
    return;
  }

  const target = resolveProvider(opts.provider ?? "auto");
  const prior = opts.history ?? [];
  const maxTokens = opts.maxTokens ?? 2048;
  const temperature = opts.temperature ?? 0.2;

  if (target === "anthropic") {
    const stream = getAnthropic().messages.stream({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      temperature,
      system: opts.system,
      messages: [
        ...prior.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: opts.user },
      ],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
    return;
  }

  // Groq OpenAI-compatible streaming
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature,
      max_tokens: maxTokens,
      stream: true,
      messages: [
        { role: "system", content: opts.system },
        ...prior.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: opts.user },
      ],
    }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Groq stream failed (${res.status}). Check GROQ_API_KEY / quota. ${detail.slice(0, 200)}`,
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const parsed = JSON.parse(data) as {
          choices?: { delta?: { content?: string } }[];
        };
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        /* ignore partial JSON */
      }
    }
  }
}

async function completeWithGroq(opts: {
  system: string;
  user: string;
  history: ChatMessage[];
  maxTokens: number;
  temperature: number;
}): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
      messages: [
        { role: "system", content: opts.system },
        ...opts.history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: opts.user },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Groq request failed (${res.status}). Check GROQ_API_KEY / quota. ${detail.slice(0, 200)}`,
    );
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Groq returned an empty response.");
  return text;
}
