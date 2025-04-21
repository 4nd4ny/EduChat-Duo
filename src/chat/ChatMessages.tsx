import React from "react";
import ChatInput from "./ChatInput";
import ChatMessage from "./ChatMessage";
import ChatPlaceholder from "./ChatPlaceholder";
import { useAIProvider } from "../context/AIProviderManager";
import { useOpenAI } from "../context/OpenAIProvider";
import { useAnthropic } from "../context/AnthropicProvider";

/**
 * ChatMessages component supports two modes:
 * - 'both': dual mode, pairs of messages (user full width, assistants side-by-side)
 * - simple: single column for active provider
 */
export default function ChatMessages() {
  const { activeProvider } = useAIProvider();
  const openai = useOpenAI();
  const anthropic = useAnthropic();

  // Dual mode: even index = user messages (full width), odd index = assistant responses side-by-side
  if (activeProvider === 'both') {
    const anthroMsgs = anthropic.messages;
    const openaiMsgs = openai.messages;
    return (
      <div className="flex h-full w-full flex-col items-stretch bg-tertiary md:pl-[320px]">
        <div
          className="relative flex-1 flex-col items-stretch overflow-auto border-b bg-tertiary pb-[10rem] scrollbar scrollbar-w-3 scrollbar-thumb-[rgb(var(--bg-primary))] scrollbar-track-[rgb(var(--bg-secondary))] scrollbar-thumb-rounded-full px-4 py-2"
        >
          {anthroMsgs.map((msg, idx) =>
            idx % 2 === 0 ? (
              // User message spans full width
              <div key={`user-${idx}`} className="mb-2">
                <ChatMessage
                  message={msg}
                  isInitialUserMessage={idx === 0}
                  isLastAssistantMessage={false}
                  messageIndex={idx}
                />
              </div>
            ) : (
              // Assistant messages side by side
              <div key={`assist-${idx}`} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                <ChatMessage
                  message={anthroMsgs[idx]}
                  isInitialUserMessage={false}
                  isLastAssistantMessage={idx === anthroMsgs.length - 1}
                  messageIndex={idx}
                />
                <ChatMessage
                  message={openaiMsgs[idx]}
                  isInitialUserMessage={false}
                  isLastAssistantMessage={idx === openaiMsgs.length - 1}
                  messageIndex={idx}
                />
              </div>
            )
          )}
        </div>
        {/* Shared input */}
        <div className="p-2 border-t border-white/20">
          <ChatInput />
        </div>
      </div>
    );
  }

  // Simple mode: single provider messages in one column
  const msgs = activeProvider === 'openai' ? openai.messages : anthropic.messages;
  return (
    <div className="flex h-full w-full flex-col items-stretch md:pl-[320px]">
      <div
        className="relative flex-1 flex-col items-stretch overflow-auto border-b bg-tertiary pb-[10rem] scrollbar scrollbar-w-3 scrollbar-thumb-[rgb(var(--bg-primary))] scrollbar-track-[rgb(var(--bg-secondary))] scrollbar-thumb-rounded-full px-4 py-2"
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
      <div className="p-2 border-t border-white/20">
        <ChatInput />
      </div>
    </div>
  );
}