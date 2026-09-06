/**
 * 应用图标持久化与刷新
 * 将用户上传的图标写入 <link rel="icon"> 与 manifest，
 * 刷新页面后从 IndexedDB 恢复，避免恢复默认 favicon。
 */
import { dbGet, dbSet } from '@/services/db';

const ICON_KEY = 'soulcard_appearance_appIcon';

export function getStoredAppIcon(): string | null {
  return dbGet(ICON_KEY);
}

export function setStoredAppIcon(url: string): void {
  dbSet(ICON_KEY, url);
}

export function removeStoredAppIcon(): void {
  dbSet(ICON_KEY, '');
}

/** 立即把指定图标应用到当前页面的 favicon 与 manifest */
export function applyAppIcon(url: string, accentColor?: string): void {
  if (!url) {
    resetAppIcon();
    return;
  }
  // favicon
  let link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = 'image/png';
  link.href = url;

  // manifest（PWA 添加到主屏幕时使用的图标）
  let manifestLink = document.querySelector<HTMLLinkElement>("link[rel='manifest']");
  const manifest = {
    name: 'yann语',
    short_name: 'yann语',
    description: '用字卡传递温暖，与灵魂相伴',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAFAFA',
    theme_color: accentColor || '#F2A2A2',
    icons: [{ src: url, sizes: '192x192', type: 'image/png' }],
  };
  const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
  const manifestUrl = URL.createObjectURL(blob);
  if (!manifestLink) {
    manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    document.head.appendChild(manifestLink);
  }
  manifestLink.href = manifestUrl;
}

/** 恢复默认 favicon / manifest */
export function resetAppIcon(): void {
  const link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
  if (link) {
    link.type = 'image/svg+xml';
    link.href = '/favicon.png';
  }
  const manifestLink = document.querySelector<HTMLLinkElement>("link[rel='manifest']");
  if (manifestLink) {
    manifestLink.href = '/manifest.json';
  }
}
