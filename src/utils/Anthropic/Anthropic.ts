import { AnthropicApiKey } from "../env";
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

    // console.log("Claude API request:", JSON.stringify(requestBody, null, 2));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      headers: {
        "x-api-key": AnthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      method: "POST",
      body: JSON.stringify(requestBody),
    });
    
    // Check if the response is correct
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Claude API error:", errorData);
      throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // console.log("Claude API response structure:", Object.keys(data));

    // Handle thinking mode and normal responses differently
    let thinkingText = "";
    let responseText = "";
    
    if (data && data.content && Array.isArray(data.content)) {
      // Process each content block based on its type
      for (const block of data.content) {
        if (block.type === "thinking" && block.thinking) {
          thinkingText = block.thinking;
        } else if (block.type === "text" && block.text) {
          responseText = block.text;
        }
        // Ignore redacted_thinking blocks
      }
      
      // Construct the final reply
      if (thinkingText) {
        reply = `# Thinking\n${thinkingText}\n\n# Response\n${responseText || "No response provided"}`;
      } else {
        reply = responseText || "No content in response.";
      }
      
      // Extract token usage if available
      if (data.usage) {
        currentTokenUsage = data.usage.input_tokens + data.usage.output_tokens;
      }
    } else {
      console.error("Unexpected Claude response structure:", data);
      throw new Error("Unexpected response structure from Anthropic API");
    }

  } catch (error: any) {
    console.error("Error in getAnthropicCompletion:", error);
    reply = error.message || "An unexpected error occurred.";
  }
  // Return the response and the number of tokens used
  return { reply, tokenUsage: currentTokenUsage };
};