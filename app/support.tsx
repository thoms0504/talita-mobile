import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import { CheckCheck, Check, FileText, Headphones, Paperclip, Send, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, FlatList, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, TextInput, View } from 'react-native';
import {
  attachmentName, attachmentUrl, errorMessage, isImageAttachment, supportApi, type Attachment, type SupportMessage,
} from '@/api';
import { AppHeader } from '@/components/AppHeader';
import { IconButton, OfflineBanner, T } from '@/components/ui';
import { MAX_UPLOAD_BYTES } from '@/config';
import { useOnline } from '@/hooks/useOnline';
import { formatBytes, formatDate, formatTime, parseServerDate } from '@/lib/format';
import { notifyLocal } from '@/lib/notifications';
import { EVENTS, getSocket } from '@/lib/socket';
import { clean } from '@/lib/validation';
import { useAuth } from '@/store/auth';
import { brand, font, useTheme } from '@/theme';

const GREEN = ['#047857', '#065F46'] as const;

const isFromAdmin = (m: SupportMessage, myId?: number) =>
  m.is_admin ?? (m.sender_role ? m.sender_role === 'admin' : m.sender_id != null && myId != null ? m.sender_id !== myId : false);

export default function SupportScreen() {
  const { c, isDark } = useTheme();
  const online = useOnline();
  const me = useAuth((s) => s.user);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState('');
  const [adminOnline, setAdminOnline] = useState<boolean | null>(null);
  const [adminTyping, setAdminTyping] = useState(false);
  const [connected, setConnected] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<Attachment | null>(null);
  const listRef = useRef<FlatList<SupportMessage>>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmit = useRef(0);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => (appState.current = s));
    return () => sub.remove();
  }, []);

  // Riwayat via REST (fallback bila socket putus — mitigasi risiko §12).
  const loadHistory = useCallback(async () => {
    try {
      setMessages(await supportApi.messages());
    } catch {
      /* offline */
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  // Polling ringan selama socket belum tersambung.
  useEffect(() => {
    if (connected || !online) return;
    const t = setInterval(loadHistory, 15000);
    return () => clearInterval(t);
  }, [connected, online, loadHistory]);

  useEffect(() => {
    let active = true;
    let cleanup = () => {};
    (async () => {
      const socket = await getSocket();
      if (!active) return;
      const join = () => {
        setConnected(true);
        socket.emit(EVENTS.joinRoom, { user_id: me?.id });
        void loadHistory(); // sinkronkan pesan yang terlewat saat reconnect
      };
      const onDisconnect = () => setConnected(false);
      const onMessage = (m: SupportMessage) => {
        setMessages((prev) => {
          // ganti pesan lokal "sending" yang sama, hindari duplikat
          const isEcho = (x: SupportMessage) => String(x.id).startsWith('local-') && x.content === m.content && !isFromAdmin(m, me?.id);
          const without = prev.filter((x) => !isEcho(x) && x.id !== m.id);
          return [...without, m];
        });
        if (isFromAdmin(m, me?.id)) {
          setAdminTyping(false);
          if (appState.current !== 'active') void notifyLocal('Admin BPS', m.content || 'Mengirim lampiran', { category: 'admin', url: '/support' });
          socket.emit(EVENTS.messageRead, { message_id: m.id });
        }
      };
      const onStatus = (s: any) => setAdminOnline(typeof s === 'boolean' ? s : !!(s?.online ?? s?.is_online));
      const onRead = (p: any) => {
        const ids: (string | number)[] = p?.message_ids ?? (p?.message_id != null ? [p.message_id] : []);
        setMessages((prev) => prev.map((x) => (ids.length === 0 || ids.includes(x.id) ? (isFromAdmin(x, me?.id) ? x : { ...x, is_read: true }) : x)));
      };
      const onTyping = (p: any) => {
        if (p?.is_admin === false || p?.sender_role === 'user') return;
        setAdminTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setAdminTyping(false), 3500);
      };
      socket.on('connect', join);
      socket.on('disconnect', onDisconnect);
      socket.on(EVENTS.receiveMessage, onMessage);
      socket.on(EVENTS.adminStatus, onStatus);
      socket.on(EVENTS.messageRead, onRead);
      socket.on(EVENTS.adminTyping, onTyping);
      if (socket.connected) join();
      else socket.connect();
      cleanup = () => {
        socket.off('connect', join);
        socket.off('disconnect', onDisconnect);
        socket.off(EVENTS.receiveMessage, onMessage);
        socket.off(EVENTS.adminStatus, onStatus);
        socket.off(EVENTS.messageRead, onRead);
        socket.off(EVENTS.adminTyping, onTyping);
      };
    })();
    return () => {
      active = false;
      cleanup();
    };
  }, [me?.id, loadHistory]);

  const emitTyping = async () => {
    const now = Date.now();
    if (now - lastTypingEmit.current < 2000) return;
    lastTypingEmit.current = now;
    (await getSocket()).emit(EVENTS.typing, { user_id: me?.id });
  };

  const sendRaw = async (content: string, attachment?: Attachment | null) => {
    if (!content && !attachment) return;
    if (!online) return Alert.alert('Tidak ada koneksi', 'Pesan akan bisa dikirim setelah Anda online kembali.');
    const local: SupportMessage = { id: `local-${Date.now()}`, content, attachment: attachment ?? null, created_at: new Date().toISOString(), sender_role: 'user', local: 'sending' };
    setMessages((m) => [...m, local]);
    const socket = await getSocket();
    const mark = (state: SupportMessage['local']) => setMessages((m) => m.map((x) => (x.id === local.id ? { ...x, local: state } : x)));
    if (!socket.connected) {
      mark('failed');
      return;
    }
    // Server tidak wajib mengirim ack: pesan dianggap terkirim begitu di-emit saat tersambung,
    // lalu diganti oleh echo `receive_message` dari server bila ada.
    socket.emit(EVENTS.sendMessage, { content, attachment_id: attachment?.id, attachment });
    mark(undefined);
  };

  const send = async (attachment?: Attachment) => {
    const content = clean(input);
    if (!content && !attachment) return;
    setInput('');
    await sendRaw(content, attachment);
  };

  const retry = (m: SupportMessage) => {
    setMessages((list) => list.filter((x) => x.id !== m.id));
    void sendRaw(m.content, m.attachment);
  };

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true, multiple: false });
    if (res.canceled) return;
    const f = res.assets[0];
    if (f.size && f.size > MAX_UPLOAD_BYTES) return Alert.alert('File terlalu besar', `Maksimal ${formatBytes(MAX_UPLOAD_BYTES)}.`);
    setUploading(true);
    try {
      const att = await supportApi.upload({ uri: f.uri, name: f.name, type: f.mimeType ?? 'application/octet-stream', size: f.size });
      await send({ ...att, filename: att.filename ?? f.name, mime_type: att.mime_type ?? f.mimeType, size: att.size ?? f.size });
    } catch (e) {
      Alert.alert('Gagal mengunggah', errorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const statusText = !online ? 'Offline' : adminOnline == null ? (connected ? 'Terhubung' : 'Menghubungkan…') : adminOnline ? 'Admin online' : 'Admin sedang offline — pesan tetap terkirim';

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? c.bg : '#F3FBF7' }}>
      <AppHeader
        title="Admin BPS Lampung"
        subtitle={statusText}
        back
        colors={GREEN}
        zigzagColor="#6EE7B7"
        right={
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
            <Headphones size={22} color={brand.support} />
            <View style={{ position: 'absolute', right: -2, bottom: -2, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#065F46', backgroundColor: adminOnline ? '#4ADE80' : '#A8A29E' }} />
          </View>
        }
      />
      <OfflineBanner visible={!online} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListHeaderComponent={
            <View style={{ alignSelf: 'center', backgroundColor: isDark ? c.surface : '#E3F3EB', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 4 }}>
              <T w="semibold" size={11} muted>
                Tabik pun! Tim admin BPS Lampung siap membantu.
              </T>
            </View>
          }
          renderItem={({ item, index }) => {
            const prev = messages[index - 1];
            const day = formatDate(item.created_at);
            const showDay = !prev || formatDate(prev.created_at) !== day;
            return (
              <>
                {showDay ? (
                  <T w="semibold" size={11} muted style={{ alignSelf: 'center', marginVertical: 4 }}>
                    {sameDay(item.created_at) ? 'Hari ini' : day}
                  </T>
                ) : null}
                <MessageBubble m={item} fromAdmin={isFromAdmin(item, me?.id)} onOpen={setPreview} onRetry={() => retry(item)} />
              </>
            );
          }}
          ListFooterComponent={
            adminTyping ? (
              <T size={12} muted style={{ marginTop: 8 }} accessibilityLiveRegion="polite">
                Admin sedang mengetik…
              </T>
            ) : null
          }
        />
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end', padding: 10, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: isDark ? c.border : '#D1FAE5' }}>
          <IconButton icon={Paperclip} label="Lampirkan gambar atau PDF" onPress={pickFile} color={brand.support} bg={c.supportSoft} disabled={uploading || !online} />
          <TextInput
            accessibilityLabel="Pesan"
            value={input}
            onChangeText={(t) => {
              setInput(t);
              void emitTyping();
            }}
            placeholder={uploading ? 'Mengunggah lampiran…' : 'Ketik pesan…'}
            placeholderTextColor={c.textSubtle}
            multiline
            maxLength={2000}
            style={{ flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, borderWidth: 1.5, borderColor: isDark ? c.inputBorder : '#D1FAE5', backgroundColor: isDark ? c.inputBg : '#F8FDFB', paddingHorizontal: 16, paddingVertical: 11, fontFamily: font.regular, fontSize: 14, color: c.text }}
          />
          <IconButton icon={Send} label="Kirim" onPress={() => send()} color="#FFFFFF" bg={brand.support} disabled={!input.trim()} />
        </View>
      </KeyboardAvoidingView>

      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center' }}>
          <View style={{ position: 'absolute', top: 48, right: 16, zIndex: 2 }}>
            <IconButton icon={X} label="Tutup pratinjau" color="#FFFFFF" bg="rgba(255,255,255,0.15)" onPress={() => setPreview(null)} />
          </View>
          {preview ? <Image source={{ uri: attachmentUrl(preview) ?? undefined }} style={{ width: '100%', height: '75%' }} contentFit="contain" accessibilityLabel={attachmentName(preview)} /> : null}
        </View>
      </Modal>
    </View>
  );
}

function sameDay(v: string) {
  return formatDate(v) === formatDate(new Date());
}

function MessageBubble({ m, fromAdmin, onOpen, onRetry }: { m: SupportMessage; fromAdmin: boolean; onOpen: (a: Attachment) => void; onRetry: () => void }) {
  const { c, isDark } = useTheme();
  const att = m.attachment ?? m.attachments?.[0] ?? null;
  const time = parseServerDate(m.created_at) ? formatTime(m.created_at, false) : '';
  const body = (
    <>
      {att ? (
        isImageAttachment(att) && attachmentUrl(att) ? (
          <Pressable accessibilityRole="imagebutton" accessibilityLabel={`Pratinjau ${attachmentName(att)}`} onPress={() => onOpen(att)}>
            <Image source={{ uri: attachmentUrl(att)! }} style={{ width: 200, height: 140, borderRadius: 12 }} contentFit="cover" />
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="link"
            onPress={() => {
              const u = attachmentUrl(att);
              if (u) Linking.openURL(u);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 6 }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={20} color="#B91C1C" />
            </View>
            <View style={{ flexShrink: 1 }}>
              <T w="bold" size={13} numberOfLines={1} color={fromAdmin ? undefined : '#FFFFFF'}>
                {attachmentName(att)}
              </T>
              <T size={12} color={fromAdmin ? c.textMuted : 'rgba(255,255,255,0.85)'}>
                {[formatBytes(att.size), 'Ketuk untuk membuka'].filter(Boolean).join(' · ')}
              </T>
            </View>
          </Pressable>
        )
      ) : null}
      {m.content ? (
        <T size={14} color={fromAdmin ? undefined : '#FFFFFF'} selectable style={{ paddingHorizontal: att ? 6 : 0, paddingTop: att ? 6 : 0 }}>
          {m.content}
        </T>
      ) : null}
    </>
  );
  if (fromAdmin) {
    return (
      <View style={{ maxWidth: '82%', gap: 4 }}>
        <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: isDark ? c.border : '#D1FAE5', borderRadius: 18, borderTopLeftRadius: 4, padding: att ? 6 : 12 }}>{body}</View>
        <T size={11} muted>
          Admin · {time}
        </T>
      </View>
    );
  }
  return (
    <View style={{ alignSelf: 'flex-end', maxWidth: '82%', alignItems: 'flex-end', gap: 4 }}>
      <View style={{ backgroundColor: brand.support, borderRadius: 18, borderTopRightRadius: 4, padding: att ? 6 : 12, opacity: m.local === 'sending' ? 0.7 : 1 }}>{body}</View>
      {m.local === 'failed' ? (
        <Pressable accessibilityRole="button" onPress={onRetry}>
          <T size={11} color={c.danger}>
            Gagal terkirim · ketuk untuk coba lagi
          </T>
        </Pressable>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} accessibilityLabel={m.local === 'sending' ? 'Mengirim' : m.is_read ? 'Dibaca' : 'Terkirim'}>
          <T size={11} muted>
            {m.local === 'sending' ? 'Mengirim…' : time}
          </T>
          {m.local ? null : m.is_read ? <CheckCheck size={14} color="#0E7490" /> : <Check size={14} color={c.textSubtle} />}
        </View>
      )}
    </View>
  );
}
