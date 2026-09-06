/**
 * 兼容所有浏览器的唯一 ID 生成器
 * crypto.randomUUID 在 iOS 14 以下 / 旧 Android WebView 中不存在
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try { return crypto.randomUUID(); } catch { /* fallback */ }
  }
  // Fallback: 时间戳 + 随机数 + 16 进制
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  const extra = Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  return `${ts}-${rand}-${extra}`;
}
