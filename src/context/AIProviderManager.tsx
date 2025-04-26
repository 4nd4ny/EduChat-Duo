// context/AIProviderManager.tsx
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { OpenAIChatModels } from './OpenAI/OpenAI.constants';
import { AnthropicChatModels } from './Anthropic/Anthropic.constants';
import { OpenAIChatMessage } from './OpenAI/OpenAI.types';
import { AnthropicChatMessage } from './Anthropic/Anthropic.types';
import OpenAIProvider from './OpenAIProvider';
import AnthropicProvider from './AnthropicProvider';
import { Conversation, storeConversation as storeConversationFn, getHistory, updateConversation } from './History';
import { useRouter } from "next/router";
import { v4 as uuidv4 } from "uuid";
import { useMode } from './ModeContext';

// ---------  Internal helper types  ------------------

interface ProviderSyncData {
  messages: any[];
  conversationId: string;
  conversationName: string;
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  updateConversationName: (id: string, name: string) => void;
  addMessage?: (
    content?: string,
    submit?: boolean,
    role?: 'user' | 'assistant',
    executiveModel?: string
  ) => void;
  loading?: boolean;

  // Expose advanced helpers so the manager can act as proxy
  regenerateMessage?: (
    messages: any[],
    onSuccess: (reply: string) => void,
    modelOverride?: string,
    useThinking?: boolean
  ) => void;
  deleteMessagesFromIndex?: (index: number) => void;
}

type SyncData = {
  anthropic?: ProviderSyncData;
  openai?: ProviderSyncData;
};

interface AIProviderContextType {
  activeProvider: 'anthropic' | 'openai' | 'both';
  setActiveProvider: (provider: 'anthropic' | 'openai' | 'both') => void;
  lastModel: 'anthropic' | 'openai' | 'both'; // Exposer lastModel dans le contexte
  setLastModel: (model: 'anthropic' | 'openai' | 'both') => void; // Exposer une méthode pour mettre à jour lastModel
  isAnthropicModel: (model: string) => boolean;
  isOpenAIModel: (model: string) => boolean;
  onStoreConversation: (id: string, conversation: Conversation) => string;
  importConversationCoordinated: (jsonData: any) => boolean;  

  // Export current conversation to a JSON blob matching the import format
  exportConversation: (conversationId: string) => void;

  // Registration helpers for underlying provider components so they can give us
  // their internal state references.
  registerAnthropicData: (data: ProviderSyncData) => void;
  registerOpenAIData: (data: ProviderSyncData) => void;

  /**
   * Centralised helper to dispatch a user/assistant message to the underlying
   * provider(s) according to the current mode (single / dual).
   */
  addMessage: (
    content: string,
    role?: 'user' | 'assistant'
  ) => void;

  // Wrapped provider utilities used by ChatMessage
  regenerateMessage: (
    provider: 'openai' | 'anthropic',
    messages: any[],
    onSuccess: (reply: string) => void,
    modelOverride?: string,
    useThinking?: boolean
  ) => void;
  replaceMessages: (provider: 'openai' | 'anthropic', newMessages: any[]) => void;
  deleteMessagesFromIndex: (provider: 'openai' | 'anthropic', index: number) => void;

  openaiMessages: any[];
  anthropicMessages: any[];

  /**
   * Combined loading state reflecting the busy status of the provider(s)
   */
  loading: boolean;
}
const AIProviderContext = createContext<AIProviderContextType>({
  activeProvider: 'anthropic',
  setActiveProvider: () => {},
  lastModel: 'anthropic', // Valeur par défaut
  setLastModel: () => {}, // Fonction par défaut
  isAnthropicModel: () => false,
  isOpenAIModel: () => false,
  onStoreConversation: () => '',
  importConversationCoordinated: () => false,

  exportConversation: () => {},

  addMessage: () => {},
  loading: false,

  regenerateMessage: () => {},
  replaceMessages: () => {},
  deleteMessagesFromIndex: () => {},
  openaiMessages: [],
  anthropicMessages: [],

  registerAnthropicData: () => {},
  registerOpenAIData: () => {},
});

export const useAIProvider = () => useContext(AIProviderContext);

interface ProviderManagerProps {
  children: React.ReactNode;
}


export function AIProviderManager({ children }: ProviderManagerProps) {

  // Mode global (source unique)
  const { mode: activeProvider, setMode } = useMode();

  // AIProviderManager garde toujours lastModel pour savoir qui vient de répondre
  const [lastModel, setLastModelState] = useState<'anthropic' | 'openai' | 'both'>(activeProvider);

  // Références pour stocker les données de synchronisation
  const syncDataRef = useRef<SyncData>({});
  // simple state to force re-render when providers update their loading status
  // Next.js router to detect conversation changes
  const router = useRouter();

  // Fonction pour mettre à jour lastModel
  const setLastModel = useCallback((model: 'anthropic' | 'openai' | 'both') => {
    setLastModelState(model);

  // Notifier les changements
  const event = new CustomEvent('lastModelChanged', { 
      detail: { lastModel: model } 
    });
    document.dispatchEvent(event);
  }, []);

  const isAnthropicModel = useCallback((model: string) => {
    return Object.keys(AnthropicChatModels).includes(model);
  }, []);

  const isOpenAIModel = useCallback((model: string) => {
    return Object.keys(OpenAIChatModels).includes(model);
  }, []);

  // Fonctions pour enregistrer les données de synchronisation provenant des deux
  // providers. Chaque provider appelle cette fonction dans un useEffect afin que le
  // manager dispose toujours des références les plus à jour (messages, setters,
  // helpers, etc.)

  const registerAnthropicData = useCallback((data: ProviderSyncData) => {
    syncDataRef.current = {
      ...syncDataRef.current,
      anthropic: data,
    };
    // no-op re-render trigger removed
  }, []);

  const registerOpenAIData = useCallback((data: ProviderSyncData) => {
    syncDataRef.current = {
      ...syncDataRef.current,
      openai: data,
    };
    // no-op re-render trigger removed
  }, []);

  // Centralized conversation storage
  const onStoreConversation = useCallback((id: string, conversation: Conversation) => {
    // Ajouter lastModel aux métadonnées de la conversation
    const updatedConversation = {
      ...conversation,
      lastModel: lastModel
    };
    return storeConversationFn(id, updatedConversation);
  }, [lastModel]);

  const setActiveProvider = useCallback((provider: 'anthropic' | 'openai' | 'both') => {
    if (provider !== activeProvider) {
      setMode(provider);
      setLastModelState(provider);
    }
  }, [activeProvider, setMode]);

  // Fonction coordonnée d'importation - APRÈS toutes les autres fonctions
  const importConversationCoordinated = useCallback((jsonData: any) => {
    try {
      // Validation minimaliste
      if (!jsonData.meta || !jsonData.openai || !jsonData.anthropic) {
        throw new Error('Invalid format');
      }
      const { lastModel } = jsonData.meta;
      if (!['openai', 'anthropic', 'both'].includes(lastModel)) {
        throw new Error('Invalid lastModel');
      }

      const oaMsgs = jsonData.openai as any[];
      const anMsgs = jsonData.anthropic as any[];
      if (!Array.isArray(oaMsgs) || !Array.isArray(anMsgs) || oaMsgs.length !== anMsgs.length) {
        throw new Error('Desynchronised messages');
      }

      const newId = uuidv4();

      // Inject messages in providers
      const { openai, anthropic } = syncDataRef.current;
      openai?.setMessages(oaMsgs);
      anthropic?.setMessages(anMsgs);

      // Build conversation object and store
      const now = Date.now();
      const conversation = {
        name: jsonData.meta.conversationName || 'Imported conversation',
        lastModel,
        mode: jsonData.meta.mode || lastModel,
        createdAt: now,
        lastMessage: now,
        openaiMessages: oaMsgs,
        anthropicMessages: anMsgs,
      } as Conversation;

      onStoreConversation(newId, conversation);

      // Appliquer le mode enregistré
      setMode(lastModel);

      // Navigation vers la nouvelle conversation
      router.push(`/chat/${newId}`);

      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  }, [syncDataRef, onStoreConversation, router, setMode]);

  // Export current conversation into a downloadable JSON file
  const exportConversation = useCallback(
    (conversationId: string) => {
      try {
        const hist = getHistory();
        const conv = hist[conversationId];
        if (!conv) {
          console.error('Conversation not found');
          return;
        }

        // Ensure messages are up-to-date with current providers
        const { openai, anthropic } = syncDataRef.current;
        const exportData = {
          meta: {
            conversationId,
            conversationName: conv.name,
            lastModel: conv.lastModel || activeProvider,
            mode: conv.mode || activeProvider,
            exportedAt: new Date().toISOString(),
          },
          openai: openai?.messages || conv.openaiMessages || [],
          anthropic: anthropic?.messages || conv.anthropicMessages || [],
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conversation-${conversationId}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error('Export failed', e);
      }
    },
    [activeProvider]
  );

  // -------------------------------------------------------------
  // Unified helpers exposed to the rest of the application
  // -------------------------------------------------------------

  const addMessage = useCallback(
    (content: string, role: 'user' | 'assistant' = 'user') => {
      const { anthropic, openai } = syncDataRef.current;

      if (!anthropic || !openai) {
        console.warn('[AIProviderManager] Providers not ready yet');
        return;
      }

      if (activeProvider === 'both') {
        openai.addMessage?.(content, true, role);
        anthropic.addMessage?.(content, true, role);
      } else if (activeProvider === 'openai') {
        openai.addMessage?.(content, true, role);
        anthropic.addMessage?.(content, false, role);
      } else {
        anthropic.addMessage?.(content, true, role);
        openai.addMessage?.(content, false, role);
      }
    },
    [activeProvider]
  );

  const getLoadingState = () => {
    const { anthropic, openai } = syncDataRef.current;

    if (activeProvider === 'both') {
      return Boolean(openai?.loading) || Boolean(anthropic?.loading);
    }
    if (activeProvider === 'openai') return Boolean(openai?.loading);
    return Boolean(anthropic?.loading);
  };

  const loading = getLoadingState();

  // -------------------------------------------------------------
  // Proxy helpers to expose provider-specific utilities
  // -------------------------------------------------------------

  const regenerateMessage = useCallback<AIProviderContextType['regenerateMessage']>(
    (provider, messages, onSuccess, modelOverride, useThinking) => {
      const target = syncDataRef.current[provider];
      target?.regenerateMessage?.(messages, onSuccess, modelOverride, useThinking);
    },
    []
  );

  const replaceMessages = useCallback<AIProviderContextType['replaceMessages']>(
    (provider, newMessages) => {
      const target = syncDataRef.current[provider];
      if (target) target.setMessages(newMessages);
    },
    []
  );

  const deleteMessagesFromIndex = useCallback<AIProviderContextType['deleteMessagesFromIndex']>(
    (provider, index) => {
      const target = syncDataRef.current[provider];
      target?.deleteMessagesFromIndex?.(index);
    },
    []
  );

  // Convenience accessors for messages arrays
  const openaiMessages = syncDataRef.current.openai?.messages || [];
  const anthropicMessages = syncDataRef.current.anthropic?.messages || [];

  const value = {
    activeProvider,
    setActiveProvider,
    lastModel,
    setLastModel,
    isAnthropicModel,
    isOpenAIModel,
    onStoreConversation,
    importConversationCoordinated, // Inclure la nouvelle fonction
    // Helpers
    addMessage,
    loading,
    exportConversation,
    // Proxy helpers
    regenerateMessage,
    replaceMessages,
    deleteMessagesFromIndex,
    openaiMessages,
    anthropicMessages,
    // Registration helpers for underlying providers
    registerAnthropicData,
    registerOpenAIData,
  };

  return (
    <AIProviderContext.Provider value={value}>
      <AnthropicProvider>
        <OpenAIProvider>
          {children}
        </OpenAIProvider>
      </AnthropicProvider>
    </AIProviderContext.Provider>
  );
}