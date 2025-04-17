import { OpenAIChatModels } from "../../utils/OpenAI/OpenAI.constants";
import { getAnthropicCompletion, AnthropicRequest } from "../../utils/Anthropic";
import { getOpenAICompletion, OpenAIRequest } from "../../utils/OpenAI";

export const config = {
  runtime: "edge",
};

export default async function handler(req: Request) {
  if (req.method === 'POST') {
    try {
      const requestData = await req.json();
      const { model, max_completion_tokens, messages, thinking } = requestData;

      if (!messages) {
        return new Response(JSON.stringify({ error: "Missing messages" }), {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        });
      }

      let reply: string;
      let tokenUsage: number; 

      // Determine which API to use based on the model
      if (model in OpenAIChatModels) {
        // console.log(`Using OpenAI API with model: ${model}`);
        const payload: OpenAIRequest = {
          model,
          max_completion_tokens,
          messages,
          thinking: thinking === true // Ensure thinking is a boolean
        };
        
        // Call the function that gets the response and tokens from OpenAI
        ({ reply, tokenUsage } = await getOpenAICompletion(payload));  
      } else {
        // console.log(`Using Anthropic API with model: ${model}`);
        const payload: AnthropicRequest = {
          model,
          max_tokens: max_completion_tokens,
          messages,
          thinking: thinking === true // Ensure thinking is a boolean
        };
        
        // Call the function that gets the response and tokens from Anthropic
        ({ reply, tokenUsage } = await getAnthropicCompletion(payload));
      } 
      
      // Return the structured response with the reply and number of tokens used
      const responseBody = JSON.stringify({ reply, tokenUsage });

      return new Response(responseBody, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });

    } catch (e: any) {
      console.error("Error in completion handler:", e);
      return new Response(JSON.stringify({ 
        error: {
          message: e.message || "Error fetching response from API"
        }
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }
  } else {
    return new Response(JSON.stringify({ 
      error: { message: "Method not allowed. Only POST requests are supported." }
    }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}