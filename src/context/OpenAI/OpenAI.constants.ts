import { OpenAIModel } from "./OpenAI.types";

export const OpenAIChatModels: Record<string, OpenAIModel> = {
  "gpt-4.1": { 
    id: "gpt-4.1",
    name: "gpt-4.1", 
    maxLimit: 32768, 
  },
  "o4-mini": { 
    id: "o4-mini",
    name: "o4-mini",
    maxLimit: 100000, 
  },
  "o3": {
    id: "o3",
    name: "o3",
    maxLimit: 100000,
  },
  "gpt-4.1-nano": { 
    id: "gpt-4.1-nano",
    name: "gpt-4.1-nano", 
    maxLimit: 32768, 
  },
};

export const defaultConfig = {
  model: "gpt-4.1", 
  max_completion_tokens: 100000, 
};

