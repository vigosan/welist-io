import { useCallback, useEffect, useRef, useState } from "react";
import {
  addSpeechRecognitionListener,
  ExpoSpeechRecognitionModule,
  isRecognitionAvailable,
} from "expo-speech-recognition";

function localeTag(lang: string): string {
  return lang === "es" ? "es-ES" : "en-US";
}

/**
 * Wraps expo-speech-recognition with a small web-parity surface
 * ({ supported, listening, start, stop }). `supported` is false when the
 * native module is unavailable (e.g. dev client not rebuilt), so callers can
 * hide the mic button and degrade gracefully.
 */
export function useSpeechInput(lang: string, onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const supported = (() => {
    try {
      return isRecognitionAvailable();
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    if (!supported) return;
    const resultSub = addSpeechRecognitionListener("result", (e) => {
      const transcript = e.results?.[0]?.transcript?.trim();
      if (e.isFinal && transcript) onResultRef.current(transcript);
    });
    const endSub = addSpeechRecognitionListener("end", () =>
      setListening(false)
    );
    const errorSub = addSpeechRecognitionListener("error", () =>
      setListening(false)
    );
    return () => {
      resultSub.remove();
      endSub.remove();
      errorSub.remove();
    };
  }, [supported]);

  const stop = useCallback(() => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      /* noop */
    }
    setListening(false);
  }, []);

  const start = useCallback(async () => {
    if (!supported) return;
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) return;
    setListening(true);
    ExpoSpeechRecognitionModule.start({
      lang: localeTag(lang),
      interimResults: false,
      continuous: false,
    });
  }, [supported, lang]);

  return { supported, listening, start, stop };
}
