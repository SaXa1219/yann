import React, { useState } from 'react';
import { generateId } from '@/utils/id';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send, Mail } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import type { Letter } from '@/types/types';
import { toast } from 'sonner';

export default function LetterWritePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const replyId = searchParams.get('replyId');
  const { contact, cards, addLetter } = useApp();
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = () => {
    if (!body.trim()) { toast.error('请写点什么吧'); return; }
    if (cards.length === 0) { toast.error('请先添加字卡内容'); return; }
    setSending(true);
    const myId = generateId();
    addLetter({ id: myId, fromUser: true, content: body, timestamp: Date.now(), replyId: replyId || undefined });
    window.history.length > 1 ? navigate(-1) : navigate('/');

    // 对方后台回信：主动写信时强制回信；回复来信时 20% 概率回信
    const isReply = !!replyId;
    const shouldReply = !isReply || Math.random() < 0.2;
    if (!shouldReply) return;
    const delaySec = contact.letterReplyDelaySec ?? 5;
    setTimeout(() => {
      const count = 5 + Math.floor(Math.random() * 8); // 5〜12 句
      const shuffled = [...cards].sort(() => Math.random() - 0.5);
      const picked = shuffled.slice(0, Math.min(count, shuffled.length));
      const replyContent = picked.map(c => c.content).join('。');
      const replyLetter: Letter = {
        id: generateId(), fromUser: false,
        content: replyContent + (picked.length > 0 ? '。' : ''),
        timestamp: Date.now(), replyId: myId,
      };
      addLetter(replyLetter);
    }, delaySec * 1000);
  };

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      {/* ── IG 风格顶栏 ── */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 h-12 px-4 flex items-center gap-3">
        <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')} className="text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="flex-1 text-center text-base font-bold text-gray-900 tracking-tight">写信</h1>
        <button
          onClick={() => navigate('/letter/inbox')}
          className="text-sm font-semibold text-[var(--accent-color)] mr-2"
        >
          收信箱
        </button>
        <button
          onClick={handleSend} disabled={sending}
          className="text-sm font-semibold"
          style={{ color: sending ? '#aaa' : '#0095f6' }}
        >
          {sending ? '送出中…' : '发送'}
        </button>
      </header>

      {/* ── 收件人 ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-500 shrink-0">收件人</span>
        <span className="text-sm font-bold text-gray-900">{contact.nickname}</span>
      </div>

      <div className="flex-1 flex flex-col px-4 pt-3 pb-4">
        {/* To: 固定前缀 */}
        <p className="text-sm text-gray-400 mb-2 font-medium">
          To: <span className="text-gray-800 font-semibold">{contact.nickname}</span>
        </p>

        {/* 正文输入区 */}
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="写下你想说的话…"
          disabled={sending}
          className="flex-1 min-h-[280px] w-full resize-none outline-none text-sm leading-7 text-gray-800 placeholder:text-gray-300 bg-white"
          style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
        />

        {/* 底部发送区 */}
        <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Mail className="w-4 h-4" />
            <span>对方将用字卡回信</span>
          </div>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-2 px-5 h-9 rounded-full text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ background: 'linear-gradient(90deg,#833ab4,#fd1d1d,#fcb045)' }}
          >
            {sending ? (
              <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            {sending ? '送出中' : '送出'}
          </button>
        </div>
      </div>
    </div>
  );
}
