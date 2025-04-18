import React from "react";
import { useAIProvider } from "../context/AIProviderManager";
import { useOpenAI } from "../context/OpenAIProvider";
import { useAnthropic } from "../context/AnthropicProvider";
import Conversation from "./Conversation";

type Props = {};

export default function Conversations({}: Props) {
  const { activeProvider } = useAIProvider();
  const openai = useOpenAI();
  const anthropic = useAnthropic();
  const { conversations, conversationId } =
    activeProvider === 'openai' ? openai : anthropic;
  return (
    <div className="flex-1 overflow-y-auto py-2 scrollbar-none">
      <div className="flex flex-col gap-y-2">
        { // Object.keys(conversations).reverse() // Inverser l'ordre des clés
          Object.entries(conversations) 
            .sort(([, a], [, b]) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map(([key, conversation]) => (
              <Conversation
                key={key} // key={key + conversations[key].name}
                id={key}
                conversation={conversation}
                active={key === conversationId}
              />
        ))}
      </div>
    </div>
  );
}
