import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import { Music, Play, Pause, SkipBack, SkipForward, User } from 'lucide-react';
import { resolveMusicUrl } from '@/lib/musicUrl';
import type { HomeSettings } from '@/types/types';

interface MainScreenProps {
  draft: HomeSettings;
}

export default function MainScreen({ draft }: MainScreenProps) {
  const { contact } = useApp();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [musicIndex, setMusicIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const hasPlaylist = contact.musicEnabled !== false && (contact.musicPlaylist?.length ?? 0) > 0;
  const currentSong = hasPlaylist ? contact.musicPlaylist[Math.min(musicIndex, contact.musicPlaylist.length - 1)] : null;

  const [musicSrc, setMusicSrc] = useState('');

  useEffect(() => {
    let cancelled = false;
    setMusicSrc('');
    if (!currentSong?.url) return;
    resolveMusicUrl(currentSong.url).then(url => {
      if (!cancelled) setMusicSrc(url);
    });
    return () => { cancelled = true; };
  }, [currentSong?.url]);

  useEffect(() => {
    if (!audioRef.current || !musicSrc) return;
    audioRef.current.src = musicSrc;
    audioRef.current.load();
    setProgress(0);
    setDuration(0);
    if (isPlaying) audioRef.current.play().catch(() => setIsPlaying(false));
  }, [musicSrc, isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      if (contact.musicPlaylist && contact.musicPlaylist.length > 1) {
        setMusicIndex(prev => (prev + 1) % contact.musicPlaylist!.length);
      } else {
        setIsPlaying(false);
        setProgress(0);
      }
    };
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('ended', onEnded);
    };
  }, [contact.musicPlaylist]);

  const togglePlay = () => {
    if (!audioRef.current || !musicSrc) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => toast.error('音乐播放失败'));
    }
  };
  const prevSong = () => {
    if (!contact.musicPlaylist?.length) return;
    setMusicIndex(p => (p - 1 + contact.musicPlaylist!.length) % contact.musicPlaylist!.length);
  };
  const nextSong = () => {
    if (!contact.musicPlaylist?.length) return;
    setMusicIndex(p => (p + 1) % contact.musicPlaylist!.length);
  };
  const formatTime = (sec: number) => {
    if (!isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isDark = draft.darkMode;
  const cardOpacity = Math.max(0, Math.min(1, draft.cardOpacity ?? 1));
  const cardBg = isDark ? '#242424' : `rgba(255,255,255,${cardOpacity})`;
  const avatar = draft.avatar || contact.myAvatar || '';
  const displayName = draft.displayName || '';
  const handleStr = draft.handle || '';
  const signature = draft.signature || '';
  const theirAvatar = draft.theirAvatar || contact.theirAvatar || '';
  const topBanner = draft.topBannerImage || '';
  const polaroid = draft.polaroidImage || '';
  const polaroid2 = draft.polaroidImage2 || '';
  const relationName2 = draft.relationName || '对方';
  const myBio = draft.chatPreview2 || signature || '';
  const theirBio = draft.chatPreview1 || '';

  return (
    <div className={`relative flex-1 flex flex-col items-center px-5 pb-4 overflow-y-auto gap-5 ${isDark ? 'text-stone-100' : 'text-stone-800'}`} style={{ touchAction: 'pan-y' }}>
      {/* 全局壁纸由 HomePage 外层统一渲染，此处保持透明，避免重复与上下露色 */}

      {/* 顶部横幅 */}
      <div className="w-full max-w-sm h-40 rounded-[20px] relative flex items-center justify-center overflow-hidden mt-2" style={{ backgroundColor: topBanner ? 'transparent' : '#E5E7EB', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        {topBanner && <img src={topBanner} className="w-full h-full object-cover" alt="banner" />}
      </div>

      {/* 个人信息 + 音乐播放器容器 */}
      <div className="relative w-full max-w-sm">
        {/* 个人信息卡片 */}
        <div className={`w-full rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.04)] pt-12 pb-3 px-6 relative border ${isDark ? 'border-stone-700/40' : 'border-stone-100/40'}`} style={{ marginTop: -16, backgroundColor: cardBg }}>
          {/* 双头像 */}
          <div className="absolute -top-9 left-1/2 -translate-x-1/2">
            <div className="relative" style={{ width: 100, height: 64 }}>
              <div className="absolute rounded-full overflow-hidden bg-stone-100 shadow-[0_6px_20px_rgba(0,0,0,0.08)] border-[3px] border-white" style={{ width: 64, height: 64, left: 0, top: 0, zIndex: 2 }}>
                {avatar ? <img src={avatar} className="w-full h-full object-cover" alt="me" /> : <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-stone-700 text-stone-400' : 'bg-gray-100 text-gray-400'}`}><User className="w-7 h-7" /></div>}
              </div>
              <div className="absolute rounded-full overflow-hidden bg-stone-100 shadow-[0_6px_20px_rgba(0,0,0,0.08)] border-[3px] border-white" style={{ width: 64, height: 64, left: 40, top: 0, zIndex: 1 }}>
                {theirAvatar ? <img src={theirAvatar} className="w-full h-full object-cover" alt="them" /> : <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-stone-600 text-stone-400' : 'bg-gray-100 text-gray-400'}`}><User className="w-7 h-7" /></div>}
              </div>
            </div>
          </div>

          {displayName && <h2 className={`text-center text-lg font-bold mb-0.5 tracking-wide ${isDark ? 'text-stone-100' : 'text-stone-800'}`}>{displayName}</h2>}
          {handleStr && <p className={`text-center text-sm mb-2 ${isDark ? 'text-stone-400' : 'text-stone-400'}`}>{handleStr}</p>}
          {signature && <p className={`text-center text-sm ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>{signature}</p>}
        </div>
      </div>

      {/* 照片 + 音乐播放器 */}
      <div className="w-full max-w-sm flex items-center justify-between px-2 relative">
        <div className="relative" style={{ width: 150, height: 140 }}>
          <div className="absolute overflow-hidden" style={{ width: 90, height: 105, backgroundColor: '#EDE8E0', borderRadius: 6, top: 18, left: 4, transform: 'rotate(-20deg)', zIndex: 1, boxShadow: '3px 3px 14px rgba(0,0,0,0.07)' }}>
            {polaroid2 ? <img src={polaroid2} className="w-full h-full object-cover" alt="pic2" /> : <div className="w-full h-full bg-stone-100" />}
          </div>
          <div className="absolute overflow-hidden" style={{ width: 90, height: 105, backgroundColor: '#D8D2C8', borderRadius: 6, top: 8, left: 36, transform: 'rotate(14deg)', zIndex: 2, boxShadow: '3px 3px 14px rgba(0,0,0,0.09)' }}>
            {polaroid ? <img src={polaroid} className="w-full h-full object-cover" alt="pic1" /> : <div className="w-full h-full bg-stone-200" />}
          </div>
        </div>

        <div className="w-[150px] shrink-0">
          <div className={`flex flex-col gap-2 rounded-[24px] p-3 shadow-[0_4px_16px_rgba(0,0,0,0.04)] border ${isDark ? 'border-stone-700/40' : 'border-stone-100/40'}`} style={{ backgroundColor: cardBg }}>
            <div className="flex items-center gap-2.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-stone-300 to-stone-400 flex items-center justify-center shrink-0">
                <Music className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold truncate ${isDark ? 'text-stone-100' : 'text-stone-800'}`}>{currentSong?.name || '暂无歌曲'}</p>
                <p className={`text-[10px] truncate ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>{currentSong?.artist || '未知歌手'}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[9px] tabular-nums ${isDark ? 'text-stone-500' : 'text-stone-400'}`}>{formatTime(progress)}</span>
              <div className={`flex-1 h-1 rounded-full overflow-hidden ${isDark ? 'bg-stone-700' : 'bg-stone-200'}`}>
                <div className="h-full bg-stone-500 rounded-full" style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }} />
              </div>
              <span className={`text-[9px] tabular-nums ${isDark ? 'text-stone-500' : 'text-stone-400'}`}>{formatTime(duration)}</span>
            </div>
            <div className="flex items-center justify-center gap-1">
              <button onClick={prevSong} disabled={!hasPlaylist} className={`p-1 rounded-full ${isDark ? 'text-stone-300 hover:bg-stone-700' : 'text-stone-600 hover:bg-stone-100'} disabled:opacity-30`}><SkipBack className="w-3.5 h-3.5" /></button>
              <button onClick={togglePlay} disabled={!hasPlaylist} className={`p-1.5 rounded-full ${isDark ? 'bg-stone-700 text-stone-100' : 'bg-stone-800 text-white'} disabled:opacity-30`}>{isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}</button>
              <button onClick={nextSong} disabled={!hasPlaylist} className={`p-1 rounded-full ${isDark ? 'text-stone-300 hover:bg-stone-700' : 'text-stone-600 hover:bg-stone-100'} disabled:opacity-30`}><SkipForward className="w-3.5 h-3.5" /></button>
            </div>
          </div>
          <audio ref={audioRef} playsInline preload="metadata" />
        </div>
      </div>

      {/* 聊天气泡预览 */}
      <div className="w-full max-w-sm space-y-2 px-2 -mt-1">
        <div className="flex items-end gap-2.5">
          <div className={`w-9 h-9 rounded-full overflow-hidden shrink-0 border ${isDark ? 'bg-stone-800 border-stone-700' : 'bg-stone-100 border-stone-200'}`}>
            {theirAvatar ? <img src={theirAvatar} className="w-full h-full object-cover" alt="them" /> : <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-stone-700 text-stone-400' : 'bg-gray-100 text-gray-400'}`}><User className="w-5 h-5" /></div>}
          </div>
          <div className={`relative rounded-2xl rounded-bl-none px-4 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border w-[200px] min-h-[36px] flex items-center ${isDark ? 'border-stone-700/30' : 'border-stone-100/30'}`} style={{ backgroundColor: isDark ? '#2A2A2A' : cardBg }}>
            <p className={`text-[13px] ${isDark ? 'text-stone-200' : 'text-stone-700'}`}>{draft.chatPreview1 || theirBio || ''}</p>
            <div className="absolute bottom-0 -left-[6px] w-3 h-3" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)', backgroundColor: isDark ? '#2A2A2A' : cardBg }} />
          </div>
        </div>
        <div className="flex items-end gap-2.5 flex-row-reverse">
          <div className={`w-9 h-9 rounded-full overflow-hidden shrink-0 border ${isDark ? 'bg-stone-800 border-stone-700' : 'bg-stone-100 border-stone-200'}`}>
            {avatar ? <img src={avatar} className="w-full h-full object-cover" alt="me" /> : <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-stone-700 text-stone-400' : 'bg-gray-100 text-gray-400'}`}><User className="w-5 h-5" /></div>}
          </div>
          <div className={`relative rounded-2xl rounded-br-none px-4 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border w-[200px] min-h-[36px] flex items-center ${isDark ? 'border-stone-700/30' : 'border-stone-100/30'}`} style={{ backgroundColor: isDark ? '#2A2A2A' : cardBg }}>
            <p className={`text-[13px] ${isDark ? 'text-stone-200' : 'text-stone-700'}`}>{draft.chatPreview2 || myBio || ''}</p>
            <div className="absolute bottom-0 -right-[6px] w-3 h-3" style={{ clipPath: 'polygon(0 0, 0 100%, 100% 0)', backgroundColor: isDark ? '#2A2A2A' : cardBg }} />
          </div>
        </div>
      </div>

    </div>
  );
}
