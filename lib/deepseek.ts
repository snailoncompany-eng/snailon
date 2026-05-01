// DeepSeek is OpenAI-compatible.
// Docs: https://api-docs.deepseek.com/
// Models: deepseek-chat (fast, general), deepseek-reasoner (slower, reasoning)

const DEEPSEEK_BASE = "https://api.deepseek.com/v1";

export type Msg = { role: "system" | "user" | "assistant"; content: string };

export type DeepseekResult = {
  content: string;
  raw: any;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
};

export async function deepseekChat(
  messages: Msg[],
  opts: { model?: string; temperature?: number; max_tokens?: number; json?: boolean } = {}
): Promise<DeepseekResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not set");

  const body: any = {
    model: opts.model ?? "deepseek-chat",
    messages,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.max_tokens ?? 400,
  };
  if (opts.json) body.response_format = { type: "json_object" };

  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DeepSeek ${res.status}: ${text}`);
  }
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? "";
  return { content, raw: json, usage: json.usage };
}
