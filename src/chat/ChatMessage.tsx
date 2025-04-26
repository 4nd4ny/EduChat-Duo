import React, { useState } from "react";
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
    lastModel,
    regenerateMessage,
    replaceMessages,
    deleteMessagesFromIndex,
    openaiMessages,
    anthropicMessages,
    loading
  } = useAIProvider();
  
  
  // Détermine le provider en fonction du modèle lorsqu'on est en mode dual
  const providerFromModel = isOpenAIModel(model) ? 'openai' : 'anthropic';

  // Plus de fonction getActiveProvider : la logique est gérée via AIProviderManager
  const getActiveProviderName = () => {
    if (currentActiveProvider === 'both') {
      // En mode dual, montrer quel provider est utilisé pour ce message
      return providerFromModel === 'openai' ? 'ChatGPT' : 'Claude';
    }
    return currentActiveProvider === 'openai' ? 'ChatGPT' : 'Claude';
  };

  const handleCopy = () => {
    const textContent = typeof content === 'string' ? content : content.reply;
    navigator.clipboard.writeText(textContent);
    setShowCopiedMessage(true);
    setTimeout(() => setShowCopiedMessage(false), 2000);
  };
  

  const handleThinking = () => {
    if (loading) return;
    setShowThinkingMessage(true);
    
    // Déterminer le provider cible (openai / anthropic)
    const targetProvider: 'openai' | 'anthropic' =
      currentActiveProvider === 'both' ? providerFromModel as 'openai' | 'anthropic' : currentActiveProvider;

    const providerMessages = targetProvider === 'openai' ? openaiMessages : anthropicMessages;

    // Trouver le dernier message de l'utilisateur
    let lastUserIndex = providerMessages.length - 1;
    while (lastUserIndex >= 0 && providerMessages[lastUserIndex].role !== 'user') {
      lastUserIndex--;
    }
    
    if (lastUserIndex < 0) {
      // Aucun message utilisateur trouvé
      setShowThinkingMessage(false);
      return;
    }
    
    // Récupérer les messages jusqu'au dernier message utilisateur
    const relevantMessages = providerMessages.slice(0, lastUserIndex + 1);
    
    // Déterminer le modèle à utiliser
    let nextModel = '';
    
    // Si on est en mode dual, utiliser le lastModel pour décider du modèle
    if (currentActiveProvider === 'both') {
      if (lastModel === 'openai' || (lastModel === 'both' && providerFromModel === 'openai')) {
        // Alterner entre o4-mini et o3 pour OpenAI
        const assistantMsgs = openaiMessages.filter(m => m.role === 'assistant');
        nextModel = assistantMsgs.length > 0 && assistantMsgs[assistantMsgs.length - 1].model === 'o4-mini'
          ? 'o3'
          : 'o4-mini';
      } else {
        // Utiliser Claude
        nextModel = 'claude-3-7-sonnet-latest';
      }
    } else if (currentActiveProvider === 'openai') {
      // Alterner entre o4-mini et o3 pour OpenAI
      const assistantMsgs = openaiMessages.filter(m => m.role === 'assistant');
      nextModel = assistantMsgs.length > 0 && assistantMsgs[assistantMsgs.length - 1].model === 'o4-mini'
        ? 'o3'
        : 'o4-mini';
    } else {
      // Utiliser Claude
      nextModel = 'claude-3-7-sonnet-latest';
    }
    
    // Régénérer le message avec le provider actif en mode thinking
    regenerateMessage(
      targetProvider,
      relevantMessages,
      (reply: string) => {
        const newMsgs = [
          ...providerMessages.slice(0, lastUserIndex + 1),
          {
            id: lastUserIndex + 1,
            role: 'assistant',
            content: reply,
            model: nextModel + (nextModel.startsWith('claude') ? '-thinking' : '')
          }
        ];
        replaceMessages(targetProvider, newMsgs);
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

  const handleRefreshAnswer = () => {
    if (loading) return;
    
    setShowSwitchMessage(true);
    
    // Déterminer le provider à utiliser en fonction du contexte
    const targetProvider: 'openai' | 'anthropic' =
      currentActiveProvider === 'both' ? providerFromModel as 'openai' | 'anthropic' : currentActiveProvider;
    
    // Déterminer le modèle à utiliser en fonction du provider
    let currentModel = '';
    
    // Si on est en mode dual, utiliser le lastModel pour décider du modèle
    if (currentActiveProvider === 'both') {
      if (lastModel === 'openai' || (lastModel === 'both' && providerFromModel === 'openai')) {
        currentModel = 'gpt-4.1';
      } else {
        currentModel = 'claude-3-7-sonnet-latest';
      }
    } else {
      currentModel = currentActiveProvider === 'openai' ? 'gpt-4.1' : 'claude-3-7-sonnet-latest';
    }

    // Trouver le dernier message de l'utilisateur
    const providerMessages = targetProvider === 'openai' ? openaiMessages : anthropicMessages;

    let lastUserIndex = providerMessages.length - 1;
    while (lastUserIndex >= 0 && providerMessages[lastUserIndex].role !== 'user') {
      lastUserIndex--;
    }
    
    if (lastUserIndex < 0) {
      // Aucun message utilisateur trouvé
      setShowSwitchMessage(false);
      return;
    }
    
    // Récupérer les messages jusqu'au dernier message utilisateur
    const relevantMessages = providerMessages.slice(0, lastUserIndex + 1);

    regenerateMessage(
      targetProvider,
      relevantMessages,
      (reply: string) => {
        const newMsgs = [
          ...providerMessages.slice(0, lastUserIndex + 1),
          {
            id: lastUserIndex + 1,
            role: 'assistant',
            content: reply,
            model: currentModel
          }
        ];
        replaceMessages(targetProvider, newMsgs);
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
      const targetProvider: 'openai' | 'anthropic' =
        currentActiveProvider === 'both' ? providerFromModel as 'openai' | 'anthropic' : currentActiveProvider;

      deleteMessagesFromIndex(targetProvider, messageIndex);
      
      // Remettre le focus sur le champ d'input
      const inputField = document.querySelector('textarea[name="query"]') as HTMLTextAreaElement;
      if (inputField) inputField.focus();
    }, 1000);
  };

  const formatModelName = (model: string): string => {
    if (!model) return 'UNKNOWN MODEL';
    
    // Si le mode est 'both', vérifier si les réponses sont identiques
    if (model === 'both') {
      return lastModel === 'both' 
        ? 'IDENTICAL RESPONSES FROM BOTH MODELS'
        : `${lastModel.toUpperCase()} (DUAL MODE)`;
    }
    
    // Afficher le mode thinking si présent
    if (model && model.includes('thinking')) {
      return model.toUpperCase().replace(/-LATEST$/i, '').replace(/-THINKING$/i, ' (THINKING)');
    }
    
    // Format standard
    return model ? model.toUpperCase().replace(/-LATEST$/i, '') : '';
  };

  // Dans le rendu, modifier pour gérer les messages unifiés :
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
