import ChatMessages from "../../chat/ChatMessages";
import ChatSidebar from "../../chatSidebar/ChatSidebar";
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
  const { activeProvider } = useAIProvider();

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
        <ChatSidebar />
      </div>
    </React.Fragment>
  );
}