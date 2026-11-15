import { router } from 'expo-router';
import { Info, Send } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { errorMessage, forumApi, type Tag } from '@/api';
import { AppHeader } from '@/components/AppHeader';
import { Button, Chip, T, TextField } from '@/components/ui';
import { clean, validateQuestion } from '@/lib/validation';
import { useTheme } from '@/theme';

const MAX_TAGS = 5;

export default function CreateQuestion() {
  const { c } = useTheme();
  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    forumApi.tags().then(setTags).catch(() => {});
  }, []);

  const toggle = (name: string) =>
    setSelected((s) => (s.includes(name) ? s.filter((x) => x !== name) : s.length < MAX_TAGS ? [...s, name] : s));

  const submit = async () => {
    const input = { judul: clean(judul), deskripsi: clean(deskripsi), tags: selected };
    const e = validateQuestion(input);
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      const post = await forumApi.create(input);
      router.replace(post?.id ? `/forum/${post.id}` : '/(tabs)/forum');
    } catch (err) {
      Alert.alert('Gagal memposting', errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AppHeader title="Buat Pertanyaan" subtitle="Forum Komunitas" back />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 18 }} keyboardShouldPersistTaps="handled">
          <TextField label={`Judul pertanyaan (${judul.length}/150)`} value={judul} onChangeText={setJudul} maxLength={150} placeholder="Contoh: Perbedaan data kemiskinan Maret dan September" error={errors.judul} />
          <TextField
            label="Isi pertanyaan"
            value={deskripsi}
            onChangeText={setDeskripsi}
            multiline
            numberOfLines={7}
            maxLength={5000}
            placeholder="Jelaskan konteks, data yang Anda gunakan, dan apa yang ingin diketahui"
            hint="Mendukung Markdown: **tebal**, _miring_, daftar, tabel."
            error={errors.deskripsi}
            style={{ minHeight: 160 }}
          />
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <T w="semibold" size={13}>
                Tag
              </T>
              <T muted size={13}>
                {selected.length}/{MAX_TAGS} dipilih
              </T>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {tags.map((t) => (
                <Chip key={t.id} label={t.name} small selected={selected.includes(t.name)} onPress={() => toggle(t.name)} />
              ))}
            </View>
            {errors.tags ? (
              <T size={12} color={c.danger} style={{ marginTop: 6 }}>
                {errors.tags}
              </T>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A' }}>
            <Info size={20} color="#B45309" />
            <View style={{ flex: 1 }}>
              <T w="bold" size={13} color="#78350F">
                Tips diskusi
              </T>
              <T size={13} color="#78350F">
                Gunakan judul yang spesifik, tambahkan tag, dan sertakan sumber data yang Anda gunakan.
              </T>
            </View>
          </View>
        </ScrollView>
        <View style={{ padding: 16, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border }}>
          <Button title="Posting Pertanyaan" icon={Send} onPress={submit} loading={loading} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
