import { router } from 'expo-router';
import { ArrowUp, Check, Eye, MessageCircle } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, View } from 'react-native';
import type { ForumPost } from '@/api';
import { formatNumber, relativeTime } from '@/lib/format';
import { useTheme } from '@/theme';
import { Badge, T, TagPill } from './ui';

/** Dianggap terjawab bila ada jawaban terpilih; jika backend belum punya field itu, cukup ≥1 jawaban. */
export const isAnswered = (p: ForumPost) => (p.accepted_answer_id != null ? true : p.answer_count > 0);

export const ForumCard = memo(function ForumCard({ post }: { post: ForumPost }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${post.judul}. ${post.vote_count} vote, ${post.answer_count} jawaban`}
      onPress={() => router.push(`/forum/${post.id}`)}
      style={({ pressed }) => ({ backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 18, padding: 14, opacity: pressed ? 0.85 : 1 })}
    >
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
        <T w="bold" size={15} style={{ flex: 1 }} numberOfLines={2}>
          {post.judul}
        </T>
        {isAnswered(post) ? <Badge label="Terjawab" fg={c.success} bg={c.successSoft} icon={Check} /> : null}
      </View>
      <T muted size={13} numberOfLines={2} style={{ marginTop: 6 }}>
        {post.deskripsi}
      </T>
      {post.tags.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {post.tags.map((t) => (
            <TagPill key={t.id} name={t.name} />
          ))}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12 }}>
        <Stat icon={ArrowUp} value={post.vote_count} />
        <Stat icon={MessageCircle} value={post.answer_count} />
        {post.view_count != null ? <Stat icon={Eye} value={post.view_count} /> : null}
        <T muted size={12} numberOfLines={1} style={{ marginLeft: 'auto', flexShrink: 1 }}>
          @{post.author?.username} · {relativeTime(post.created_at)}
        </T>
      </View>
    </Pressable>
  );
});

function Stat({ icon: Icon, value }: { icon: typeof Eye; value: number }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Icon size={14} color={c.textMuted} />
      <T muted size={12}>
        {formatNumber(value)}
      </T>
    </View>
  );
}
