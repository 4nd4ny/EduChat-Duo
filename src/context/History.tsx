import { OpenAIChatMessage } from './OpenAI/OpenAI.types';
import { v4 as uuidv4 } from "uuid";

const HISTORY_KEY = "pg-history";

// Types
export type Conversation = {
  // Conversation metadata
  name: string;
  // Whether automatic title regeneration is disabled (after manual rename)
  disableAutoTitle?: boolean;
  // Identifier of the last provider used for assistant reply (ex: 'openai' ou 'anthropic')
  lastProvider?: 'openai' | 'anthropic' | 'both';
  // Timestamps
  createdAt: number; // Unix timestamp
  lastMessage: number; // Unix timestamp
  // Messages per provider
  openaiMessages?: OpenAIChatMessage[];
  anthropicMessages?: OpenAIChatMessage[];
  importError?: string; // Ajouté pour gestion d'erreur d'importation
};

export type History = Record<string, Conversation>;

// Store conversation in local storage
export const storeConversation = (id: string, conversation: Conversation) => {
  const history = getHistory();
  id = id || uuidv4();
  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify({
      ...history,
      [id]: conversation,
    })
  );
  // Notify listeners that history has been updated
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('historyUpdated'));
  }
  return id;
};

// Get a conversation from local storage
export const getConversation = (id: string) => {
  const history = getHistory();
  return history[id];
};

// Update a conversation in local storage
export const updateConversation = (
  id: string,
  conversation: Partial<Conversation>
) => {
  const history = getHistory();
  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify({
      ...history,
      [id]: {
        ...history[id],
        ...conversation,
      },
    })
  );
  // Notify listeners that history has been updated
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('historyUpdated'));
  }
};

// Delete a conversation from local storage
export const deleteConversationFromHistory = (id: string) => {
  const history = getHistory();
  delete history[id];
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  // Notify listeners that history has been updated
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('historyUpdated'));
  }
};

// Get conversations from local storage
export const getHistory: () => History = () => {
  const history = localStorage.getItem(HISTORY_KEY);
  return history ? JSON.parse(history) : {};
};

// Clear conversations from local storage
export const clearHistory = () => {
  localStorage.removeItem(HISTORY_KEY);
  // Notify listeners that history has been cleared
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('historyUpdated'));
  }
};
