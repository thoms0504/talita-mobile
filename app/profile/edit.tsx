import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Camera, ImageIcon, Lock } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { authApi, errorMessage } from '@/api';
import { AppHeader } from '@/components/AppHeader';
import { Avatar, Button, Segmented, T, TextField } from '@/components/ui';
import { MAX_AVATAR_BYTES } from '@/config';
import { clean, isUsername } from '@/lib/validation';
import { useAuth } from '@/store/auth';
import { useTheme } from '@/theme';

type Gender = 'L' | 'P';
const toGender = (g?: string | null): Gender => (g && /^p/i.test(g) ? 'P' : 'L');

export default function EditProfile() {
  const { c } = useTheme();
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const [nama, setNama] = useState(user?.nama_lengkap ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [gender, setGender] = useState<Gender>(toGender(user?.jenis_kelamin));
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const pick = async (source: 'camera' | 'library') => {
    const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Izin diperlukan', source === 'camera' ? 'Aktifkan izin kamera di Pengaturan.' : 'Aktifkan izin galeri di Pengaturan.');
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 };
    const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled) return;
    const a = res.assets[0];
    if (a.fileSize && a.fileSize > MAX_AVATAR_BYTES) return Alert.alert('Foto terlalu besar', 'Pilih foto maksimal 2 MB.');
    setPhoto(a); // pratinjau sebelum disimpan
    setSaved(false);
  };

  const save = async () => {
    const e: Record<string, string> = {};
    if (clean(nama).length < 3) e.nama = 'Nama minimal 3 karakter';
    if (!isUsername(username)) e.username = '3–30 karakter: huruf, angka, titik atau garis bawah';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    setSaved(false);
    try {
      const updated = await authApi.updateProfile({ nama_lengkap: clean(nama), username: username.trim(), jenis_kelamin: gender });
      let avatar_url = updated?.avatar_url ?? user?.avatar_url ?? null;
      if (photo) {
        avatar_url =
          (await authApi.uploadAvatar({ uri: photo.uri, name: photo.fileName ?? `avatar-${Date.now()}.jpg`, type: photo.mimeType ?? 'image/jpeg', size: photo.fileSize })) ?? avatar_url;
      }
      setUser({ ...(user as any), ...(updated ?? {}), nama_lengkap: clean(nama), username: username.trim(), jenis_kelamin: gender, avatar_url });
      setPhoto(null);
      setSaved(true);
      setTimeout(() => router.back(), 700);
    } catch (err) {
      Alert.alert('Gagal menyimpan', errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AppHeader title="Edit Profil" back />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', gap: 12 }}>
            <View style={{ borderWidth: 3, borderColor: '#FDBA74', borderRadius: 38, overflow: 'hidden' }}>
              {photo ? (
                <View>
                  <Image source={{ uri: photo.uri }} style={{ width: 108, height: 108 }} accessibilityLabel="Pratinjau foto profil baru" />
                  <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(124,45,18,0.78)', paddingVertical: 3 }}>
                    <T w="bold" size={11} color="#FFFFFF" style={{ textAlign: 'center' }}>
                      PRATINJAU
                    </T>
                  </View>
                </View>
              ) : (
                <Avatar name={user?.nama_lengkap ?? user?.username} url={user?.avatar_url} size={108} radius={0} />
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title="Kamera" icon={Camera} variant="outline" size="sm" onPress={() => pick('camera')} />
              <Button title="Galeri" icon={ImageIcon} variant="outline" size="sm" onPress={() => pick('library')} />
            </View>
            <T muted size={12}>
              JPG/PNG, maks. 2 MB
            </T>
          </View>
          <TextField label="Nama lengkap" value={nama} onChangeText={setNama} error={errors.nama} />
          <TextField label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} error={errors.username} />
          <TextField label="Email" icon={Lock} value={user?.email ?? ''} editable={false} hint="Email tidak dapat diubah" />
          <View>
            <T w="semibold" size={13} style={{ marginBottom: 6 }}>
              Jenis kelamin
            </T>
            <Segmented<Gender>
              value={gender}
              onChange={setGender}
              options={[
                { key: 'L', label: 'Laki-laki' },
                { key: 'P', label: 'Perempuan' },
              ]}
            />
          </View>
          {saved ? (
            <View style={{ padding: 12, borderRadius: 14, backgroundColor: c.successSoft }} accessibilityLiveRegion="polite">
              <T w="semibold" size={13} color={c.success}>
                Profil berhasil disimpan
              </T>
            </View>
          ) : null}
        </ScrollView>
        <View style={{ padding: 16, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border }}>
          <Button title="Simpan Perubahan" onPress={save} loading={saving} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
