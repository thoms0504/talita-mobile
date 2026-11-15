import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

/**
 * Speech-to-Text native (PRD F-11) memakai expo-speech-recognition
 * (SFSpeechRecognizer di iOS, SpeechRecognizer di Android), bahasa Indonesia.
 */
export function useSpeech(onText: (text: string, final: boolean) => void) {
  const [listening, setListening] = useState(false);

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

  const start = useCallback(async () => {
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Izin mikrofon', 'Aktifkan izin mikrofon & pengenalan suara di Pengaturan untuk bertanya dengan suara.');
      return;
    }
    ExpoSpeechRecognitionModule.start({ lang: 'id-ID', interimResults: true, continuous: false });
  }, []);

  const stop = useCallback(() => ExpoSpeechRecognitionModule.stop(), []);

  return { listening, start, stop, toggle: () => (listening ? stop() : start()) };
}
