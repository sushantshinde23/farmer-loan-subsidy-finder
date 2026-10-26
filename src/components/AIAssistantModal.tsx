import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  X,
  Send,
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  source?: string;
  timestamp: string;
}

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BROWSER_LANG_MAP: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
  bn: 'bn-IN',
  gu: 'gu-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  pa: 'pa-IN',
  as: 'as-IN',
  or: 'or-IN',
  ur: 'ur-IN'
};

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({ isOpen, onClose }) => {
  const { user, farmerProfile } = useAuth();
  const { language, t } = useLanguage();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize or update welcome message whenever language or modal opens
  useEffect(() => {
    if (messages.length === 0 || messages[0]?.id === 'welcome') {
      const welcomeText = t(
        'aiWelcomeGreeting',
        `Namaste ${user?.fullName ? user.fullName.split(' ')[0] : 'Kisan Mitra'}! 🙏\nI am Krishi Sahayak, your verified Government Agricultural Scheme & Financial Assistant.\n\nAsk me about subsidies (PM-KUSUM Solar Pumps, Drip Irrigation), Kisan Credit Card (4% interest), required documents, or eligibility criteria.`
      );
      setMessages([
        {
          id: 'welcome',
          sender: 'ai',
          text: welcomeText,
          source: 'VERIFIED_DATABASE',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [language, isOpen]);

  const quickQuestions = [
    t('quickQ1', 'How do I get 60% subsidy on PM-KUSUM solar pumps?'),
    t('quickQ2', 'What are the interest rates and limits for Kisan Credit Card (KCC)?'),
    t('quickQ3', 'What is the subsidy rate for Drip Irrigation under PDMC?'),
    t('quickQ4', 'Which documents are needed for PM-KISAN ₹6,000 assistance?'),
    t('quickQ5', 'Can tenant farmers apply for agricultural loans?')
  ];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = BROWSER_LANG_MAP[language] || 'en-IN';

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          setIsRecording(false);
        };

        recognition.onerror = () => {
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const toggleRecording = () => {
    if (!speechSupported || !recognitionRef.current) {
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: 'ai',
          text: t('aiVoiceNotSupported', 'Voice recognition is not available in this browser. Please type your query in the chat box below.'),
          source: 'OFFICIAL_GUIDELINES',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Recognition start error:', err);
      }
    }
  };

  const handleSpeak = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    // Clean markdown formatting for clean speech
    const cleanText = text.replace(/[*_#`[\]()]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = BROWSER_LANG_MAP[language] || 'en-IN';
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (userText?: string) => {
    const textToSend = userText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await api.askKrishiSahayak(textToSend, language, {
        farmerName: user?.fullName,
        state: user?.state,
        district: user?.district,
        landAreaAcres: farmerProfile?.landAreaAcres,
        primaryCrops: farmerProfile?.primaryCrops
      });

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.reply,
        source: res.source,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: t('aiError', 'Unable to reach the scheme knowledge server. Please verify your connection or browse schemes in the Schemes directory.'),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[90vh] max-h-[680px] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 bg-gradient-to-r from-emerald-800 via-emerald-900 to-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Bot className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base leading-tight">
                  {t('aiAssistantTitle', 'Krishi Sahayak AI')}
                </h2>
                <span className="flex items-center gap-1 text-[10px] font-semibold bg-emerald-700/80 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-500/40">
                  <ShieldCheck className="w-3 h-3" />
                  {t('aiGroundedBadge', 'Grounded in Official Schemes')}
                </span>
              </div>
              <p className="text-xs text-emerald-200/90 font-medium">
                {t('aiAssistantSubtitle', 'Verified Agricultural Scheme & Finance Assistant')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-emerald-200 hover:text-white transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Questions Carousel */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 overflow-x-auto flex items-center gap-2 no-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            {t('aiSuggestedTitle', 'Suggested:')}
          </span>
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="text-xs shrink-0 px-2.5 py-1 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#fbfbf9]/60 dark:bg-slate-900/60">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 shadow-xs text-xs sm:text-sm leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-emerald-700 text-white rounded-tr-none'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <span>{m.timestamp}</span>
                    {m.source && (
                      <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        {t('docVerified', 'Verified')}
                      </span>
                    )}
                  </div>
                  {m.sender === 'ai' && (
                    <button
                      onClick={() => handleSpeak(m.text)}
                      className="flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-500 transition px-1 py-0.5 rounded"
                      title={t('btnListen', 'Listen')}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>{t('btnListen', 'Listen')}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-none p-3.5 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>{t('statusUnderReview', 'Checking verified government rules & schemes...')}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Legal Disclaimer Bar */}
        <div className="px-4 py-1.5 bg-amber-50 dark:bg-amber-950/30 border-t border-amber-200 dark:border-amber-900/40 text-[10px] text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
          <span className="font-bold shrink-0">Note:</span>
          <span className="truncate">
            {t('aiDisclaimer', 'Based on available verified government records. Final approval depends on official departmental verification.')}
          </span>
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isRecording ? t('aiListening', 'Listening...') : t('aiInputPlaceholder', 'Ask about solar pumps, KCC, eligibility, documents in your language...')}
              className="flex-1 py-2.5 px-3.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            {/* Voice Input Button */}
            <button
              type="button"
              onClick={toggleRecording}
              className={`p-2.5 rounded-xl border transition ${
                isRecording
                  ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-200'
              }`}
              title={isRecording ? 'Listening... click to stop' : 'Speak your question'}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white transition active:scale-95"
              title="Send question"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
