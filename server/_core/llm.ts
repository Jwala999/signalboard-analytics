import { ENV } from "./env";

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

type LLMOptions = {
  model?: string;
  messages: Message[];
  maxTokens?: number;
  temperature?: number;
  reasoning?: { effort?: "low" | "medium" | "high" };
};

type LLMResponse = {
  choices: Array<{
    message: { role: string; content: string };
  }>;
};

/**
 * Thin wrapper around OpenAI-compatible chat completion APIs.
 * Set OPENAI_API_KEY and optionally OPENAI_BASE_URL env vars.
 */
export async function invokeLLM(options: LLMOptions): Promise<LLMResponse> {
  const {
    model = "gpt-4o-mini",
    messages,
    maxTokens = 1024,
    temperature = 0.3,
  } = options;

  const apiKey = ENV.openaiApiKey;
  const baseUrl = ENV.openaiBaseUrl;

  if (!apiKey) {
    throw new Error(
      "LLM not configured: set OPENAI_API_KEY environment variable"
    );
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`LLM request failed (${response.status}): ${text}`);
  }

  return (await response.json()) as LLMResponse;
}
