import { AnthropicChatModels } from "./Anthropic.constants";

export interface AnthropicChatMessage {
  id?: number;
  role: "assistant" | "user";
  content: string | { reply: string; tokenUsage: number };
  model?: keyof typeof AnthropicChatModels;
}

export interface AnthropicConfig {
  model: keyof typeof AnthropicChatModels;
  max_tokens?: number;
  // temperature?: number;
  // system?: string;
}

export interface AnthropicChatModel {
  id: string;
  name: string;
  maxLimit: number;
  temperature?: number;
  // system?: string;
}

export interface AnthropicContentBlock {
  type: "text";
  text: string;
}

export interface AnthropicResponse {
  id: string;
  content: AnthropicContentBlock[];
  model: string;
  role: "assistant";
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface ProviderSubmitFunction {
  (messages?: AnthropicChatMessage[], modelIndex?: number): Promise<void>;
}

export interface ProviderRegenerateFunction {
  (messages?: AnthropicChatMessage[], onSuccess?: (reply: string) => void, modelOverride?: string, useThinking?: boolean): void;
}

export interface ProviderContext {
  loading: boolean;
}
