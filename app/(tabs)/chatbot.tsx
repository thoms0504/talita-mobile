import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { FileText, Menu, Mic, MicOff, Plus, Send, Square, Trash2, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { chatApi, errorMessage, type ChatMessage, type ChatSession } from '@/api';
import { AppHeader } from '@/components/AppHeader';
import { Markdown } from '@/components/Markdown';
import { Button, IconButton, OfflineBanner, T } from '@/components/ui';
import { useOnline } from '@/hooks/useOnline';
import { useSpeech } from '@/hooks/useSpeech';
import { formatDate, formatTime } from '@/lib/format';
import { KEYS, prefs } from '@/lib/storage';
import { clean } from '@/lib/validation';
import { brand, font, useTheme } from '@/theme';

const SUGGESTIONS = ['Apa itu BPS?', 'Data penduduk Lampung', 'Inflasi Bandar Lampung', 'Cara akses data mikro', 'Apa itu IPM?'];
const TALITA = require('../../assets/images/talita-logo.png');

export default function ChatbotScreen() {
  const { c, isDark } = useTheme();
  const online = useOnline();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const speech = useSpeech((text) => setInput(text));

  const loadSessions = useCallback(async () => {
    try {
      const s = await chatApi.sessions();
      setSessions(s);
      prefs.set(KEYS.sessionsCache, s);
      return s;
    } catch {
      const cached = await prefs.get<ChatSession[]>(KEYS.sessionsCache, []);
      setSessions(cached);
      return cached;
    }
  }, []);

  const openSession = useCallback(async (id: number) => {
    setActiveId(id);
    setDrawer(false);
    const cached = await prefs.get<ChatMessage[]>(KEYS.chatCache(id), []);
    setMessages(cached);
    try {
      const fresh = await chatApi.messages(id);
      setMessages(fresh);
      prefs.set(KEYS.chatCache(id), fresh);
    } catch {
      /* offline: tampilkan cache */
    }
  }, []);

  useEffect(() => {
    loadSessions().then((s) => {
      if (s[0]) void openSession(s[0].id);
    });
  }, [loadSessions, openSession]);

  // Cache riwayat lokal untuk mode offline (PRD §7.4), disimpan setelah streaming selesai.
  useEffect(() => {
    if (!streaming && activeId && messages.length) prefs.set(KEYS.chatCache(activeId), messages);
  }, [streaming, activeId, messages]);

  // Hentikan streaming bila pindah tab.
  useFocusEffect(useCallback(() => () => abortRef.current?.abort(), []));

  const newSession = () => {
    abortRef.current?.abort();
    setActiveId(null);
    setMessages([]);
    setDrawer(false);
  };

  const send = async (raw?: string) => {
    const text = clean(raw ?? input);
    if (!text || streaming) return;
    if (!online) return Alert.alert('Tidak ada koneksi', 'Pesan belum bisa dikirim. Periksa koneksi internet Anda.');
    if (speech.listening) speech.stop();
    setInput('');
    const userMsg: ChatMessage = { id: `u${Date.now()}`, role: 'user', content: text, created_at: new Date().toISOString() };
    const botId = `a${Date.now()}`;
    setMessages((m) => [...m, userMsg, { id: botId, role: 'assistant', content: '', pending: true }]);
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;
    let sessionId = activeId;
    try {
      if (!sessionId) {
        const s = await chatApi.createSession(text.slice(0, 60));
        sessionId = s.id;
        setActiveId(s.id);
        setSessions((prev) => [s, ...prev]);
      }
      await chatApi.sendStreaming(
        sessionId,
        text,
        (delta) => setMessages((m) => m.map((x) => (x.id === botId ? { ...x, content: x.content + delta } : x))),
        controller.signal,
      );
      setMessages((m) => m.map((x) => (x.id === botId ? { ...x, pending: false } : x)));
    } catch (e: any) {
      const aborted = e?.name === 'AbortError' || controller.signal.aborted;
      setMessages((m) =>
        m.map((x) =>
          x.id === botId
            ? { ...x, pending: false, failed: !aborted, content: aborted ? x.content || '_Respons dihentikan._' : x.content || `⚠️ ${errorMessage(e, e?.message ? `Gagal mendapatkan jawaban (${e.message}).` : 'Gagal mendapatkan jawaban.')}` }
            : x,
        ),
      );
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const removeSession = (s: ChatSession) =>
    Alert.alert('Hapus sesi?', `Riwayat "${s.title ?? 'Sesi tanpa judul'}" akan dihapus permanen.`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await chatApi.deleteSession(s.id);
            prefs.remove(KEYS.chatCache(s.id));
            setSessions((prev) => prev.filter((x) => x.id !== s.id));
            if (activeId === s.id) newSession();
          } catch (e) {
            Alert.alert('Gagal', errorMessage(e));
          }
        },
      },
    ]);

  const empty = messages.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? c.bg : '#FAF7FF' }}>
      <AppHeader
        title="Chatbot AI"
        subtitle="Asisten TALITA · berbasis dokumen resmi BPS"
        left={<IconButton icon={Menu} label="Buka riwayat sesi" color="#FFFFFF" bg="rgba(255,255,255,0.14)" onPress={() => setDrawer(true)} />}
        right={<IconButton icon={Plus} label="Sesi baru" color="#FFFFFF" bg="rgba(255,255,255,0.14)" onPress={newSession} />}
      />
      <OfflineBanner visible={!online} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        {empty ? (
          <ScrollView contentContainerStyle={{ alignItems: 'center', padding: 24, paddingTop: 36 }} keyboardShouldPersistTaps="handled">
            <View style={{ width: 96, height: 96, borderRadius: 30, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' }}>
              <Image source={TALITA} style={{ width: 76, height: 76, borderRadius: 38 }} accessibilityLabel="TALITA" />
            </View>
            <T w="extrabold" size={21} style={{ marginTop: 18 }}>
              Halo, saya TALITA!
            </T>
            <T w="semibold" size={14} color={isDark ? '#C4B5FD' : '#6D28D9'}>
              Ada yang ingin ditanyakan?
            </T>
            <T muted size={14} style={{ textAlign: 'center', marginTop: 8, maxWidth: 300 }}>
              Jawaban disusun dari dokumen resmi BPS. Coba salah satu topik berikut:
            </T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 20 }}>
              {SUGGESTIONS.map((s) => (
                <Pressable key={s} accessibilityRole="button" onPress={() => send(s)} style={{ height: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: '#DDD6FE', backgroundColor: c.surface, justifyContent: 'center' }}>
                  <T w="semibold" size={13} color={isDark ? '#C4B5FD' : '#5B21B6'}>
                    {s}
                  </T>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => String(m.id)}
            contentContainerStyle={{ padding: 16, gap: 14 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => <Bubble m={item} />}
            ListFooterComponent={
              streaming ? (
                <Pressable accessibilityRole="button" onPress={() => abortRef.current?.abort()} style={{ alignSelf: 'center', marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: '#DDD6FE', backgroundColor: c.surface }}>
                  <Square size={14} color="#6D28D9" />
                  <T w="semibold" size={13} color="#6D28D9">
                    Hentikan respons
                  </T>
                </Pressable>
              ) : null
            }
          />
        )}

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end', padding: 10, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border }}>
          <IconButton icon={speech.listening ? MicOff : Mic} label={speech.listening ? 'Berhenti mendengarkan' : 'Bicara (speech-to-text)'} onPress={speech.toggle} color={speech.listening ? '#FFFFFF' : '#6D28D9'} bg={speech.listening ? brand.chatbot : c.chatbotSoft} />
          <TextInput
            accessibilityLabel="Pertanyaan"
            value={input}
            onChangeText={setInput}
            placeholder={speech.listening ? 'Mendengarkan…' : 'Ketik pertanyaan…'}
            placeholderTextColor={c.textSubtle}
            multiline
            maxLength={2000}
            style={{ flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, borderWidth: 1.5, borderColor: isDark ? c.inputBorder : '#E7DEF5', backgroundColor: isDark ? c.inputBg : '#FBFAFF', paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontFamily: font.regular, fontSize: 14, color: c.text }}
          />
          <IconButton icon={Send} label="Kirim" onPress={() => send()} color="#FFFFFF" bg={brand.chatbot} disabled={!input.trim() || streaming} />
        </View>
      </KeyboardAvoidingView>

      <SessionDrawer open={drawer} onClose={() => setDrawer(false)} sessions={sessions} activeId={activeId} onOpen={openSession} onNew={newSession} onDelete={removeSession} />
    </View>
  );
}

function Bubble({ m }: { m: ChatMessage }) {
  const { c, isDark } = useTheme();
  if (m.role === 'user') {
    return (
      <View style={{ alignSelf: 'flex-end', maxWidth: '82%', alignItems: 'flex-end', gap: 4 }}>
        <View style={{ backgroundColor: brand.chatbot, borderRadius: 18, borderTopRightRadius: 4, paddingVertical: 11, paddingHorizontal: 14 }}>
          <T size={14} color="#FFFFFF" selectable>
            {m.content}
          </T>
        </View>
        {m.created_at ? (
          <T size={11} muted>
            {formatTime(m.created_at, false)}
          </T>
        ) : null}
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', maxWidth: '92%' }}>
      <Image source={TALITA} style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: '#DDD6FE' }} accessibilityLabel="TALITA" />
      <View style={{ flexShrink: 1, backgroundColor: c.surface, borderWidth: 1, borderColor: m.failed ? c.danger : isDark ? c.border : '#EDE5F9', borderRadius: 18, borderTopLeftRadius: 4, paddingVertical: 10, paddingHorizontal: 14 }}>
        {m.pending && !m.content ? (
          <View style={{ flexDirection: 'row', gap: 5, paddingVertical: 6 }} accessibilityLabel="TALITA sedang mengetik">
            {['#A78BFA', '#C4B5FD', '#DDD6FE'].map((col) => (
              <View key={col} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: col }} />
            ))}
          </View>
        ) : (
          <Markdown>{m.content}</Markdown>
        )}
        {!m.pending && !m.failed && m.content ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 2, backgroundColor: c.chatbotSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
            <FileText size={12} color={isDark ? '#C4B5FD' : '#6D28D9'} />
            <T w="semibold" size={11} color={isDark ? '#C4B5FD' : '#6D28D9'}>
              Sumber: dokumen resmi BPS
            </T>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function SessionDrawer({ open, onClose, sessions, activeId, onOpen, onNew, onDelete }: {
  open: boolean; onClose: () => void; sessions: ChatSession[]; activeId: number | null; onOpen: (id: number) => void; onNew: () => void; onDelete: (s: ChatSession) => void;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const x = useRef(new Animated.Value(-320)).current;
  useEffect(() => {
    Animated.timing(x, { toValue: open ? 0 : -320, duration: 220, useNativeDriver: true }).start();
  }, [open, x]);
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable accessibilityLabel="Tutup riwayat sesi" onPress={onClose} style={{ flex: 1, backgroundColor: c.overlay }} />
      <Animated.View
        accessibilityViewIsModal
        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 308, backgroundColor: c.surface, borderTopRightRadius: 24, borderBottomRightRadius: 24, paddingTop: insets.top + 12, transform: [{ translateX: x }] }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 12 }}>
          <View style={{ flex: 1 }}>
            <T w="extrabold" size={18} accessibilityRole="header">
              Riwayat Sesi
            </T>
            <T muted size={12}>
              Tersimpan di akun Anda
            </T>
          </View>
          <IconButton icon={X} label="Tutup" onPress={onClose} bg={c.surfaceAlt} />
        </View>
        <View style={{ padding: 16 }}>
          <Button title="Sesi baru" icon={Plus} color={brand.chatbot} onPress={onNew} size="sm" />
        </View>
        <FlatList
          data={sessions}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: insets.bottom + 20 }}
          ListEmptyComponent={
            <T muted size={13} style={{ padding: 16 }}>
              Belum ada sesi. Mulai bertanya untuk membuat sesi pertama.
            </T>
          }
          renderItem={({ item }) => {
            const on = item.id === activeId;
            return (
              <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 12, backgroundColor: on ? c.chatbotSoft : 'transparent' }}>
                <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => onOpen(item.id)} style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 12 }}>
                  <T w={on ? 'bold' : 'medium'} size={14} numberOfLines={1}>
                    {item.title || 'Sesi tanpa judul'}
                  </T>
                  <T muted size={12}>
                    {formatDate(item.updated_at ?? item.created_at, { short: true })}
                  </T>
                </Pressable>
                <IconButton icon={Trash2} label={`Hapus sesi ${item.title ?? ''}`} color={c.textSubtle} onPress={() => onDelete(item)} />
              </View>
            );
          }}
        />
      </Animated.View>
    </Modal>
  );
}
