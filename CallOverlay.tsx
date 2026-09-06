// @refresh reset
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, PhoneOff, PhoneMissed, Minimize2, Users } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { SYSTEM_FIXED } from '@/constants/behavior';
import { useCallCompanion } from '@/hooks/useCallCompanion';
type CallState = 'idle' | 'incoming' | 'outgoing' | 'connected';

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m.toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

export default function CallOverlay() {
  const { contact, currentContactId, updateContact, contacts, appearance, miniMaxSettings } = useApp();
  const [state, setState] = useState<CallState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [minimized, setMinimized] = useState(false);

  const { isListening, current, anim, typing, bubbles } = useCallCompanion(
    currentContactId,
    state === 'connected',
    miniMaxSettings.enabled,
    miniMaxSettings.voiceId,
    miniMaxSettings.apiKey,
    miniMaxSettings.groupId,
    miniMaxSettings.speed,
  );

  const [pos, setPos] = useState({ x: 20, y: 100 });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoCallRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 群聊成员
  const isGroup = contact.isGroup;
  const groupMembers = isGroup
    ? contacts.filter(c => contact.groupMemberIds?.includes(c.id))
    : [];
  // 最多显示 4 个头像，多出来的用 +n 表示
  const visibleMembers = groupMembers.slice(0, 4);
  const extraCount = groupMembers.length - 4;

  const scheduleAutoCall = useCallback(() => {
    const chance = SYSTEM_FIXED.autoCallChance;
    if (chance <= 0) return;
    const delay = 30000 + Math.random() * 60000;
    autoCallRef.current = setTimeout(() => {
      if (state === 'idle' && Math.random() * 100 < chance) {
        setState('incoming');
      }
    }, delay);
  }, [state]);

  useEffect(() => {
    const handleStart = () => { setState('outgoing'); };
    window.addEventListener('startCall', handleStart);
    return () => window.removeEventListener('startCall', handleStart);
  }, []);

  useEffect(() => {
    if (state === 'idle') {
      scheduleAutoCall();
    }
    return () => { if (autoCallRef.current) clearTimeout(autoCallRef.current); };
  }, [state, scheduleAutoCall]);

  useEffect(() => {
    if (state !== 'outgoing') return;
    const hangup = Math.random() * 100 < SYSTEM_FIXED.hangupChance;
    const t = setTimeout(() => {
      if (hangup) { setState('idle'); } else { setState('connected'); }
    }, 2000 + Math.random() * 2000);
    return () => clearTimeout(t);
  }, [state, contact.hangupChance]);

  useEffect(() => {
    if (state === 'connected') {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state]);

  const handleAccept = () => setState('connected');
  const handleReject = () => setState('idle');
  const handleHangup = () => {
    if (state === 'connected' && elapsed > 0) {
      window.dispatchEvent(new CustomEvent('callEnded', { detail: { duration: elapsed } }));
      updateContact({ ...contact, companionSeconds: (contact.companionSeconds || 0) + elapsed });
    }
    setState('idle');
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const nx = e.clientX - dragOffset.current.x;
    const ny = e.clientY - dragOffset.current.y;
    setPos({ x: Math.max(0, nx), y: Math.max(0, ny) });
  };
  const onPointerUp = () => { dragging.current = false; };

  if (state === 'idle') return null;

  const theirAvatar = contact.theirAvatar;
  const name = contact.nickname;

  // 单聊头像
  const singleAvatar = (
    <div className="relative">
      <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-700 ring-4 ring-white/10 shadow-2xl">
        {theirAvatar ? (
          <img src={theirAvatar} className="w-full h-full object-cover" alt="avatar" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🌸</div>
        )}
      </div>
      {state === 'connected' && (
        <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-green-400 border-[3px] border-[#0f3460]" />
      )}
      {state !== 'connected' && (
        <div className="absolute inset-0 rounded-full animate-ping bg-white/5" />
      )}
    </div>
  );

  // 群聊头像堆叠
  const groupAvatar = (
    <div className="relative flex items-center justify-center">
      <div className="flex flex-wrap justify-center gap-2 max-w-[200px]">
        {visibleMembers.map((m, i) => (
          <div key={m.id} className="relative" style={{ zIndex: visibleMembers.length - i }}>
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-700 ring-2 ring-white/10 shadow-xl">
              {m.theirAvatar ? (
                <img src={m.theirAvatar} className="w-full h-full object-cover" alt="avatar" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl">🌸</div>
              )}
            </div>
            {state === 'connected' && (
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-400 border-[2px] border-[#0f3460]" />
            )}
          </div>
        ))}
        {extraCount > 0 && (
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center ring-2 ring-white/10">
            <span className="text-white/60 text-sm font-medium">+{extraCount}</span>
          </div>
        )}
      </div>
    </div>
  );

  if (minimized) {
    return (
      <>
        <div
          className="fixed z-[200] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing select-none overflow-hidden"
          style={{ left: pos.x, top: pos.y, background: 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))', touchAction: 'none' }}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
          {isGroup ? (
            <div className="flex items-center justify-center w-full h-full">
              <Users className="w-6 h-6 text-white" />
            </div>
          ) : theirAvatar ? (
            <img src={theirAvatar} className="w-full h-full object-cover" alt="avatar" />
          ) : (
            <Phone className="w-6 h-6 text-white animate-pulse" />
          )}
          {state === 'connected' && (
            <div className="absolute bottom-0 w-full text-center bg-black/30 text-white text-[9px] py-0.5">{formatTime(elapsed)}</div>
          )}
          <button className="absolute top-0 right-0 w-5 h-5 rounded-full bg-white/40 flex items-center justify-center" onClick={() => setMinimized(false)}>
            <Minimize2 className="w-2.5 h-2.5 text-white" style={{ transform: 'rotate(180deg)' }} />
          </button>
        </div>
        {/* 缩小后的字卡气泡 */}
        {bubbles.length > 0 && (
          <div
            className="fixed z-[200] flex flex-col gap-2 max-w-[220px] pointer-events-none"
            style={{ left: pos.x + 62, top: pos.y + 2 }}
          >
            {bubbles.map(b => (
              <div key={b.id} className="animate-fade-in-up">
                <div className="relative px-3 py-2 rounded-xl rounded-tl-none bg-white/90 text-gray-800 text-xs shadow-lg border border-white/40">
                  <p className="line-clamp-3">{b.content}</p>
                  <span className="absolute -left-1 top-0 w-2 h-2 bg-white/90 rotate-45 -translate-y-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  // 全屏通话界面
  const callBg = appearance.callBg;
  const callBgOpacity = appearance.callBgOpacity ?? 1;
  const isCssBackground = callBg && (callBg.startsWith('linear-gradient') || callBg.startsWith('radial-gradient') || callBg.startsWith('#') || callBg.startsWith('rgb') || callBg.startsWith('var('));
  const callBgStyle: React.CSSProperties = callBg
    ? isCssBackground
      ? { background: callBg, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { backgroundImage: `url(${callBg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
    : { background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)' };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-between select-none">
      {/* 背景独立图层，支持透明度调节 */}
      <div className="absolute inset-0 -z-10" style={{ ...callBgStyle, opacity: callBgOpacity }} />

      {/* 顶部 */}
      <div className="w-full flex items-center justify-between px-5 pt-6">
        <span className="text-xs font-medium tracking-widest text-white/50 uppercase">
          {state === 'incoming' ? (isGroup ? 'Group Call' : 'Incoming Call') : state === 'outgoing' ? (isGroup ? 'Group Call' : 'Calling') : formatTime(elapsed)}
        </span>
        <button onClick={() => setMinimized(true)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
          <Minimize2 className="w-4 h-4 text-white/70" />
        </button>
      </div>

      {/* 中部头像 + 名字 */}
      <div className="flex flex-col items-center gap-5 -mt-8">
        {isGroup ? groupAvatar : singleAvatar}
        <div className="text-center">
          <p className="text-2xl font-bold text-white tracking-tight">{isGroup ? (contact.nickname || '群聊') : name}</p>
          <p className="text-sm text-white/50 mt-1.5 font-light">
            {state === 'incoming' ? '正在呼叫你…' : state === 'outgoing' ? '等待对方接听…' : `通话中${isGroup ? ` · ${groupMembers.length + 1} 人` : ''}`}
          </p>
          {state === 'connected' && (
            <div className="flex flex-col items-center gap-1 mt-2">
              {typing ? (
                <p className="text-xs text-white/50">对方正在输入…</p>
              ) : isListening ? (
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                  </span>
                  <span>正在倾听你…</span>
                </div>
              ) : (
                <p className="text-xs text-white/40">等待你的声音</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 陪伴字卡 */}
      {state === 'connected' && (
        <div className="flex-1 flex items-center justify-center px-8 w-full">
          <div
            className={`max-w-md w-full text-center transition-all duration-700 ease-in-out ${
              anim === 'visible' ? 'opacity-100 translate-y-0' : anim === 'entering' ? 'opacity-0 translate-y-4' : anim === 'exiting' ? 'opacity-0 -translate-y-4' : 'opacity-0'
            }`}
          >
            {current && (
              <div className="inline-block px-6 py-4 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 shadow-2xl">
                <p className="text-white text-lg font-medium leading-relaxed whitespace-pre-wrap">{current.content}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 底部按钮 */}
      <div className="w-full pb-12 px-8">
        {state === 'incoming' && (
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center gap-2">
              <button onClick={handleReject}
                className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30 active:scale-95 transition-transform">
                <PhoneOff className="w-7 h-7 text-white" />
              </button>
              <span className="text-xs text-white/50">拒绝</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button onClick={handleAccept}
                className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30 active:scale-95 transition-transform">
                <Phone className="w-7 h-7 text-white" />
              </button>
              <span className="text-xs text-white/50">接听</span>
            </div>
          </div>
        )}
        {(state === 'outgoing' || state === 'connected') && (
          <div className="flex flex-col items-center gap-2">
            <button onClick={handleHangup}
              className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30 active:scale-95 transition-transform">
              {state === 'outgoing' ? <PhoneMissed className="w-7 h-7 text-white" /> : <PhoneOff className="w-7 h-7 text-white" />}
            </button>
            <span className="text-xs text-white/50">{state === 'outgoing' ? '取消' : '挂断'}</span>
          </div>
        )}
      </div>
    </div>
  );
}
