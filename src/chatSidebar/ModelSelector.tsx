import React from 'react';
import { useAIProvider } from '../context/AIProviderManager';

const ModelSelector: React.FC = () => {
  const { activeProvider, setActiveProvider } = useAIProvider();

  const handleModelChange = (newProvider: 'anthropic' | 'openai') => {
    setActiveProvider(newProvider);
  };

  return (
    <div className="flex flex-col w-full gap-y-2 border-y border-white/10 py-2">
      <div className="flex w-full items-center gap-2 px-3">
        <button
          className={`flex-1 rounded-l-md py-2 text-center transition-colors
            ${activeProvider === 'openai'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}
          `}
          onClick={() => handleModelChange('openai')}
        >
          ChatGPT
        </button>
        <button
          className={`flex-1 rounded-r-md py-2 text-center transition-colors
            ${activeProvider === 'anthropic'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}
          `}
          onClick={() => handleModelChange('anthropic')}
        >
          Claude
        </button>
      </div>
      <div className="px-3 mt-1 text-xs text-gray-500 text-center">
        {activeProvider === 'openai' 
          ? 'OpenAI GPT-4.1 O4-mini O3' 
          : 'Anthropic Claude 3.7'}
      </div>
    </div>
  );
};

export default ModelSelector;