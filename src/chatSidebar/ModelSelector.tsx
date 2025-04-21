import React, { useState } from 'react';
import { useAIProvider } from '../context/AIProviderManager';

const ModelSelector: React.FC = () => {
  const { activeProvider, setActiveProvider, syncProviders, providerLocked } = useAIProvider();
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

  // Background click: select both
  const handleMidClick = () => {
    console.log("ModelSelector: handleMidClick invoked. activeProvider=", activeProvider, "providerLocked=", providerLocked);
    if (providerLocked) {
      console.log("ModelSelector: handleMidClick aborted because providerLocked is true");
      return;
    }
    console.log("ModelSelector: calling syncProviders()");
    syncProviders();
    console.log("ModelSelector: calling setActiveProvider('both')");
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

  console.log("ModelSelector");
  return (
    <div className="flex flex-col w-full gap-y-2 border-y border-white/10 py-2 hover:bg-gray-700 cursor-pointer transition-colors"
        onMouseEnter={() => setHoverMid(true)} // Déclenche l'état pour les boutons enfants
        onMouseLeave={() => setHoverMid(false)}
        onClick={handleMidClick} // Supprimé la condition providerLocked
        // Optionnel: Ajoutez role="button", tabIndex="0", aria-label si pertinent pour l'accessibilité
      >
      <div
        // Ajout de hover:bg-gray-800 pour le survol de la div
        // Suppression des conditions liées à providerLocked
        className={`flex w-full items-center px-3`} 
      >
        <button
          // Simplification de la logique de classe : suppression de providerLocked
          className={`flex-1 rounded-l-md py-2 text-center transition-colors
            ${anthropicSelected
              ? 'bg-[#DA7756] text-white' // Style si sélectionné
              : hoverMid // Si la div parente est survolée ?
                ? 'bg-gray-600 text-white' // Style des deux boutons au survol de la div
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700' // Style par défaut + survol individuel
            }`
          }
          onClick={(e) => {
            e.stopPropagation(); // Important pour ne pas déclencher handleMidClick
            handleSideClick('anthropic'); // Appel direct sans condition
          }}
          aria-pressed={anthropicSelected}
          // Attributs disabled et aria-disabled supprimés
        >
          Claude
        </button>

        {/* Espace où se trouvait le bouton milieu, maintenant géré par le survol/clic de la div */}

        <button
          // Simplification de la logique de classe : suppression de providerLocked
          className={`flex-1 rounded-r-md py-2 text-center transition-colors
            ${openaiSelected
              ? 'bg-[#00A67E] text-white' // Style si sélectionné
              : hoverMid // Si la div parente est survolée ?
                ? 'bg-gray-600 text-white' // Style des deux boutons au survol de la div
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700' // Style par défaut + survol individuel
            }`
          }
          onClick={(e) => {
            e.stopPropagation(); // Important pour ne pas déclencher handleMidClick
            handleSideClick('openai'); // Appel direct sans condition
          }}
          aria-pressed={openaiSelected}
          // Attributs disabled et aria-disabled supprimés
        >
          ChatGPT
        </button>
      </div>
      <div className="px-3 mt-1 text-xs text-gray-500 text-center">
        {/* Assurez-vous que providerText est toujours pertinent ou supprimez/modifiez cette partie */}
        {providerText}
      </div>
    </div>
  );
};

export default ModelSelector;