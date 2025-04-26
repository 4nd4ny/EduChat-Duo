import React from "react";
import { getHistory, storeConversation } from "../context/History";
import { useAIProvider } from "../context/AIProviderManager";
import { useOpenAI } from "../context/OpenAIProvider";
import { useAnthropic } from "../context/AnthropicProvider";
import Conversation from "./Conversation";

type Props = {};

export default function Conversations({}: Props) {
  const openai = useOpenAI();
  const anthropic = useAnthropic();
  const { activeProvider } = useAIProvider();
  // Persistent pinned conversation keys
  const DUAL_KEY = 'dualConversationId';
  const OPENAI_KEY = 'soloOpenAIConversationId';
  const ANTHROPIC_KEY = 'soloAnthropicConversationId';
  // Initialize history from storage
  const [history, setHistory] = React.useState(() => getHistory());
  // Ensure pinned conversations exist
  React.useEffect(() => {
    // Only on client
    if (typeof window === 'undefined') return;
    const ensure = (key: string, defaultName: string) => {
      let id = localStorage.getItem(key) || '';
      const existing = history[id];
      if (!id || !existing) {
        const conv: any = {
          name: defaultName,
          createdAt: Date.now(),
          lastMessage: Date.now(),
          messages: [],
          mode: key === DUAL_KEY ? 'both' : key === OPENAI_KEY ? 'openai' : 'anthropic',
        };
        const newId = storeConversation(id, conv);
        localStorage.setItem(key, newId);
        // Update history map
        setHistory(getHistory());
      }
    };
  }, [openai, anthropic]);
  // Listen for external history updates (e.g., deletion) to refresh list
  React.useEffect(() => {
    const onHistoryUpdated = () => setHistory(getHistory());
    if (typeof window !== 'undefined') {
      window.addEventListener('historyUpdated', onHistoryUpdated);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('historyUpdated', onHistoryUpdated);
      }
    };
  }, []);
  // Get pinned IDs
  const dualId = localStorage.getItem(DUAL_KEY) || '';
  const openaiId = localStorage.getItem(OPENAI_KEY) || '';
  const anthroId = localStorage.getItem(ANTHROPIC_KEY) || '';
  // Determine active conversation ID
  let activeId: string;
  if (activeProvider === 'openai') {
    activeId = openai.conversationId;
  } else if (activeProvider === 'anthropic') {
    activeId = anthropic.conversationId;
  } else {
    // Dual mode: use current OpenAI conversationId (same as Anthropic)
    activeId = openai.conversationId || anthropic.conversationId || dualId;
  }
  // Build ordered list: pinned then others
  const talks = Object.entries(history)
    .sort(([, a], [, b]) => b.createdAt - a.createdAt);
  return (
    <div className="flex-1 overflow-y-auto py-2 scrollbar-none">
      <div className="flex flex-col gap-y-2">
        {talks.map(([key, conv]) => (
          <Conversation
            key={key}
            id={key}
            conversation={conv}
            active={key === activeId}
          />
        ))}
      </div>
    </div>
  );
}
