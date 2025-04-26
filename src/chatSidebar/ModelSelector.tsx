import React, { useState } from 'react';
import { useMode } from '../context/ModeContext';

// Composant responsable de la sélection visuelle du modèle / mode
// Il est désormais la **seule** source qui peut modifier le mode.

const ModelSelector: React.FC = () => {
  const { mode, setMode } = useMode();
  const [hoverMid, setHoverMid] = useState(false);

  // États visuels
  const anthropicSelected = mode === 'anthropic' || mode === 'both';
  const openaiSelected = mode === 'openai' || mode === 'both';

  // Handlers -------------------------------------------------------------
  const handleDualModeClick = () => setMode('both');
  const handleClaudeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMode('anthropic');
  };
  const handleChatGPTClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMode('openai');
  };

  // Label descriptif
  const providerText =
    mode === 'openai' ? 'OpenAI GPT-4' : mode === 'anthropic' ? 'Anthropic Claude' : 'Dual mode';

  return (
    <div
      className="flex flex-col w-full gap-y-2 border-y border-white/10 py-2 hover:bg-gray-700 cursor-pointer transition-colors"
      onMouseEnter={() => setHoverMid(true)}
      onMouseLeave={() => setHoverMid(false)}
      onClick={handleDualModeClick}
    >
      <div className="flex w-full items-center px-3" onMouseEnter={() => setHoverMid(false)}>
        <button
          className={`flex-1 rounded-l-md py-2 text-center transition-colors ${
            hoverMid
              ? 'bg-[#DA7756] text-white'
              : anthropicSelected
              ? 'bg-gray-400 text-black hover:bg-[#DA7756] hover:text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-[#DA7756] hover:text-white'
          }`}
          onClick={handleClaudeClick}
        >
          Claude
        </button>

        <button
          className={`flex-1 rounded-r-md py-2 text-center transition-colors ${
            hoverMid
              ? 'bg-[#00A67E] text-white'
              : openaiSelected
              ? 'bg-gray-400 text-black hover:bg-[#00A67E] hover:text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-[#00A67E] hover:text-white'
          }`}
          onClick={handleChatGPTClick}
        >
          ChatGPT
        </button>
      </div>
      <div className="px-3 mt-1 text-xs text-gray-500 text-center">{providerText}</div>
    </div>
  );
};

export default ModelSelector;
