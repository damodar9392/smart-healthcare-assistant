import { useCallback, useEffect, useRef, useState } from 'react';

const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

const requiresSecureContext = () =>
  typeof window !== 'undefined' &&
  !window.isSecureContext &&
  window.location &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1';

const LANG_MAP = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  hi: 'hi-IN',
  bn: 'bn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  pa: 'pa-IN',
  ur: 'ur-PK',
  ar: 'ar-SA',
  pt: 'pt-BR',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR',
  ru: 'ru-RU',
  it: 'it-IT',
  nl: 'nl-NL',
  tr: 'tr-TR',
  th: 'th-TH',
  vi: 'vi-VN',
  id: 'id-ID',
};

const FEMALE_VOICE_KEYWORDS = [
  'female',
  'woman',
  'lady',
  'zira',
  'hazel',
  'samantha',
  'karen',
  'moira',
  'tessa',
  'veena',
  'google',
  'microsoft',
];

const useVoice = ({ lang = 'en', onResult, onEnd } = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState({ stt: false, tts: false });
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const preferredVoiceRef = useRef(null);
  const activeUtteranceRef = useRef(null);
  const voicesLoadedRef = useRef(false);
  const manuallyStoppedRef = useRef(false);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef(null);
  const idleTimerRef = useRef(null);
  const restartTimerRef = useRef(null);
  const recentFinalRef = useRef(false);
  const hadInterimRef = useRef(false);
  const speechTokenRef = useRef(0);
  const startListeningRef = useRef(() => {});

  useEffect(() => {
    setIsSupported({
      stt: !!SpeechRecognition,
      tts: !!synthRef.current,
    });
  }, []);

  const pickVoiceForLang = useCallback(
    (voices, langCode) => {
      const matching = voices.filter((v) => v.lang.toLowerCase().startsWith(langCode));
      return (
        matching.find((v) =>
          FEMALE_VOICE_KEYWORDS.some((kw) => v.name.toLowerCase().includes(kw)),
        ) ||
        matching[0] ||
        null
      );
    },
    [],
  );

  const loadVoices = useCallback(() => {
    if (!synthRef.current) return;
    const voices = synthRef.current.getVoices();
    if (voices.length === 0) return;
    voicesLoadedRef.current = true;

    const langCode = (lang || 'en').split('-')[0].split('_')[0].toLowerCase();
    const preferred = pickVoiceForLang(voices, langCode) || voices.find((v) => v.lang.startsWith('en'));
    preferredVoiceRef.current = preferred;
  }, [lang, pickVoiceForLang]);

  useEffect(() => {
    const synth = synthRef.current;
    if (!synth) return;
    loadVoices();
    synth.onvoiceschanged = loadVoices;
    return () => {
      synth.onvoiceschanged = null;
    };
  }, [loadVoices]);

  const startListening = useCallback((fromRetry = false) => {
    if (!fromRetry) {
      retryCountRef.current = 0;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    }
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    if (requiresSecureContext()) {
      setError('Voice input requires a secure (HTTPS) connection. Open the site over HTTPS or localhost.');
      return;
    }
    setError(null);
    setInterimText('');

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    const langCode = LANG_MAP[(lang || 'en').split('-')[0].split('_')[0].toLowerCase()] || 'en-US';
    recognition.lang = langCode;

    // Stop only after a real pause in speech, never mid-sentence. The idle
    // timer resets on every result so a long question is captured in full.
    const clearIdle = () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
    const armIdle = () => {
      clearIdle();
      idleTimerRef.current = setTimeout(() => {
        try {
          recognition.stop();
        } catch {
          // recognition already ended
        }
      }, 12000);
    };

    recognition.onstart = () => {
      armIdle();
      setIsListening(true);
    };

    recognition.onspeechend = () => {
      armIdle();
    };

    recognition.onresult = (event) => {
      armIdle();
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      if (interim) {
        hadInterimRef.current = true;
      }
      setInterimText(interim);
      if (final) {
        hadInterimRef.current = false;
        recentFinalRef.current = true;
        setInterimText('');
        onResult?.(final.trim());
        clearIdle();
        try {
          recognition.stop();
        } catch {
          // recognition already ended
        }
      }
    };

    recognition.onerror = (event) => {
      clearIdle();
      const err = event.error;
      if (err === 'not-allowed') {
        setError('Microphone access denied. Click the padlock in the address bar and allow microphone permission.');
      } else if (err === 'language-not-supported') {
        setError('Speech recognition does not support this language in your browser. Try English or Hindi.');
      } else if (err === 'service-not-allowed') {
        setError('The speech recognition service is not allowed in this browser.');
      } else if (err === 'audio-capture') {
        setError('No microphone found. Plug in a microphone and try again.');
      } else if (err === 'network') {
        if (retryCountRef.current < 3) {
          retryCountRef.current += 1;
          setError(null);
          setIsListening(false);
          if (recognitionRef.current === recognition) recognitionRef.current = null;
          retryTimerRef.current = setTimeout(
            () => startListeningRef.current(true),
            2000 * retryCountRef.current
          );
          return;
        }
        setError(
          navigator.onLine === false
            ? "You appear to be offline. Voice recognition needs the internet. Reconnect and tap the mic again, or type your message."
            : 'Voice recognition could not connect to the browser speech service. Please restart your browser, make sure the microphone is allowed (padlock icon in the address bar), and disable ad-blockers/VPN, then tap the mic again. You can also type your message.'
        );
      } else if (err === 'no-speech') {
        setError(null);
      } else if (err !== 'aborted') {
        setError(`Voice error: ${err}`);
      }
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      setIsListening(false);
    };

    recognition.onend = () => {
      clearIdle();
      if (recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
      setInterimText('');
      setIsListening(false);
      // The recognizer was stopped by the user (or after a network error retry).
      if (manuallyStoppedRef.current) {
        return;
      }
      // A sentence finished and was sent; the session is over.
      if (recentFinalRef.current) {
        recentFinalRef.current = false;
        onEnd?.();
        return;
      }
      // The recognizer dropped out mid-word/with a pause but the overall
      // spoken sentence is not complete yet — restart quickly so nothing is
      // lost, instead of forcing the user to tap the mic again.
      if (hadInterimRef.current) {
        hadInterimRef.current = false;
        setIsListening(true);
        restartTimerRef.current = setTimeout(() => {
          startListeningRef.current(true);
        }, 400);
        return;
      }
      onEnd?.();
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      clearIdle();
      recognitionRef.current = null;
      setError('The microphone is busy. Wait a moment and try again.');
      setIsListening(false);
    }
  }, [lang, onResult, onEnd]);

  const stopListening = useCallback(() => {
    manuallyStoppedRef.current = true;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    retryCountRef.current = 0;
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    hadInterimRef.current = false;
    recentFinalRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore — recognizer may already be stopped
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimText('');
  }, []);

  const speak = useCallback(
    (text) => {
      const synth = synthRef.current;
      if (!synth || !text) {
        if (!synth && text) {
          setError('Text-to-speech is not supported in this browser. Replies will only be shown as text.');
        }
        return;
      }

      const langCode = (lang || 'en').split('-')[0].split('_')[0].toLowerCase();

      if (!voicesLoadedRef.current) {
        const voices = synth.getVoices();
        if (voices.length > 0) {
          voicesLoadedRef.current = true;
          if (!preferredVoiceRef.current) {
            preferredVoiceRef.current = pickVoiceForLang(voices, langCode) || voices[0];
          }
        }
      }

      const useVoiceForLang =
        preferredVoiceRef.current &&
        preferredVoiceRef.current.lang.toLowerCase().startsWith(langCode)
          ? preferredVoiceRef.current
          : pickVoiceForLang(synth.getVoices(), langCode);

      // Chromium's speechSynthesis pauses after roughly 15 seconds of audio.
      // Split long replies into sentence-sized chunks and play them back to
      // back so nothing is truncated. The token invalidates any previous
      // playback (cancel() also fires event handlers on the old utterance).
      const token = ++speechTokenRef.current;
      const chunks = (text.match(/.{1,160}(?:\s+|$)/g) || [text])
        .map((c) => c.trim())
        .filter(Boolean);

      const speakChunk = (index) => {
        if (speechTokenRef.current !== token) return;
        if (index >= chunks.length) {
          setIsSpeaking(false);
          activeUtteranceRef.current = null;
          return;
        }
        const utterance = new SpeechSynthesisUtterance(chunks[index]);
        utterance.rate = 0.92;
        utterance.pitch = 1.15;
        utterance.volume = 1;
        utterance.lang = LANG_MAP[langCode] || 'en-US';
        if (useVoiceForLang) {
          utterance.voice = useVoiceForLang;
          utterance.lang = useVoiceForLang.lang;
        }
        utterance.onstart = () => {
          if (speechTokenRef.current === token) setIsSpeaking(true);
        };
        utterance.onend = () => speakChunk(index + 1);
        utterance.onerror = () => speakChunk(index + 1);
        activeUtteranceRef.current = utterance;
        try {
          synth.speak(utterance);
        } catch {
          speakChunk(index + 1);
        }
      };

      synth.cancel();
      setTimeout(() => speakChunk(0), 80);
    },
    [lang, pickVoiceForLang],
  );

  const stopSpeaking = useCallback(() => {
    speechTokenRef.current += 1;
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
    activeUtteranceRef.current = null;
  }, []);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      retryCountRef.current = 0;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      manuallyStoppedRef.current = false;
      stopSpeaking();
      startListening();
    }
  }, [isListening, startListening, stopListening, stopSpeaking]);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      stopListening();
      stopSpeaking();
    };
  }, [stopListening, stopSpeaking]);

  return {
    isListening,
    isSpeaking,
    isSupported,
    interimText,
    error,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    toggleListening,
  };
};

export default useVoice;
