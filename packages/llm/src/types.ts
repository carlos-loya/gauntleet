export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface CompleteOptions {
  messages: Message[];
  system?: string;
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface CompleteResult {
  text: string;
  modelId: string;
  usage?: TokenUsage;
}

export interface LLMProvider {
  readonly model: string;
  readonly familyId: string;
  complete(opts: CompleteOptions): Promise<CompleteResult>;
}

export class ProviderConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderConfigError";
  }
}
