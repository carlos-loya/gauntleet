import OpenAI from "openai";
import type { CompleteOptions, CompleteResult, LLMProvider } from "./types.js";

export interface OpenAICompatibleOptions {
  baseURL: string;
  apiKey: string;
  model: string;
}

export class OpenAICompatibleProvider implements LLMProvider {
  readonly model: string;
  readonly familyId: string;
  private readonly client: OpenAI;

  constructor(opts: OpenAICompatibleOptions) {
    this.model = opts.model;
    this.familyId = opts.baseURL;
    this.client = new OpenAI({ baseURL: opts.baseURL, apiKey: opts.apiKey });
  }

  async complete(opts: CompleteOptions): Promise<CompleteResult> {
    const messages: OpenAI.ChatCompletionMessageParam[] = [];
    if (opts.system) messages.push({ role: "system", content: opts.system });
    for (const m of opts.messages) {
      messages.push({ role: m.role, content: m.content });
    }

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      ...(opts.maxTokens !== undefined && { max_tokens: opts.maxTokens }),
      ...(opts.temperature !== undefined && { temperature: opts.temperature }),
      ...(opts.jsonMode && { response_format: { type: "json_object" } }),
    });

    const choice = response.choices[0];
    const text = choice?.message?.content ?? "";

    return {
      text,
      modelId: response.model,
      ...(response.usage && {
        usage: {
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
        },
      }),
    };
  }
}
