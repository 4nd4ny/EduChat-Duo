import React from 'react';
import ChatMessage from './ChatMessage';

type Props = {
  leftMessage: any;   // Claude (Anthropic)
  rightMessage: any;  // ChatGPT (OpenAI)
  messageIndex: number;
};

// Affiche deux messages assistant côte à côte
export default function ChatMessageDual({ leftMessage, rightMessage, messageIndex }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Left (Anthropic) message */}
      <div className="border border-white/10 rounded-md p-2 min-h-[4rem]">
        {leftMessage ? (
          <ChatMessage
            message={leftMessage}
            isInitialUserMessage={messageIndex === 0}
            isLastAssistantMessage={messageIndex === undefined ? false : true}
            messageIndex={messageIndex}
          />
        ) : (
          <div className="text-gray-500 italic">—</div>
        )}
      </div>
      {/* Right (OpenAI) message */}
      <div className="border border-white/10 rounded-md p-2 min-h-[4rem]">
        {rightMessage ? (
          <ChatMessage
            message={rightMessage}
            isInitialUserMessage={messageIndex === 0}
            isLastAssistantMessage={messageIndex === undefined ? false : true}
            messageIndex={messageIndex}
          />
        ) : (
          <div className="text-gray-500 italic">—</div>
        )}
      </div>
    </div>
  );
}
