import { Platform } from 'react-native';
import { fetch as expoFetch } from 'expo/fetch';
import { API_BASE, API_ORIGIN } from '@/config';
import { api, getAccessToken, refreshAccessToken } from './client';
import type {
  Attachment, AuthResponse, ChatMessage, ChatSession, ForumAnswer, ForumDetail, ForumPost, ForumPostList,
  PublicStats, SupportMessage, Tag, User, ZoomRequest, ZoomRequestInput, ZoomSlot,
} from './types';

export * from './types';
export { api, errorMessage, onUnauthorized } from './client';

/** Ambil array dari respons yang bisa berbentuk `[...]` atau `{ key: [...] }`. */
function list<T>(data: any, ...keys: string[]): T[] {
  if (Array.isArray(data)) return data;
  for (const k of keys) if (Array.isArray(data?.[k])) return data[k];
  return [];
}

export type UploadFile = { uri: string; name: string; type: string; size?: number };
function toForm(field: string, f: UploadFile) {
  const form = new FormData();
  // Format file khas React Native: { uri, name, type }
  form.append(field, { uri: Platform.OS === 'ios' ? f.uri.replace('file://', '') : f.uri, name: f.name, type: f.type } as any);
  return form;
}

/** URL absolut untuk file/gambar dari backend (path relatif → origin backend). */
export function absoluteUrl(path?: string | null) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}
export function attachmentUrl(a?: Attachment | null) {
  return absoluteUrl(a?.url ?? a?.file_url ?? a?.file_path ?? null);
}
export function attachmentName(a?: Attachment | null) {
  const n = a?.filename ?? a?.file_name ?? (a?.file_path ?? a?.url ?? '').split('/').pop();
  return n || 'lampiran';
}
export function isImageAttachment(a?: Attachment | null) {
  const t = a?.mime_type ?? a?.content_type ?? '';
  return t.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(attachmentName(a));
}

// ───────────────────────────── Auth ─────────────────────────────
export const authApi = {
  /** Web saat ini login memakai username + password. */
  async login(username: string, password: string) {
    const { data } = await api.post<AuthResponse>('/auth/login', { username: username.trim(), password });
    return data;
  },
  async register(input: { nama_lengkap: string; username: string; email: string; password: string; jenis_kelamin: string }) {
    const { data } = await api.post<AuthResponse>('/auth/register', input);
    return data;
  },
  /** Kirim ID token Google hasil expo-auth-session ke backend untuk ditukar JWT TALITA. */
  async google(idToken: string) {
    const { data } = await api.post<AuthResponse>('/auth/google', { id_token: idToken, credential: idToken });
    return data;
  },
  async me() {
    const { data } = await api.get('/auth/me');
    return (data?.user ?? data) as User;
  },
  async logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      /* token mungkin sudah tidak valid — logout lokal tetap jalan */
    }
  },
  async updateProfile(input: Partial<Pick<User, 'nama_lengkap' | 'username' | 'jenis_kelamin'>>) {
    const { data } = await api.put('/auth/profile', input);
    return (data?.user ?? data) as User;
  },
  async uploadAvatar(file: UploadFile) {
    const { data } = await api.post('/auth/upload-avatar', toForm('file', file), { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 });
    return (data?.avatar_url ?? data?.user?.avatar_url ?? data?.url) as string | undefined;
  },
  /** Endpoint baru (PRD §7.3): simpan device token untuk push notification. */
  async registerPushToken(token: string, type: string) {
    await api.post('/auth/fcm-token', { token, fcm_token: token, type, platform: Platform.OS });
  },
};

// ───────────────────────────── Public ─────────────────────────────
export const publicApi = {
  async stats() {
    const { data } = await api.get<PublicStats>('/public/stats');
    return data;
  },
};

// ───────────────────────────── Chatbot ─────────────────────────────
export const chatApi = {
  async sessions() {
    const { data } = await api.get('/chat/sessions');
    return list<ChatSession>(data, 'sessions', 'items');
  },
  async createSession(title?: string) {
    const { data } = await api.post('/chat/sessions', title ? { title } : {});
    return (data?.session ?? data) as ChatSession;
  },
  async messages(sessionId: number) {
    const { data } = await api.get(`/chat/sessions/${sessionId}/messages`);
    return list<any>(data, 'messages', 'items').map(
      (m): ChatMessage => ({
        id: m.id,
        role: m.role === 'user' || m.sender === 'user' || m.is_user ? 'user' : 'assistant',
        content: m.content ?? m.message ?? '',
        created_at: m.created_at,
      }),
    );
  },
  async deleteSession(sessionId: number) {
    await api.delete(`/chat/sessions/${sessionId}`);
  },
  /**
   * Kirim pertanyaan dan terima jawaban secara streaming.
   * Memakai `expo/fetch` (mendukung ReadableStream di Android & iOS).
   * Menerima format SSE (`data: ...`) maupun chunk teks biasa; payload JSON {content|delta|token|text} juga dikenali.
   */
  async sendStreaming(sessionId: number, content: string, onDelta: (text: string) => void, signal?: AbortSignal) {
    const doFetch = async (token: string | null) =>
      expoFetch(`${API_BASE}/chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream, text/plain, application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ content, message: content }),
        signal,
      });
    let res = await doFetch(await getAccessToken());
    if (res.status === 401) {
      const fresh = await refreshAccessToken();
      if (fresh) res = await doFetch(fresh);
    }
    if (!res.ok) {
      let data: any;
      try {
        const raw = await res.text();
        try {
          data = JSON.parse(raw);
        } catch {
          data = { detail: raw.slice(0, 200) };
        }
      } catch {
        /* body tidak terbaca */
      }
      if (__DEV__) console.warn(`[chat] POST /chat/sessions/${sessionId}/messages -> HTTP ${res.status}`, data);
      const detail = data?.detail ?? data?.message;
      const msg = typeof detail === 'string' && detail ? `${detail} (HTTP ${res.status})` : `Server menolak permintaan (HTTP ${res.status})`;
      throw Object.assign(new Error(msg), { response: { status: res.status, data: { detail: msg } } });
    }

    const ctype = res.headers.get('content-type') ?? '';
    if (ctype.includes('application/json')) {
      const data = await res.json();
      const text = data?.content ?? data?.answer ?? data?.message?.content ?? data?.response ?? '';
      onDelta(String(text));
      return;
    }
    const reader = res.body?.getReader();
    if (!reader) {
      onDelta(await res.text());
      return;
    }
    const decoder = new TextDecoder();
    let buffer = '';
    const isSSE = ctype.includes('event-stream');
    const emit = (payload: string) => {
      if (!payload || payload === '[DONE]') return;
      try {
        const j = JSON.parse(payload);
        const t = j.delta ?? j.content ?? j.token ?? j.text ?? j.choices?.[0]?.delta?.content;
        if (typeof t === 'string') onDelta(t);
      } catch {
        onDelta(payload);
      }
    };
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (!isSSE) {
        onDelta(chunk);
        continue;
      }
      buffer += chunk;
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() ?? '';
      for (const ev of events) {
        const dataLines = ev.split(/\r?\n/).filter((l) => l.startsWith('data:')).map((l) => l.slice(5).replace(/^ /, ''));
        if (dataLines.length) emit(dataLines.join('\n'));
      }
    }
    if (isSSE && buffer.trim().startsWith('data:')) emit(buffer.trim().slice(5).trim());
  },
};

// ───────────────────────────── Forum ─────────────────────────────
export const forumApi = {
  async posts(params: { page?: number; search?: string; tag?: string } = {}) {
    const { data } = await api.get<ForumPostList>('/forum/posts', {
      params: { page: params.page ?? 1, search: params.search || undefined, tag: params.tag || undefined },
    });
    return { posts: list<ForumPost>(data, 'posts'), total: data?.total ?? 0, pages: data?.pages ?? 1, page: data?.current_page ?? params.page ?? 1 };
  },
  async detail(id: number) {
    const { data } = await api.get<ForumDetail>(`/forum/posts/${id}`);
    return { post: data.post, answers: data.answers ?? [] };
  },
  async tags() {
    const { data } = await api.get('/forum/tags');
    return list<Tag>(data, 'tags');
  },
  async create(input: { judul: string; deskripsi: string; tags: string[] }) {
    const { data } = await api.post('/forum/posts', input);
    return (data?.post ?? data) as ForumPost;
  },
  /** value: 1 (upvote) | -1 (downvote). Kirim nilai yang sama lagi untuk membatalkan (perilaku web). */
  async votePost(id: number, value: 1 | -1) {
    const { data } = await api.post(`/forum/posts/${id}/vote`, { value, vote_type: value });
    return data as { vote_count?: number; user_vote?: 1 | -1 | null };
  },
  async answer(id: number, content: string) {
    const { data } = await api.post(`/forum/posts/${id}/answers`, { content });
    return (data?.answer ?? data) as ForumAnswer;
  },
  async voteAnswer(id: number, value: 1 | -1) {
    const { data } = await api.post(`/forum/answers/${id}/vote`, { value, vote_type: value });
    return data as { vote_count?: number; user_vote?: 1 | -1 | null };
  },
  async myQuestions() {
    const { data } = await api.get('/forum/my-questions');
    return list<ForumPost>(data, 'posts', 'questions', 'items');
  },
  async report(id: number, reason: string) {
    await api.post(`/forum/posts/${id}/report`, { reason });
  },
};

// ───────────────────────────── Zoom ─────────────────────────────
export const zoomApi = {
  async calendar() {
    const { data } = await api.get('/zoom/calendar');
    return list<ZoomSlot>(data, 'slots');
  },
  async myRequests() {
    const { data } = await api.get('/zoom/my-requests');
    return list<ZoomRequest>(data, 'requests', 'items');
  },
  async request(input: ZoomRequestInput) {
    const { data } = await api.post('/zoom/request', input);
    return (data?.request ?? data) as ZoomRequest;
  },
};

// ───────────────────────────── Chat Admin ─────────────────────────────
export const supportApi = {
  async messages() {
    const { data } = await api.get('/support/messages');
    return list<SupportMessage>(data, 'messages', 'items');
  },
  async upload(file: UploadFile) {
    const { data } = await api.post('/attachments/upload', toForm('file', file), { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 90000 });
    return (data?.attachment ?? data) as Attachment;
  },
};
