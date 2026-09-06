import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, ChevronDown, ChevronUp, Mail, Send, Trash2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import type { ContactSettings, Letter } from '@/types/types';

function formatDate(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function letterLabel(letter: Letter) {
  const isMe = letter.fromUser;
  const isReply = !!letter.replyId;
  if (isMe && isReply) return { text: '我的回信', color: 'bg-blue-50 text-blue-500' };
  if (isMe && !isReply) return { text: '我的主动写信', color: 'bg-purple-50 text-purple-500' };
  if (!isMe && isReply) return { text: '回复我', color: 'bg-green-50 text-green-500' };
  return { text: '主动写信', color: 'bg-orange-50 text-orange-500' };
}

function ContactAvatar({ c, active, onClick }: { c: ContactSettings; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 min-w-[64px]">
      <div className={`w-14 h-14 rounded-full p-[2px] transition-colors ${active ? 'bg-[var(--accent-color)]' : 'bg-gray-200'}`}>
        <div className="w-full h-full rounded-full bg-white p-[2px]">
          <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
            {c.theirAvatar ? (
              <img src={c.theirAvatar} className="w-full h-full object-cover" alt={c.nickname} />
            ) : (
              <span className="text-sm text-gray-500">{c.nickname.charAt(0)}</span>
            )}
          </div>
        </div>
      </div>
      <span className={`text-[11px] truncate max-w-[64px] ${active ? 'text-[var(--accent-color)] font-medium' : 'text-gray-500'}`}>{c.nickname}</span>
    </button>
  );
}

export default function LetterInboxPage() {
  const navigate = useNavigate();
  const { letters, contact, contacts, currentContactId, switchContact, deleteLetter } = useApp();
  const [expanded, setExpanded] = useState<string | null>(null);

  const sorted = [...letters].sort((a, b) => b.timestamp - a.timestamp);
  const unreadCount = letters.filter(l => !l.fromUser).length;

  return (
    <div className="min-h-dvh bg-white">
      {/* ── 顶栏 ── */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 h-12 px-4 flex items-center gap-3">
        <button
          onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}
          className="text-gray-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="flex-1 text-center text-base font-bold text-gray-900 tracking-tight">
          信箱
          {unreadCount > 0 && (
            <span className="ml-1.5 text-xs font-normal text-gray-400">({unreadCount})</span>
          )}
        </h1>
        <button onClick={() => navigate('/letter/write')} className="text-[var(--accent-color)]">
          <Pencil className="w-4.5 h-4.5" />
        </button>
      </header>

      {/* ── 联系人切换（Stories 风格） ── */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
          <button
            onClick={() => navigate('/letter/write')}
            className="flex flex-col items-center gap-1.5 shrink-0"
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(45deg,#833ab4,#fd1d1d,#fcb045)' }}>
              <Send className="w-6 h-6 text-white" />
            </div>
            <span className="text-[11px] text-gray-500">写信</span>
          </button>
          {contacts.map(c => (
            <ContactAvatar
              key={c.id}
              c={c}
              active={c.id === currentContactId}
              onClick={() => switchContact(c.id)}
            />
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">当前：{contact.nickname} · 点击头像切换联系人</p>
      </div>

      {/* ── 信件列表（IG 帖子风格） ── */}
      <div className="divide-y divide-gray-100">
        {sorted.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 opacity-60">
            <Mail className="w-10 h-10 text-gray-300" />
            <p className="text-sm text-gray-400">还没有信件</p>
          </div>
        )}
        {sorted.map(letter => {
          const isOpen = expanded === letter.id;
          const isMe = letter.fromUser;
          const toName = isMe ? contact.nickname : (contact.myName || '我');
          const fromName = isMe ? (contact.myName || '我') : contact.nickname;

          return (
            <div key={letter.id}>
              {/* 帖子头部（IG 风格）*/}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                onClick={() => setExpanded(isOpen ? null : letter.id)}
              >
                {/* 头像（IG 风格渐变环） */}
                <div className="relative w-9 h-9 shrink-0">
                  <div className="absolute inset-0 rounded-full p-[1.5px]"
                    style={{ background: isMe ? '#c7b8e8' : 'linear-gradient(45deg,#833ab4,#fd1d1d,#fcb045)' }}>
                    <div className="w-full h-full rounded-full bg-white p-[1.5px]">
                      <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                        {isMe
                          ? (contact.myAvatar
                            ? <img src={contact.myAvatar} className="w-full h-full object-cover" alt="我" />
                            : <span className="text-sm">{(contact.myName || '我').charAt(0)}</span>)
                          : (contact.theirAvatar
                            ? <img src={contact.theirAvatar} className="w-full h-full object-cover" alt="对方" />
                            : <span className="text-sm">{contact.nickname.charAt(0)}</span>)
                        }
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900">{fromName}</p>
                    {(() => {
                      const label = letterLabel(letter);
                      return <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${label.color}`}>{label.text}</span>;
                    })()}
                  </div>
                  <p className="text-xs text-gray-400">{formatDate(letter.timestamp)} · 致 {toName}</p>
                </div>
                <button
                  onClick={(ev) => {
                    ev.stopPropagation();
                    if (window.confirm('确定删除这封信吗？')) {
                      deleteLetter(letter.id);
                      toast.success('已删除');
                    }
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-300 active:text-red-500 shrink-0"
                  aria-label="删除信件"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                {isOpen ? <ChevronUp className="w-4 h-4 text-gray-300 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-300 shrink-0" />}
              </div>

              {/* 信件内容（折叠展开） */}
              {isOpen && (
                <div className="px-4 pb-4">
                  <div className="rounded-2xl bg-gray-50 px-4 py-4">
                    <p className="text-sm font-semibold text-gray-500 mb-3"
                      style={{ fontFamily: 'Georgia, serif' }}>
                      To: {toName}
                    </p>
                    <p className="text-sm leading-7 text-gray-700 whitespace-pre-wrap break-words"
                      style={{ fontFamily: 'Georgia, serif' }}>
                      {letter.content}
                    </p>
                    <p className="text-right text-xs text-gray-400 mt-4"
                      style={{ fontFamily: 'Georgia, serif' }}>
                      {fromName} 敬上
                    </p>
                    {!isMe && !letters.some(reply => reply.fromUser && reply.replyId === letter.id) && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => navigate(`/letter/write?replyId=${letter.id}`)}
                          className="w-full h-10 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-1"
                          style={{ background: 'linear-gradient(90deg,#833ab4,#fd1d1d,#fcb045)' }}
                        >
                          <Send className="w-3.5 h-3.5" />
                          写回信
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>


    </div>
  );
}
