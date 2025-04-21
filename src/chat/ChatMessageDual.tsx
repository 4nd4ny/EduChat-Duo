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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 py-2">
      <div className="border border-white/10 rounded-md p-2">
        <ChatMessage
          message={leftMessage}
          isInitialUserMessage={false}
          isLastAssistantMessage={true}
          messageIndex={messageIndex}
        />
      </div>
      <div className="border border-white/10 rounded-md p-2">
        <ChatMessage
          message={rightMessage}
          isInitialUserMessage={false}
          isLastAssistantMessage={true}
          messageIndex={messageIndex}
        />
      </div>
    </div>
  );
}
