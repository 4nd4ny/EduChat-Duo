import ChatMessages from "../../chat/ChatMessages";
import { useRouter } from "next/router";
import React, { useEffect } from "react";
import { getConversation } from "../../context/History";
import { useAnthropic } from "../../context/AnthropicProvider";
import { useOpenAI } from "../../context/OpenAIProvider";
import { useAIProvider } from "../../context/AIProviderManager";

export default function Chat() {
  const router = useRouter();
  const { id } = router.query;
  const { loadConversation: loadAnthropicConversation, conversationId: anthropicConversationId } = useAnthropic();
  const { loadConversation: loadOpenAIConversation, conversationId: openAIConversationId } = useOpenAI();
  const { activeProvider, setActiveProvider, lockProvider, unlockProvider, isAnthropicModel, isOpenAIModel } = useAIProvider();

  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    
    if (typeof window !== "undefined") {
      // Récupérer la conversation depuis le stockage local
      const conversation = getConversation(id);

      // S'il n'y a pas de conversation, rediriger vers la page d'accueil
      if (!conversation) {
        router.push("/");
      } 
      // Si la conversation n'est pas déjà chargée, la charger dans les deux providers
      else if (anthropicConversationId !== id || openAIConversationId !== id) {
        // Charger la conversation dans les deux providers pour maintenir la cohérence
        loadAnthropicConversation(id, conversation);
        loadOpenAIConversation(id, conversation);
      }
    }
  }, [id, router, anthropicConversationId, openAIConversationId, loadAnthropicConversation, loadOpenAIConversation]);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    const convId = id as string;
    const conversation = getConversation(convId);
    if (!conversation) return;

    // Trouver le premier message assistant pour déterminer le modèle utilisé
    const firstAssistant = conversation.messages.find(m => m.role === 'assistant');
    
    // Si aucun message assistant n'existe encore, NE PAS verrouiller le sélecteur
    // Cela permet à l'utilisateur de choisir le mode dual avant d'envoyer un message
    if (!firstAssistant || !firstAssistant.model) {
      // Déverrouiller pour permettre la sélection libre
      unlockProvider();
      return;
    }

    // Déterminer le provider basé sur le modèle
    const hasAnthropic = isAnthropicModel(firstAssistant.model);
    const hasOpenai = isOpenAIModel(firstAssistant.model);
    
    let provider: 'anthropic' | 'openai' | 'both' = 'anthropic'; // Par défaut anthropic
    if (hasAnthropic && hasOpenai) {
      provider = 'both';
    } else if (hasOpenai) {
      provider = 'openai';
    }
    
    // Ne verrouiller que si la conversation a déjà des messages d'assistant
    unlockProvider();
    setActiveProvider(provider);
    
    // Uniquement verrouiller si la conversation contient déjà des réponses d'assistant
    if (firstAssistant) {
      lockProvider();
    }
    
    // Mettre à jour l'affichage du modèle actif
    setTimeout(() => {
      const event = new CustomEvent('activeProviderChanged', { detail: { provider } });
      document.dispatchEvent(event);
    }, 100);
    
  }, [id, unlockProvider, setActiveProvider, lockProvider, isAnthropicModel, isOpenAIModel]);

  // Déterminer le titre de la page
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Mettre à jour le titre de la page pour indiquer le modèle actif
      const modelName = activeProvider === 'openai' ? 'ChatGPT' : 'Claude';
      document.title = `EduChat - ${modelName}`;
    }
  }, [activeProvider]);

  return (
    <React.Fragment>
      <div className="max-w-screen relative h-screen max-h-screen w-screen overflow-hidden">
        <ChatMessages />
      </div>
    </React.Fragment>
  );
}