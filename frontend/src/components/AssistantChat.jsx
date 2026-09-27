import { useCallback, useEffect, useRef, useState } from 'react';
import { assistantApi } from '../services/api';
import useVoice from '../hooks/useVoice';

const WELCOME = {
  role: 'bot',
  text: 'Hello! I am your health assistant. Tap the microphone and tell me how you feel — I understand many languages and will reply in yours.',
};

const LANG_LABELS = {
  en: 'English',
  es: 'Espanol',
  fr: 'Francais',
  de: 'Deutsch',
  hi: 'Hindi',
  bn: 'Bengali',
  ta: 'Tamil',
  te: 'Telugu',
  mr: 'Marathi',
  gu: 'Gujarati',
  kn: 'Kannada',
  ml: 'Malayalam',
  pa: 'Punjabi',
  ur: 'Urdu',
  ar: 'Arabic',
  pt: 'Portuguese',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ru: 'Russian',
  it: 'Italian',
  nl: 'Dutch',
  tr: 'Turkish',
  th: 'Thai',
  vi: 'Vietnamese',
  id: 'Indonesian',
};

const LANG_OPTIONS = [
  { code: 'auto', label: 'Auto-detect' },
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'ar', label: 'Arabic' },
  { code: 'bn', label: 'Bengali' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'mr', label: 'Marathi' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'pa', label: 'Punjabi' },
  { code: 'ur', label: 'Urdu' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ru', label: 'Russian' },
];

const AssistantChat = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [detectedLang, setDetectedLang] = useState(null);
  const [voiceLang, setVoiceLang] = useState('auto');
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const effectiveLang = voiceLang === 'auto' ? detectedLang || 'en' : voiceLang;
  const sendMessageRef = useRef(null);

  const {
    isListening,
    isSpeaking,
    isSupported,
    interimText,
    error: voiceError,
    toggleListening,
    speak,
    stopSpeaking,
  } = useVoice({
    lang: effectiveLang,
    onResult: useCallback((text) => {
      setInput(text);
      setTimeout(() => sendMessageRef.current?.(text), 100);
    }, []),
  });

  const sendMessage = useCallback(
    async (text) => {
      const message = text?.trim();
      if (!message || busy) return;

      setInput('');
      setMessages((prev) => [...prev, { role: 'user', text: message }]);
      setBusy(true);

      try {
        const { data } = await assistantApi.chat(message, conversationId);
        const result = data?.data || data;
        const lang = result.detectedLanguage;
        if (lang && lang !== 'en') setDetectedLang(lang);
        if (result.conversationId) setConversationId(result.conversationId);

        setMessages((prev) => [
          ...prev,
          {
            role: 'bot',
            text: result.reply,
            language: lang,
            specialty: result.recommendedSpecialty,
            urgency: result.urgencyLevel,
          },
        ]);

        if (autoSpeak && result.reply) {
          setTimeout(() => speak(result.reply), 200);
        }
      } catch {
        setInput(message);
        const errMsg = 'Sorry, I could not reach the server. Your message is restored below — tap send to retry.';
        setMessages((prev) => [...prev, { role: 'bot', text: errMsg }]);
        if (autoSpeak) setTimeout(() => speak(errMsg), 200);
      } finally {
        setBusy(false);
      }
    },
    [busy, autoSpeak, speak, conversationId],
  );

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleMicClick = () => {
    if (isSpeaking) stopSpeaking();
    if (busy && !isListening) return;
    toggleListening();
  };

  const startNewConversation = () => {
    setMessages([WELCOME]);
    setConversationId(null);
    setDetectedLang(null);
  };

  return (
    <div className="assistant-chat">
      {open && (
        <div className="chat-panel" role="dialog" aria-label="AI Health Assistant">
          <div className="chat-header">
            <span className="chat-avatar" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </span>
            <div>
              <strong>Health Assistant</strong>
              <small>Speak or type in any language</small>
            </div>
            <button
              type="button"
              className="chat-close"
              aria-label="Close assistant"
              onClick={() => { setOpen(false); stopSpeaking(); }}
            >
              x
            </button>
          </div>

          <div className="chat-toolbar">
            <button
              type="button"
              className="chat-toolbar-btn"
              onClick={startNewConversation}
              aria-label="New conversation"
              title="New conversation"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14" /><path d="M5 12h14" />
              </svg>
            </button>
            <button
              type="button"
              className={`chat-toolbar-btn ${showSettings ? 'active' : ''}`}
              onClick={() => setShowSettings((p) => !p)}
              aria-label="Voice settings"
              title="Settings"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
            <div className="chat-toolbar-lang">
              <span className="chat-lang-icon">🌐</span>
              <select
                value={voiceLang}
                onChange={(e) => setVoiceLang(e.target.value)}
                aria-label="Select language"
              >
                {LANG_OPTIONS.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>
            <label className="chat-toggle-label" title="Auto-speak replies">
              <input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} />
              <span className="chat-toggle-switch" />
              <span className="chat-toggle-text">Voice</span>
            </label>
          </div>

          {showSettings && (
            <div className="chat-settings-panel">
              <div className="chat-settings-info">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                </svg>
                <span>
                  {isSupported.stt && isSupported.tts
                    ? 'Voice features ready. Tap the mic to speak.'
                    : !isSupported.stt
                      ? 'Speech recognition not available in this browser. Try Chrome or Edge.'
                      : 'Text-to-speech not available.'}
                </span>
              </div>
              {detectedLang && (
                <div className="chat-settings-info">
                  <span className="chat-detected-flag">{LANG_LABELS[detectedLang] || detectedLang}</span>
                  <span>detected from your speech</span>
                </div>
              )}
            </div>
          )}

          <div className="chat-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`chat-msg ${msg.role}`}>
                {msg.urgency && msg.urgency !== 'low' && (
                  <span className={`chat-urgency chat-urgency-${msg.urgency}`}>
                    {msg.urgency === 'emergency' ? '!' : msg.urgency === 'high' ? '!' : 'i'} {msg.urgency}
                  </span>
                )}
                {msg.specialty && <span className="chat-specialty">{msg.specialty}</span>}
                <div className="chat-msg-text">{msg.text}</div>
                {msg.language && msg.language !== 'en' && (
                  <span className="chat-lang">{msg.language}</span>
                )}
                {msg.role === 'bot' && (
                  <button
                    type="button"
                    className="chat-speak-btn"
                    onClick={() => speak(msg.text)}
                    disabled={isSpeaking}
                    title="Listen to this reply"
                    aria-label="Read aloud"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
            {busy && (
              <div className="chat-msg bot chat-typing" aria-label="Assistant is typing">
                <span /><span /><span />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {voiceError && (
            <div className="chat-voice-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" />
              </svg>
              {voiceError}
            </div>
          )}

          {isListening && (
            <div className="chat-listening-bar">
              <div className="chat-listening-waves">
                <span /><span /><span /><span /><span />
              </div>
              <span className="chat-listening-text">
                {interimText || 'Listening... speak now'}
              </span>
            </div>
          )}

          <div className="chat-input-area">
            <form className="chat-input-row" onSubmit={handleFormSubmit}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type or tap mic to speak..."
                maxLength={500}
                aria-label="Message"
                disabled={busy}
              />
              <button type="submit" className="chat-send-btn" disabled={busy || !input.trim()} aria-label="Send">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>

            <div className="chat-mic-row">
              <button
                type="button"
                className={`chat-mic-btn ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}
                onClick={handleMicClick}
                aria-label={isListening ? 'Stop listening' : isSpeaking ? 'Stop speaking' : 'Tap to speak'}
                title={!isSupported.stt ? 'Voice input not supported in this browser' : 'Tap to speak'}
              >
                <div className="chat-mic-ripple" />
                <div className="chat-mic-inner">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                  </svg>
                </div>
              </button>
              <span className="chat-mic-hint">
                {isListening ? 'Tap to stop' : isSpeaking ? 'Tap to stop audio' : 'Tap to speak'}
              </span>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        className="chat-fab"
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? 'x' : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default AssistantChat;
