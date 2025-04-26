import { OpenAIApiKey } from "../../utils/env";
import { 
  OpenAIChatMessage, 
  OpenAIConfig, 
  OpenAIResponseItem, 
  OpenAIContentItem,
  OpenAIMessageWithSystemRole 
} from "./OpenAI.types";

export type OpenAIRequest = {
  messages: OpenAIChatMessage[];
  thinking?: boolean; // Parameter for thinking mode
} & OpenAIConfig;

export const getOpenAICompletion = async (
  payload: OpenAIRequest
): Promise<{ reply: string; tokenUsage: number }> => { 
  let reply = "Something went wrong."; // Default value in case of error
  let currentTokenUsage = 0;  // Variable for tokens used in the current call

  try {
    // Determine if we should use the Responses API for o4-mini and o3 models
    const isResponseAPIModel = payload.model.startsWith('o4-') || payload.model === 'o3';
    
    // Handle different model types differently
    if (isResponseAPIModel) {
      // --- Responses API section for O4-mini/O3 models ---
      let requestBodyForResponsesAPI: any = { // Use 'any' for simplicity or define a specific type
        model: payload.model,
        // Use 'input' instead of 'messages'
        input: payload.messages.map(msg => ({
          role: msg.role,
          // Ensure content is string - adapt if necessary based on actual msg.content type
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
        })),
        // Use 'max_output_tokens' as per documentation
        max_output_tokens: payload.max_completion_tokens || 25000, // Default suggested by OpenAI doc
      };

      // Add reasoning parameter if thinking mode is enabled
      // Map payload.thinking to reasoning.effort
      if (payload.thinking) {
        requestBodyForResponsesAPI.reasoning = { effort: "high" }; // Or "medium" based on desired intensity
      } else {
         // Optionally set a default effort or omit 'reasoning' entirely
         requestBodyForResponsesAPI.reasoning = { effort: "medium" }; // Example: default to medium
      }

      console.log("OpenAI Responses API request:", JSON.stringify(requestBodyForResponsesAPI, null, 2));
      // ... suite du code ...
    }
  } catch (e) {
    // Gestion des erreurs
  }
  return { reply, tokenUsage: currentTokenUsage };
};
