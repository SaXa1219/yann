import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

/**
 * 后台保活：开启时请求屏幕常亮 + 播放静音音频循环，
 * 让浏览器尽量不冻结/挂起标签页。
 * 注意：iOS Safari / 部分安卓浏览器在切后台后仍会冻结页面，
 * 这是 Web 限制，无法 100% 保证后台存活。
 */
export function useBackgroundKeepAlive(enabled: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const visibilityHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled) {
      // 清理
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
      if (visibilityHandlerRef.current) {
        document.removeEventListener('visibilitychange', visibilityHandlerRef.current);
        visibilityHandlerRef.current = null;
      }
      return;
    }

    // 屏幕常亮
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as Navigator & { wakeLock: { request: (type: 'screen') => Promise<WakeLockSentinel> } }).wakeLock.request('screen');
        }
      } catch { /* ignore */ }
    };
    requestWakeLock();

    // 静音音频循环，阻止浏览器进入节能/冻结状态
    try {
      const audio = new Audio();
      // 1 秒空白静音 MP3（base64）
      audio.src = 'data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWgAAAA0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      audio.loop = true;
      audio.volume = 0;
      (audio as unknown as { webkitPlaysInline?: boolean; playsInline?: boolean }).playsInline = true;
      audio.play().catch(() => {});
      audioRef.current = audio;
    } catch { /* ignore */ }

    // 页面重新可见时重新请求 WakeLock（浏览器切后台会释放）
    const onVisible = () => {
      if (!document.hidden) requestWakeLock();
    };
    visibilityHandlerRef.current = onVisible;
    document.addEventListener('visibilitychange', onVisible);

    // 提示用户
    toast.info('后台保活已开启：建议保持标签页打开，并添加到主屏幕以获得更稳定体验', { duration: 5000 });

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
      document.removeEventListener('visibilitychange', onVisible);
      visibilityHandlerRef.current = null;
    };
  }, [enabled]);
}
