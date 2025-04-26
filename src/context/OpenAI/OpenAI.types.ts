import { OpenAIChatModels } from "./OpenAI.constants";
import { AnthropicChatModels } from "../Anthropic/Anthropic.constants";

export interface OpenAIChatMessage {
  id?: number;
  role: "assistant" | "user";
  content: string | { reply: string; tokenUsage: number };
  model?: keyof typeof OpenAIChatModels | keyof typeof AnthropicChatModels;
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

// Define interfaces for OpenAI API response types
export interface OpenAIResponseItem {
  type: string;
  [key: string]: any;
}

export interface OpenAIContentItem {
  type: string;
  text?: string;
  [key: string]: any;
}

// Define interface for messages that can include system role
export interface OpenAIMessageWithSystemRole {
  role: "assistant" | "user" | "system";
  content: string;
}

export interface ProviderSubmitFunction {
  (messages?: OpenAIChatMessage[], modelIndex?: number): Promise<void>;
}

export interface ProviderRegenerateFunction {
  (messages?: OpenAIChatMessage[], onSuccess?: (reply: string) => void, modelOverride?: string, useThinking?: boolean): void;
}
