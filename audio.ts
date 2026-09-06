// 浏览器音频自动播放策略解锁辅助：用户第一次点击/触摸时播放一段静音，
// 解除 Safari/Chrome 等移动端对 <audio> 自动播放的限制，使后续音乐播放更稳定。
export function unlockAudioPlayback() {
  if (typeof window === 'undefined') return;
  const silentSrc = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
  const unlock = () => {
    const a = new Audio(silentSrc);
    a.volume = 0.001;
    a.play().catch(() => {});
    window.removeEventListener('touchstart', unlock);
    window.removeEventListener('click', unlock);
  };
  window.addEventListener('touchstart', unlock, { once: true, passive: true });
  window.addEventListener('click', unlock, { once: true, passive: true });
}
