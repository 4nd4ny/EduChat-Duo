import React from 'react';

type Props = {
  onSelect: (provider: 'openai' | 'anthropic') => void;
};

export default function PreferenceQuiz({ onSelect }: Props) {
  return (
    <div className="flex w-full items-center justify-center gap-6 py-4 bg-tertiary border-t border-white/10">
      <button
        className="rounded-md bg-[#DA7756] px-4 py-2 text-sm text-white hover:opacity-90"
        onClick={() => onSelect('anthropic')}
      >
        Je préfère Claude
      </button>
      <button
        className="rounded-md bg-[#00A67E] px-4 py-2 text-sm text-white hover:opacity-90"
        onClick={() => onSelect('openai')}
      >
        Je préfère ChatGPT
      </button>
    </div>
  );
}
