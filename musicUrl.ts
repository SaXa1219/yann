import { fetchSongUrl } from '@/services/netease';

function extractNetEaseId(link: string): number | null {
  if (/^\d+$/.test(link)) return Number(link);
  if (link.includes('music.163.com/song/media/outer/url')) {
    const m = link.match(/[?&]id=(\d+)/);
    return m ? Number(m[1]) : null;
  }
  const m = link.match(/[?&]id=(\d+)/);
  return m ? Number(m[1]) : null;
}

function normalizeUrl(link: string): string {
  const direct = link.match(/(https?:\/\/[^\s]+)/i)?.[1];
  if (direct) return direct.replace(/^http:\/\//, 'https://');
  return link;
}

function isDirectAudioUrl(link: string): boolean {
  return /\.(mp3|m4a|flac|aac|ogg|wav)(\?|$)/i.test(link) ||
    /music\.126\.net|m[0-9]c\.music\.126\.net|m[0-9]\.music\.126\.net/.test(link);
}

/**
 * 同步解析：将网易云 ID / 分享页转成官方外链，并统一 https。
 * 不保证外链一定能播放，建议播放前调用 resolveMusicUrl 获取真实地址。
 */
export function parseMusicUrl(link: string): string {
  const trimmed = link.trim();
  if (!trimmed) return '';

  const id = extractNetEaseId(trimmed);
  if (id) {
    return `https://music.163.com/song/media/outer/url?id=${id}.mp3`;
  }

  if (isDirectAudioUrl(trimmed)) {
    return normalizeUrl(trimmed);
  }

  return normalizeUrl(trimmed);
}

/**
 * 异步解析真实可播放链接：
 * - 网易云歌曲先通过服务端接口换取真实 CDN URL
 * - 失败或无版权时回退到官方外链
 * - 外部直链保持原样
 */
export async function resolveMusicUrl(link: string): Promise<string> {
  const trimmed = link.trim();
  if (!trimmed) return '';

  const id = extractNetEaseId(trimmed);
  if (id) {
    try {
      const real = await fetchSongUrl(id);
      if (real && isDirectAudioUrl(real)) return normalizeUrl(real);
    } catch {
      // 回退到官方外链
    }
    return `https://music.163.com/song/media/outer/url?id=${id}.mp3`;
  }

  if (isDirectAudioUrl(trimmed)) {
    return normalizeUrl(trimmed);
  }

  return normalizeUrl(trimmed);
}
