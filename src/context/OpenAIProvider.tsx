import { v4 as uuidv4 } from "uuid";
import {
  Conversation,
  getHistory,
  clearHistory,
  storeConversation,
  History,
  deleteConversationFromHistory,
  updateConversation,
} from "./History";
import {
  OpenAIChatMessage,
  OpenAIChatModels, 
  ProviderSubmitFunction,
} from "../utils/OpenAI";
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
import { sanitizeString } from "../utils/sanitize";

const CHAT_ROUTE = "/";

const defaultContext = {
  loading: false,
  
  messages: [] as OpenAIChatMessage[],
  setMessages: (() => {}) as React.Dispatch<React.SetStateAction<OpenAIChatMessage[]>>,
  submit: (() => {}) as (messages_?: OpenAIChatMessage[], modelIndex?: number) => Promise<void>,
  regenerateMessage: (messages?: OpenAIChatMessage[], onSuccess?: (reply: string) => void, modelOverride?: string, useThinking?: boolean) => {}, // Updated
  addMessage: () => {},
  updateMessageContent: (id: number, content: string) => {},
  removeMessage: (id: number) => {},
  toggleMessageRole: (id: number) => {},

  conversationId: "",
  conversationName: "",
  updateConversationName: (id: string, name: string) => {},
  generateTitle: () => {},
  loadConversation: (id: string, conversation: Conversation) => {},
  importConversation: (jsonData: any) => {},
  resetConversation: () => {}, 
  deleteConversation: (id: string) => {}, 
  deleteMessagesFromIndex: (index: number) => {},
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
    role?: "user" | "assistant"
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
  resetConversation: () => void; 
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
      role: "user" | "assistant" = "user"
    ) => {
      setMessages((prev) => {
        const prevMessages = prev || [];
        const messages = [
          ...prevMessages,
          {
            id: prevMessages.length,
            role,
            content: content || "",
          } as OpenAIChatMessage,
        ];
        submit(messages);
        return messages;
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
  const [conversationName, setConversationName] = React.useState("");
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
    updateConversation(id, { name });
  };

  const handleStoreConversation = useCallback(() => {
  // Vérifier si messages existe et n'est pas vide
  if (!messages?.length) return;
  
    const conversation = {
      name: conversationName || "...",
      createdAt: Date.now(),
      lastMessage: Date.now(),
      messages,
    } as Conversation;

    let id = storeConversation(conversationId, conversation);
    setConversationId(id);
    setConversations((prev) => ({ ...prev, [id]: conversation }));

    if (router.pathname === CHAT_ROUTE) router.push(`/chat/${id}`);
  }, [conversationId, messages, conversationName, router.pathname]);

  useEffect(() => {
    handleStoreConversation();
  }, [messages, handleStoreConversation]);

  const generateTitle = useCallback(async () => {
    if (!messages?.length || !messages[0]?.content) {
      setConversationName("...");
      return;
    }
    // Éviter la récursion si on a déjà un nom
    if (conversationName && conversationName !== "...") {
      return;
    }

    const firstMessage = messages[0].content;
    const messageText = typeof firstMessage === 'string' ? firstMessage : firstMessage.reply;

    const titlePrompt = `Summarize the following text in three words, maintaining the language of the statement (usually french). Don't add any text at all to your answer (I need it to name a conversation via your API):
      <TEXT>
      ${messageText}
      </TEXT>`;

    updateInputTokens(titlePrompt);
    try {
      const response = await fetch('/api/completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OpenAIApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1',
          messages: [{
            role: "user",
            content: titlePrompt
          }],
          max_completion_tokens: 100
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { reply, tokenUsage } = await response.json(); // Lecture du contenu JSON  
      setConversationName(reply);
      updateConversationName(conversationId, reply);
      updateTokenCount(tokenUsage);

    } catch (error) {
      console.error("Error generating title:", error);
      setConversationName(messageText.slice(0, 30) + "...");
    }
  
  }, [conversationId, messages, conversationName, updateConversationName]);

  // Modifier également le useEffect pour éviter les appels inutiles :
  useEffect(() => {
    if (
      messages?.length === 1 && 
      messages[0]?.role === 'user' && 
      conversationName === "..."
    ) {
      generateTitle();
    }
  }, [messages, conversationName, generateTitle]);

  const loadConversation = (id: string, conversation: Conversation) => {
    setConversationId(id);
    const { messages, name } = conversation;
    setMessages(messages);
    setConversationName(name);
  };

  const importConversation = useCallback((jsonData: any) => {
    try {
      // 1. Validation stricte de la structure
      if (!isValidConversationStructure(jsonData)) {
        throw new Error("Invalid conversation structure");
      }

      // 2. Limiter la taille du JSON
      const jsonString = JSON.stringify(jsonData);
      if (jsonString.length > 1000000) { // Par exemple, limite à 1 Mo
        throw new Error("Imported conversation is too large");
      }

      // 3. Sanitisation des données
      /*
      const sanitizedConversation: Conversation = {
        name: jsonData.name, // Limiter à 100 caractères
        createdAt: Number(jsonData.createdAt) || Date.now(),
        lastMessage: Number(jsonData.lastMessage) || Date.now(),
        messages: jsonData.messages.map((msg: any, index: number) => ({
          id: index,
          role: msg.role === "assistant" || msg.role === "user" ? msg.role : "user",
          content: msg.content, // Limiter à 10000 caractères
          model: msg.model
        }))
      };
      */
      const sanitizedConversation: Conversation = {
        name: sanitizeString(jsonData.name, 100),
        createdAt: Number(jsonData.createdAt) || Date.now(),
        lastMessage: Number(jsonData.lastMessage) || Date.now(),
        messages: jsonData.messages.map((msg: any, index: number) => ({
          id: index,
          role: msg.role === "assistant" || msg.role === "user" ? msg.role : "user",
          content: typeof msg.content === 'string' 
            ? sanitizeString(msg.content, 10000) 
            : { 
                reply: sanitizeString(typeof msg.content.reply === 'string' ? msg.content.reply : '', 10000), 
                tokenUsage: Number(msg.content.tokenUsage) || 0 
              },
          model: msg.model
        }))
      };

      const newId = uuidv4();

      // Mettre à jour l'état local
      setConversations((prev: History) => ({
        ...prev,
        [newId]: sanitizedConversation
      }));

      // Stocker la nouvelle conversation
      storeConversation(newId, sanitizedConversation);

      // Charger la conversation importée
      loadConversation(newId, sanitizedConversation);

      // Rediriger vers la nouvelle conversation
      router.push(`/chat/${newId}`);

      console.log("Conversation imported successfully");
    } catch (error) {
      console.error("Error importing conversation:", error);
      // Notification à l'utilisateur
    }
  }, [router, loadConversation]);

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

  const resetConversation = useCallback(() => {
    const newId = Date.now().toString();

    setConversationId(newId);
    setConversationName("...");
    setMessages([]);

    // Créer une nouvelle conversation
    const newConversation: Conversation = {
      name: "...",
      createdAt: Date.now(),
      lastMessage: Date.now(),
      messages: [],
    };

    // Mettre à jour l'historique des conversations
    setConversations(prev => ({
      ...prev,
      [newId]: newConversation
    }));

    // Stocker la nouvelle conversation
    storeConversation(newId, newConversation);

    // Rediriger vers la nouvelle conversation
    router.push(`/chat/${newId}`);
  }, [router]);

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
    // Enregistrer les données pour la synchronisation
    registerOpenAIData({
      messages,
      conversationId,
      conversationName,
      setMessages,
      updateConversationName,
    });
  }, []);

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
      generateTitle,
      loadConversation,
      importConversation,
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
      importConversation,
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