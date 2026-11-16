import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

type SpeechLib = typeof import('expo-speech-recognition');

/**
 * Modul native tidak tersedia di Expo Go; require langsung akan melempar
 * "Cannot find native module" dan menjatuhkan seluruh aplikasi. Jadi dimuat
 * defensif: di Expo Go speech nonaktif, di development build berfungsi penuh.
 */
let lib: SpeechLib | null = null;
try {
  lib = require('expo-speech-recognition') as SpeechLib;
  if (!lib.ExpoSpeechRecognitionModule) lib = null;
} catch {
  lib = null;
}

/**
 * Speech-to-Text native (PRD F-11) memakai expo-speech-recognition
 * (SFSpeechRecognizer di iOS, SpeechRecognizer di Android), bahasa Indonesia.
 */
export function useSpeech(onText: (text: string, final: boolean) => void) {
  const [listening, setListening] = useState(false);

  // `lib` konstan selama proses berjalan, jadi urutan hook tetap stabil.
  if (lib) {
    const { useSpeechRecognitionEvent } = lib;
    /* eslint-disable react-hooks/rules-of-hooks */
    useSpeechRecognitionEvent('start', () => setListening(true));
    useSpeechRecognitionEvent('end', () => setListening(false));
    useSpeechRecognitionEvent('result', (e) => {
      const t = e.results?.[0]?.transcript;
      if (t) onText(t, e.isFinal);
    });
    useSpeechRecognitionEvent('error', (e) => {
      setListening(false);
      if (e.error !== 'no-speech' && e.error !== 'aborted') Alert.alert('Mikrofon', 'Suara tidak dapat dikenali. Coba lagi.');
    });
    /* eslint-enable react-hooks/rules-of-hooks */
  }

  const start = useCallback(async () => {
    if (!lib) {
      Alert.alert('Tidak tersedia', 'Input suara membutuhkan development build dan tidak bisa dipakai di Expo Go.');
      return;
    }
    const { ExpoSpeechRecognitionModule } = lib;
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Izin mikrofon', 'Aktifkan izin mikrofon & pengenalan suara di Pengaturan untuk bertanya dengan suara.');
      return;
    }
    ExpoSpeechRecognitionModule.start({ lang: 'id-ID', interimResults: true, continuous: false });
  }, []);

  const stop = useCallback(() => lib?.ExpoSpeechRecognitionModule.stop(), []);

  return { listening, start, stop, toggle: () => (listening ? stop() : start()) };
}
