import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, PhoneOff, Heart, Thermometer, Navigation, Send } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type { CompanionSession } from '@/types/types';
import { DEFAULT_COMPANION_CONFIG } from '@/types/types';
import { getActiveCompanionSession, saveActiveCompanionSession, clearActiveCompanionSession, getCompanionSessions, saveCompanionSessions } from '@/services/storage';
import { generateId } from '@/utils/id';
import { toast } from 'sonner';

const DEFAULT_REPLIES = [
  '我也在，专心一起吧',
  '别分心，我在你身边',
  '刚刚心跳快了一下，是你也在想我吗？',
  '继续，我陪你',
  '好累就歇一下，我等你',
  '嘿嘿，认真一点哦',
  '我在这里，一直都在',
  '你那边冷不冷？',
];

const DIRECTIONS = ['在你左边', '在你左前方', '在你正前方', '在你右前方', '在你右边', '在你右后方', '在你正后方', '在你左后方'];

function pickReply() {
  return DEFAULT_REPLIES[Math.floor(Math.random() * DEFAULT_REPLIES.length)];
}

function formatDate(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')}`;
}

function formatDuration(ms: number) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}小时${m}分钟${s}秒`;
}

function clamp(num: number, min: number, max: number) {
  return Math.max(min, Math.min(max, num));
}

function round(num: number, digits: number) {
  const factor = Math.pow(10, digits);
  return Math.round(num * factor) / factor;
}

export default function CompanionSessionPage() {
  const navigate = useNavigate();
  const { contacts, switchContact, contact, messages, addMessage } = useApp();
  const [session, setSession] = useState<CompanionSession | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [live, setLive] = useState({
    heartbeat: DEFAULT_COMPANION_CONFIG.baseHeartbeat,
    temperature: DEFAULT_COMPANION_CONFIG.baseTemperature,
    direction: DIRECTIONS[2],
    distance: DEFAULT_COMPANION_CONFIG.baseDistance,
  });
  const [chatOpen, setChatOpen] = useState(false);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const hbRef = useRef<number | null>(null);
  const tempRef = useRef<number | null>(null);
  const locRef = useRef<number | null>(null);
  const sessionRef = useRef<CompanionSession | null>(null);

  useEffect(() => {
    const s = getActiveCompanionSession();
    if (!s) {
      toast.error('暂无进行中的陪伴');
      navigate('/companion/select');
      return;
    }
    const config = { ...DEFAULT_COMPANION_CONFIG, ...s.config };
    const initial = {
      heartbeat: config.baseHeartbeat,
      temperature: config.baseTemperature,
      direction: DIRECTIONS[2],
      distance: config.baseDistance,
    };
    setLive(initial);
    const loaded = { ...s, config };
    setSession(loaded);
    sessionRef.current = loaded;
    switchContact(s.contactId);
    setElapsed(Date.now() - s.startTime);
  }, [navigate, switchContact]);

  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setSession(s => {
        if (!s) return s;
        setElapsed(Date.now() - s.startTime);
        return s;
      });
    }, 1000);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    // 心跳：每 10 秒变化一次
    hbRef.current = window.setInterval(() => {
      setLive(prev => {
        const s = sessionRef.current;
        const config = s?.config || DEFAULT_COMPANION_CONFIG;
        const hbBase = config.baseHeartbeat + Math.sin(Date.now() / 4000) * (config.heartbeatRange / 2);
        const hb = clamp(hbBase + (Math.random() * 6 - 3), 50, 120);
        const next = { ...prev, heartbeat: round(hb, 0) };
        setSession(cur => {
          if (!cur) return cur;
          const updated = { ...cur, heartbeat: [...cur.heartbeat, next.heartbeat].slice(-180) };
          saveActiveCompanionSession(updated);
          return updated;
        });
        return next;
      });
    }, 10000);

    // 体温：每 10 秒变化一次，与心跳错开 5 秒
    tempRef.current = window.setTimeout(() => {
      tempRef.current = window.setInterval(() => {
        setLive(prev => {
          const s = sessionRef.current;
          const config = s?.config || DEFAULT_COMPANION_CONFIG;
          const temp = clamp(config.baseTemperature + (Math.random() * config.tempRange * 2 - config.tempRange), 35.5, 38.0);
          const next = { ...prev, temperature: round(temp, 1) };
          setSession(cur => {
            if (!cur) return cur;
            const updated = { ...cur, temperature: [...cur.temperature, next.temperature].slice(-180) };
            saveActiveCompanionSession(updated);
            return updated;
          });
          return next;
        });
      }, 10000);
    }, 5000);

    // 实时位置（方位 + 距离）：每 1 分钟变化一次
    locRef.current = window.setInterval(() => {
      setLive(prev => {
        const prevIndex = DIRECTIONS.indexOf(prev.direction);
        const step = Math.random() > 0.5 ? (Math.random() > 0.5 ? 1 : -1) : 0;
        const dir = DIRECTIONS[(prevIndex + step + DIRECTIONS.length) % DIRECTIONS.length];
        const dist = clamp(prev.distance + (Math.random() * 0.4 - 0.2), 0.1, 5.0);
        const next = { ...prev, direction: dir, distance: round(dist, 1) };
        setSession(cur => {
          if (!cur) return cur;
          const updated = {
            ...cur,
            direction: [...cur.direction, next.direction].slice(-180),
            distance: [...cur.distance, next.distance].slice(-180),
          };
          saveActiveCompanionSession(updated);
          return updated;
        });
        return next;
      });
    }, 60000);

    return () => {
      if (hbRef.current) window.clearInterval(hbRef.current);
      if (tempRef.current) window.clearInterval(tempRef.current);
      if (locRef.current) window.clearInterval(locRef.current);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, chatOpen]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const text = input.trim();
    addMessage({
      id: generateId(),
      type: 'text',
      content: text,
      sender: 'user',
      timestamp: Date.now(),
      read: true,
    });
    setSession(s => {
      if (!s) return s;
      const updated = { ...s, log: [...s.log, { time: Date.now(), text: `我说：${text}`, sender: 'user' as const }] };
      sessionRef.current = updated;
      saveActiveCompanionSession(updated);
      return updated;
    });
    setInput('');

    // 陪伴中对方自动回复
    const replyDelay = 1500 + Math.random() * 2000;
    setTimeout(() => {
      const reply = pickReply();
      addMessage({
        id: generateId(),
        type: 'text',
        content: reply,
        sender: 'system',
        timestamp: Date.now(),
      });
      setSession(s => {
        if (!s) return s;
        const updated = { ...s, log: [...s.log, { time: Date.now(), text: `${contact?.nickname || 'TA'}说：${reply}`, sender: 'system' as const }] };
        sessionRef.current = updated;
        saveActiveCompanionSession(updated);
        return updated;
      });
    }, replyDelay);
  };

  const end = () => {
    if (!session) return;
    const endTime = Date.now();
    const duration = endTime - session.startTime;
    const log = [
      ...session.log,
      { time: endTime, text: `陪伴结束，共${formatDuration(duration)}` },
    ];
    const summary: CompanionSession = {
      ...session,
      endTime,
      duration,
      log,
    };
    const sessions = getCompanionSessions().filter(s => s.id !== session.id);
    saveCompanionSessions([summary, ...sessions]);
    clearActiveCompanionSession();
    navigate(`/companion/summary/${session.id}`);
  };

  if (!session) return null;

  const progress = Math.min(100, Math.round((elapsed / (25 * 60 * 1000)) * 100));
  const bg = session.background || 'linear-gradient(135deg, #2d1b36 0%, #4a2c55 50%, #2d1b36 100%)';
  const isImageBg = bg.startsWith('url(');

  return (
    <div
      className="min-h-screen w-full text-white flex flex-col relative"
      style={isImageBg ? { backgroundImage: bg, backgroundSize: 'cover', backgroundPosition: 'center' } : { backgroundImage: bg }}
    >
      {isImageBg && <div className="absolute inset-0 bg-black/40 z-0" />}
      <div className="relative z-10 flex flex-col flex-1">
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-sm text-white/70">陪伴中</span>
        <div className="w-9" />
      </div>

      <div className="flex-1 flex flex-col items-center px-6 pt-4 pb-6">
        <p className="text-sm text-white/60 mb-1">{formatDate(session.startTime)}</p>
        <div className="relative w-24 h-24 mb-3">
          <span className="absolute inset-0 rounded-full border border-white/20 animate-ping" />
          <span className="absolute inset-[-6px] rounded-full border border-pink-200/20 animate-pulse" />
          <span className="absolute inset-[-12px] rounded-full border border-white/10 animate-pulse" style={{ animationDelay: '0.6s' }} />
          <div className="absolute inset-0 rounded-full overflow-hidden border-4 border-white/20 shadow-[0_0_30px_rgba(255,182,193,0.25)]">
            {contact?.theirAvatar ? (
              <img src={contact.theirAvatar} className="w-full h-full object-cover" alt={contact.nickname} />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-white/10 text-white/70">{contact?.nickname?.slice(0, 1) || 'TA'}</div>
            )}
          </div>
        </div>
        <h1 className="text-xl font-semibold mb-5 text-center">{contact?.nickname || 'TA'} 和你一起{session.activity || session.scene}</h1>

        <div className="w-full max-w-sm mb-5">
          <div className="flex justify-between text-xs text-white/70 mb-2">
            <span>闲散</span>
            <span>专注</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-[#7dd3fc] transition-all duration-1000" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="w-full max-w-sm grid grid-cols-2 gap-3 mb-5">
          <div className="rounded-2xl bg-white/10 p-4 flex flex-col items-center gap-1">
            <Heart className="w-5 h-5 text-pink-200 mb-1" />
            <span className="text-xl font-semibold">{live.heartbeat}</span>
            <span className="text-xs text-white/60">对面心跳</span>
          </div>
          <div className="rounded-2xl bg-white/10 p-4 flex flex-col items-center gap-1">
            <Thermometer className="w-5 h-5 text-orange-200 mb-1" />
            <span className="text-xl font-semibold">{live.temperature.toFixed(1)}°C</span>
            <span className="text-xs text-white/60">对面体温</span>
          </div>
        </div>

        <div className="w-full max-w-sm rounded-2xl bg-white/10 p-4 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Navigation className="w-6 h-6 text-green-200" style={{ transform: `rotate(${DIRECTIONS.indexOf(live.direction) * 45}deg)` }} />
            <div>
              <p className="text-sm font-medium">{live.direction}</p>
              <p className="text-xs text-white/60">距离 {live.distance.toFixed(1)} 米</p>
            </div>
          </div>
          <div className="text-xs text-white/40">实时位置</div>
        </div>

        <div className="w-full max-w-sm rounded-2xl bg-white/10 p-4 mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-white/70">已陪伴时长</span>
            <span className="font-semibold">{formatDuration(elapsed)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/50">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span>实时连接中</span>
          </div>
        </div>

        <div className="flex gap-4 mt-auto">
          <Sheet open={chatOpen} onOpenChange={setChatOpen}>
            <SheetTrigger>
              <Button className="rounded-full px-6 py-5 text-white bg-white/20 hover:bg-white/30">
                <MessageCircle className="w-5 h-5 mr-2" />
                聊天
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl bg-[#2d1b36] border-0 p-0 flex flex-col">
              <SheetHeader className="px-4 py-3 border-b border-white/10">
                <SheetTitle className="text-white text-base">与 {contact?.nickname || 'TA'} 聊天</SheetTitle>
              </SheetHeader>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(m => {
                  const isUser = m.sender === 'user';
                  return (
                    <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${isUser ? 'bg-[#7dd3fc] text-[#2d1b36]' : 'bg-white/10 text-white'}`}>
                        {m.content}
                      </div>
                    </div>
                  );
                })}
                {messages.length === 0 && <p className="text-center text-white/40 text-sm py-6">开始聊天吧</p>}
              </div>
              <div className="p-3 border-t border-white/10 flex items-center gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
                  placeholder="输入消息..."
                  className="flex-1 bg-white/10 text-white placeholder:text-white/40 rounded-full px-4 py-2 text-sm outline-none focus:bg-white/15"
                />
                <button onClick={sendMessage} className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white">
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </SheetContent>
          </Sheet>
          <Button
            onClick={end}
            variant="destructive"
            className="rounded-full px-6 py-5 bg-white/10 hover:bg-white/20 text-white"
          >
            <PhoneOff className="w-5 h-5 mr-2" />
            结束陪伴
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
}