import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock, Calendar, Sparkles, Heart, RotateCcw, Home } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { getCompanionSessions } from '@/services/storage';
import type { CompanionSession } from '@/types/types';
import { toast } from 'sonner';

function formatTime(ts: number) {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function formatDate(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')}`;
}

function formatDuration(ms: number) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return `${h}小时${m}分钟`;
}

export default function CompanionSummaryPage() {
  const navigate = useNavigate();
  const { contacts } = useApp();
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<CompanionSession | null>(null);

  useEffect(() => {
    const sessions = getCompanionSessions();
    const s = sessions.find(x => x.id === id);
    if (!s) {
      toast.error('未找到陪伴记录');
      navigate('/companion/select');
      return;
    }
    setSession(s);
  }, [id, navigate]);

  if (!session) return null;

  const contact = contacts.find(c => c.id === session.contactId);
  const nickname = contact?.nickname || session.contactId;

  const avgHeartbeat = session.heartbeat.length
    ? Math.round(session.heartbeat.reduce((a, b) => a + b, 0) / session.heartbeat.length)
    : 0;
  const avgTemp = session.temperature.length
    ? (session.temperature.reduce((a, b) => a + b, 0) / session.temperature.length).toFixed(1)
    : '0.0';

  const handleShare = () => {
    const text = `今天和${nickname}一起${session.activity || session.scene}了${formatDuration(session.duration)}，平均心跳${avgHeartbeat}，平均体温${avgTemp}°C。`;
    if (navigator.share) {
      navigator.share({ title: '陪伴总结', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => toast.success('已复制到剪贴板'));
    }
  };

  const backHome = () => navigate('/');
  const again = () => navigate('/companion/select');

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#1f1429] via-[#2d1b36] to-[#3d2345] text-white flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">陪伴手账</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        <div className="flex flex-col items-center pt-4 pb-6">
          <div className="flex items-center gap-2 text-sm text-white/60 mb-2">
            <Sparkles className="w-4 h-4" />
            <span>{formatDate(session.startTime)}</span>
          </div>
          <h2 className="text-2xl font-semibold text-center mb-1">{nickname}和你一起{session.activity || session.scene}</h2>
          <p className="text-sm text-white/50">一次安静的陪伴</p>
        </div>

        <div className="w-full max-w-sm mx-auto rounded-3xl bg-white/10 backdrop-blur-md border border-white/10 p-5 mb-6">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-white/20 overflow-hidden mb-2">
                {contact?.theirAvatar ? (
                  <img src={contact.theirAvatar} className="w-full h-full object-cover" alt={nickname} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/70 text-sm">{nickname.slice(0, 1)}</div>
                )}
              </div>
              <span className="text-xs text-white/70">{nickname}</span>
            </div>
            <div className="flex-1 h-px bg-white/20" />
            <div className="flex flex-col items-center text-center">
              <Heart className="w-5 h-5 text-pink-200 mb-1" />
              <span className="text-xs text-white/70">陪伴</span>
            </div>
            <div className="flex-1 h-px bg-white/20" />
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-white/20 overflow-hidden mb-2" />
              <span className="text-xs text-white/70">我</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-xs text-white/60 mb-1">平均心跳</p>
              <p className="text-xl font-semibold">{avgHeartbeat}<span className="text-xs font-normal text-white/60"> bpm</span></p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-xs text-white/60 mb-1">平均体温</p>
              <p className="text-xl font-semibold">{avgTemp}<span className="text-xs font-normal text-white/60"> °C</span></p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6 max-w-sm mx-auto">
          <div className="rounded-2xl bg-white/10 p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-white/70 text-xs">
              <Clock className="w-4 h-4" />
              <span>开始</span>
            </div>
            <p className="text-lg font-semibold">{formatTime(session.startTime)}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-white/70 text-xs">
              <Calendar className="w-4 h-4" />
              <span>结束</span>
            </div>
            <p className="text-lg font-semibold">{formatTime(session.endTime)}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-4 flex flex-col gap-1 col-span-2">
            <div className="flex items-center gap-2 text-white/70 text-xs">
              <Clock className="w-4 h-4" />
              <span>陪伴时长</span>
            </div>
            <p className="text-lg font-semibold">{formatDuration(session.duration)}</p>
          </div>
        </div>

        <div className="rounded-3xl bg-[#f4f1f8]/10 border border-white/10 p-5 mb-6 max-w-sm mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-pink-200" />
            <h3 className="text-base font-semibold">专注日记</h3>
          </div>
          <div className="space-y-4">
            {session.log.length === 0 && <p className="text-sm text-white/50 text-center py-4">这次陪伴很安静，没有留下对话</p>}
            {session.log.map((entry, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full ${entry.sender === 'user' ? 'bg-[#7dd3fc]' : 'bg-pink-200'}`} />
                  {idx < session.log.length - 1 && <div className="w-px flex-1 bg-white/10 my-1" />}
                </div>
                <div className="flex-1 pb-2">
                  <p className="text-xs text-white/50 mb-0.5">{formatTime(entry.time)}</p>
                  <p className={`text-sm leading-relaxed ${entry.sender === 'user' ? 'text-[#7dd3fc]' : 'text-white'}`}>{entry.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 max-w-sm mx-auto">
          <Button onClick={backHome} className="flex-1 rounded-full py-5 bg-white/10 hover:bg-white/20 text-white">
            <Home className="w-4 h-4 mr-2" />
            返回首页
          </Button>
          <Button onClick={again} className="flex-1 rounded-full py-5 bg-white/20 hover:bg-white/30 text-white">
            <RotateCcw className="w-4 h-4 mr-2" />
            再来一次
          </Button>
        </div>
      </div>
    </div>
  );
}