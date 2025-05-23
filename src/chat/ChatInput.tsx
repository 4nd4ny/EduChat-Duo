import React, { useRef, useState, useCallback, useEffect, ChangeEvent } from "react";
import { useAIProvider } from "../context/AIProviderManager";
import { wrapIcon } from "../utils/Icon";
import { MdSend as RawMdSend } from "react-icons/md";

type Props = {};

export default function ChatInput({}: Props) {
  // Wrapped send icon
  const MdSend = wrapIcon(RawMdSend);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");
  const { activeProvider, addMessage, loading: isLoading } = useAIProvider();
  
  // Fonction pour maintenir le focus sur le textarea
  const maintainFocus = useCallback(() => {
    if (textAreaRef.current) {
      textAreaRef.current.focus();
    }
  }, [textAreaRef]);
  
  // Maintenir le focus après le changement de provider
  useEffect(() => {
    setTimeout(maintainFocus, 100);
  }, [activeProvider, maintainFocus]);
  
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    if (isLoading) return;
    e.preventDefault();
    if (input.trim()) {
      // Confier la logique à AIProviderManager
      addMessage(input, 'user');
      setInput('');
      // Maintenir le focus après soumission
      setTimeout(maintainFocus, 100);
    }
  }, [isLoading, input, maintainFocus, addMessage, activeProvider]);

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    
    // Déterminer si le texte ressemble à du code (uniquement en mode auto-détection)
    const isCodeLike = (
      (text.includes("{") && text.includes("}")) || 
      (text.includes("function ")) || 
      (text.includes("if ")) || 
      (text.includes("import ") && text.includes("from ")) ||
      (text.includes("class ") && text.includes("{")) ||
      (text.includes("class ") && text.includes(":")) ||
      (text.includes("const ") && text.includes("=")) ||
      (text.includes("let ") && text.includes("=")) ||
      (text.includes("<") && text.includes("/>")) ||
      (text.trim().split("\n").some(line => line.trim().startsWith("//")) && text.includes("(") && text.includes(")")) ||
      // Détection Quorum
      ((text.includes("action ") || text.includes("if ") || text.includes("repeat ")) && 
       text.includes("end"))
      );
    
    // Déterminer le langage pour le formatage
    let language = "";
    if (isCodeLike) {
      if (text.includes("import React") || text.includes("useState") || text.includes("<div>") || text.includes("</div>")) {
        language = "tsx";
      } else if (text.includes("function") || text.includes("const") || text.includes("let")) {
        language = "javascript";
      } else if (text.includes("class") && text.includes("public") && text.includes(";")) {
        language = "java";
      } else if ((text.includes("def ") && text.includes(":")) || (text.includes("def ") && text.includes(":"))) {
        language = "python";
      } else if ((text.includes("action ") || text.includes("repeat ")) && text.includes("end")) {
        language = "quorum";
      } else {
        // Si on est en mode code mais qu'on n'a pas détecté de langage spécifique
        language = "plaintext";
      }
    }
    
    // Formater le texte si nécessaire
    let preservedText = text;
    if ((isCodeLike) && !text.startsWith("```") && !text.endsWith("```")) {
      preservedText = "```" + language + "\n" + text + "\n```";
    }
    
    // Obtenir la position du curseur
    const start = e.currentTarget.selectionStart;
    const end = e.currentTarget.selectionEnd;
    
    // Créer le nouveau texte avec le contenu collé
    const newText = input.substring(0, start) + preservedText + input.substring(end);
    setInput(newText);
    
    // Positionner le curseur après le texte collé
    setTimeout(() => {
      if (textAreaRef.current) {
        textAreaRef.current.selectionStart = textAreaRef.current.selectionEnd = start + preservedText.length;
        textAreaRef.current.focus();
      }
    }, 0);
  };

  // Gestion de la hauteur du textarea
  useEffect(() => {
    const resize = () => {
      if (textAreaRef.current) {
        textAreaRef.current.style.height = "40px";
        textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
      }
    };
    resize();
  }, [input]);

  // Gestion de la touche Entrée
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Vérifier si l'événement provient du textarea
      if (e.target === textAreaRef.current) {
        if (e.key === "Enter") {
          if (e.shiftKey) {
            // Si Shift+Enter est pressé, on peut garder un comportement alternatif si nécessaire
            // Ici on ne fait rien de spécial, le comportement par défaut ajoutera \n
          } else {
            // Empêcher le comportement par défaut de soumission du formulaire
            e.preventDefault();
            
            // Ajouter manuellement un saut de ligne à la position du curseur
            if (textAreaRef.current) {
              const start = textAreaRef.current.selectionStart;
              const end = textAreaRef.current.selectionEnd;
              const newText = input.substring(0, start) + "\n" + input.substring(end);
              setInput(newText);
            
              // Position le curseur juste après le retour à la ligne inséré
              // Cette ligne doit être exécutée après que le state ait été mis à jour
              setTimeout(() => {
                if (textAreaRef.current) {
                  textAreaRef.current.selectionStart = start + 1;
                  textAreaRef.current.selectionEnd = start + 1;
                  textAreaRef.current.focus();
                }
              }, 0);
            }
          }
        }
      }
    };

    // Attention: attachez l'événement au textarea directement plutôt qu'au document
    const textArea = textAreaRef.current;
    if (textArea) {
      textArea.addEventListener("keydown", handleKeyDown);
      return () => {
        textArea.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [input, textAreaRef]);

  // Afficher l'indication du modèle actif
  let activeModelName;
  if (activeProvider === 'openai') {
    activeModelName = 'OpenAI GPT-4.1 O4-mini O3';
  } else if (activeProvider === 'anthropic') {
    activeModelName = 'Anthropic Claude 3.7';
  } else {
    activeModelName = 'Dual mode'; 
  } 

/*
  // [WARNING] Je ne comprends ce que ça fait, mais c'est peut-être utile ! NE PAS SUPPRIMER !!!
  // Fonction pour gérer l'événement de changement de provider
  useEffect(() => {
    const handleProviderChange = (event: CustomEvent) => {
      if (event.detail && event.detail.provider) {
        // Forcer une mise à jour du composant pour afficher le nouveau provider
        setInput(current => current + ''); // Astuce pour forcer un re-render
      }
    };

    // Ajouter l'écouteur d'événement
    document.addEventListener('activeProviderChanged', handleProviderChange as EventListener);
    
    // Nettoyer l'écouteur d'événement
    return () => {
      document.removeEventListener('activeProviderChanged', handleProviderChange as EventListener);
    };
  }, []);
*/


  // Assurer que le focus est placé sur le textarea au chargement de la page
  useEffect(() => {
    maintainFocus();
    
    // Réappliquer le focus lorsque la fenêtre redevient active (utile pour les changements d'onglet)
    const handleFocus = () => setTimeout(maintainFocus, 100);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [maintainFocus]);

  return (
    <div className="fixed bottom-0 flex flex-grow h-40 w-full bg-gradient-to-t from-[rgb(var(--bg-secondary))] to-transparent md:w-[calc(100%-320px)]">
      <form
        className="mx-auto flex flex-grow h-full w-full items-end justify-center p-4 pb-10"
        onSubmit={handleSubmit}
      >
        <div className="relative flex flex-grow w-full flex-row rounded border border-stone-500/20 bg-tertiary shadow-xl">
          <div className="absolute -top-6 left-4 text-xs text-gray-400">
            Modèle actif: {activeModelName}
          </div>
          <textarea
            name="query"
            placeholder="Posez votre question ici..."
            ref={textAreaRef}
            className={`flex flex-grow max-h-[200px] w-full resize-none border-none bg-tertiary p-4 text-primary outline-none`}
            onChange={handleChange}
            onPaste={handlePaste}
            value={input}
            rows={1}
            spellCheck={false}
            autoFocus={true}
          />
          <button
            type="submit"
            className="rounded p-4 text-primary hover:bg-[#DC6521]"
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? (
              <div className="mx-auto h-5 w-5 animate-spin rounded-full border-b-2 border-white" />
            ) : (
              <MdSend className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}