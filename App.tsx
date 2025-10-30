
import React, { useState, useRef, useCallback } from 'react';
import { translateAndGenerateSpeech } from './services/geminiService';
import { decode, decodeAudioData } from './utils/audioUtils';

// Helper component for the speaker icon, defined outside the main component.
const SpeakerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
    />
  </svg>
);

// Helper component for the loading spinner, defined outside the main component.
const SpinnerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

// Helper component for the clear icon.
const ClearIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={className} 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor" 
        strokeWidth={2}
        aria-hidden="true"
    >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

type Language = 'id' | 'jw' | 'en';

const languageOptions: { key: Language; label: string }[] = [
    { key: 'id', label: 'Indonesia' },
    { key: 'jw', label: 'Jawa' },
    { key: 'en', label: 'English' },
];

const App: React.FC = () => {
  const [announcementText, setAnnouncementText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('id');
  const audioContextRef = useRef<AudioContext | null>(null);

  const handleGenerateSpeech = useCallback(async () => {
    if (!announcementText.trim() || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    // Initialize AudioContext on user interaction
    if (!audioContextRef.current) {
        try {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 24000,
            });
        } catch (e) {
            setError("Browser does not support AudioContext.");
            setIsLoading(false);
            return;
        }
    }
    
    // Resume context if suspended
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    try {
      const base64Audio = await translateAndGenerateSpeech(announcementText, selectedLanguage);
      const audioData = decode(base64Audio);
      if (!audioContextRef.current) throw new Error("Audio context not initialized");

      const audioBuffer = await decodeAudioData(
        audioData,
        audioContextRef.current,
        24000,
        1
      );
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();

    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('An unknown error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [announcementText, isLoading, selectedLanguage]);

  const handleClearText = useCallback(() => {
    setAnnouncementText('');
  }, []);

  return (
    <div className="bg-slate-900 min-h-screen flex items-center justify-center font-sans text-white p-4">
      <div className="w-full max-w-2xl bg-slate-800 rounded-2xl shadow-2xl p-6 md:p-10 transform transition-all duration-500">
        <div className="flex items-center mb-6">
          <div className="bg-indigo-500 p-3 rounded-full mr-4 shrink-0">
            <SpeakerIcon className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Pengumuman Suara AI</h1>
            <p className="text-slate-400 mt-1">
              Ketik teks, pilih bahasa, dan biarkan AI menyuarakannya.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg relative mb-6" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <div className="space-y-6">
            <div className="relative">
                <textarea
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    placeholder="Contoh: Perhatian kepada seluruh pengunjung, toko akan segera tutup dalam 15 menit..."
                    className="w-full h-48 p-4 pr-12 bg-slate-700 border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-300 resize-none text-slate-200 placeholder-slate-500"
                    disabled={isLoading}
                    aria-label="Teks Pengumuman"
                />
                {announcementText && !isLoading && (
                    <button
                        onClick={handleClearText}
                        className="absolute top-4 right-4 p-1 rounded-full text-slate-500 hover:text-slate-200 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                        aria-label="Bersihkan teks"
                        title="Bersihkan teks"
                    >
                        <ClearIcon className="w-5 h-5" />
                    </button>
                )}
            </div>
            
            <div className="flex flex-col sm:flex-row items-baseline justify-between gap-4">
                <label className="text-slate-400 font-medium shrink-0" id="language-label">
                    Bahasa Output:
                </label>
                <div className="flex space-x-2" role="group" aria-labelledby="language-label">
                    {languageOptions.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setSelectedLanguage(key)}
                            disabled={isLoading}
                            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 ${
                                selectedLanguage === key
                                    ? 'bg-indigo-600 text-white shadow'
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            aria-pressed={selectedLanguage === key}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

          <button
            onClick={handleGenerateSpeech}
            disabled={isLoading || !announcementText.trim()}
            className="w-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-opacity-50 text-lg shadow-lg"
          >
            {isLoading ? (
              <>
                <SpinnerIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                Memproses...
              </>
            ) : (
              'Ubah Menjadi Suara'
            )}
          </button>
        </div>
         <footer className="text-center mt-8 text-slate-500 text-sm">
            Ditenagai oleh Gemini API
        </footer>
      </div>
    </div>
  );
};

export default App;
