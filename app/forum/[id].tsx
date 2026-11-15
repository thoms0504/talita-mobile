import { useLocalSearchParams } from 'expo-router';
import { ArrowDown, ArrowUp, Check, Flag, Paperclip, Send, Share2 } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActionSheetIOS, Alert, KeyboardAvoidingView, Linking, Platform, Pressable, RefreshControl, ScrollView, Share, TextInput, View } from 'react-native';
import { attachmentName, attachmentUrl, errorMessage, forumApi, type Attachment, type ForumAnswer, type ForumPost } from '@/api';
import { AppHeader } from '@/components/AppHeader';
import { Markdown } from '@/components/Markdown';
import { Avatar, Badge, Card, EmptyState, IconButton, Loading, T, TagPill } from '@/components/ui';
import { WEB_ORIGIN } from '@/config';
import { useOnline } from '@/hooks/useOnline';
import { formatNumber, relativeTime } from '@/lib/format';
import { clean } from '@/lib/validation';
import { useAuth } from '@/store/auth';
import { font, useTheme } from '@/theme';

type Vote = 1 | -1 | null;
const REPORT_REASONS = ['Spam atau promosi', 'Konten tidak pantas', 'Informasi menyesatkan', 'Lainnya'];

export default function ForumDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = Number(id);
  const { c } = useTheme();
  const online = useOnline();
  const me = useAuth((s) => s.user);
  const [post, setPost] = useState<ForumPost | null>(null);
  const [answers, setAnswers] = useState<ForumAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await forumApi.detail(postId);
      setPost(d.post);
      setAnswers(d.answers);
      setError('');
    } catch (e) {
      setError(errorMessage(e, 'Pertanyaan tidak dapat dimuat.'));
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Optimistic vote: klik arah yang sama membatalkan vote. */
  const applyVote = <V extends { vote_count: number; user_vote: Vote }>(item: V, dir: 1 | -1): V => {
    const prev = item.user_vote ?? 0;
    const next: Vote = item.user_vote === dir ? null : dir;
    return { ...item, user_vote: next, vote_count: item.vote_count - prev + (next ?? 0) };
  };

  const votePost = async (dir: 1 | -1) => {
    if (!post) return;
    const before = post;
    setPost(applyVote(post, dir));
    try {
      const r = await forumApi.votePost(post.id, dir);
      if (r?.vote_count != null) setPost((p) => (p ? { ...p, vote_count: r.vote_count!, user_vote: r.user_vote ?? p.user_vote } : p));
    } catch (e) {
      setPost(before);
      Alert.alert('Vote gagal', errorMessage(e));
    }
  };

  const voteAnswer = async (a: ForumAnswer, dir: 1 | -1) => {
    setAnswers((list) => list.map((x) => (x.id === a.id ? applyVote(x, dir) : x)));
    try {
      const r = await forumApi.voteAnswer(a.id, dir);
      if (r?.vote_count != null) setAnswers((list) => list.map((x) => (x.id === a.id ? { ...x, vote_count: r.vote_count!, user_vote: r.user_vote ?? x.user_vote } : x)));
    } catch (e) {
      setAnswers((list) => list.map((x) => (x.id === a.id ? a : x)));
      Alert.alert('Vote gagal', errorMessage(e));
    }
  };

  const submitAnswer = async () => {
    const content = clean(reply);
    if (content.length < 5) return Alert.alert('Jawaban terlalu pendek', 'Tulis jawaban minimal 5 karakter.');
    setSending(true);
    try {
      const a = await forumApi.answer(postId, content);
      setReply('');
      if (a?.id) setAnswers((list) => [...list, { ...a, author: a.author ?? (me as any), attachments: a.attachments ?? [], vote_count: a.vote_count ?? 0, user_vote: null } as ForumAnswer]);
      else await load();
      setPost((p) => (p ? { ...p, answer_count: p.answer_count + 1 } : p));
    } catch (e) {
      Alert.alert('Gagal mengirim', errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const report = () => {
    const doReport = async (reason: string) => {
      try {
        await forumApi.report(postId, reason);
        Alert.alert('Terima kasih', 'Laporan Anda sudah dikirim ke admin.');
      } catch (e) {
        Alert.alert('Gagal melapor', errorMessage(e));
      }
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ title: 'Laporkan konten', options: [...REPORT_REASONS, 'Batal'], cancelButtonIndex: REPORT_REASONS.length, destructiveButtonIndex: 0 }, (i) => i < REPORT_REASONS.length && doReport(REPORT_REASONS[i]));
    } else {
      Alert.alert('Laporkan konten', 'Pilih alasan laporan', [...REPORT_REASONS.slice(0, 3).map((r) => ({ text: r, onPress: () => doReport(r) })), { text: 'Batal', style: 'cancel' as const }]);
    }
  };

  const share = () => post && Share.share({ message: `${post.judul}\n${WEB_ORIGIN}/forum/${post.id}`, url: `${WEB_ORIGIN}/forum/${post.id}` });

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AppHeader
        title="Detail Pertanyaan"
        subtitle="Forum Komunitas"
        back
        right={
          <>
            <IconButton icon={Share2} label="Bagikan" color="#FFFFFF" bg="rgba(255,255,255,0.14)" onPress={share} />
            <IconButton icon={Flag} label="Laporkan konten" color="#FFFFFF" bg="rgba(255,255,255,0.14)" onPress={report} />
          </>
        }
      />
      {loading ? (
        <Loading />
      ) : !post ? (
        <EmptyState icon={Flag} title="Tidak dapat dimuat" text={error} />
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => (setRefreshing(true), await load(), setRefreshing(false))} colors={[c.primary]} />}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Avatar name={post.author?.nama_lengkap ?? post.author?.username} url={post.author?.avatar_url} size={36} />
                <View style={{ flex: 1 }}>
                  <T w="bold">@{post.author?.username}</T>
                  <T muted size={12}>
                    {relativeTime(post.created_at)}
                    {post.view_count != null ? ` · ${formatNumber(post.view_count)} dilihat` : ''}
                  </T>
                </View>
              </View>
              <T w="extrabold" size={19} style={{ marginTop: 14, lineHeight: 26 }} accessibilityRole="header">
                {post.judul}
              </T>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <Voter count={post.vote_count} vote={post.user_vote} onVote={votePost} disabled={!online} />
                <View style={{ flex: 1 }}>
                  <Markdown>{post.deskripsi}</Markdown>
                  <Attachments items={post.attachments} />
                </View>
              </View>
              {post.tags.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {post.tags.map((t) => (
                    <TagPill key={t.id} name={t.name} />
                  ))}
                </View>
              ) : null}
            </Card>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <T w="extrabold" size={16}>
                {answers.length} Jawaban
              </T>
              <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
            </View>

            {answers.map((a) => {
              const accepted = a.is_accepted || post.accepted_answer_id === a.id;
              return (
                <Card key={a.id} style={accepted ? { borderColor: '#6EE7B7', borderWidth: 1.5 } : undefined}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Avatar name={a.author?.nama_lengkap ?? a.author?.username} url={a.author?.avatar_url} size={36} />
                    <View style={{ flex: 1 }}>
                      <T w="bold">{a.author?.role === 'admin' ? 'Admin BPS Lampung' : `@${a.author?.username}`}</T>
                      <T muted size={12}>
                        {relativeTime(a.created_at)}
                      </T>
                    </View>
                    {accepted ? <Badge label="Jawaban terpilih" fg={c.success} bg={c.successSoft} icon={Check} /> : null}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                    <Voter count={a.vote_count} vote={a.user_vote} onVote={(d) => voteAnswer(a, d)} disabled={!online} />
                    <View style={{ flex: 1 }}>
                      <Markdown>{a.content}</Markdown>
                      <Attachments items={a.attachments} />
                    </View>
                  </View>
                </Card>
              );
            })}
            {answers.length === 0 ? (
              <T muted style={{ textAlign: 'center', paddingVertical: 12 }}>
                Belum ada jawaban. Jadilah yang pertama menjawab!
              </T>
            ) : null}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end', padding: 12, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border }}>
            <TextInput
              accessibilityLabel="Jawaban Anda"
              value={reply}
              onChangeText={setReply}
              placeholder={online ? 'Tulis jawaban Anda…' : 'Offline — tidak bisa menjawab'}
              editable={online}
              placeholderTextColor={c.textSubtle}
              multiline
              maxLength={5000}
              style={{ flex: 1, minHeight: 48, maxHeight: 140, borderRadius: 14, borderWidth: 1.5, borderColor: c.inputBorder, backgroundColor: c.inputBg, paddingHorizontal: 14, paddingVertical: 12, fontFamily: font.regular, fontSize: 14, color: c.text }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Kirim jawaban"
              disabled={sending || !reply.trim() || !online}
              onPress={submitAnswer}
              style={({ pressed }) => ({ height: 48, paddingHorizontal: 16, borderRadius: 14, backgroundColor: c.primary, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: sending || !reply.trim() ? 0.5 : pressed ? 0.85 : 1 })}
            >
              <Send size={16} color="#FFFFFF" />
              <T w="bold" color="#FFFFFF">
                {sending ? 'Mengirim…' : 'Kirim'}
              </T>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

function Voter({ count, vote, onVote, disabled }: { count: number; vote: Vote; onVote: (d: 1 | -1) => void; disabled?: boolean }) {
  const { c } = useTheme();
  const btn = (dir: 1 | -1) => {
    const on = vote === dir;
    const Icon = dir === 1 ? ArrowUp : ArrowDown;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={dir === 1 ? 'Upvote' : 'Downvote'}
        accessibilityState={{ selected: on, disabled }}
        disabled={disabled}
        onPress={() => onVote(dir)}
        style={{ width: 44, height: 40, borderRadius: 12, borderWidth: 1, borderColor: on ? c.primary : c.border, backgroundColor: on ? c.primarySoft : c.surface, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon size={18} color={on || dir === 1 ? c.primary : c.textSubtle} strokeWidth={2.2} />
      </Pressable>
    );
  };
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      {btn(1)}
      <T w="extrabold" size={16} accessibilityLabel={`${count} vote`}>
        {count}
      </T>
      {btn(-1)}
    </View>
  );
}

function Attachments({ items }: { items?: Attachment[] }) {
  const { c } = useTheme();
  if (!items?.length) return null;
  return (
    <View style={{ gap: 6, marginTop: 6 }}>
      {items.map((a, i) => {
        const url = attachmentUrl(a);
        return (
          <Pressable key={a.id ?? i} accessibilityRole="link" onPress={() => url && Linking.openURL(url)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 10, backgroundColor: c.surfaceAlt }}>
            <Paperclip size={14} color={c.textMuted} />
            <T size={13} numberOfLines={1} style={{ flex: 1 }}>
              {attachmentName(a)}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}
