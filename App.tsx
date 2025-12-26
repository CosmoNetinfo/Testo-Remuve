
import React, { useState, useRef } from 'react';
import { ProcessingState, VideoData } from './types';
import { GeminiService } from './services/geminiService';
import ApiKeyManager from './components/ApiKeyManager';

const App: React.FC = () => {
  const [video, setVideo] = useState<VideoData | null>(null);
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState<ProcessingState>({ status: 'idle' });
  const [isAuthRequired, setIsAuthRequired] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      // Determine aspect ratio based on video metadata (simplified default 16:9)
      setVideo({
        url,
        blob: file,
        name: file.name,
        aspectRatio: '16:9'
      });
      setResultVideoUrl(null);
      setProcessing({ status: 'idle' });
    }
  };

  const convertToBase64 = (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Function to extract the first frame for the API call as a starting reference
  const extractFrame = (videoUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      video.onloadeddata = () => {
        video.currentTime = 0;
      };
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
    });
  };

  const processVideo = async () => {
    if (!video || !video.blob) return;

    setProcessing({ 
      status: 'processing', 
      message: 'L\'IA sta analizzando e rimuovendo il testo dal video. Questo processo può richiedere diversi minuti...' 
    });

    try {
      // For Veo image-to-video capabilities, we extract a key frame from the original source
      const frameBase64 = await extractFrame(video.url);
      
      const cleanedVideoUrl = await GeminiService.removeTextFromVideo(
        frameBase64,
        'image/png',
        "Elimina scritte, loghi o sottotitoli. Ricostruisci lo sfondo in modo realistico.",
        video.aspectRatio
      );

      setResultVideoUrl(cleanedVideoUrl);
      setProcessing({ status: 'completed' });
      setIsAuthRequired(false);
    } catch (error: any) {
      // Re-prompt for API key selection if the request fails due to missing billing/permissions
      if (error.message === 'AUTH_REQUIRED') {
        setIsAuthRequired(true);
        setProcessing({ status: 'idle' });
      } else {
        setProcessing({ 
          status: 'error', 
          error: error.message || 'Si è verificato un errore durante l\'elaborazione.' 
        });
      }
    }
  };

  const reset = () => {
    setVideo(null);
    setResultVideoUrl(null);
    setProcessing({ status: 'idle' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
      <ApiKeyManager 
        onKeySelected={() => setIsAuthRequired(false)} 
        forceShow={isAuthRequired}
      />

      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2"></div>

      {/* Header */}
      <div className="text-center mb-12 z-10">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
          CleanView AI
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Utilizza la potenza di Gemini Veo 3.1 per rimuovere testo, loghi e watermark dai tuoi video con precisione cinematografica.
        </p>
      </div>

      <main className="w-full max-w-5xl z-10">
        {!video ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="glass-panel border-dashed border-2 border-white/10 rounded-[2rem] p-12 text-center cursor-pointer hover:border-blue-500/50 hover:bg-white/5 transition-all group"
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept="video/*" 
              className="hidden" 
            />
            <div className="mb-6 inline-flex p-6 rounded-3xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Carica il tuo video</h2>
            <p className="text-gray-400">Trascina un file o clicca per selezionarlo dal tuo dispositivo</p>
            <p className="text-xs text-gray-500 mt-4 uppercase tracking-widest font-semibold">Max 25MB consigliati per un'elaborazione veloce</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Source Display */}
            <div className="glass-panel rounded-3xl overflow-hidden p-4">
              <div className="flex justify-between items-center mb-4 px-2">
                <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Sorgente Originale</span>
                <button onClick={reset} className="text-gray-400 hover:text-white text-sm transition-colors">Rimuovi</button>
              </div>
              <video 
                src={video.url} 
                className="w-full rounded-2xl shadow-lg aspect-video object-cover" 
                controls 
              />
            </div>

            {/* Results / Progress Tracking */}
            <div className="glass-panel rounded-3xl p-8 flex flex-col justify-center min-h-[400px]">
              {processing.status === 'idle' && (
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-4">Pronto per la pulizia?</h3>
                  <p className="text-gray-400 mb-8">L'intelligenza artificiale rileverà automaticamente ogni testo e lo rimuoverà preservando i dettagli della scena.</p>
                  <button 
                    onClick={processVideo}
                    className="w-full py-5 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-900/40 active:scale-95 flex items-center justify-center gap-3"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Avvia Rimozione Testo
                  </button>
                </div>
              )}

              {processing.status === 'processing' && (
                <div className="text-center">
                  <div className="relative w-24 h-24 mx-auto mb-8">
                    <div className="absolute inset-0 rounded-full border-4 border-blue-500/20"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin"></div>
                  </div>
                  <h3 className="text-2xl font-bold mb-4 animate-pulse-subtle">Generazione Video in corso...</h3>
                  <p className="text-gray-400 leading-relaxed italic">
                    {processing.message}
                  </p>
                  <div className="mt-8 text-xs text-gray-500 uppercase tracking-widest">
                    Veo 3.1 sta lavorando sulla tua scena
                  </div>
                </div>
              )}

              {processing.status === 'completed' && resultVideoUrl && (
                <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="mb-6 inline-flex p-4 rounded-full bg-green-500/10 text-green-400">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Elaborazione Completata!</h3>
                  <video 
                    src={resultVideoUrl} 
                    className="w-full rounded-2xl shadow-2xl aspect-video object-cover mb-8" 
                    controls 
                    autoPlay
                    loop
                  />
                  <div className="flex gap-4">
                    <a 
                      href={resultVideoUrl} 
                      download="clean-video.mp4"
                      className="flex-1 py-4 px-6 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Scarica Risultato
                    </a>
                    <button 
                      onClick={reset}
                      className="py-4 px-6 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-all"
                    >
                      Nuovo Video
                    </button>
                  </div>
                </div>
              )}

              {processing.status === 'error' && (
                <div className="text-center">
                  <div className="mb-6 inline-flex p-4 rounded-full bg-red-500/10 text-red-400">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-red-400">Oops! Qualcosa è andato storto</h3>
                  <p className="text-gray-400 mb-8">{processing.error}</p>
                  <button 
                    onClick={() => setProcessing({ status: 'idle' })}
                    className="py-4 px-8 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all"
                  >
                    Riprova
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="mt-24 text-gray-500 text-sm z-10 flex flex-col items-center gap-4">
        <p>&copy; 2024 CleanView AI. Powered by Google Gemini & Veo 3.1</p>
        <div className="flex gap-6">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span> Modello Veo Attivo
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span> 1080p Support
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;
