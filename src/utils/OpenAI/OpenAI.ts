import { OpenAIApiKey } from "../env";
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

      // Use the CORRECT endpoint: /v1/responses
      const response = await fetch("https://api.openai.com/v1/responses", {
        headers: {
          Authorization: `Bearer ${OpenAIApiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        // Send the CORRECT request body
        body: JSON.stringify(requestBodyForResponsesAPI),
      });

      // Handle response for Responses API
      if (!response.ok) {
        let errorData;
         try {
           errorData = await response.json();
           console.error("OpenAI Responses API Error Response:", errorData);
         } catch(e) {
            const textError = await response.text();
            console.error("OpenAI Responses API Non-JSON Error Response:", textError);
            throw new Error(`HTTP error! status: ${response.status}, Body: ${textError}`);
         }
        // Extract error message if possible
        const errorMessage = errorData?.error?.message || errorData?.message || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      // console.log("OpenAI response structure:", Object.keys(data));

      // 1. Handle incomplete status (peut contenir du texte partiel)
      if (data && data.status === "incomplete" && data.incomplete_details?.reason === "max_output_tokens") {
          console.warn("OpenAI Response Incomplete:", data.incomplete_details);
          // Essayer de trouver le texte partiel même si incomplet
          const messageOutput = data.output?.find((item: OpenAIResponseItem) => item.type === 'message');
          const textContent = messageOutput?.content?.find((c: OpenAIContentItem) => c.type === 'output_text');
          reply = textContent?.text || "Response incomplete due to max_output_tokens."; // Fournir le texte partiel ou un message d'erreur
          if (data.usage) {
             currentTokenUsage = data.usage.total_tokens || (data.usage.input_tokens + data.usage.output_tokens);
          }
      }
      // 2. Handle completed status (chercher le texte dans la structure)
      else if (data && data.status === 'completed') {
          // Trouver l'objet 'message' dans le tableau 'output'
          const messageOutput = data.output?.find((item: OpenAIResponseItem) => item.type === 'message');
          // Trouver l'objet 'output_text' dans le tableau 'content' du message
          const textContent = messageOutput?.content?.find((c: OpenAIContentItem) => c.type === 'output_text');

          // Vérifier si on a bien trouvé le texte
          if (textContent && typeof textContent.text === 'string') {
             reply = textContent.text; // Extraire le texte
             if (data.usage) {
               currentTokenUsage = data.usage.total_tokens || (data.usage.input_tokens + data.usage.output_tokens);
             }
          } else {
             // La structure est 'completed' mais le texte n'est pas trouvé où prévu
             console.error("Could not find 'output_text' in completed response structure:", data);
             throw new Error("Could not find text content in completed OpenAI Responses API structure");
          }
      }
      // 3. Handle other statuses or unexpected structures
      else {
        console.error("Invalid or unexpected response structure/status from OpenAI Responses API:", data);
        // Inclure le statut si disponible pour plus de contexte
        throw new Error(`Invalid or unexpected response structure/status: ${data?.status || 'Unknown status'}`);
      }

    } else {
        // Existing logic for GPT models using /v1/chat/completions
        // Create typed array with correct role types
        const messagesWithThinking: OpenAIMessageWithSystemRole[] = [...payload.messages.map(msg => ({
          role: msg.role,
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) // Ensure string content
        }))];

        if (payload.thinking) {
          messagesWithThinking.unshift({
            role: "system",
            content: "Lorsque tu réponds, je voudrais que tu utilises une approche de réflexion étape par étape. Pense au problème en détail, en décomposant ton raisonnement et en explorant plusieurs angles avant de formuler ta réponse finale. Commence ta réponse par '# Réflexion' puis détaille ton processus de pensée avant de conclure avec ta réponse finale."
          });
        }

        const requestBody = {
          model: payload.model,
          messages: messagesWithThinking,
          max_tokens: payload.max_completion_tokens || 1024
        };

        console.log("OpenAI Chat Completions API request:", JSON.stringify(requestBody, null, 2));

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          headers: {
            Authorization: `Bearer ${OpenAIApiKey}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
           let errorData;
           try {
             errorData = await response.json();
             console.error("OpenAI ChatCompletions API Error Response:", errorData);
           } catch(e) {
              const textError = await response.text();
              console.error("OpenAI ChatCompletions API Non-JSON Error Response:", textError);
              throw new Error(`HTTP error! status: ${response.status}, Body: ${textError}`);
           }
           const errorMessage = errorData?.error?.message || errorData?.message || `HTTP error! status: ${response.status}`;
          throw new Error(errorMessage);
        }

        const data = await response.json();
        if (data && data.choices && data.choices.length > 0 && data.choices[0].message) {
          reply = data.choices[0].message.content || "No content in response.";
          if (data.usage) {
            currentTokenUsage = data.usage.total_tokens;
          }
        } else {
           console.error("Invalid response structure from OpenAI Chat Completions API:", data);
           throw new Error("Invalid response structure from OpenAI Chat Completions API");
        }
    }
  } catch (error: any) {
    console.error("Error in getOpenAICompletion:", error);
    reply = error.message || "An unexpected error occurred.";
    currentTokenUsage = 0; // Ensure token usage is 0 on error
  }

  return { reply, tokenUsage: currentTokenUsage };
};