import { router, useFocusEffect } from 'expo-router';
import { MessageSquarePlus, Plus, Search, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { forumApi, type ForumPost, type Tag } from '@/api';
import { AppHeader } from '@/components/AppHeader';
import { ForumCard } from '@/components/ForumCard';
import { Button, Chip, EmptyState, IconButton, Loading, OfflineBanner, Segmented } from '@/components/ui';
import { useOnline } from '@/hooks/useOnline';
import { formatNumber } from '@/lib/format';
import { KEYS, prefs } from '@/lib/storage';
import { font, useTheme } from '@/theme';

type Tab = 'all' | 'mine';

export default function ForumScreen() {
  const { c } = useTheme();
  const online = useOnline();
  const [tab, setTab] = useState<Tab>('all');
  const [tags, setTags] = useState<Tag[]>([]);
  const [tag, setTag] = useState<string>('');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [mine, setMine] = useState<ForumPost[] | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const reqId = useRef(0);

  const load = useCallback(
    async (p = 1) => {
      const id = ++reqId.current;
      try {
        const res = await forumApi.posts({ page: p, search, tag });
        if (id !== reqId.current) return;
        setPosts((prev) => (p === 1 ? res.posts : [...prev, ...res.posts.filter((x) => !prev.some((y) => y.id === x.id))]));
        setPage(res.page);
        setPages(res.pages);
        setTotal(res.total);
        if (p === 1 && !search && !tag) prefs.set(KEYS.forumCache, res);
      } catch {
        if (p === 1 && !search && !tag) {
          const cached = await prefs.get<{ posts: ForumPost[]; total: number } | null>(KEYS.forumCache, null);
          if (cached) {
            setPosts(cached.posts);
            setTotal(cached.total);
            setPages(1);
          }
        }
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    },
    [search, tag],
  );

  useEffect(() => {
    forumApi.tags().then(setTags).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    void load(1);
  }, [load]);

  // Debounce pencarian.
  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 400);
    return () => clearTimeout(t);
  }, [query]);

  const loadMine = useCallback(() => {
    forumApi.myQuestions().then(setMine).catch(() => setMine((m) => m ?? []));
  }, []);
  useFocusEffect(useCallback(() => (tab === 'mine' ? loadMine() : undefined), [tab, loadMine]));

  const onRefresh = async () => {
    setRefreshing(true);
    if (tab === 'mine') await forumApi.myQuestions().then(setMine).catch(() => {});
    else await load(1);
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (tab !== 'all' || loadingMore || page >= pages || !online) return;
    setLoadingMore(true);
    await load(page + 1);
    setLoadingMore(false);
  };

  const data = tab === 'mine' ? (mine ?? []).filter((p) => !tag || p.tags.some((t) => t.name === tag)) : posts;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AppHeader
        title="Forum Diskusi"
        subtitle={`${formatNumber(total)} pertanyaan · temukan jawaban bersama komunitas`}
        right={<IconButton icon={Plus} label="Buat pertanyaan" color="#7C2D12" bg="#FDE68A" onPress={() => router.push('/forum/create')} disabled={!online} />}
      />
      <OfflineBanner visible={!online} />
      <View style={{ paddingHorizontal: 16, paddingTop: 14, gap: 12 }}>
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { key: 'all', label: 'Semua Pertanyaan' },
            { key: 'mine', label: 'Pertanyaan Saya' },
          ]}
        />
        {tab === 'all' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', height: 46, borderRadius: 14, borderWidth: 1.5, borderColor: c.inputBorder, backgroundColor: c.inputBg, paddingLeft: 14 }}>
            <Search size={18} color={c.textSubtle} />
            <TextInput
              accessibilityLabel="Cari pertanyaan"
              value={query}
              onChangeText={setQuery}
              placeholder="Cari pertanyaan…"
              placeholderTextColor={c.textSubtle}
              returnKeyType="search"
              style={{ flex: 1, paddingHorizontal: 10, fontFamily: font.regular, fontSize: 14, color: c.text }}
            />
            {query ? <IconButton icon={X} label="Hapus pencarian" onPress={() => setQuery('')} color={c.textSubtle} /> : null}
          </View>
        ) : null}
      </View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
          <Chip label="Semua" selected={!tag} onPress={() => setTag('')} />
          {tags.map((t) => (
            <Chip key={t.id} label={t.name} selected={tag === t.name} onPress={() => setTag(tag === t.name ? '' : t.name)} />
          ))}
        </ScrollView>
      </View>

      {loading && tab === 'all' ? (
        <Loading />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(p) => String(p.id)}
          renderItem={({ item }) => <ForumCard post={item} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[c.primary]} tintColor={c.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          initialNumToRender={8}
          ListFooterComponent={loadingMore ? <Loading /> : null}
          ListEmptyComponent={
            tab === 'mine' && mine == null ? (
              <Loading />
            ) : (
              <EmptyState
                icon={MessageSquarePlus}
                title={tab === 'mine' ? 'Belum ada pertanyaan' : 'Tidak ada hasil'}
                text={tab === 'mine' ? 'Pertanyaan yang Anda buat akan muncul di sini.' : tag ? `Belum ada pertanyaan dengan tag ${tag}.` : 'Coba kata kunci lain.'}
                action={tab === 'mine' ? <Button title="Buat pertanyaan" size="sm" onPress={() => router.push('/forum/create')} style={{ marginTop: 8 }} /> : undefined}
              />
            )
          }
        />
      )}
    </View>
  );
}
