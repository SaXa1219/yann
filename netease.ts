import { dbGet, dbSet } from './db';

const AUTH_KEY = 'soulcard_netease_auth';

export interface NetEaseSong {
  id: number;
  name: string;
  artist: string;
  url?: string;
  picUrl?: string;
}

export interface NetEasePlaylist {
  id: number;
  name: string;
  trackCount: number;
}

export function getNetEaseAuth(): { cookie?: string; userId?: number; nickname?: string } {
  try {
    const raw = dbGet(AUTH_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
export function saveNetEaseAuth(auth: { cookie?: string; userId?: number; nickname?: string }): void {
  dbSet(AUTH_KEY, JSON.stringify(auth));
}
export function clearNetEaseAuth(): void {
  dbSet(AUTH_KEY, '{}');
}

function getSupabaseConfig(): { url: string; anonKey: string } {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('未配置 Supabase 环境变量');
  return { url, anonKey };
}

async function proxyFetch(path: string, query = ''): Promise<unknown> {
  const { url, anonKey } = getSupabaseConfig();
  const q = query ? `?${query}` : '';
  const res = await fetch(`${url}/functions/v1/netease-proxy${path}${q}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${anonKey}` },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg = (data.error || data.message || `请求失败 (${res.status})`) as string;
    throw new Error(msg);
  }
  return data;
}

async function proxyPost(path: string, body?: Record<string, unknown>): Promise<unknown> {
  const { url, anonKey } = getSupabaseConfig();
  const res = await fetch(`${url}/functions/v1/netease-proxy${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg = (data.error || data.message || `请求失败 (${res.status})`) as string;
    throw new Error(msg);
  }
  return data;
}

/** 获取二维码 key */
export async function fetchQrKey(): Promise<string> {
  const data = (await proxyFetch('/login/qr/key')) as Record<string, unknown>;
  const payload = (data?.data as Record<string, unknown>) || data || {};
  return String(payload.unikey || data.unikey || '');
}

export interface QrCreateResult {
  qrimg: string;
  qrurl?: string;
  url?: string;
}

/** 获取二维码图片地址 */
export async function fetchQrCreate(key: string): Promise<QrCreateResult> {
  const data = (await proxyFetch('/login/qr/create', `key=${encodeURIComponent(key)}&qrimg=true`)) as Record<string, unknown>;
  const payload = (data?.data as Record<string, unknown>) || data || {};
  return {
    qrimg: String(payload.qrimg || payload.qrImg || payload.img || ''),
    qrurl: String(payload.qrurl || payload.qrUrl || ''),
    url: String(payload.url || ''),
  };
}

export type QrStatus = 'waiting' | 'scanned' | 'confirmed' | 'expired' | 'success';

export async function checkQrStatus(key: string): Promise<{ status: QrStatus; cookie?: string; userId?: number; nickname?: string }> {
  const data = (await proxyFetch('/login/qr/check', `key=${encodeURIComponent(key)}`)) as Record<string, unknown>;
  const code = Number(data?.code ?? (data?.data as Record<string, unknown>)?.code ?? 801);
  const cookie = String(data?.cookie || '');
  const account = (data?.account as Record<string, unknown>) || {};
  const profile = (data?.profile as Record<string, unknown>) || {};
  if (code === 803) {
    return {
      status: 'success',
      cookie,
      userId: Number(account?.id || (data?.account as Record<string, unknown>)?.id),
      nickname: String(profile?.nickname || (data?.profile as Record<string, unknown>)?.nickname || ''),
    };
  }
  if (code === 802) return { status: 'confirmed' };
  if (code === 800) return { status: 'expired' };
  return { status: 'waiting' };
}

/** 通过歌曲 ID 获取可播放 URL */
export async function fetchSongUrl(id: number, cookie?: string): Promise<string> {
  const query = `id=${id}` + (cookie ? `&cookie=${encodeURIComponent(cookie)}` : '');
  const data = (await proxyFetch('/song/url', query)) as Record<string, unknown>;
  const song = ((data?.data as unknown[])?.[0] as Record<string, unknown>) || (data?.data as Record<string, unknown>) || {};
  return String(song.url || '');
}

/** 从歌单导入 */
export async function fetchPlaylistSongs(playlistId: number, cookie?: string): Promise<NetEaseSong[]> {
  const detailData = (await proxyFetch('/playlist/detail', `id=${playlistId}`)) as Record<string, unknown>;
  const playlist = (detailData?.playlist as Record<string, unknown>) || {};
  const tracks: unknown[] = (playlist?.tracks as unknown[]) || [];
  if (!Array.isArray(tracks) || tracks.length === 0) return [];
  const ids = tracks.map((t: any) => t.id).filter(Boolean).join(',');
  const urlData = (await proxyFetch('/song/url', `id=${ids}` + (cookie ? `&cookie=${encodeURIComponent(cookie)}` : ''))) as Record<string, unknown>;
  const urlMap = new Map<number, string>();
  ((urlData?.data as unknown[]) || []).forEach((s: any) => { if (s?.id) urlMap.set(Number(s.id), String(s.url || '')); });
  return tracks.map((t: any) => ({
    id: Number(t.id),
    name: String(t.name || '未知歌曲'),
    artist: (t.ar || t.artists || []).map((a: any) => a.name).join(' / ') || '未知歌手',
    url: urlMap.get(Number(t.id)) || '',
  })).filter(s => s.url);
}

/** 获取「我喜欢的音乐」歌单歌曲 */
export async function fetchLikedSongs(userId: number, cookie?: string): Promise<NetEaseSong[]> {
  const likeData = (await proxyFetch('/likelist', `uid=${userId}` + (cookie ? `&cookie=${encodeURIComponent(cookie)}` : ''))) as Record<string, unknown>;
  const ids: number[] = ((likeData?.ids as number[]) || []);
  if (!ids.length) return [];
  return fetchSongsByIds(ids, cookie);
}

/** 获取用户歌单列表 */
export async function fetchUserPlaylists(userId: number, cookie?: string): Promise<NetEasePlaylist[]> {
  const data = (await proxyFetch('/user/playlist', `uid=${userId}&limit=50` + (cookie ? `&cookie=${encodeURIComponent(cookie)}` : ''))) as Record<string, unknown>;
  const list: unknown[] = (data?.playlist as unknown[]) || [];
  return list.map((p: any) => ({
    id: Number(p.id),
    name: String(p.name || '歌单'),
    trackCount: Number(p.trackCount || 0),
  }));
}

async function fetchSongsByIds(ids: number[], cookie?: string): Promise<NetEaseSong[]> {
  const idStr = ids.join(',');
  const detailData = (await proxyFetch('/song/detail', `ids=${idStr}` + (cookie ? `&cookie=${encodeURIComponent(cookie)}` : ''))) as Record<string, unknown>;
  const songs: unknown[] = (detailData?.songs as unknown[]) || [];
  const urlData = (await proxyFetch('/song/url', `id=${idStr}` + (cookie ? `&cookie=${encodeURIComponent(cookie)}` : ''))) as Record<string, unknown>;
  const urlMap = new Map<number, string>();
  ((urlData?.data as unknown[]) || []).forEach((s: any) => { if (s?.id) urlMap.set(Number(s.id), String(s.url || '')); });
  return songs.map((t: any) => ({
    id: Number(t.id),
    name: String(t.name || '未知歌曲'),
    artist: (t.ar || t.artists || []).map((a: any) => a.name).join(' / ') || '未知歌手',
    url: urlMap.get(Number(t.id)) || '',
    picUrl: t.al?.picUrl || t.album?.picUrl || '',
  })).filter(s => s.url);
}

/** 搜索歌曲 */
export async function searchSongs(keyword: string, cookie?: string): Promise<NetEaseSong[]> {
  const data = (await proxyFetch('/cloudsearch', `keywords=${encodeURIComponent(keyword)}&limit=20` + (cookie ? `&cookie=${encodeURIComponent(cookie)}` : ''))) as Record<string, unknown>;
  const result = (data?.result as Record<string, unknown>) || {};
  const songs: unknown[] = (result?.songs as unknown[]) || [];
  const ids = songs.map((t: any) => t.id).filter(Boolean);
  if (!ids.length) return [];
  return fetchSongsByIds(ids, cookie);
}
