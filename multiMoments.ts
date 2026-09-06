import { supabase } from '@/db/supabase';
import type { PublicMoment, PublicMomentComment } from '@/types/types';

const NICKNAME_KEY = 'yannyu_public_nickname';
const DEVICE_ID_KEY = 'yannyu_device_id';
const LIKED_PREFIX = 'yannyu_liked_';
const MOMENT_TOKEN_PREFIX = 'yannyu_moment_token_';
const COMMENT_TOKEN_PREFIX = 'yannyu_comment_token_';
const MY_MOMENTS_CACHE_KEY = 'yannyu_my_moments_cache';
const MY_COMMENTS_CACHE_KEY = 'yannyu_my_comments_cache';

function storeToken(prefix: string, id: string, token: string) {
  try { localStorage.setItem(prefix + id, token); } catch { /* ignore */ }
}

export function getMomentDeleteToken(id: string): string | null {
  try { return localStorage.getItem(MOMENT_TOKEN_PREFIX + id); } catch { return null; }
}

export function getCommentDeleteToken(id: string): string | null {
  try { return localStorage.getItem(COMMENT_TOKEN_PREFIX + id); } catch { return null; }
}

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    // 隐私模式无法持久化时返回临时 ID
    return 'temp_' + Math.random().toString(36).slice(2);
  }
}

export function getPublicNickname(): string | null {
  try { return localStorage.getItem(NICKNAME_KEY); } catch { return null; }
}

export function setPublicNickname(nickname: string) {
  try { localStorage.setItem(NICKNAME_KEY, nickname); } catch { /* ignore */ }
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9\u4e00-\u9fa5_-]/gi, '_').slice(0, 20);
}

// 本地缓存自己发布的多人朋友圈动态/评论，确保退出重进后仍能立即显示
function readCache<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function writeCache<T>(key: string, list: T[]) {
  try { localStorage.setItem(key, JSON.stringify(list)); } catch { /* ignore */ }
}

export function getMyMomentsCache(): PublicMoment[] {
  return readCache<PublicMoment>(MY_MOMENTS_CACHE_KEY);
}
export function getMyCommentsCache(): PublicMomentComment[] {
  return readCache<PublicMomentComment>(MY_COMMENTS_CACHE_KEY);
}
export function addMomentToCache(moment: PublicMoment) {
  const list = getMyMomentsCache();
  if (list.some(m => m.id === moment.id)) return;
  writeCache(MY_MOMENTS_CACHE_KEY, [...list, moment]);
}
export function addCommentToCache(comment: PublicMomentComment) {
  const list = getMyCommentsCache();
  if (list.some(c => c.id === comment.id)) return;
  writeCache(MY_COMMENTS_CACHE_KEY, [...list, comment]);
}
export function removeMomentFromCache(id: string) {
  writeCache(MY_MOMENTS_CACHE_KEY, getMyMomentsCache().filter(m => m.id !== id));
}
export function removeCommentFromCache(id: string) {
  writeCache(MY_COMMENTS_CACHE_KEY, getMyCommentsCache().filter(c => c.id !== id));
}
export function cleanupMyMomentsCache(serverMoments: PublicMoment[]) {
  const serverIds = new Set(serverMoments.map(m => m.id));
  const serverCommentIds = new Set<string>();
  serverMoments.forEach(m => (m.comments || []).forEach(c => serverCommentIds.add(c.id)));
  // 仅在服务端已持久化图片的动态才从缓存移除；服务端图片为空但本地有图片时保留缓存，防止图片被吞
  writeCache(MY_MOMENTS_CACHE_KEY, getMyMomentsCache().filter(m => {
    if (!serverIds.has(m.id)) return true;
    const server = serverMoments.find(s => s.id === m.id);
    if (server && (!server.images || server.images.length === 0) && m.images && m.images.length > 0) return true;
    return false;
  }));
  writeCache(MY_COMMENTS_CACHE_KEY, getMyCommentsCache().filter(c => !serverCommentIds.has(c.id)));
}

/** 将本地缓存的自己动态/评论与服务端数据合并 */
export function mergeCachedMyData(server: PublicMoment[]): PublicMoment[] {
  const cachedMoments = getMyMomentsCache();
  const cachedComments = getMyCommentsCache();
  const map = new Map<string, PublicMoment>();
  server.forEach(m => map.set(m.id, m));

  cachedMoments.forEach(m => {
    const existing = map.get(m.id);
    if (existing) {
      // 服务端图片缺失时，用本地缓存的图片补回，防止图片被吞
      if ((!existing.images || existing.images.length === 0) && m.images && m.images.length > 0) {
        map.set(m.id, { ...existing, images: m.images });
      }
    } else {
      map.set(m.id, { ...m, comments: [] });
    }
  });

  // 服务端没有的本地评论保留（包含回复）
  cachedComments.forEach(c => {
    const m = map.get(c.moment_id);
    if (!m) return;
    const existing = m.comments || [];
    if (existing.some(x => x.id === c.id)) return;
    map.set(c.moment_id, { ...m, comments: [...existing, c] });
  });

  return Array.from(map.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function dataUrlToFile(dataUrl: string, fileName: string): File | null {
  const arr = dataUrl.split(',');
  if (arr.length < 2) return null;
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], fileName, { type: mime });
}

export async function uploadPublicMomentImage(
  dataUrl: string,
  nickname: string,
): Promise<string | null> {
  const file = dataUrlToFile(dataUrl, `${Date.now()}.jpg`);
  if (!file) return null;
  const safeNick = sanitizeFilename(nickname) || 'guest';
  const path = `${safeNick}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { data, error } = await supabase.storage
    .from('public-moments')
    .upload(path, file, { contentType: 'image/jpeg', upsert: false });
  if (error || !data) {
    console.error('upload image failed', error);
    return null;
  }
  const { data: urlData } = supabase.storage.from('public-moments').getPublicUrl(data.path);
  return urlData.publicUrl;
}

export async function fetchPublicMoments(): Promise<PublicMoment[]> {
  const deviceId = getDeviceId();
  const { data, error } = await supabase
    .from('public_moments')
    .select('id, nickname, content, images, created_at, likes_count, comments_count, public_moment_comments!moment_id(id, moment_id, nickname, content, created_at, parent_id, reply_to_nickname)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error || !Array.isArray(data)) {
    console.error('fetch moments failed', error);
    return [];
  }

  const { data: likedData } = await supabase
    .from('public_moment_likes')
    .select('moment_id')
    .eq('device_id', deviceId)
    .limit(1000);
  const likedIds = new Set((likedData || []).map((l: { moment_id: string }) => l.moment_id));

  return data.map((m: any) => ({
    id: m.id,
    nickname: m.nickname,
    content: m.content,
    images: Array.isArray(m.images) ? m.images : [],
    created_at: m.created_at,
    likes_count: m.likes_count ?? 0,
    comments_count: m.comments_count ?? 0,
    liked: likedIds.has(m.id),
    comments: (m.public_moment_comments || [])
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((c: any) => ({
        id: c.id,
        moment_id: c.moment_id,
        nickname: c.nickname,
        content: c.content,
        created_at: c.created_at,
        parent_id: c.parent_id,
        reply_to_nickname: c.reply_to_nickname,
      } as PublicMomentComment)),
  } as PublicMoment));
}

export async function createPublicMoment(
  content: string,
  images: string[],
  nickname: string,
): Promise<PublicMoment | null> {
  const { data, error } = await supabase
    .from('public_moments')
    .insert({ content, images, nickname })
    .select()
    .maybeSingle();
  if (error || !data) {
    console.error('create moment failed', error);
    return null;
  }
  if (data.delete_token) {
    storeToken(MOMENT_TOKEN_PREFIX, data.id, data.delete_token);
  }
  const moment: PublicMoment = {
    id: data.id,
    nickname: data.nickname,
    content: data.content,
    images: Array.isArray(data.images) ? data.images : [],
    created_at: data.created_at,
    likes_count: 0,
    comments_count: 0,
    liked: false,
    comments: [],
  };
  addMomentToCache(moment);
  return moment;
}

export async function deletePublicMoment(momentId: string, token: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('delete_public_moment', {
    moment_id: momentId,
    token,
  });
  if (error) {
    console.error('delete moment failed', error);
    return false;
  }
  if (data) removeMomentFromCache(momentId);
  return !!data;
}

export async function createPublicComment(
  momentId: string,
  content: string,
  nickname: string,
  parent?: { id: string; nickname: string },
): Promise<PublicMomentComment | null> {
  const payload: Record<string, unknown> = { moment_id: momentId, content, nickname };
  if (parent) {
    payload.parent_id = parent.id;
    payload.reply_to_nickname = parent.nickname;
  }
  const { data, error } = await supabase
    .from('public_moment_comments')
    .insert(payload)
    .select()
    .maybeSingle();
  if (error || !data) {
    console.error('create comment failed', error);
    return null;
  }
  if (data.delete_token) {
    storeToken(COMMENT_TOKEN_PREFIX, data.id, data.delete_token);
  }
  const comment: PublicMomentComment = {
    id: data.id,
    moment_id: data.moment_id,
    nickname: data.nickname,
    content: data.content,
    created_at: data.created_at,
    parent_id: data.parent_id,
    reply_to_nickname: data.reply_to_nickname,
  };
  addCommentToCache(comment);
  return comment;
}

export async function deletePublicComment(commentId: string, token: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('delete_public_comment', {
    comment_id: commentId,
    token,
  });
  if (error) {
    console.error('delete comment failed', error);
    return false;
  }
  if (data) removeCommentFromCache(commentId);
  return !!data;
}

export async function togglePublicLike(momentId: string, nickname: string): Promise<boolean> {
  const deviceId = getDeviceId();
  const { data, error } = await supabase.rpc('toggle_public_like', {
    p_moment_id: momentId,
    p_device_id: deviceId,
    p_nickname: nickname,
  });
  if (error) {
    console.error('toggle like failed', error);
    return false;
  }
  // 本地也缓存一份点赞状态，减少重复请求
  const key = LIKED_PREFIX + momentId;
  const liked = !!data;
  try { localStorage.setItem(key, liked ? '1' : '0'); } catch { /* ignore */ }
  return liked;
}
