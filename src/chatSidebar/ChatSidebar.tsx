import Link from "next/link";
import React, { useCallback } from "react";
import { wrapIcon } from "../utils/Icon";
import {
  MdAdd as RawMdAdd,
  MdDeleteOutline as RawMdDeleteOutline,
  MdUploadFile as RawMdUploadFile,
} from "react-icons/md";
import { BsRobot as RawBsRobot } from "react-icons/bs";
import { RiRobot2Line as RawRiRobot2Line } from "react-icons/ri";
import { useAnthropic } from "../context/AnthropicProvider";
import { useAIProvider } from "../context/AIProviderManager";
import { useOpenAI } from "../context/OpenAIProvider";
import Conversations from "./Conversations";
import ButtonContainer from "./ButtonContainer";
import { useDropzone } from 'react-dropzone';
import ModelSelector from "./ModelSelector"; // Importer le nouveau composant

type Props = {};

// Wrapped icons to ensure valid ReactElement return types
const MdAdd = wrapIcon(RawMdAdd);
const MdDeleteOutline = wrapIcon(RawMdDeleteOutline);
const MdUploadFile = wrapIcon(RawMdUploadFile);
const BsRobot = wrapIcon(RawBsRobot);
const RiRobot2Line = wrapIcon(RawRiRobot2Line);

export default function ChatSidebar({}: Props) {
  const openai = useOpenAI();
  const anthropic = useAnthropic();
  const { activeProvider, setActiveProvider, importConversationCoordinated } = useAIProvider(); 

  const handleNewChat = (e: React.MouseEvent) => {
    e.preventDefault();
    // Generate a unique conversation ID for this new chat
    const newId = Date.now().toString();
    // Reset the appropriate provider(s) with the same ID
    if (activeProvider === 'openai') {
      openai.resetConversation(newId);
    } else if (activeProvider === 'anthropic') {
      anthropic.resetConversation(newId);
    } else {
      openai.resetConversation(newId);
      anthropic.resetConversation(newId);
    }
    // Notify to refresh conversation list
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('historyUpdated'));
    }
  };

  const handleClearConversations = () => {
    openai.clearConversations();
    anthropic.clearConversations();
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onabort = () => console.log('file reading was aborted');
      reader.onerror = () => console.log('file reading has failed');
      reader.onload = () => {
        const fileContent = reader.result as string;
        try {
          const jsonData = JSON.parse(fileContent);
          importConversationCoordinated(jsonData);
          // Mettre à jour la liste des conversations
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('historyUpdated'));
          }
        } catch (error) {
          console.error('Error parsing JSON:', error);
          // Vous pourriez ajouter ici une notification pour l'utilisateur
        }
      };
      reader.readAsText(file);
    });
  }, [openai, importConversationCoordinated]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/json': ['.json']
    }
  });

  return (
    <div className="flex flex-col bg-gray-900 left-0 top-0 h-full max-h-screen text-primary md:fixed md:w-[328px]">
      <div className="flex h-full flex-col items-stretch p-2">

        <div className="flex flex-col gap-y-2 border-y border-white/10 py-2">  
          <Link
            href="#"
            onClick={handleNewChat}
            className="flex items-center gap-3 rounded p-3 transition-colors hover:bg-gray-100/10"
          >
            <MdAdd />
            Nouvelle discussion
          </Link>
          <div {...getRootProps()} className={`flex items-center gap-3 rounded p-3 transition-colors hover:bg-gray-100/10 cursor-pointer ${isDragActive ? 'bg-gray-100/20' : ''}`}>
            <input {...getInputProps()} />
            <MdUploadFile />
            {isDragActive ? "Déposez le fichier" : "Importer une discussion"}
          </div>
        </div>

        <ModelSelector />
        <Conversations />

        <div className="flex flex-col gap-y-2 border-y border-white/10 py-2">
          <ButtonContainer onClick={handleClearConversations}>
            <MdDeleteOutline />
            Tout effacer
          </ButtonContainer>
        </div>
      </div>
    </div>
  );
}