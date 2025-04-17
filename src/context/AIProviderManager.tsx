// context/AIProviderManager.tsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { OpenAIChatModels } from '../utils/OpenAI/OpenAI.constants';
import { AnthropicChatModels } from '../utils/Anthropic/Anthropic.constants';
import OpenAIProvider from './OpenAIProvider';
import AnthropicProvider from './AnthropicProvider';

interface AIProviderContextType {
  activeProvider: 'anthropic' | 'openai'; // Nouveau: indique le fournisseur actif
  setActiveProvider: (provider: 'anthropic' | 'openai') => void; // Fonction pour changer de fournisseur
  useOpenAIForNext: boolean;
  setUseOpenAIForNext: (value: boolean) => void;
  isAnthropicModel: (model: string) => boolean;
  isOpenAIModel: (model: string) => boolean;
  syncProviders: () => void;
}

const AIProviderContext = createContext<AIProviderContextType>({
  activeProvider: 'anthropic',
  setActiveProvider: () => {},
  useOpenAIForNext: false,
  setUseOpenAIForNext: () => {},
  isAnthropicModel: () => false,
  isOpenAIModel: () => false,
  syncProviders: () => {},
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
    return 'anthropic'; // Par défaut: Anthropic
  };

  // État pour le fournisseur actif
  const [activeProvider, setActiveProviderState] = useState<'anthropic' | 'openai'>(getSavedActiveProvider());

  // Mise à jour du fournisseur actif avec synchronisation localStorage
  const setActiveProvider = useCallback((provider: 'anthropic' | 'openai') => {
    setActiveProviderState(provider);
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeProvider', provider);
    }
  }, []);

  // Pour la compatibilité avec le code existant
  const [useOpenAIForNext, setUseOpenAIForNext] = useState(activeProvider === 'openai');
  
  // Synchroniser useOpenAIForNext avec activeProvider
  useEffect(() => {
    setUseOpenAIForNext(activeProvider === 'openai');
  }, [activeProvider]);

  const isAnthropicModel = useCallback((model: string) => {
    return Object.keys(AnthropicChatModels).includes(model);
  }, []);

  const isOpenAIModel = useCallback((model: string) => {
    return Object.keys(OpenAIChatModels).includes(model);
  }, []);

  const syncProviders = useCallback(() => {
    console.log("Synchronisation des providers demandée");
  }, []);

  const value = {
    activeProvider,
    setActiveProvider,
    useOpenAIForNext,
    setUseOpenAIForNext,
    isAnthropicModel,
    isOpenAIModel,
    syncProviders,
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