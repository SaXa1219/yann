import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, User, Trash2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';

function formatDate(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatTimeAgo(ts: number) {
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diff < 60) return `${diff || 1} 秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 172800) return '昨天';
  return formatDate(ts);
}

export default function DiaryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { diaries, playerDiaries, contact, deleteDiary, deletePlayerDiary } = useApp();

  const entry = useMemo(() => {
    return diaries.find(d => d.id === id) || playerDiaries.find(d => d.id === id);
  }, [diaries, playerDiaries, id]);

  const isPlayerEntry = !!entry && !diaries.some(d => d.id === entry.id);
  const handleDelete = () => {
    if (!entry) return;
    if (!window.confirm('确定删除这篇日记吗？')) return;
    if (isPlayerEntry) deletePlayerDiary(entry.id);
    else deleteDiary(contact.id, entry.id);
    toast.success('已删除');
    navigate(-1);
  };

  const theirAvatar = contact?.theirAvatar;
  const isAuthorSystem = entry?.author === 'system';
  const authorName = isAuthorSystem ? (contact?.nickname || '对方') : '我';
  const authorAvatar = isAuthorSystem ? theirAvatar : contact?.myAvatar;

  const renderAvatar = (src?: string, fallback?: string) => (
    <div className="w-10 h-10 rounded-full overflow-hidden bg-[#f0f2f5] shrink-0">
      {src ? (
        <img src={src} className="w-full h-full object-cover" alt="" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[#9ca3af]">
          {fallback ? <span className="text-sm font-medium">{fallback[0]}</span> : <User className="w-5 h-5" />}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col min-h-dvh" style={{ backgroundColor: '#F7F8FA' }}>
      <header className="shrink-0 h-16 px-4 flex items-center bg-white border-b border-[#f0f2f5] z-10">
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/diary'))}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f3f4f6] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[#374151]" />
        </button>
        <h1 className="flex-1 text-center text-base font-semibold text-[#111827]">日记</h1>
        {entry ? (
          <button
            onClick={handleDelete}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f3f4f6] transition-colors text-[#9ca3af] active:text-red-500"
            aria-label="删除日记"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        ) : <div className="w-9 h-9" />}
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!entry ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-[#9ca3af]">
            <div className="w-16 h-16 rounded-full bg-[#f0f2f5] flex items-center justify-center">
              <BookOpen className="w-8 h-8 opacity-50" />
            </div>
            <p className="text-sm">日记找不到了</p>
          </div>
        ) : (
          <div className="space-y-4">
            <article className="bg-white rounded-2xl border border-[#f0f2f5] shadow-sm p-4">
              <div className="flex items-start gap-3 mb-3">
                {renderAvatar(authorAvatar, authorName)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-[#111827] truncate">{authorName}</span>
                    <span className="text-xs text-[#9ca3af] shrink-0">@{authorName}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-[#9ca3af]">
                    <span>{formatTimeAgo(entry.createdAt)} · {formatTime(entry.createdAt)}</span>
                  </div>
                </div>
              </div>

              {entry.title && <h2 className="text-lg font-bold text-[#111827] mb-2 leading-snug text-balance">{entry.title}</h2>}
              <p className="text-[15px] leading-[1.85] text-[#374151] whitespace-pre-line text-pretty">{entry.content}</p>
            </article>
          </div>
        )}
      </div>
    </div>
  );
}
