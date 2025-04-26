import { AnthropicApiKey } from "../../utils/env";
import { AnthropicChatMessage, AnthropicConfig } from "./Anthropic.types";

export type AnthropicRequest = {
  messages: AnthropicChatMessage[];
  thinking?: boolean; // Parameter for thinking mode
} & AnthropicConfig;

export const getAnthropicCompletion = async (
  payload: AnthropicRequest
): Promise<{ reply: string; tokenUsage: number }> => { 
  let reply = "Something went wrong."; // Default value in case of error
  let currentTokenUsage = 0;  // Variable for tokens used in the current call
  let requestBody: any;

  try {
    // Check if messages is an array
    if (!Array.isArray(payload.messages)) {
      throw new Error("Messages must be an array");
    }

    const formattedMessages = payload.messages.map(msg => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : msg.content.reply
    }));

    // Default max tokens value if not provided
    const maxTokens = payload.max_tokens || 8192;

    // If thinking mode is requested, add the thinking parameter according to the documentation
    if (payload.thinking) {
      // Build the request body
      requestBody = {
        model: payload.model,
        messages: formattedMessages,
        max_tokens: maxTokens * 3,
        system: "You are Claude, a helpful AI assistant created by Anthropic."
      };
      requestBody.thinking = {
        type: "enabled",
        budget_tokens: maxTokens * 2
      };
    } else {
      // Build the request body
      requestBody = {
        model: payload.model,
        messages: formattedMessages,
        max_tokens: maxTokens, // Using default or provided value
        system: "You are Claude, a helpful AI assistant created by Anthropic."
      };      
    }
    // ... suite du code ...
  } catch (e) {
    // Gestion des erreurs
  }
  return { reply, tokenUsage: currentTokenUsage };
};
