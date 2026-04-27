import Anthropic from "@anthropic-ai/sdk";
import type { CompleteOptions, CompleteResult, LLMProvider } from "./types.js";

export interface AnthropicProviderOptions {
  apiKey: string;
  model: string;
}

export class AnthropicProvider implements LLMProvider {
  readonly familyId = "anthropic";
  readonly model: string;
  private readonly client: Anthropic;

  constructor(opts: AnthropicProviderOptions) {
    this.model = opts.model;
    this.client = new Anthropic({ apiKey: opts.apiKey });
  }

  async complete(opts: CompleteOptions): Promise<CompleteResult> {
    const systemParts: string[] = [];
    if (opts.system) systemParts.push(opts.system);
    if (opts.jsonMode) {
      systemParts.push("Reply with a single valid JSON object and no other text.");
    }

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: opts.maxTokens ?? 4096,
      ...(opts.temperature !== undefined && { temperature: opts.temperature }),
      ...(systemParts.length > 0 && { system: systemParts.join("\n\n") }),
      messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((b) => b.text)
      .join("");

    return {
      text,
      modelId: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }
}
