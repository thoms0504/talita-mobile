import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import { CalendarDays, Check, Clock, Info, Lock, Send, Users, Video, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { errorMessage, zoomApi, type ZoomRequest, type ZoomSlot } from '@/api';
import { AppHeader } from '@/components/AppHeader';
import { Badge, Button, Card, Chip, EmptyState, Loading, OfflineBanner, Segmented, T, TextField } from '@/components/ui';
import { useOnline } from '@/hooks/useOnline';
import { formatClock, formatDate, parseServerDate, toHHmm, toISODate } from '@/lib/format';
import { clean, validateZoom } from '@/lib/validation';
import { useAuth } from '@/store/auth';
import { brand, useTheme } from '@/theme';

/** Topik sama dengan web (PRD F-06). */
const TOPICS = ['Inflasi/PDRB', 'Kemiskinan', 'Metodologi', 'Penelitian', 'Dataset Mikro', 'Lainnya'];
type Tab = 'form' | 'history';
type PickerKind = 'date' | 'start' | 'end' | null;

export default function ZoomScreen() {
  const { c } = useTheme();
  const online = useOnline();
  const [tab, setTab] = useState<Tab>('form');
  const [requests, setRequests] = useState<ZoomRequest[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      setRequests(await zoomApi.myRequests());
    } catch {
      setRequests((r) => r ?? []);
    }
  }, []);
  useFocusEffect(useCallback(() => void loadRequests(), [loadRequests]));

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AppHeader title="Konsultasi Zoom" subtitle="Tatap muka virtual dengan petugas BPS" />
      <OfflineBanner visible={!online} />
      <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          accent="#1D4ED8"
          options={[
            { key: 'form', label: 'Ajukan' },
            { key: 'history', label: `Riwayat${requests?.length ? ` (${requests.length})` : ''}` },
          ]}
        />
      </View>
      {tab === 'form' ? (
        <RequestForm
          onSubmitted={async () => {
            await loadRequests();
            setTab('history');
          }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 14 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => (setRefreshing(true), await loadRequests(), setRefreshing(false))} colors={[brand.zoom]} />}
        >
          {requests == null ? (
            <Loading />
          ) : requests.length === 0 ? (
            <EmptyState icon={Video} title="Belum ada pengajuan" text="Pengajuan konsultasi Zoom Anda akan tampil di sini." />
          ) : (
            requests.map((r) => <RequestCard key={r.id} r={r} />)
          )}
        </ScrollView>
      )}
    </View>
  );
}

function RequestForm({ onSubmitted }: { onSubmitted: () => void }) {
  const { c } = useTheme();
  const user = useAuth((s) => s.user);
  const [instansi, setInstansi] = useState('');
  const [topic, setTopic] = useState(TOPICS[0]);
  const [customTopic, setCustomTopic] = useState('');
  const [ket, setKet] = useState('');
  const [tanggal, setTanggal] = useState<Date | null>(null);
  const [mulai, setMulai] = useState<Date | null>(null);
  const [selesai, setSelesai] = useState<Date | null>(null);
  const [picker, setPicker] = useState<PickerKind>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slots, setSlots] = useState<ZoomSlot[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    zoomApi.calendar().then(setSlots).catch(() => setSlots([]));
  }, []);

  /** Slot terisi dikelompokkan per tanggal, ditampilkan vertikal (bukan grid) di mobile. */
  const grouped = useMemo(() => {
    const today = toISODate(new Date());
    const m = new Map<string, ZoomSlot[]>();
    (slots ?? [])
      .filter((s) => s.tanggal >= today)
      .sort((a, b) => (a.tanggal + a.jam_mulai).localeCompare(b.tanggal + b.jam_mulai))
      .forEach((s) => m.set(s.tanggal, [...(m.get(s.tanggal) ?? []), s]));
    return [...m.entries()];
  }, [slots]);

  const topik = topic === 'Lainnya' ? customTopic : topic;

  const onPick = (kind: Exclude<PickerKind, null>) => (e: DateTimePickerEvent, d?: Date) => {
    if (Platform.OS === 'android') setPicker(null);
    if (e.type !== 'set' || !d) return;
    if (kind === 'date') setTanggal(d);
    if (kind === 'start') setMulai(d);
    if (kind === 'end') setSelesai(d);
  };

  const submit = async () => {
    const e = validateZoom({ nama_instansi: instansi, topik, tanggal, jam_mulai: mulai, jam_selesai: selesai });
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await zoomApi.request({ nama_instansi: clean(instansi), topik: clean(topik), keterangan: clean(ket), tanggal: toISODate(tanggal!), jam_mulai: toHHmm(mulai!), jam_selesai: toHHmm(selesai!) });
      Alert.alert('Pengajuan terkirim', 'Status pengajuan dapat dilihat di tab Riwayat. Anda akan mendapat notifikasi saat admin memprosesnya.');
      setInstansi('');
      setKet('');
      setTanggal(null);
      setMulai(null);
      setSelesai(null);
      onSubmitted();
    } catch (err) {
      Alert.alert('Gagal mengajukan', errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const pickerValue = picker === 'date' ? tanggal ?? new Date() : picker === 'start' ? mulai ?? at(9) : selesai ?? at(10);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: 14 }}>
          <T w="extrabold" size={16}>
            Formulir pengajuan
          </T>
          <TextField label="Nama lengkap" icon={Lock} value={user?.nama_lengkap ?? user?.username ?? ''} editable={false} hint="Otomatis dari akun Anda" />
          <TextField label="Nama instansi" placeholder="Contoh: Bappeda Kota Bandar Lampung" value={instansi} onChangeText={setInstansi} error={errors.nama_instansi} />
          <View>
            <T w="semibold" size={13} style={{ marginBottom: 8 }}>
              Topik konsultasi
            </T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {TOPICS.map((t) => (
                <Chip key={t} label={t} selected={topic === t} onPress={() => setTopic(t)} color={brand.zoom} />
              ))}
            </View>
            {topic === 'Lainnya' ? (
              <View style={{ marginTop: 10 }}>
                <TextField label="Topik lainnya" placeholder="Tulis topik Anda" value={customTopic} onChangeText={setCustomTopic} error={errors.topik} />
              </View>
            ) : null}
          </View>
          <TextField label="Keterangan" placeholder="Jelaskan kebutuhan data atau pertanyaan Anda" multiline value={ket} onChangeText={setKet} maxLength={1000} />
          <PickField label="Tanggal" icon={CalendarDays} value={tanggal ? formatDate(tanggal, { weekday: true }) : ''} placeholder="Pilih tanggal" onPress={() => setPicker('date')} error={errors.tanggal} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <PickField label="Jam mulai" icon={Clock} value={mulai ? `${toHHmm(mulai).replace(':', '.')} WIB` : ''} placeholder="--.--" onPress={() => setPicker('start')} error={errors.jam_mulai} />
            </View>
            <View style={{ flex: 1 }}>
              <PickField label="Jam selesai" icon={Clock} value={selesai ? `${toHHmm(selesai).replace(':', '.')} WIB` : ''} placeholder="--.--" onPress={() => setPicker('end')} error={errors.jam_selesai} />
            </View>
          </View>
          {picker ? (
            <View>
              <DateTimePicker
                value={pickerValue}
                mode={picker === 'date' ? 'date' : 'time'}
                is24Hour
                locale="id-ID"
                minimumDate={picker === 'date' ? new Date() : undefined}
                minuteInterval={picker === 'date' ? undefined : 15}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onPick(picker)}
              />
              {Platform.OS === 'ios' ? <Button title="Selesai" size="sm" variant="outline" onPress={() => setPicker(null)} /> : null}
            </View>
          ) : null}
          <Button title="Ajukan Konsultasi" icon={Send} color={brand.zoom} onPress={submit} loading={loading} />
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <CalendarDays size={18} color={brand.zoom} />
            <T w="extrabold" size={15}>
              Slot yang sudah terisi
            </T>
          </View>
          <T muted size={12} style={{ marginTop: 4, marginBottom: 6 }}>
            Pilih waktu di luar slot berikut.
          </T>
          {slots == null ? (
            <Loading />
          ) : grouped.length === 0 ? (
            <T muted size={13} style={{ paddingVertical: 10 }}>
              Belum ada slot terisi — semua jadwal masih tersedia.
            </T>
          ) : (
            grouped.map(([date, list]) => {
              const d = parseServerDate(date)!;
              return (
                <View key={date} style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.border }}>
                  <View style={{ width: 56, alignItems: 'center' }}>
                    <T w="bold" size={11} muted>
                      {formatDate(d, { weekday: true }).split(',')[0].slice(0, 3).toUpperCase()}
                    </T>
                    <T w="extrabold" size={20} color="#1D4ED8">
                      {formatDate(d).split(' ')[0]}
                    </T>
                    <T size={11} muted>
                      {formatDate(d, { short: true }).split(' ')[1]}
                    </T>
                  </View>
                  <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignContent: 'center' }}>
                    {list.map((s, i) => (
                      <View key={s.id ?? i} style={{ backgroundColor: c.zoomSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 }}>
                        <T w="semibold" size={12} color="#1E3A8A">
                          {formatClock(s.jam_mulai)}–{formatClock(s.jam_selesai)}
                        </T>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })
          )}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function at(h: number) {
  const d = new Date();
  d.setHours(h, 0, 0, 0);
  return d;
}

function PickField({ label, icon: Icon, value, placeholder, onPress, error }: { label: string; icon: typeof Clock; value: string; placeholder: string; onPress: () => void; error?: string }) {
  const { c } = useTheme();
  return (
    <View>
      <T w="semibold" size={13} style={{ marginBottom: 6 }}>
        {label}
      </T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || 'belum dipilih'}`}
        onPress={onPress}
        style={{ height: 50, borderRadius: 12, borderWidth: 1.5, borderColor: error ? c.danger : c.inputBorder, backgroundColor: c.inputBg, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 }}
      >
        <Icon size={18} color={c.textSubtle} />
        <T size={15} color={value ? c.text : c.textSubtle} numberOfLines={1}>
          {value || placeholder}
        </T>
      </Pressable>
      {error ? (
        <T size={12} color={c.danger} style={{ marginTop: 6 }}>
          {error}
        </T>
      ) : null}
    </View>
  );
}

function normalizeStatus(s: string): 'pending' | 'approved' | 'rejected' {
  const v = s?.toLowerCase();
  if (['approved', 'disetujui', 'accepted', 'diterima'].includes(v)) return 'approved';
  if (['rejected', 'ditolak', 'declined'].includes(v)) return 'rejected';
  return 'pending';
}

function RequestCard({ r }: { r: ZoomRequest }) {
  const { c } = useTheme();
  const status = normalizeStatus(r.status);
  const badge =
    status === 'approved'
      ? { label: 'Disetujui', fg: c.success, bg: c.successSoft, icon: Check }
      : status === 'rejected'
        ? { label: 'Ditolak', fg: c.danger, bg: c.dangerSoft, icon: X }
        : { label: 'Pending', fg: c.warning, bg: c.warningSoft, icon: Clock };
  const note = r.catatan_admin ?? r.admin_note;
  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <T w="extrabold" size={15} style={{ flex: 1 }}>
          {r.topik}
        </T>
        <Badge {...badge} />
      </View>
      <Row icon={CalendarDays} text={formatDate(r.tanggal, { weekday: true })} />
      <Row icon={Clock} text={`${formatClock(r.jam_mulai)}–${formatClock(r.jam_selesai)} WIB`} />
      <Row icon={Users} text={r.nama_instansi} />
      {status === 'approved' && r.zoom_link ? (
        <Button
          title="Masuk Room Zoom"
          icon={Video}
          color={brand.zoom}
          onPress={() => {
            const link = r.zoom_link!;
            if (/^https:\/\/([a-z0-9-]+\.)*zoom\.us\//i.test(link)) Linking.openURL(link);
            else Alert.alert('Tautan tidak valid', 'Tautan Zoom tidak dikenali. Hubungi admin melalui Chat Admin.');
          }}
        />
      ) : null}
      {status === 'pending' ? (
        <View style={{ flexDirection: 'row', gap: 8, backgroundColor: c.warningSoft, borderRadius: 10, padding: 10 }}>
          <Info size={16} color={c.warning} />
          <T size={12} color={c.warning} style={{ flex: 1 }}>
            Menunggu persetujuan admin. Anda akan menerima notifikasi saat status berubah.
          </T>
        </View>
      ) : null}
      {status === 'rejected' && note ? (
        <View style={{ backgroundColor: c.dangerSoft, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: c.danger + '44' }}>
          <T size={13} color={c.danger}>
            <T w="bold" size={13} color={c.danger}>
              Catatan admin:{' '}
            </T>
            {note}
          </T>
        </View>
      ) : null}
    </Card>
  );
}

function Row({ icon: Icon, text }: { icon: typeof Clock; text: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Icon size={16} color={c.textMuted} />
      <T size={13} muted style={{ flex: 1 }}>
        {text}
      </T>
    </View>
  );
}
