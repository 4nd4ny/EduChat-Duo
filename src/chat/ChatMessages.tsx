import React from 'react';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';
import ChatPlaceHolder from './ChatPlaceHolder';
import { useAIProvider } from '../context/AIProviderManager';
import { useOpenAI } from '../context/OpenAIProvider';
import { useAnthropic } from '../context/AnthropicProvider';

export default function ChatMessages() {
  const { activeProvider } = useAIProvider();
  const openai = useOpenAI();
  const anthropic = useAnthropic();

  const oMsgs = openai.messages ?? [];
  const aMsgs = anthropic.messages ?? [];

  // Petite utilité pour normaliser le content.
  const extractContent = (c: any) => (typeof c === 'string' ? c : c.reply);

  // Fusion de l’historique
  const buildMerged = () => {
    // Mono provider : pas de fusion complexe.
    if (activeProvider === 'openai') return oMsgs.map((m) => ({ ...m, provider: 'openai' }));
    if (activeProvider === 'anthropic') return aMsgs.map((m) => ({ ...m, provider: 'anthropic' }));

    // Mode dual.
    const merged: any[] = [];
    const maxLen = Math.max(oMsgs.length, aMsgs.length);

    for (let i = 0; i < maxLen; i++) {
      const o = oMsgs[i];
      const a = aMsgs[i];

      // Si l’une des deux listes n’a plus de messages
      if (o && !a) {
        merged.push({ ...o, provider: 'openai', unifiedResponse: false });
        continue;
      }
      if (a && !o) {
        merged.push({ ...a, provider: 'anthropic', unifiedResponse: false });
        continue;
      }

      // Les deux existent.
      if (o.role === 'user' && a.role === 'user') {
        merged.push({ ...o, provider: 'both', unifiedResponse: true });
        continue;
      }

      if (o.role === 'assistant' && a.role === 'assistant') {
        if (extractContent(o.content) === extractContent(a.content)) {
          merged.push({ ...o, provider: 'both', unifiedResponse: true });
        } else {
          merged.push({ ...a, provider: 'anthropic', unifiedResponse: false });
          merged.push({ ...o, provider: 'openai', unifiedResponse: false });
        }
        continue;
      }

      // Désynchronisation (rare) : on les ajoute tels quels
      if (a) merged.push({ ...a, provider: 'anthropic', unifiedResponse: false });
      if (o) merged.push({ ...o, provider: 'openai', unifiedResponse: false });
    }

    return merged;
  };

  const messages = React.useMemo(buildMerged, [activeProvider, oMsgs, aMsgs]);

  // Trouver le/les derniers messages assistant pour activer les contrôles
  let lastAssistantStart = -1;
  let lastAssistantEnd = -1;

  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') {
      if (messages[i].unifiedResponse) {
        lastAssistantStart = lastAssistantEnd = i;
      } else {
        // paire -> prendre l’index précédent aussi
        lastAssistantEnd = i;
        lastAssistantStart = i - 1 >= 0 ? i - 1 : i;
      }
      break;
    }
  }

  // Aucune conversation → placeholder + input
  if (messages.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-stretch md:pl-[320px] bg-tertiary">
        <div className="relative flex-1 overflow-auto border-b bg-tertiary pb-[10rem] ml-2 z-10">
          <ChatPlaceHolder />
        </div>
        <div className="p-2 border-t border-white/20 bg-tertiary z-10">
          <ChatInput />
        </div>
      </div>
    );
  }

  // Rendu
  const rows: JSX.Element[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    // Paire de réponses distinctes (unifiedResponse=false)
    if (
      msg.role === 'assistant' &&
      msg.unifiedResponse === false &&
      i + 1 < messages.length &&
      messages[i + 1].role === 'assistant'
    ) {
      const twin = messages[i + 1];

      const isLastPair = i >= lastAssistantStart && i <= lastAssistantEnd;

      rows.push(
        <div key={`pair-${i}`} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
          <ChatMessage
            message={msg}
            isInitialUserMessage={false}
            isLastAssistantMessage={isLastPair}
            disableControls={!isLastPair}
            messageIndex={i}
          />
          <ChatMessage
            message={twin}
            isInitialUserMessage={false}
            isLastAssistantMessage={isLastPair}
            disableControls={!isLastPair}
            messageIndex={i + 1}
          />
        </div>
      );
      i++; // skip twin already rendered
      continue;
    }

    // Message unique (user OU assistant unifié)
    const isLastAssistant = i === lastAssistantStart && msg.role === 'assistant';

    rows.push(
      <div key={`msg-${i}`} className="mb-2">
        <ChatMessage
          message={msg}
          isInitialUserMessage={msg.role === 'user'}
          isLastAssistantMessage={isLastAssistant}
          disableControls={!isLastAssistant}
          messageIndex={i}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-stretch md:pl-[320px] bg-tertiary">
      <div className="relative flex-1 overflow-auto border-b bg-tertiary pb-[10rem] ml-2 z-10">
        {rows}
      </div>
      <div className="p-2 border-t border-white/20 bg-tertiary z-10">
        <ChatInput />
      </div>
    </div>
  );
}
