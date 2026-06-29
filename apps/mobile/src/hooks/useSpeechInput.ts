import { useCallback, useEffect, useRef, useState } from "react";

// Lazily resolve the native module. A static `import` from
// "expo-speech-recognition" throws at module-eval time when the native module
// is not present in the binary (e.g. an older dev client), which would crash
// any screen that imports this hook. Requiring it inside try/catch keeps the
// feature optional and degrades to `supported: false`.
type SpeechModule = {
  ExpoSpeechRecognitionModule: {
    start: (opts: Record<string, unknown>) => void;
    stop: () => void;
    requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  };
  addSpeechRecognitionListener: (
    event: string,
    cb: (e: { isFinal?: boolean; results?: { transcript?: string }[] }) => void
  ) => { remove: () => void };
  isRecognitionAvailable: () => boolean;
};

function loadSpeech(): SpeechModule | null {
  try {
    // biome-ignore lint/suspicious/noExplicitAny: optional native module
    const mod = require("expo-speech-recognition") as any;
    if (!mod?.isRecognitionAvailable?.()) return null;
    return mod as SpeechModule;
  } catch {
    return null;
  }
}

function localeTag(lang: string): string {
  return lang === "es" ? "es-ES" : "en-US";
}

export function useSpeechInput(lang: string, onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const moduleRef = useRef<SpeechModule | null | undefined>(undefined);

  if (moduleRef.current === undefined) {
    moduleRef.current = loadSpeech();
  }
  const speech = moduleRef.current;
  const supported = speech !== null;

  useEffect(() => {
    if (!speech) return;
    const resultSub = speech.addSpeechRecognitionListener("result", (e) => {
      const transcript = e.results?.[0]?.transcript?.trim();
      if (e.isFinal && transcript) onResultRef.current(transcript);
    });
    const endSub = speech.addSpeechRecognitionListener("end", () =>
      setListening(false)
    );
    const errorSub = speech.addSpeechRecognitionListener("error", () =>
      setListening(false)
    );
    return () => {
      resultSub.remove();
      endSub.remove();
      errorSub.remove();
    };
  }, [speech]);

  const wantListeningRef = useRef(false);

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    try {
      speech?.ExpoSpeechRecognitionModule.stop();
    } catch {
      /* noop */
    }
    setListening(false);
  }, [speech]);

  const start = useCallback(async () => {
    if (!speech) return;
    wantListeningRef.current = true;
    setListening(true);
    const perm =
      await speech.ExpoSpeechRecognitionModule.requestPermissionsAsync();
    // If the user released (push-to-talk) before the permission resolved, abort.
    if (!perm.granted || !wantListeningRef.current) {
      setListening(false);
      return;
    }
    speech.ExpoSpeechRecognitionModule.start({
      lang: localeTag(lang),
      interimResults: false,
      continuous: false,
    });
  }, [speech, lang]);

  return { supported, listening, start, stop };
}
