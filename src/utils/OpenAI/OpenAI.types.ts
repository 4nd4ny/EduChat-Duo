import { OpenAIChatModels } from "./OpenAI.constants";

export interface OpenAIChatMessage {
  id?: number;
  role: "assistant" | "user";
  content: string | { reply: string; tokenUsage: number };
  model?: keyof typeof OpenAIChatModels;
}

export interface OpenAIMessageWithSystemRole {
  role: "assistant" | "user" | "system";
  content: string;
}

export interface OpenAIConfig {
  model: keyof typeof OpenAIChatModels;
  max_completion_tokens?: number;
}

export interface OpenAIModel {
  id: string;
  name: string;
  maxLimit: number;
}

export interface ProviderSubmitFunction {
  (messages?: OpenAIChatMessage[], modelIndex?: number): Promise<void>;
}

export interface ProviderRegenerateFunction {
  (messages?: OpenAIChatMessage[], onSuccess?: (reply: string) => void, modelOverride?: string, useThinking?: boolean): void;
}