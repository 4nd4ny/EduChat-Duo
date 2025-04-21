import React from "react";
import ChatInput from "./ChatInput";
import ChatMessage from "./ChatMessage";
import ChatPlaceholder from "./ChatPlaceholder";
import { useAIProvider } from "../context/AIProviderManager";
import { useOpenAI } from "../context/OpenAIProvider";
import { useAnthropic } from "../context/AnthropicProvider";

/**
 * ChatMessages component supports two modes:
 * - 'both': dual mode, interleaved messages -> even indexes are user, odd are assistant
 * - simple: single column for active provider
 */
export default function ChatMessages() {
  const { activeProvider } = useAIProvider();
  const openai = useOpenAI();
  const anthropic = useAnthropic();

  // Dual mode: even index = user messages (full width), odd index = assistant responses side-by-side
  if (activeProvider === 'both') {
    const uMsgs = anthropic.messages;
    const gMsgs = openai.messages;
    const length = Math.max(uMsgs.length, gMsgs.length);
    return (
      <div className="flex h-full w-full flex-col items-stretch md:pl-[320px] bg-tertiary">
        <div
          className="relative flex-1 flex-col items-stretch overflow-auto border-b bg-tertiary pb-[10rem]
                     scrollbar scrollbar-w-3 scrollbar-thumb-[rgb(var(--bg-primary))]
                     scrollbar-track-[rgb(var(--bg-secondary))] scrollbar-thumb-rounded-full
                     px-4 py-2 z-10"
        >
          {Array.from({ length }).map((_, idx) =>
            // user message (even index)
            idx % 2 === 0 ? (
              <div key={`user-${idx}`} className="mb-2">
                <ChatMessage
                  message={uMsgs[idx] || gMsgs[idx]}
                  isInitialUserMessage={idx === 0}
                  isLastAssistantMessage={false}
                  messageIndex={idx}
                />
              </div>
            ) : (
              // assistant responses side by side
              <div key={`assist-${idx}`} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                {uMsgs[idx] && (
                  <ChatMessage
                    message={uMsgs[idx]}
                    isInitialUserMessage={false}
                    isLastAssistantMessage={idx === uMsgs.length - 1}
                    messageIndex={idx}
                  />
                )}
                {gMsgs[idx] && (
                  <ChatMessage
                    message={gMsgs[idx]}
                    isInitialUserMessage={false}
                    isLastAssistantMessage={idx === gMsgs.length - 1}
                    messageIndex={idx}
                  />
                )}
              </div>
            )
          )}
        </div>
        {/* Shared input */}
        <div className="p-2 border-t border-white/20 bg-tertiary z-10">
          <ChatInput />
        </div>
      </div>
    );
  }

  // Simple mode: single provider messages
  const msgs = activeProvider === 'openai' ? openai.messages : anthropic.messages;
  return (
    <div className="flex h-full w-full flex-col items-stretch md:pl-[320px] bg-tertiary">
      <div
        className="relative flex-1 flex-col items-stretch overflow-auto border-b bg-tertiary pb-[10rem]
                   scrollbar scrollbar-w-3 scrollbar-thumb-[rgb(var(--bg-primary))]
                   scrollbar-track-[rgb(var(--bg-secondary))] scrollbar-thumb-rounded-full
                   px-4 py-2 z-10"
      >
        {msgs.length === 0 ? (
          <ChatPlaceholder />
        ) : (
          msgs.map((message, idx) => (
            <div key={message.id ?? idx} className="mb-2">
              <ChatMessage
                message={message}
                isInitialUserMessage={idx === 0}
                isLastAssistantMessage={message.role === 'assistant' && idx === msgs.length - 1}
                messageIndex={idx}
              />
            </div>
          ))
        )}
      </div>
      <div className="p-2 border-t border-white/20 bg-tertiary z-10">
        <ChatInput />
      </div>
    </div>
  );
}