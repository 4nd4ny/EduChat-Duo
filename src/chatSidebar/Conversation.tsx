// import Link from "next/link";
import React, { useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useAIProvider } from "../context/AIProviderManager";
import { wrapIcon } from "../utils/Icon";
import {
  MdChatBubbleOutline as RawMdChatBubbleOutline,
  MdCheck as RawMdCheck,
  MdClear as RawMdClear,
  MdDelete as RawMdDelete,
  MdDownload as RawMdDownload,
  MdDriveFileRenameOutline as RawMdDriveFileRenameOutline,
  MdPerson as RawMdPerson,
} from "react-icons/md";
import { BsRobot as RawBsRobot } from "react-icons/bs";
import { RiRobot2Line as RawRiRobot2Line } from "react-icons/ri";
import { BiConversation as RawBiConversation } from "react-icons/bi";
import { Conversation as ConversationI } from "../context/History";
import { useOpenAI } from "../context/OpenAIProvider";
import { useAnthropic } from "../context/AnthropicProvider";
import { updateConversation } from "../context/History";
import { OpenAIApiKey, AnthropicApiKey } from "../utils/env";

// Wrapped icons to ensure valid ReactElement return types
const MdChatBubbleOutline = wrapIcon(RawMdChatBubbleOutline);
const MdCheck = wrapIcon(RawMdCheck);
const MdClear = wrapIcon(RawMdClear);
const MdDelete = wrapIcon(RawMdDelete);
const MdDownload = wrapIcon(RawMdDownload);
const MdDriveFileRenameOutline = wrapIcon(RawMdDriveFileRenameOutline);
// Pseudo-icons for conversation entries
const MdPerson = wrapIcon(RawMdPerson);
const BsRobot = wrapIcon(RawBsRobot);
const RiRobot2Line = wrapIcon(RawRiRobot2Line);
const BiConversation = wrapIcon(RawBiConversation);

type Props = {
  id: string;
  conversation: ConversationI;
  active: boolean;
};

// Fonction utilitaire pour extraire le contenu textuel d'un message
const getMessageContent = (content: string | { reply: string; tokenUsage: number }): string => {
  if (typeof content === 'string') {
    return content;
  }
  return content.reply;
};

export default function Conversation({ id, conversation, active }: Props) {
  const router = useRouter();
  // Providers and methods
  const openai = useOpenAI();
  const anthropic = useAnthropic();
  const { updateConversationName, deleteConversation: deleteOpenAIConversation } = openai;
  const { deleteConversation: deleteAnthropicConversation } = anthropic;
  const { activeProvider, isOpenAIModel, setActiveProvider } = useAIProvider();

  // Flag to disable automatic title regeneration (initialized from metadata)
  const [disableAutoTitle, setDisableAutoTitle] = React.useState<boolean>(
    conversation.disableAutoTitle ?? false
  );

  // Sync flag when conversation metadata changes (retrocompat)
  React.useEffect(() => {
    setDisableAutoTitle(conversation.disableAutoTitle ?? false);
  }, [conversation.disableAutoTitle]);

  // Auto-generate title on first user message for single provider
  const generateTitle = React.useCallback(async () => {
    if (!active || disableAutoTitle) return;
    if (conversation.name !== '...') return;
    const msgs = activeProvider === 'openai'
      ? (conversation.openaiMessages ?? [])
      : (conversation.anthropicMessages ?? []);
    if (!msgs.length || msgs[0].role !== 'user') return;
    const last = msgs[msgs.length - 1];
    const content = typeof last.content === 'string' ? last.content : last.content.reply;
    const titlePrompt = `Summarize the following text in three words, maintaining the language of the statement (usually french). Don't add any text at all to your answer (I need it to name a conversation via your API):
  <TEXT>
  ${content}
  </TEXT>`;
    try {
      let headers: Record<string, string> = { 'Content-Type': 'application/json' };
      let bodyObj: any;
      if (activeProvider === 'openai') {
        headers.Authorization = `Bearer ${OpenAIApiKey}`;
        bodyObj = { model: 'gpt-4.1-nano', messages: [{ role: 'user', content: titlePrompt }], max_completion_tokens: 100 };
      } else {
        headers['x-api-key'] = AnthropicApiKey;
        headers['anthropic-version'] = '2023-06-01';
        bodyObj = { model: 'claude-3-5-haiku-latest', messages: [{ role: 'user', content: titlePrompt }], max_completion_tokens: 100 };
      }
      const response = await fetch('/api/completion', { method: 'POST', headers, body: JSON.stringify(bodyObj) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const reply = data.reply;
      updateConversation(id, { name: reply, disableAutoTitle: true });
    } catch (err) {
      console.error('Error generating title:', err);
    }
  }, [active, activeProvider, conversation, disableAutoTitle, id]);
  
  React.useEffect(() => { generateTitle(); }, [generateTitle]);
  

  const [editing, setEditing] = React.useState(false);

  // Fonction pour obtenir le nom initial (fallback sur openaiMessages puis anthropicMessages)
  const getInitialName = (): string => {
    if (conversation.name) {
      return conversation.name;
    }
    const msgs = conversation.openaiMessages ?? conversation.anthropicMessages ?? [];
    if (msgs[0]?.content) {
      return getMessageContent(msgs[0].content);
    }
    return "?";
  };

  const [name, setName] = React.useState<string>(getInitialName());

  // Synchroniser l'état local du nom avec les changements de la conversation ou de messages
  useEffect(() => {
    setName(getInitialName());
  }, [conversation.name, conversation.openaiMessages, conversation.anthropicMessages]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleNameSubmit = () => {
    updateConversationName(id, name);
    setEditing(false);
    // Disable auto title regeneration after manual rename
    setDisableAutoTitle(true);
  };

  const handleNameCancel = () => {
    setName(conversation.name);
    setEditing(false);
  };

  const handleNameEdit = () => {
    setEditing(true);
  };

  const handleDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent parent Link navigation
    e.preventDefault();
    e.stopPropagation();
    // Delete conversation in both providers to keep in sync
    deleteOpenAIConversation(id);
    deleteAnthropicConversation(id);
    // Notify conversation list to refresh
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('historyUpdated'));
    }
    // Redirect away from deleted conversation
    router.push('/');
  };

  const handleDownload = () => {
    
    function sanitizeFilename(input: string): string {
      let sanitized = input.replace(/\s+/g, "-");
      sanitized = sanitized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      sanitized = sanitized.replace(/[^a-zA-Z0-9-_]/g, "");
      return sanitized.toLowerCase();
    };

    // Export en Markdown / JSON
    if (activeProvider === 'both') {
      // Dual: export both provider histories
      const anthroMsgs = anthropic.messages;
      const openaiMsgs = openai.messages;
      [
        { name: 'claude', msgs: anthroMsgs },
        { name: 'chatgpt', msgs: openaiMsgs }
      ].forEach(({ name, msgs }) => {
        // Markdown export
        const md = msgs.map(m => `${m.role}: ${getMessageContent(m.content)}`).join("\n\n");
        const mdBlob = new Blob([md], { type: 'text/plain' });
        const mdLink = document.createElement('a');
        mdLink.href = URL.createObjectURL(mdBlob);
        mdLink.download = `${name}-${sanitizeFilename(conversation.name)}.md`;
        mdLink.click();
        // JSON export
        const json = JSON.stringify({ name: name + '-' + conversation.name, messages: msgs }, null, 2);
        const jsonBlob = new Blob([json], { type: 'application/json' });
        const jsonLink = document.createElement('a');
        jsonLink.href = URL.createObjectURL(jsonBlob);
        jsonLink.download = `${name}-${sanitizeFilename(conversation.name)}.json`;
        jsonLink.click();
      });
    } else {
      // Single provider: export history for current active provider
      const msgs = activeProvider === 'openai'
        ? openai.messages
        : anthropic.messages;
      // Markdown export
      const conversationText = (msgs || [])
        .map((msg: any) => `${msg.role}: ${getMessageContent(msg.content)}`)
        .join("\n\n");
      const textBlob = new Blob([conversationText], { type: "text/plain" });
      const textLink = document.createElement("a");
      textLink.href = URL.createObjectURL(textBlob);
      textLink.download = `${sanitizeFilename(conversation.name)}.md`;
      textLink.click();
      // JSON export: include provider messages under 'messages' for compatibility
      const exportObj = {
        ...conversation,
        messages: msgs,
      };
      const jsonData = JSON.stringify(exportObj, null, 2);
      const jsonBlob = new Blob([jsonData], { type: "application/json" });
      const jsonLink = document.createElement("a");
      jsonLink.href = URL.createObjectURL(jsonBlob);
      jsonLink.download = `${sanitizeFilename(conversation.name)}.json`;
      jsonLink.click();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter") {
      handleNameSubmit();
    }
  };

  return (
    <div
      // Navigate and sync provider on click
      onClick={() => {
        router.push(`/chat/${id}`);
        setActiveProvider((conversation.lastProvider ?? conversation.mode) as 'openai' | 'anthropic' | 'both');
      }}
      className={`group relative flex flex-row items-center gap-3 rounded p-3 hover:bg-secondary ${
        active ? "bg-secondary" : ""
      }`}
    >
      <span>
        {(() => {
          // Primary: use lastProvider to choose icon if available
          if (conversation.lastProvider === 'openai') return <BsRobot />;
          if (conversation.lastProvider === 'anthropic') return <RiRobot2Line />;
          if (conversation.lastProvider === 'both') return <BiConversation />;
          if (conversation.mode === 'openai') return <BsRobot />;
          if (conversation.mode === 'anthropic') return <RiRobot2Line />;
          if (conversation.mode === 'both') return <BiConversation />;
          // Default chat bubble
          return <MdChatBubbleOutline />;
        })()}
      </span>
      <div className="relative flex grow truncate text-clip">
        {editing ? (
          <input
            type="text"
            className="z-50 w-full rounded bg-transparent p-[1px] text-primary outline-primary"
            onChange={handleNameChange}
            value={name}
          />
        ) : (
          name
        )}
        <div
          className={`absolute bottom-0 right-0 z-10 h-full w-24 bg-gradient-to-r from-transparent ${
            active
              ? "to-[rgb(var(--bg-secondary))]"
              : "to-[rgb(var(--bg-primary))] group-hover:to-[rgb(var(--bg-secondary))]"
          }`}
        />
      </div>

      {active && !editing && (
        <div className="flex items-center gap-2">
          <button
            className="text-xl opacity-60 transition-opacity hover:opacity-100"
            onClick={handleNameEdit}
          >
            <MdDriveFileRenameOutline />
          </button>
          <button
            className="text-xl opacity-60 transition-opacity hover:opacity-100"
            onClick={handleDelete}
          >
            <MdDelete />
          </button>
          <button
            className="text-xl opacity-60 transition-opacity hover:opacity-100"
            onClick={handleDownload}
          >
            <MdDownload />
          </button>
        </div>
      )}

      {active && editing && (
        <div className="flex items-center gap-2">
          <button
            className="text-xl opacity-60 transition-opacity hover:opacity-100"
            onClick={handleNameSubmit}
            onKeyDown={handleKeyDown}
            tabIndex={0}
          >
            <MdCheck />
          </button>
          <button
            className="text-xl opacity-60 transition-opacity hover:opacity-100"
            onClick={handleNameCancel}
          >
            <MdClear />
          </button>
        </div>
      )}
    </div>
  );
}
