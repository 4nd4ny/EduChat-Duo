import React, { useEffect, useState } from "react";
import { wrapIcon } from "../utils/Icon";
import {
  MdPerson as RawMdPerson,
  MdContentCopy as RawMdContentCopy,
  MdAutorenew as RawMdAutorenew,
  MdDeleteSweep as RawMdDeleteSweep,
  MdPsychology as RawMdPsychology,
} from "react-icons/md";
import { BsRobot as RawBsRobot } from "react-icons/bs";
import { RiRobot2Line as RawRiRobot2Line } from "react-icons/ri";
import AssistantMessageContent from "./AssistantMessageContent";
import UserMessageContent from "./UserMessageContent";

// Wrapped icons to ensure valid ReactElement return types
const MdPerson = wrapIcon(RawMdPerson);
const MdContentCopy = wrapIcon(RawMdContentCopy);
const MdAutorenew = wrapIcon(RawMdAutorenew);
const MdDeleteSweep = wrapIcon(RawMdDeleteSweep);
const MdPsychology = wrapIcon(RawMdPsychology);
const BsRobot = wrapIcon(RawBsRobot);
const RiRobot2Line = wrapIcon(RawRiRobot2Line);
import { useAIProvider } from "../context/AIProviderManager";
import { useOpenAI } from "../context/OpenAIProvider";
import { useAnthropic } from "../context/AnthropicProvider";

type Props = {
  message: any;
  isInitialUserMessage: boolean;
  isLastAssistantMessage: boolean;
  messageIndex: number; 
  disableControls?: boolean;
};

export default function ChatMessage({ 
  message: { role, content, model }, 
  isInitialUserMessage, 
  isLastAssistantMessage,
  messageIndex,
  disableControls = false
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
  
  // Détermine le provider en fonction du modèle lorsqu'on est en mode dual
  const providerFromModel = isOpenAIModel(model) ? 'openai' : 'anthropic';

  // Helper pour récupérer le provider actif selon le contexte ou le modèle si mode 'both'
  const getActiveProvider = () => {
    if (currentActiveProvider === 'both') {
      return providerFromModel === 'openai' ? openai : anthropic;
    }
    return currentActiveProvider === 'openai' ? openai : anthropic;
  };

  const getAlternativeProvider = () => {
    if (currentActiveProvider === 'both') {
      return providerFromModel === 'openai' ? anthropic : openai;
    }
    return currentActiveProvider === 'openai' ? anthropic : openai;
  };

  const getActiveProviderName = () => {
    if (currentActiveProvider === 'both') {
      return providerFromModel === 'openai' ? 'ChatGPT' : 'Claude';
    }
    return currentActiveProvider === 'openai' ? 'ChatGPT' : 'Claude';
  };
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
  
  const handleThinking = () => {
    if (openai.loading || anthropic.loading) return;
    setShowThinkingMessage(true);
    const activeProviderContext = getActiveProvider();

    // Trouver le dernier message de l'utilisateur
    let lastUserIndex = activeProviderContext.messages.length - 1;
    while (lastUserIndex >= 0 && activeProviderContext.messages[lastUserIndex].role !== 'user') {
      lastUserIndex--;
    }
    
    if (lastUserIndex < 0) {
      // Aucun message utilisateur trouvé
      setShowThinkingMessage(false);
      return;
    }
    
    // Récupérer les messages jusqu'au dernier message utilisateur
    const relevantMessages = activeProviderContext.messages.slice(0, lastUserIndex + 1);
    
    // Choix du modèle
    let nextModel = providerFromModel === 'openai' ? 'o4-mini' : 'claude-3-7-sonnet-latest';
    if (providerFromModel === 'openai') {
      const assistantMsgs = openai.messages.filter(m => m.role === 'assistant');
      if (assistantMsgs.length > 0 && assistantMsgs[assistantMsgs.length - 1].model === 'o4-mini') {
        nextModel = 'o3';
      }
    }
    
    // Régénérer le message avec le provider actif
    activeProviderContext.regenerateMessage(
      relevantMessages,
      (reply) => {
        // Remplacer tous les messages après le dernier message utilisateur par cette nouvelle réponse
        activeProviderContext.setMessages(prev => [
          ...prev.slice(0, lastUserIndex + 1),
          {
            id: lastUserIndex + 1,
            role: 'assistant',
            content: reply,
            model: nextModel + (providerFromModel === 'anthropic' ? '-thinking' : '')
          }
        ]);
      },
      nextModel,
      true
    );
    
    setTimeout(() => setShowThinkingMessage(false), 1000);
    setTimeout(() => {
      const input = document.querySelector('textarea[name="query"]') as HTMLTextAreaElement;
      if (input) input.focus();
    }, 100);
  };

  // Fonction similaire pour handleRefreshAnswer
  const handleRefreshAnswer = () => {
    if (openai.loading || anthropic.loading) return;
    
    setShowSwitchMessage(true);
    
    // Trouver le dernier message de l'utilisateur
    const activeProvider = getActiveProvider();
    let currentModel = providerFromModel === 'openai' ? 'gpt-4.1' : 'claude-3-7-sonnet-latest';

    // Trouver le dernier message de l'utilisateur
    let lastUserIndex = activeProvider.messages.length - 1;
    while (lastUserIndex >= 0 && activeProvider.messages[lastUserIndex].role !== 'user') {
      lastUserIndex--;
    }
    
    if (lastUserIndex < 0) {
      // Aucun message utilisateur trouvé
      setShowSwitchMessage(false);
      return;
    }
    
    // Récupérer les messages jusqu'au dernier message utilisateur
    const relevantMessages = activeProvider.messages.slice(0, lastUserIndex + 1);
    
    // Régénérer une réponse avec la même provider
    activeProvider.regenerateMessage(
      relevantMessages, 
      (reply) => {
        // Remplacer tous les messages après le dernier message utilisateur
        activeProvider.setMessages(prev => [
          ...prev.slice(0, lastUserIndex + 1),
          {
            id: lastUserIndex + 1,
            role: 'assistant',
            content: reply,
            model: currentModel
          }
        ]);
      }, 
      currentModel,
      false
    );
    
    setTimeout(() => setShowSwitchMessage(false), 1000);
    
    setTimeout(() => {
      const inputField = document.querySelector('textarea[name="query"]') as HTMLTextAreaElement;
      if (inputField) inputField.focus();
    }, 100);
  };

  const handleDeleteFromHere = () => {
    setShowDeleteMessage(true);
    setTimeout(() => {
      setShowDeleteMessage(false);
      const activeCtx = getActiveProvider();
      activeCtx.deleteMessagesFromIndex(messageIndex);
      if (currentActiveProvider === 'both') {
        getAlternativeProvider().deleteMessagesFromIndex(messageIndex);
      }
      
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
          {role === "user" ? (
            <MdPerson />
          ) : (
            isOpenAIModel(model) ? <BsRobot /> : <RiRobot2Line />
          )}
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
                {isLastAssistantMessage && !disableControls && (
                  <>
                    <div
                      className={`cursor-pointer text-gray-500 transition-colors transition-transform transform hover:scale-110 hover:bg-[#ac1e44] hover:text-white rounded-full flex items-center justify-center w-12 h-12`}
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
