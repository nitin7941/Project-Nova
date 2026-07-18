import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";

export const isLiveMode = Boolean(process.env.ANTHROPIC_API_KEY);

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export interface CompletionOptions {
  system: string;
  user: string;
  /** Deterministic mock output used when no API key is configured. */
  mock: string;
  maxTokens?: number;
  temperature?: number;
}

export interface CompletionResult {
  text: string;
  mode: "live" | "mock";
  model: string;
}

/**
 * Single entry point every feature module uses to talk to Claude.
 * When ANTHROPIC_API_KEY is absent we return the module's mock output so the
 * whole platform stays demoable offline.
 */
export async function complete(opts: CompletionOptions): Promise<CompletionResult> {
  if (!isLiveMode) {
    return { text: opts.mock, mode: "mock", model: "mock" };
  }

  const message = await getClient().messages.create({
    model: DEFAULT_MODEL,
    max_tokens: opts.maxTokens ?? 2048,
    temperature: opts.temperature ?? 0.2,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });

  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return { text, mode: "live", model: DEFAULT_MODEL };
}
