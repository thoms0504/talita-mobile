/**
 * Tipe data API TALITA-NG.
 *
 * ✔ = diverifikasi dari respons publik talita.statapps.dev (14 Nov 2026):
 *     /api/public/stats, /api/forum/posts, /api/forum/posts/{id}, /api/forum/tags, /api/zoom/calendar
 * ? = endpoint butuh login; bentuk diambil dari PRD & konvensi web. Cocokkan dengan backend/app/routers/.
 */

// ✔
export type Author = {
  id: number;
  username: string;
  nama_lengkap: string | null;
  role: 'user' | 'admin' | string;
  avatar_url: string | null;
};

// ? /api/auth/me
export type User = Author & {
  email: string;
  jenis_kelamin?: 'L' | 'P' | 'Laki-laki' | 'Perempuan' | string | null;
};

// ?
export type AuthResponse = {
  access_token: string;
  refresh_token?: string | null;
  token_type?: string;
  user?: User;
};

// ✔
export type PublicStats = {
  forum: { total_questions: number; top_words: { text: string; value: number }[] };
  chat: { total_questions: number; top_words: { text: string; value: number }[] };
};

// ✔
export type Tag = { id: number; name: string };

// ✔
export type ForumPost = {
  id: number;
  user_id: number;
  judul: string;
  deskripsi: string;
  file_path: string | null;
  created_at: string;
  updated_at: string;
  is_hidden: boolean;
  tags: Tag[];
  vote_count: number;
  answer_count: number;
  report_count: number;
  user_vote: 1 | -1 | null;
  author: Author;
  attachments?: Attachment[];
  /** Belum ada di respons saat ini; dipakai jika backend menambahkannya. */
  view_count?: number;
  accepted_answer_id?: number | null;
};

// ✔
export type ForumPostList = { posts: ForumPost[]; total: number; pages: number; current_page: number };

// ✔
export type ForumAnswer = {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  created_at: string;
  updated_at: string;
  vote_count: number;
  report_count: number;
  user_vote: 1 | -1 | null;
  author: Author;
  attachments: Attachment[];
  is_accepted?: boolean;
};

// ✔
export type ForumDetail = { post: ForumPost; answers: ForumAnswer[] };

export type Attachment = {
  id?: number;
  url?: string;
  file_url?: string;
  file_path?: string;
  filename?: string;
  file_name?: string;
  mime_type?: string;
  content_type?: string;
  size?: number;
};

// ?
export type ChatSession = { id: number; title: string | null; created_at: string; updated_at?: string };
export type ChatRole = 'user' | 'assistant';
export type ChatMessage = { id: number | string; role: ChatRole; content: string; created_at?: string; pending?: boolean; failed?: boolean };

// ✔ (kosong saat dicek) / ?
export type ZoomSlot = { id?: number; tanggal: string; jam_mulai: string; jam_selesai: string; status?: string };

// ?
export type ZoomStatus = 'pending' | 'approved' | 'rejected';
export type ZoomRequest = {
  id: number;
  nama_lengkap: string;
  nama_instansi: string;
  topik: string;
  keterangan: string | null;
  tanggal: string;
  jam_mulai: string;
  jam_selesai: string;
  status: string;
  zoom_link?: string | null;
  catatan_admin?: string | null;
  admin_note?: string | null;
  created_at?: string;
};
export type ZoomRequestInput = {
  nama_instansi: string;
  topik: string;
  keterangan: string;
  tanggal: string; // YYYY-MM-DD
  jam_mulai: string; // HH:mm
  jam_selesai: string; // HH:mm
};

// ?
export type SupportMessage = {
  id: number | string;
  sender_role?: 'user' | 'admin' | string;
  sender_id?: number;
  is_admin?: boolean;
  content: string;
  attachment?: Attachment | null;
  attachments?: Attachment[];
  created_at: string;
  is_read?: boolean;
  /** status lokal */
  local?: 'sending' | 'failed';
};
