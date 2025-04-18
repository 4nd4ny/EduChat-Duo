// context/AIProviderManager.tsx
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { OpenAIChatModels } from '../utils/OpenAI/OpenAI.constants';
import { AnthropicChatModels } from '../utils/Anthropic/Anthropic.constants';
import { OpenAIChatMessage } from '../utils/OpenAI';
import { AnthropicChatMessage } from '../utils/Anthropic';
import OpenAIProvider from './OpenAIProvider';
import AnthropicProvider from './AnthropicProvider';
import { Conversation } from './History';

// Interface pour exposer les données et méthodes nécessaires à la synchronisation
interface AnthropicSyncData {
  messages: AnthropicChatMessage[];
  conversationId: string;
  conversationName: string;
  setMessages: React.Dispatch<React.SetStateAction<AnthropicChatMessage[]>>;
  updateConversationName: (id: string, name: string) => void;
}

interface OpenAISyncData {
  messages: OpenAIChatMessage[];
  conversationId: string;
  conversationName: string;
  setMessages: React.Dispatch<React.SetStateAction<OpenAIChatMessage[]>>;
  updateConversationName: (id: string, name: string) => void;
}

type SyncData = {
  anthropic?: AnthropicSyncData;
  openai?: OpenAISyncData;
}

interface AIProviderContextType {
  activeProvider: 'anthropic' | 'openai';
  setActiveProvider: (provider: 'anthropic' | 'openai') => void;
  isAnthropicModel: (model: string) => boolean;
  isOpenAIModel: (model: string) => boolean;
  syncProviders: () => void;
  // Ajouter les références aux données de synchronisation
  registerAnthropicData: (data: AnthropicSyncData) => void;
  registerOpenAIData: (data: OpenAISyncData) => void;
}

const AIProviderContext = createContext<AIProviderContextType>({
  activeProvider: 'anthropic',
  setActiveProvider: () => {},
  isAnthropicModel: () => false,
  isOpenAIModel: () => false,
  syncProviders: () => {},
  registerAnthropicData: () => {},
  registerOpenAIData: () => {},
});

export const useAIProvider = () => useContext(AIProviderContext);

interface ProviderManagerProps {
  children: React.ReactNode;
}

export function AIProviderManager({ children }: ProviderManagerProps) {
  // Récupérer la préférence du fournisseur actif du localStorage
  const getSavedActiveProvider = (): 'anthropic' | 'openai' => {
    if (typeof window !== 'undefined') {
      const savedProvider = localStorage.getItem('activeProvider');
      return (savedProvider === 'openai') ? 'openai' : 'anthropic';
    }
    return 'openai'; // Par défaut: OpenAi
  };

  // État pour le fournisseur actif
  const [activeProvider, setActiveProviderState] = useState<'anthropic' | 'openai'>(getSavedActiveProvider());

  // Références pour stocker les données de synchronisation
  const syncDataRef = useRef<SyncData>({});

  // Mise à jour du fournisseur actif avec synchronisation localStorage
  const setActiveProvider = useCallback((provider: 'anthropic' | 'openai') => {
    setActiveProviderState(provider);
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeProvider', provider);
    }
  }, []);

  const isAnthropicModel = useCallback((model: string) => {
    return Object.keys(AnthropicChatModels).includes(model);
  }, []);

  const isOpenAIModel = useCallback((model: string) => {
    return Object.keys(OpenAIChatModels).includes(model);
  }, []);

  // Fonctions pour enregistrer les données de synchronisation
  const registerAnthropicData = useCallback((data: AnthropicSyncData) => {
    syncDataRef.current.anthropic = data;
  }, []);
  
  const registerOpenAIData = useCallback((data: OpenAISyncData) => {
    syncDataRef.current.openai = data;
  }, []);

  // Fonction pour synchroniser les fournisseurs d'IA
  const syncProviders = useCallback(() => {
    const { anthropic, openai } = syncDataRef.current;
    
    if (!anthropic || !openai) {
      console.warn("Les données de synchronisation ne sont pas disponibles");
      return;
    }

    if (activeProvider === 'openai') {
      // Synchroniser OpenAI → Anthropic
      if (openai.messages.length > 0) {
        // Convertir les messages d'OpenAI au format Anthropic
        const convertedMessages = openai.messages.map((msg, index) => {
          return {
            id: index,
            role: msg.role,
            content: typeof msg.content === 'string' ? msg.content : msg.content.reply,
            model: msg.model || Object.keys(AnthropicChatModels)[0]
          } as AnthropicChatMessage;
        });
        
        // Mettre à jour les messages Anthropic
        anthropic.setMessages(convertedMessages);
        
        // Synchroniser le nom de conversation si disponible
        if (openai.conversationId && 
            openai.conversationName && 
            openai.conversationName !== "...") {
          anthropic.updateConversationName(
            openai.conversationId, 
            openai.conversationName
          );
        }
        
        console.log("Synchronisation effectuée: OpenAI → Anthropic");
      }
    } else {
      // Synchroniser Anthropic → OpenAI
      if (anthropic.messages.length > 0) {
        // Convertir les messages d'Anthropic au format OpenAI
        const convertedMessages = anthropic.messages.map((msg, index) => {
          return {
            id: index,
            role: msg.role,
            content: typeof msg.content === 'string' ? msg.content : msg.content.reply,
            model: msg.model || Object.keys(OpenAIChatModels)[0]
          } as OpenAIChatMessage;
        });
        
        // Mettre à jour les messages OpenAI
        openai.setMessages(convertedMessages);
        
        // Synchroniser le nom de conversation si disponible
        if (anthropic.conversationId && 
            anthropic.conversationName && 
            anthropic.conversationName !== "...") {
          openai.updateConversationName(
            anthropic.conversationId, 
            anthropic.conversationName
          );
        }
        
        console.log("Synchronisation effectuée: Anthropic → OpenAI");
      }
    }
  }, [activeProvider]);

  const value = {
    activeProvider,
    setActiveProvider,
    isAnthropicModel,
    isOpenAIModel,
    syncProviders,
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