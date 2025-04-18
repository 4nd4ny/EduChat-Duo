import React, { useEffect, useState } from "react";
import { MdPerson, MdSmartToy, MdContentCopy, MdAutorenew, MdDeleteSweep, MdPsychology } from "react-icons/md";
import AssistantMessageContent from "./AssistantMessageContent";
import UserMessageContent from "./UserMessageContent";
import { useAIProvider } from "../context/AIProviderManager";
import { useOpenAI } from "../context/OpenAIProvider";
import { useAnthropic } from "../context/AnthropicProvider";

type Props = {
  message: any;
  isInitialUserMessage: boolean;
  isLastAssistantMessage: boolean;
  messageIndex: number; 
};

export default function ChatMessage({ 
  message: { role, content, model }, 
  isInitialUserMessage, 
  isLastAssistantMessage,
  messageIndex 
}: Props) {
  const [hover, setHover] = React.useState(false);
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  const [showThinkingMessage, setShowThinkingMessage] = useState(false);
  const [showSwitchMessage, setShowSwitchMessage] = useState(false);
  const [showDeleteMessage, setShowDeleteMessage] = useState(false);
  
  const { 
    isOpenAIModel, 
    isAnthropicModel, 
    activeProvider: currentActiveProvider,
    setActiveProvider
  } = useAIProvider();
  
  const openai = useOpenAI();
  const anthropic = useAnthropic();
  
  // Détermine le provider basé sur le contexte actuel
  const getActiveProvider = () => currentActiveProvider === 'openai' ? openai : anthropic;
  const getAlternativeProvider = () => currentActiveProvider === 'openai' ? anthropic : openai;
  const getActiveProviderName = () => currentActiveProvider === 'openai' ? 'ChatGPT' : 'Claude';
  const getAlternativeProviderName = () => currentActiveProvider === 'openai' ? 'Claude' : 'ChatGPT';

  useEffect(() => {
    if (isInitialUserMessage && role === 'user') {
      // Utiliser le provider actif pour générer le titre
      getActiveProvider().generateTitle();
    }
  }, [isInitialUserMessage, role]);

  const handleCopy = () => {
    const textContent = typeof content === 'string' ? content : content.reply;
    navigator.clipboard.writeText(textContent);
    setShowCopiedMessage(true);
    setTimeout(() => setShowCopiedMessage(false), 2000);
  };
  
  // Fonction pour utiliser le mode thinking (corrigée)
  const handleThinking = () => {
    if (openai.loading || anthropic.loading) return;
    setShowThinkingMessage(true);
    const activeProviderContext = getActiveProvider();
    // Isoler les messages jusqu'au dernier user pour refaire la requête
    let lastUserIndex = activeProviderContext.messages.length - 1;
    while (lastUserIndex >= 0 && activeProviderContext.messages[lastUserIndex].role !== 'user') {
      lastUserIndex--;
    }
    const relevantMessages = lastUserIndex >= 0
      ? activeProviderContext.messages.slice(0, lastUserIndex + 1)
      : activeProviderContext.messages;
    activeProviderContext.setMessages(relevantMessages);
    if (currentActiveProvider === 'openai') {
      // Choix du modèle suivant l'historique de réponse
      const assistantMsgs = openai.messages.filter(m => m.role === 'assistant');
      let nextModel = 'o4-mini';
      const lastAssistant = assistantMsgs[assistantMsgs.length - 1];
      if (lastAssistant && lastAssistant.model === 'o4-mini') {
        nextModel = 'o3';
      }
      openai.regenerateMessage(
        relevantMessages,
        (reply) => {
          activeProviderContext.setMessages(prev => [...prev, {
            id: prev.length,
            role: 'assistant',
            content: reply,
            model: nextModel
          }]);
        },
        nextModel,
        true
      );
    } else {
      // Mode reflection pour Claude (inchangé)
      const currentModel = 'claude-3-7-sonnet-latest';
      anthropic.regenerateMessage(
        relevantMessages,
        (reply) => {
          activeProviderContext.setMessages(prev => [...prev, {
            id: prev.length,
            role: 'assistant',
            content: reply,
            model: currentModel + '-thinking'
          }]);
        },
        currentModel,
        true
      );
    }
    // Reset message and focus fallback
    setTimeout(() => setShowThinkingMessage(false), 1000);
    setTimeout(() => {
      const input = document.querySelector('textarea[name="query"]') as HTMLTextAreaElement;
      if (input) input.focus();
    }, 100);
  };

  // Fonction pour régénérer la réponse avec le même modèle (corrigée)
  const handleRefreshAnswer = () => {
    if (openai.loading || anthropic.loading) return;
    
    setShowSwitchMessage(true);
    
    // Trouver le dernier message de l'utilisateur
    const activeProvider = getActiveProvider();
    let currentModel = '';
    if (currentActiveProvider === 'openai') {
      currentModel = 'gpt-4.1';
    } else {
      currentModel = 'claude-3-7-sonnet-latest';
    }

    // Trouver le dernier message de l'utilisateur
    let lastUserMessageIndex = activeProvider.messages.length - 1;
    while (lastUserMessageIndex >= 0 && activeProvider.messages[lastUserMessageIndex].role !== 'user') {
      lastUserMessageIndex--;
    }
    
    // Si aucun message utilisateur trouvé, utiliser tous les messages sauf le dernier
    const relevantMessages = lastUserMessageIndex >= 0 
      ? activeProvider.messages.slice(0, lastUserMessageIndex + 1)
      : activeProvider.messages.slice(0, -1);
    
    // Mettre à jour l'état du provider actuellement actif
    activeProvider.setMessages(relevantMessages);
    
    // Puis régénérer une réponse avec le même provider
    activeProvider.regenerateMessage(
      relevantMessages, 
      (reply) => {
        // Ajouter la nouvelle réponse
        activeProvider.setMessages(prev => [...prev, {
          id: prev.length,
          role: 'assistant',
          content: reply,
          model: currentModel // Conserve le même modèle pour le refresh
        }]);
      }, 
      currentModel,
      false
    );
    
    setTimeout(() => setShowSwitchMessage(false), 1000);
    
    // Remettre le focus sur le champ d'input
    setTimeout(() => {
      const inputField = document.querySelector('textarea[name="query"]') as HTMLTextAreaElement;
      if (inputField) inputField.focus();
    }, 100);
  };

  const handleDeleteFromHere = () => {
    setShowDeleteMessage(true);
    setTimeout(() => {
      setShowDeleteMessage(false);
      getActiveProvider().deleteMessagesFromIndex(messageIndex);
      
      // Remettre le focus sur le champ d'input
      const inputField = document.querySelector('textarea[name="query"]') as HTMLTextAreaElement;
      if (inputField) inputField.focus();
    }, 1000);
  };

  const formatModelName = (model: string): string => {
    if (!model) return 'UNKNOWN MODEL';
    if (model && model.includes('thinking')) {
      return model.toUpperCase().replace(/-LATEST$/i, '').replace(/-THINKING$/i, ' (THINKING)');
    }
    return model ? model.toUpperCase().replace(/-LATEST$/i, '') : '';
  }

  return (
    <div
      className={`flex cursor-pointer flex-row items-center p-4 transition-all ${
        role === "user" ? "bg-tertiary hover:bg-secondary/50" : "bg-secondary"
      }`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="relative max-w-screen mx-auto flex w-full max-w-6xl flex-row items-center">
        <div
          className={`flex sticky top-0 my-4 h-10 w-10 items-center justify-center text-4xl mr-2 self-start transition-colors ${
            hover ? "text-stone-300" : "text-primary/20"
          }`}
        >
          {role === "user" ? <MdPerson /> : <MdSmartToy />}
        </div>
        <div className="overflow-x-auto">
          {role === 'assistant' && model && (
            <div className="text-sm font-bold text-gray-500">
              {formatModelName(model)}
            </div>
          )}
          <div 
            className="text-md prose w-full max-w-6xl rounded p-4 text-primary dark:prose-invert prose-code:text-primary prose-pre:bg-transparent prose-pre:p-0"
          >
            {role === "user" ? (
              <UserMessageContent content={typeof content === 'string' ? content : content.reply} />
            ) : (
              <AssistantMessageContent content={typeof content === 'string' ? content : content.reply} />
            )}
          </div>
          {/* Afficher les boutons de contrôle en fonction du rôle */}
          {role === "user" ? (
            // Interface pour les messages utilisateur
            <div className="ml-1 mr-3">
              <div className="relative mx-auto flex flex-row items-center mt-5 space-x-12">
                {showDeleteMessage && (
                  <div className="absolute bottom-full mb-2 text-xs text-white">
                    Suppression des messages...
                  </div>
                )}
              </div>
              <div className="relative mx-auto flex flex-row items-center mb-2 space-x-12">
                <div
                  className={`cursor-pointer text-gray-500 transition-colors transition-transform transform hover:scale-110 hover:bg-red-600 hover:text-white rounded-full flex items-center justify-center w-12 h-12`}
                  onClick={handleDeleteFromHere}
                  title="Supprimer à partir d'ici"
                >
                  <MdDeleteSweep className="text-2xl" />
                </div>
              </div>
            </div>
          ) : (
            // Interface pour les messages assistant
            <div className="ml-1 mr-3">
              <div className="relative mx-auto flex flex-row items-center mt-5 space-x-12">
                {showCopiedMessage && (
                  <div className="absolute bottom-full mb-2 text-xs text-white">
                    Réponse copiée !
                  </div>
                )}
                {showThinkingMessage && (
                  <div className="absolute bottom-full mb-2 text-xs text-white">
                    Mode réflexion avec {getActiveProviderName()}...
                  </div>
                )}
                {showSwitchMessage && (
                  <div className="absolute bottom-full mb-2 text-xs text-white">
                    Régénération de la réponse...
                  </div>
                )}
              </div>
              <div className="relative mx-auto flex flex-row items-center mb-2 space-x-12">
                <div
                  className={`cursor-pointer text-gray-500 transition-colors transition-transform transform hover:scale-110 hover:bg-blue-600 hover:text-white rounded-full flex items-center justify-center w-12 h-12`}
                  onClick={handleCopy}
                  title="Copier"
                >
                  <MdContentCopy className="text-2xl" />
                </div>
                {isLastAssistantMessage && (
                  <>
                    <div
                      className={`cursor-pointer text-gray-500 transition-colors transition-transform transform hover:scale-110 hover:bg-green-600 hover:text-white rounded-full flex items-center justify-center w-12 h-12`}
                      onClick={handleThinking}
                      title={`Regénérer la réponse avec le mode réflexion`}
                    >
                      <MdPsychology className="text-2xl" />
                    </div>
                    <div
                      className={`cursor-pointer text-gray-500 transition-colors transition-transform transform hover:scale-110 hover:bg-purple-600 hover:text-white rounded-full flex items-center justify-center w-12 h-12`}
                      onClick={handleRefreshAnswer}
                      title={`Regénérer la réponse avec le mode standard`}
                    >
                      <MdAutorenew className="text-2xl" />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}