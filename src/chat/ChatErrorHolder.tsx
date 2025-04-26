import React from "react";

interface ChatErrorHolderProps {
  error: string | null;
  onClose?: () => void;
}

const ChatErrorHolder: React.FC<ChatErrorHolderProps> = ({ error, onClose }) => {
  if (!error) return null;
  return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-2 flex items-center" role="alert">
      <span className="block font-bold mr-2">Erreur d'importation :</span>
      <span className="block flex-1">{error}</span>
      {onClose && (
        <button
          className="ml-4 px-2 py-1 bg-red-200 hover:bg-red-300 rounded"
          onClick={onClose}
          aria-label="Fermer l'alerte"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default ChatErrorHolder;
