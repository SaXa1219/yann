import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Music, X, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '@/contexts/AppContext';
import { dbGet, dbSet } from '@/services/db';
import { resolveMusicUrl } from '@/lib/musicUrl';

function formatElapsed(ms: number) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return { hours, minutes };
}

export default function MusicFloat() {
  const { contacts, homeSettings, updateContactById, contact } = useApp();

  const selectedContact = useMemo(() => {
    // 优先使用当前正在聊天/查看的联系人歌单，避免音乐与当前对象不匹配
    if (contact && contact.musicEnabled !== false && (contact.musicPlaylist?.length ?? 0) > 0) return contact;
    const candidates = contacts
      .filter(c => c.musicEnabled !== false && (c.musicPlaylist?.length ?? 0) > 0)
      .sort((a, b) => {
        const pa = a.pinned ? 1 : 0;
        const pb = b.pinned ? 1 : 0;
        if (pa !== pb) return pb - pa;
        return (b.musicPlaylist?.length ?? 0) - (a.musicPlaylist?.length ?? 0);
      });
    return candidates[0] || null;
  }, [contacts, contact]);

  const [showPanel, setShowPanel] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [musicIndex, setMusicIndex] = useState(0);
  const [elapsed, setElapsed] = useState({ hours: 0, minutes: 0 });
  const [needsGesture, setNeedsGesture] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const buttonPos = useRef({ x: 0, y: 0 });
  const [buttonTranslate, setButtonTranslate] = useState({ x: 0, y: 0 });
  const dragRef = useRef({ active: false, sx: 0, sy: 0, px: 0, py: 0 });

  const [panelPos, setPanelPos] = useState({ x: 0, y: 0 });
  const panelDragRef = useRef({ active: false, sx: 0, sy: 0, px: 0, py: 0 });
  const [panelSize, setPanelSize] = useState({ width: 280, height: 500 });
  const resizeRef = useRef({ active: false, sx: 0, sy: 0, pw: 280, ph: 500 });

  const playlist = selectedContact?.musicPlaylist ?? [];
  const currentSong = playlist.length > 0 ? playlist[Math.min(musicIndex, playlist.length - 1)] : null;
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

  // 累计时长计时器
  useEffect(() => {
    if (!selectedContact) return;
    let start = parseInt(dbGet('soulcard_music_start') || '0', 10);
    if (!start) {
      start = Date.now();
      dbSet('soulcard_music_start', String(start));
    }
    const update = () => setElapsed(formatElapsed(Date.now() - start));
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [selectedContact?.id]);

  // 联系人切换时重置索引
  useEffect(() => {
    setMusicIndex(0);
    setErrorCount(0);
  }, [selectedContact?.id]);

  // 切歌时设置 audio 源；保持播放状态
  useEffect(() => {
    if (!audioRef.current || !musicSrc) return;
    audioRef.current.src = musicSrc;
    audioRef.current.load();
    if (isPlaying) {
      audioRef.current.play().catch(() => setNeedsGesture(true));
    }
  }, [musicSrc]);

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      setNeedsGesture(false);
      audioRef.current.play().catch(() => setNeedsGesture(true));
    }
  }, [isPlaying]);

  const skip = useCallback((delta: number) => {
    if (playlist.length <= 1) return;
    setMusicIndex(prev => (prev + delta + playlist.length) % playlist.length);
    setErrorCount(0);
  }, [playlist.length]);

  const handleSongError = useCallback(() => {
    if (!selectedContact || playlist.length === 0) return;
    setErrorCount(prev => {
      const next = prev + 1;
      if (next >= playlist.length) {
        toast.error('当前歌单所有链接均无法播放，请检查网络或更换歌曲');
        setIsPlaying(false);
        return 0;
      }
      toast.error(`歌曲加载失败，自动切换下一首 (${next}/${playlist.length})`);
      setMusicIndex((idx) => (idx + 1) % playlist.length);
      return next;
    });
  }, [playlist.length, selectedContact]);

  const handleClose = useCallback(() => {
    if (!selectedContact) return;
    updateContactById(selectedContact.id, { musicEnabled: false });
    setIsPlaying(false);
    toast.success('已关闭一起听，可在联系人设置中重新开启');
  }, [selectedContact, updateContactById]);

  if (!selectedContact || !currentSong) return null;

  const myAvatar = selectedContact.myAvatar || homeSettings.avatar || '';
  const theirAvatar = selectedContact.theirAvatar || '';
  const isDiscMode = panelSize.width < 90;

  return (
    <>
      <audio
        ref={audioRef}
        src={musicSrc}
        preload="metadata"
        playsInline
        className="hidden"
        onPlay={() => { setIsPlaying(true); setNeedsGesture(false); setErrorCount(0); }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          if (playlist.length > 1) {
            setMusicIndex(prev => (prev + 1) % playlist.length);
            setErrorCount(0);
          }
        }}
        onError={handleSongError}
      />

      {/* 悬浮按钮 */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        onPointerDown={e => {
          dragRef.current.active = true;
          dragRef.current.sx = e.clientX;
          dragRef.current.sy = e.clientY;
          dragRef.current.px = buttonPos.current.x;
          dragRef.current.py = buttonPos.current.y;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={e => {
          if (!dragRef.current.active) return;
          const dx = e.clientX - dragRef.current.sx;
          const dy = e.clientY - dragRef.current.sy;
          buttonPos.current = { x: dragRef.current.px + dx, y: dragRef.current.py + dy };
          setButtonTranslate(buttonPos.current);
        }}
        onPointerUp={e => {
          dragRef.current.active = false;
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        }}
        className="fixed bottom-20 right-4 z-40 select-none bg-white rounded-2xl px-3 py-2 flex items-center gap-2"
        style={{
          transform: `translate(${buttonTranslate.x}px, ${buttonTranslate.y}px)`,
          touchAction: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
        }}
      >
        <div className="relative flex items-center gap-1">
          <div className="w-8 h-8 rounded-full overflow-hidden">
            {myAvatar ? (
              <img src={myAvatar} className="w-full h-full object-cover" alt="me" />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <Music className="w-4 h-4 text-gray-400" />
              </div>
            )}
          </div>
          <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
            <path d="M0 14 Q 6 0 12 2 Q 18 4 24 14" stroke="black" strokeWidth="1" opacity="0.3" fill="none" />
          </svg>
          <div className="w-8 h-8 rounded-full overflow-hidden">
            {theirAvatar ? (
              <img src={theirAvatar} className="w-full h-full object-cover" alt="them" />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <Music className="w-4 h-4 text-gray-400" />
              </div>
            )}
          </div>
        </div>
        {needsGesture ? (
          <span className="text-[10px] text-amber-500 font-medium">点击播放</span>
        ) : isPlaying ? (
          <span className="w-2 h-2 rounded-full bg-[#07c160]" />
        ) : null}
      </button>

      {showPanel && (
        <div
          className="fixed z-50 bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.18)] overflow-hidden select-none flex flex-col"
          style={{
            width: `${Math.max(240, Math.min(panelSize.width, window.innerWidth - 32))}px`,
            height: `${Math.max(160, Math.min(panelSize.height, window.innerHeight - 32))}px`,
            maxWidth: 'calc(100dvw - 2rem)',
            maxHeight: 'calc(100dvh - 2rem)',
            left: `calc(50% + ${panelPos.x}px)`,
            top: `calc(50% + ${panelPos.y}px)`,
            transform: 'translate(-50%, -50%)',
            touchAction: 'none',
          }}
        >
          {/* 头部 */}
          <div
            className="shrink-0 flex items-center justify-between px-3 py-2 cursor-move select-none"
            onPointerDown={e => {
              panelDragRef.current.active = true;
              panelDragRef.current.sx = e.clientX;
              panelDragRef.current.sy = e.clientY;
              panelDragRef.current.px = panelPos.x;
              panelDragRef.current.py = panelPos.y;
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            }}
            onPointerMove={e => {
              if (!panelDragRef.current.active) return;
              const dx = e.clientX - panelDragRef.current.sx;
              const dy = e.clientY - panelDragRef.current.sy;
              setPanelPos({ x: panelDragRef.current.px + dx, y: panelDragRef.current.py + dy });
            }}
            onPointerUp={e => {
              panelDragRef.current.active = false;
              (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
            }}
          >
            <span className="text-[10px] text-gray-400">一起听歌 · {selectedContact.nickname}</span>
            <button onClick={handleClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors" title="关闭一起听">
              <X className="w-3 h-3 text-gray-400" />
            </button>
          </div>

          {/* 内容 */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-2 min-h-0 overflow-hidden">
            {!isDiscMode && (
              <div className="relative flex items-center justify-center mb-2">
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 200 80" preserveAspectRatio="none">
                  <path d="M 40 70 Q 40 5 100 5 Q 160 5 160 70" fill="none" stroke="black" strokeWidth="1.5" opacity="0.3" />
                </svg>
                <div className="w-14 h-14 rounded-full overflow-hidden relative z-10 mr-10">
                  {myAvatar ? (
                    <img src={myAvatar} className="w-full h-full object-cover" alt="me" />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <Music className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="w-14 h-14 rounded-full overflow-hidden relative z-10">
                  {theirAvatar ? (
                    <img src={theirAvatar} className="w-full h-full object-cover" alt="them" />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <Music className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </div>
              </div>
            )}

            <p className="text-gray-700 text-xs font-medium text-center max-w-full truncate px-2 mb-1">
              🎵 {currentSong.name}
            </p>
            <p className="text-gray-400 text-[11px] text-center leading-relaxed mb-2">
              Ta就在你身边，一起听了 {elapsed.hours}小时{elapsed.minutes}分钟
            </p>

            <div className="flex items-center gap-3">
              {playlist.length > 1 && (
                <button
                  onClick={() => skip(-1)}
                  className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
                </button>
              )}
              <button
                onClick={handlePlayPause}
                className="w-9 h-9 rounded-full bg-[var(--accent-color)] text-white flex items-center justify-center active:scale-95 transition-transform shadow-sm"
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5" fill="currentColor" />
                ) : (
                  <Play className="w-3.5 h-3.5 ml-0.5" fill="currentColor" />
                )}
              </button>
              {playlist.length > 1 && (
                <button
                  onClick={() => skip(1)}
                  className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                </button>
              )}
            </div>

            {playlist.length > 1 && (
              <div className="mt-3 w-full max-h-24 overflow-y-auto space-y-1">
                {playlist.map((song, idx) => (
                  <button
                    key={song.id}
                    onClick={() => { setMusicIndex(idx); setErrorCount(0); }}
                    className={`w-full text-left text-[11px] px-2 py-1 rounded-lg truncate transition-colors ${idx === musicIndex ? 'bg-[var(--accent-color)]/10 text-[var(--accent-color)] font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    {idx === musicIndex && isPlaying ? '▶ ' : `${idx + 1}. `}{song.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 缩放手柄 */}
          <div
            className="absolute bottom-1 right-1 w-4 h-4 cursor-nwse-resize flex items-end justify-end"
            onPointerDown={e => {
              resizeRef.current.active = true;
              resizeRef.current.sx = e.clientX;
              resizeRef.current.sy = e.clientY;
              resizeRef.current.pw = panelSize.width;
              resizeRef.current.ph = panelSize.height;
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            }}
            onPointerMove={e => {
              if (!resizeRef.current.active) return;
              const dx = e.clientX - resizeRef.current.sx;
              const dy = e.clientY - resizeRef.current.sy;
              setPanelSize({
                width: Math.max(240, Math.min(resizeRef.current.pw + dx, window.innerWidth - 32)),
                height: Math.max(80, Math.min(resizeRef.current.ph + dy, window.innerHeight - 32)),
              });
            }}
            onPointerUp={e => {
              resizeRef.current.active = false;
              (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M6 10v-4h4" stroke="white" strokeWidth="1" opacity="0.3" />
            </svg>
          </div>
        </div>
      )}
    </>
  );
}
