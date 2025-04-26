import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

// Possible modes
export type ProviderMode = 'openai' | 'anthropic' | 'both';

interface ModeContextType {
  mode: ProviderMode;
  setMode: (m: ProviderMode) => void;
}

// Default values before hydration
const ModeContext = createContext<ModeContextType>({
  mode: 'anthropic',
  setMode: () => {},
});

// Helper hook
export const useMode = () => useContext(ModeContext);

// Provider that keeps mode in localStorage so it persists between reloads
export const ModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getInitial = (): ProviderMode => {
    if (typeof window === 'undefined') return 'anthropic';
    const stored = localStorage.getItem('activeProvider');
    if (stored === 'openai' || stored === 'anthropic' || stored === 'both') return stored;
    return 'anthropic';
  };

  const [mode, setModeState] = useState<ProviderMode>(getInitial);

  const setMode = useCallback((m: ProviderMode) => {
    setModeState(m);
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeProvider', m);
      // notifier pour que d'autres parties puissent réagir
      const evt = new CustomEvent('activeProviderChanged', { detail: { provider: m } });
      window.dispatchEvent(evt);
    }
  }, []);

  // keep in sync with storage changes from other tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'activeProvider' && e.newValue) {
        const val = e.newValue as ProviderMode;
        if (val !== mode) setModeState(val);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [mode]);

  const value = { mode, setMode };
  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
};
