import {
  Conversation,
  getHistory,
  getConversation,
  clearHistory,
  History,
  deleteConversationFromHistory,
  updateConversation,
} from "./History";
import { OpenAIChatModels } from "./OpenAI/OpenAI.constants";
import { OpenAIChatMessage,
  ProviderSubmitFunction,
} from "./OpenAI/OpenAI.types";
import {
  OpenAIApiKey,
} from "../utils/env"
import React, { 
  PropsWithChildren,
  useCallback, 
  useEffect,
} from "react";
import { useAIProvider } from "./AIProviderManager";
import { useRouter } from "next/router";

const CHAT_ROUTE = "/";

const defaultContext = {
  loading: false,
  messages: [] as OpenAIChatMessage[],
  setMessages: (() => {}) as React.Dispatch<React.SetStateAction<OpenAIChatMessage[]>>,
  submit: (() => {}) as (messages_?: OpenAIChatMessage[], modelIndex?: number) => Promise<void>,
  regenerateMessage: () => {},
  addMessage: () => {},
  updateMessageContent: () => {},
  removeMessage: () => {},
  toggleMessageRole: () => {},
  conversationId: "",
  conversationName: "",
  updateConversationName: () => {},
  generateTitle: () => {},
  importConversation: () => {},
  loadConversation: () => {},
  resetConversation: () => {},
  deleteConversation: () => {},
  deleteMessagesFromIndex: () => {},
  clearConversation: () => {},
  conversations: {} as History,
  clearConversations: () => {},
  error: "",
};

const OpenAIContext = React.createContext<{
  loading: boolean;

  messages: OpenAIChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<OpenAIChatMessage[]>>;
  submit: (messages_?: OpenAIChatMessage[], modelIndex?: number) => Promise<void>;
  regenerateMessage: (messages?: OpenAIChatMessage[], onSuccess?: (reply: string) => void, modelOverride?: string, useThinking?: boolean) => void; // Updated
  addMessage: (
    content?: string,
    submit?: boolean,
    role?: "user" | "assistant",
    executiveModel?: string,
  ) => void;
  updateMessageContent: (id: number, content: string) => void;
  removeMessage: (id: number) => void;
  toggleMessageRole: (id: number) => void;

  conversationId: string;
  conversationName: string;
  updateConversationName: (id: string, name: string) => void;
  generateTitle: () => void;

  loadConversation: (id: string, conversation: Conversation) => void;
  importConversation: (jsonData: any) => void;
  resetConversation: (idParam?: string) => void; 
  deleteConversation: (id: string) => void;
  deleteMessagesFromIndex: (index: number) => void;
  clearConversation: () => void;
  conversations: History;
  clearConversations: () => void;

  error: string;
}>(defaultContext);

export default function OpenAIProvider({ children }: PropsWithChildren) {
  
  // General
  const router = useRouter(); 
  const [loading, setLoading] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  // Model
  const modelList = Object.keys(OpenAIChatModels);

  // Messages
  const [messages, setMessages] = React.useState<OpenAIChatMessage[]>([]);
  
  // Fonction updateTokenCount pour mettre à jour le total de tokens :
  const updateTotalTokens = (newTotal: number) => {
    localStorage.setItem('totalTokens', newTotal.toString());
    // Créez un événement personnalisé
    const event = new Event('totalTokensUpdated');
    window.dispatchEvent(event);
  };
  function updateTokenCount(tokenUsage: number) {
    const storedTokens = localStorage.getItem('totalTokens');
    const previousTokenTotal = storedTokens ? parseInt(storedTokens, 10) : 0;
    const totalTokens = previousTokenTotal + tokenUsage;
    updateTotalTokens(totalTokens);
  }
  function estimateFrenchTokens(text: string) {
    // 1 token = 3,5 caractères (à la louche pour le français...) mais c'est plus compliqué que ça 
    const wordCount = text.split(/\s+/).length;  // Nombre de mots (séparés par espace)
    const charCount = text.length;  // Nombre total de caractères, y compris non-lettres
    const estimatedTokens = (0.75 * wordCount) + (charCount / 4);  // Formule approximative
    return Math.ceil(estimatedTokens);
  }
  function updateInputTokens(text: string) {
    /*
      // Use tiktoken to better count tokens
      const { encoding_for_model } = require("tiktoken");
      async function countTokens(text, model = "gpt-3.5-turbo") {
        const encoder = await encoding_for_model(model); // Chargement de l'encodeur basé sur le modèle
        const tokens = encoder.encode(text); // Tokenisation du texte
        return tokens.length;
      }
    */
    updateTokenCount(estimateFrenchTokens(text)); 
  }
  
  const submit: ProviderSubmitFunction = useCallback(
    async (messages_: OpenAIChatMessage[] = [], modelIndex: number = 0) => {
      
      if (loading) return; // Si déjà en cours, on ne fait rien
      setLoading(true); // Verrouille le bouton submit

      const messagesToSend = messages_?.length ? messages_ : messages || [];

      const currentModel = modelList[0]; // Modèle par défaut ou selon l'index
        
      try {
        // Sélection du modèle actuel en fonction de l'index
        const maximum = OpenAIChatModels[currentModel].maxLimit;
        
        let requestBody = {
          max_completion_tokens: maximum,
          model: currentModel,
          messages: messagesToSend.map(({ role, content }) => ({ 
            role, 
            content: typeof content === 'string' ? content : content.reply 
          })),
        };
        updateInputTokens(JSON.stringify(requestBody.messages));

        const response = await fetch("/api/completion", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OpenAIApiKey}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || "Failed to fetch response, check your API key and try again.");
        }
  
        const { reply, tokenUsage } = await response.json(); // Lecture du contenu JSON
        updateTokenCount(tokenUsage);

        const message: OpenAIChatMessage = {
          id: messagesToSend.length,
          role: 'assistant',
          content: reply, 
          model: currentModel,
        };

        setMessages((prev) => [...prev, message]);
        
      } catch (error: any) {
        console.error("Error in submit:", error);
        setMessages((prev) => [
          ...(prev || []),
          { 
            id: (prev || []).length, 
            role: 'assistant', 
            content: error.message || "An error occurred", 
            model: currentModel 
          },
        ]);
      }

      setLoading(false); // Déverrouille le bouton submit
    },
    [messages, loading, modelList]
  );

  // Fonction modifiée pour prendre en charge le mode thinking
  const regenerateMessage = useCallback(async (
    messages: OpenAIChatMessage[] = [], 
    onSuccess?: (reply: string) => void,
    modelOverride?: string,
    useThinking: boolean = false
  ) => {
    if (loading || messages.length === 0) return;
    setLoading(true);

    try {
      const currentModel = modelOverride || modelList[1];
      const maximum = OpenAIChatModels[currentModel]?.maxLimit || 32768;
      
      let requestBody: any = {
        max_completion_tokens: maximum,
        model: currentModel,
        messages: messages.map(({ role, content }) => ({ 
          role, 
          content: typeof content === 'string' ? content : content.reply 
        })),
      };

      // Ajouter des instructions spéciales pour le mode thinking si demandé
      if (useThinking) {
        // Ajouter un message système pour demander une réflexion approfondie
        requestBody.messages.unshift({
          role: "system",
          content: "Lorsque tu réponds, je voudrais que tu utilises une approche de réflexion étape par étape. Pense au problème en détail, en décomposant ton raisonnement et en explorant plusieurs angles avant de formuler ta réponse finale. Commence ta réponse par '# Réflexion' puis détaille ton processus de pensée avant de conclure avec ta réponse finale."
        });
      }

      updateInputTokens(JSON.stringify(requestBody.messages));

      const response = await fetch("/api/completion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OpenAIApiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch response");
      }

      const { reply, tokenUsage } = await response.json();
      updateTokenCount(tokenUsage);
      
      if (onSuccess) {
        onSuccess(reply);
      }
    } catch (error) {
      console.error("Error in regenerateMessage:", error);
    } finally {
      setLoading(false);
    }
  }, [loading, modelList]);

  const addMessage = useCallback(
    (
      content: string = "",
      newPrompt: boolean = true,
      role: "user" | "assistant" = "user",
      executiveModel?: string
    ) => {
      setMessages((prev) => {
        const prevMessages = prev || [];
        const newMessages = [
          ...prevMessages,
          {
            id: prevMessages.length,
            role,
            content: content || "",
            model: executiveModel,
          } as OpenAIChatMessage,
        ];
        if (newPrompt) {
          submit(newMessages);
        }
        return newMessages;
      });
    },
    [submit]
  );

  const updateMessageContent = (id: number, content: string) => {
    setMessages((prev) => {
      const prevMessages = prev || [];
      const index = prevMessages.findIndex((message) => message.id === id);
      if (index === -1) return prevMessages;
      const message = prevMessages[index];
      return [
        ...prevMessages.slice(0, index),
        {
          ...message,
          content,
        },
        ...prevMessages.slice(index + 1),
      ];
    });
  };

  const removeMessage = (id: number) => {
    setMessages((prev) => {
      const prevMessages = prev || [];
      return [...prevMessages.filter((message) => message.id !== id)];
    });
  };

  // Roles
  const toggleMessageRole = (id: number) => {
    setMessages((prev) => {
      const prevMessages = prev || [];
      const index = prevMessages.findIndex((message) => message.id === id);
      if (index === -1) return prevMessages;
      const message = prevMessages[index];
      return [
        ...prevMessages.slice(0, index),
        {
          ...message,
          role: message.role === "user" ? "assistant" : "user",
        },
        ...prevMessages.slice(index + 1),
      ];
    });
  };

  // Conversation 
  const [conversationId, setConversationId] = React.useState<string>("");
  // Initial placeholder for conversation title to trigger generateTitle effect
  const [conversationName, setConversationName] = React.useState<string>("");
  const updateConversationName = (id: string, name: string) => {
    setConversations((prev) => {
      const conversation = prev[id];
      if (!conversation) return prev;
      return {
        ...prev,
        [id]: {
          ...conversation,
          name,
        },
      };
    });
    if (id === conversationId) setConversationName(name);
    // Update history and set disableAutoTitle flag
    updateConversation(id, { name, disableAutoTitle: true });
  };

  // Persist current conversation including dual mode
  const { activeProvider, onStoreConversation, lastProvider } = useAIProvider();

  const handleStoreConversation = useCallback(() => {

    if (isLoading) return;
    // Vérifier si messages existe et n'est pas vide
    if (!messages?.length) return;
  
    // Merge with existing history to preserve other provider's messages
    const existing = getConversation(conversationId) || {} as Conversation;
    const conversationObj: Conversation = {
      // Conversation metadata
      name: existing.name ?? conversationName,
      disableAutoTitle: existing.disableAutoTitle ?? false,
      lastProvider: lastProvider,
      // Timestamps
      createdAt: existing.createdAt ?? Date.now(),
      lastMessage: Date.now(),
      // Message history per provider
      anthropicMessages: existing.anthropicMessages || [],
      openaiMessages: messages,
    };

  // Utiliser l'ID existant ou en générer un nouveau
  let idParam = conversationId;
  const isNew = !idParam;
  
  // Si nouvelle conversation et en dual mode ou OpenAI mode, utiliser pendingConversationId s'il existe
  if (isNew && typeof window !== 'undefined') {
    const pending = localStorage.getItem('pendingConversationId');
    if (pending) {
      idParam = pending;
      localStorage.removeItem('pendingConversationId');
    }
  }
  
  // Stocker la conversation avec l'ID déterminé
  const id = onStoreConversation(idParam, conversationObj);
  
  // Si nouvelle conversation, définir pendingConversationId pour l'autre provider
  if (isNew && (activeProvider === 'openai' || activeProvider === 'both') && typeof window !== 'undefined') {
    localStorage.setItem('pendingConversationId', id);
  }
  
  setConversationId(id);
  setConversations((prev) => ({ ...prev, [id]: conversationObj }));

  // Navigation
  if (router.pathname === CHAT_ROUTE && (activeProvider === 'openai' || activeProvider === 'both')) {
    router.push(`/chat/${id}`);
  }
}, [conversationId, messages, conversationName, router.pathname, activeProvider, lastProvider, onStoreConversation]);

  useEffect(() => {
    handleStoreConversation();
  }, [messages, handleStoreConversation]);

  const loadConversation = (id: string, conversation: Conversation) => {
    setIsLoading(true);
    setConversationId(id);
    setMessages(conversation.openaiMessages || []);
    setConversationName(conversation.name);
    // Utiliser un effet différé pour réactiver la persistance
    setTimeout(() => setIsLoading(false), 200);
  };

  // Load conversation when the URL path changes to /chat/:id
  React.useEffect(() => {
    const path = router.asPath;
    if (!path.startsWith('/chat/')) return;
    const idParam = path.split('/chat/')[1]?.split(/[/?#]/)[0];
    if (idParam && idParam !== conversationId) {
      const conv = getConversation(idParam);
      if (conv) loadConversation(idParam, conv);
    }
  }, [router.asPath, conversationId, loadConversation]);

  // Fonctions auxiliaires

  function isValidConversationStructure(data: any): boolean {
    return (
      typeof data === 'object' &&
      typeof data.name === 'string' &&
      Array.isArray(data.messages) &&
      data.messages.every((msg: any) =>
        typeof msg === 'object' &&
        (msg.role === 'assistant' || msg.role === 'user') &&
        (typeof msg.content === 'string' || (typeof msg.content === 'object' && typeof msg.content.reply === 'string'))
      )
    );
  }

  function isValidModel(model: any): model is keyof typeof OpenAIChatModels {
    return typeof model === 'string' && model in OpenAIChatModels;
  }
  
  const deleteMessagesFromIndex = useCallback((index: number) => {
    setMessages((prev) => {
      const prevMessages = prev || [];
      // Garde uniquement les messages jusqu'à l'index spécifié
      return prevMessages.slice(0, index);
    });
  }, []);  

  const resetConversation = useCallback((idParam?: string) => {
    // Create or reuse provided conversation ID
    const newId = idParam ?? Date.now().toString();

    setConversationId(newId);
    setMessages([]);

    // Créer une nouvelle conversation
    const newConversation: Conversation = {
      name: "...",
      disableAutoTitle: false,
      lastProvider: lastProvider,
      createdAt: Date.now(),
      lastMessage: Date.now(),
      openaiMessages: [],
      anthropicMessages: [],
    };

    // Mettre à jour l'historique des conversations
    setConversations(prev => ({
      ...prev,
      [newId]: newConversation
    }));

    // Stocker la nouvelle conversation
    onStoreConversation(newId, newConversation);

    // Rediriger vers la nouvelle conversation
    router.push(`/chat/${newId}`);
  }, [router, activeProvider, lastProvider, onStoreConversation]);

  const deleteConversation = (id: string) => {
    deleteConversationFromHistory(id);
    setConversations((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });

    if (id === conversationId) clearConversation();
  };

  const clearConversation = () => {
    setMessages([]);
    setConversationId("");
  };

  // Conversations
  const [conversations, setConversations] = React.useState<History>({} as History);
  
  const { registerOpenAIData } = useAIProvider();

  // Load conversation from local storage
  useEffect(() => {
    setConversations(getHistory());
  }, []);

useEffect(() => {
  // Déclencher un événement pour indiquer que les messages ont été mis à jour
  if (typeof window !== 'undefined' && messages.length > 0) {
    const event = new Event('messagesUpdated');
    document.dispatchEvent(event);
  }
}, [messages]);

  useEffect(() => {
    // Enregistrer les données pour la synchronisation
    registerOpenAIData({
      messages,
      conversationId,
      conversationName,
      setMessages,
      updateConversationName,
      addMessage,
      loading,
      regenerateMessage,
      deleteMessagesFromIndex,
    });
  // Mettre à jour l'enregistrement lorsque les messages ou la conversation changent
  }, [messages, conversationId, conversationName, loading]);

  const clearConversations = useCallback(() => {
    clearHistory();

    setMessages([]);
    setConversationId("");
    setConversations({});

    router.push("/");
  }, [router]);

  const [error] = React.useState("");

  const value = React.useMemo(
    () => ({
      loading,
      messages,
      setMessages,
      submit,
      regenerateMessage, 
      addMessage,
      updateMessageContent,
      removeMessage,
      toggleMessageRole,
      conversationId,
      conversationName,
      updateConversationName,
      generateTitle: () => {},
      loadConversation,
      importConversation: () => {},
      deleteConversation,
      deleteMessagesFromIndex,
      resetConversation,
      clearConversation,
      clearConversations,
      conversations,
      error,
    }),
    [
      loading,
      messages,
      setMessages,
      submit,
      regenerateMessage, 
      addMessage,
      conversationId,
      conversationName,
      registerOpenAIData,
      updateConversationName,
      deleteMessagesFromIndex,
      resetConversation,
      clearConversations,
      conversations,
      error,
    ]
  );

  return (
    <OpenAIContext.Provider value={value}>{children}</OpenAIContext.Provider>
  );
}

export const useOpenAI = () => React.useContext(OpenAIContext);