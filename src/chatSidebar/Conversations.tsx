import React from "react";
import { getHistory, storeConversation } from "../context/History";
import { v4 as uuidv4 } from "uuid";
import Conversation from "./Conversation";

type Props = {};

export default function Conversations({}: Props) {
  // Utilise une seule clé 'selected' pour stocker l'ID de la conversation sélectionnée (pinned ou non)
  // Au premier chargement, si aucune conversation n'est sélectionnée, on crée une conversation "dual" par défaut

  const [history, setHistory] = React.useState(() => getHistory());

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    let selectedId = localStorage.getItem('selected');
    // Si aucune conversation sélectionnée, on crée une "dual" par défaut
    if (!selectedId) {
      const newId = uuidv4();
      const conv: any = {
        name: 'Dual Mode',
        createdAt: Date.now(),
        lastMessage: Date.now(),
        messages: [],
        mode: 'both',
      };
      storeConversation(newId, conv);
      localStorage.setItem('selected', newId);
      setHistory(getHistory());
    } else {
      // Si l'ID sélectionné n'existe plus, on le retire
      if (!history[selectedId]) {
        localStorage.removeItem('selected');
      }
    }
  }, [history]);

  // Rafraîchit l'historique en cas de modification externe (suppression, etc.)
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

  // Conversation active = celle dont l'ID est stocké dans 'selected'
  const activeId = localStorage.getItem('selected') || '';

  // Trie les conversations par date de création décroissante
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

