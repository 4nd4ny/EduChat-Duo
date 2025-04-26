import ChatMessages from "../../chat/ChatMessages";
import ChatErrorHolder from "../../chat/ChatErrorHolder";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { getConversation } from "../../context/History";
import { useAnthropic } from "../../context/AnthropicProvider";
import { useOpenAI } from "../../context/OpenAIProvider";
import { useAIProvider } from "../../context/AIProviderManager";

export default function Chat() {
  const [importError, setImportError] = useState<string | null>(null);
  const router = useRouter();
  const { id } = router.query;
  const { loadConversation: loadAnthropicConversation, conversationId: anthropicConversationId } = useAnthropic();
  const { loadConversation: loadOpenAIConversation, conversationId: openAIConversationId } = useOpenAI();
  const { activeProvider, setActiveProvider } = useAIProvider();
  const [loading, setLoading] = useState(false); // Définir l'état de chargement

  // Effet principal optimisé pour initialiser la conversation
  useEffect(() => {
    // Reset error on id change
    setImportError(null);
    if (!id || typeof id !== 'string') return;
    
    // Indiquer qu'un chargement est en cours
    setLoading(true);
    
    // Ajouter un délai pour laisser le temps à l'analyse du lastProvider ???

       const conversation = getConversation(id as string);
      if (!conversation) {
        console.log(`[id].tsx: Conversation ${id} non trouvée, redirection...`);
        router.push("/");
        return;
      }

      // Vérifier s'il s'agit d'une importation (flag meta, ou champ importError dans conversation)
      if (conversation.importError) {
        setImportError(conversation.importError);
      }
      
      // Déterminer le provider avec priorité claire
      const provider = conversation.lastProvider || activeProvider;
      console.log(`[id].tsx: Conversation ${id} a provider=${provider}, current=${activeProvider}`);
      
      // Toujours mettre à jour le provider de façon synchrone
      if (provider !== activeProvider) {
        console.log(`[id].tsx: Mise à jour de provider ${activeProvider} -> ${provider}`);
        setActiveProvider(provider as 'anthropic' | 'openai' | 'both');
      }
      
      // S'assurer que la conversation est chargée dans les deux providers
      if (anthropicConversationId !== id) {
        console.log(`[id].tsx: Chargement Anthropic conversation ${id}`);
        loadAnthropicConversation(id, conversation);
      }
      
      if (openAIConversationId !== id) {
        console.log(`[id].tsx: Chargement OpenAI conversation ${id}`);
        loadOpenAIConversation(id, conversation);
      }
      
      // Mise à jour du titre immédiate
      let modelName = 'EduChat';
      if (provider === 'openai') {
        modelName = 'ChatGPT';
      } else if (provider === 'anthropic') {
        modelName = 'Claude';
      } else {
        modelName = 'Dual Mode';
      }
      
      // Terminé le chargement
      setLoading(false); 
  }, [id, activeProvider, anthropicConversationId, openAIConversationId, 
      loadAnthropicConversation, loadOpenAIConversation, router, setActiveProvider]);

  return (
    <React.Fragment>
      <div className="max-w-screen relative h-screen max-h-screen w-screen overflow-hidden">
        {loading ? (
          <div className="flex h-full w-full items-center justify-center">
            <p className="text-primary">Chargement de la conversation...</p>
          </div>
        ) : (
          <>
            <ChatErrorHolder error={importError} onClose={() => setImportError(null)} />
            <ChatMessages />
          </>
        )}
      </div>
    </React.Fragment>
  );
}