import { OpenAIModel } from "./OpenAI.types"; // Assurez-vous que ce chemin est correct

export const OpenAIChatModels: Record<string, OpenAIModel> = {
  "gpt-4.1": { 
    id: "gpt-4.1",
    name: "gpt-4.1", 
    maxLimit: 32768, 
  },
  "o1-pro": { 
    id: "o1-pro",
    name: "o1-pro",
    maxLimit: 100000, 
  },
};

export const defaultConfig = {
  model: "gpt-4.1", 
  max_completion_tokens: 100000, 
};

