
import React, { useState, useEffect } from 'react';

// Define the interface for the AI Studio key selection tool as expected by the global scope
interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

declare global {
  interface Window {
    aistudio: AIStudio;
  }
}

interface ApiKeyManagerProps {
  onKeySelected: () => void;
  // Prop to handle the "Requested entity was not found" scenario by forcing the dialog
  forceShow?: boolean;
}

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ onKeySelected, forceShow }) => {
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  useEffect(() => {
    checkKey();
  }, []);

  // Sync with forceShow from parent if authentication fails at runtime
  useEffect(() => {
    if (forceShow) {
      setHasKey(false);
    }
  }, [forceShow]);

  const checkKey = async () => {
    try {
      const result = await window.aistudio.hasSelectedApiKey();
      setHasKey(result);
      if (result) onKeySelected();
    } catch (e) {
      setHasKey(false);
    }
  };

  const handleOpenSelector = async () => {
    try {
      await window.aistudio.openSelectKey();
      // Assume success after triggering the dialog to avoid race conditions as per guidelines
      setHasKey(true);
      onKeySelected();
    } catch (e) {
      console.error("Error opening key selector", e);
    }
  };

  // Do not show if a key is already selected unless forced by an error
  if (hasKey === true && !forceShow) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="glass-panel max-w-md w-full p-8 rounded-3xl shadow-2xl text-center">
        <div className="mb-6 inline-flex p-4 rounded-full bg-blue-500/10 text-blue-400">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-4">Configurazione Richiesta</h2>
        <p className="text-gray-400 mb-8 leading-relaxed">
          Per utilizzare i modelli video avanzati <b>Veo 3.1</b>, è necessario selezionare una chiave API valida collegata a un progetto GCP con fatturazione attiva.
        </p>
        <button
          onClick={handleOpenSelector}
          className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-95 mb-4"
        >
          Seleziona Chiave API
        </button>
        <a 
          href="https://ai.google.dev/gemini-api/docs/billing" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-sm text-blue-400 hover:underline"
        >
          Documentazione fatturazione API
        </a>
      </div>
    </div>
  );
};

export default ApiKeyManager;
