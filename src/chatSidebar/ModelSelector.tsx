import React, { useState } from 'react';
import { useAIProvider } from '../context/AIProviderManager';

const ModelSelector: React.FC = () => {
  const { activeProvider, setActiveProvider, providerLocked } = useAIProvider();
  const [hoverMid, setHoverMid] = useState(false);

  // Selections
  const anthropicSelected = activeProvider === 'anthropic' || activeProvider === 'both';
  const openaiSelected   = activeProvider === 'openai'    || activeProvider === 'both';

  // Side button click: toggle or select
  const handleSideClick = (side: 'anthropic' | 'openai') => {
    if (providerLocked) return;
    if (activeProvider === 'both' || activeProvider === side) {
      setActiveProvider(side === 'anthropic' ? 'openai' : 'anthropic');
    } else {
      setActiveProvider(side);
    }
  };
  // Middle button click: select both
  const handleMidClick = () => {
    if (providerLocked) return;
    setActiveProvider('both');
  };

  let providerText;

  if (activeProvider === 'openai') {
    providerText = 'OpenAI GPT-4.1 O4-mini O3';
  } else if (activeProvider === 'anthropic') {
    providerText = 'Anthropic Claude 3.7';
  } else if (activeProvider === 'both') {
    providerText = 'Dual mode'; // Ou le texte que vous souhaitez afficher
  } else {
    // Optionnel : un cas par défaut si activeProvider n'est aucune des valeurs attendues
    providerText = 'Aucun agent sélectionné';
  }

  return (
    <div className="flex flex-col w-full gap-y-2 border-y border-white/10 py-2">
      <div className="flex w-full items-center px-3">
        <button
          className={`flex-1 rounded-l-md py-2 text-center transition-colors
            ${providerLocked
              ? (anthropicSelected ? 'bg-gray-500 text-white cursor-not-allowed' : 'bg-gray-800 text-gray-500 cursor-not-allowed')
              : anthropicSelected
                  ? 'bg-[#DA7756] text-white'
                  : hoverMid
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`
          }
          onClick={() => handleSideClick('anthropic')}
          disabled={providerLocked}
          aria-pressed={anthropicSelected}
          aria-disabled={providerLocked}
        >
          Claude
        </button>
        {/* Middle dark bar to activate dual mode */}
        <button
          type="button"
          className="w-2 mx-0 my-2 bg-transparent focus:outline-none"
          onMouseEnter={() => setHoverMid(true)}
          onMouseLeave={() => setHoverMid(false)}
          onClick={handleMidClick}
          disabled={providerLocked}
        />

        <button
          className={`flex-1 rounded-r-md py-2 text-center transition-colors
            ${providerLocked
              ? (openaiSelected ? 'bg-gray-500 text-white cursor-not-allowed' : 'bg-gray-800 text-gray-500 cursor-not-allowed')
              : openaiSelected
                  ? 'bg-[#00A67E] text-white'
                  : hoverMid
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`
          }
          onClick={() => handleSideClick('openai')}
          disabled={providerLocked}
          aria-pressed={openaiSelected}
          aria-disabled={providerLocked}
        >
          ChatGPT
        </button>
      </div>
      <div className="px-3 mt-1 text-xs text-gray-500 text-center">
        {providerText}
      </div>
    </div>
  );
};

export default ModelSelector;