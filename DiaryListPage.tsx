import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreHorizontal, CheckCircle, User, BookOpen, Trash2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';

function formatDate(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function formatTimeAgo(ts: number) {
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diff < 60) return `${diff || 1} 秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 172800) return '昨天';
  return formatDate(ts);
}

export default function DiaryListPage() {
  const navigate = useNavigate();
  const { diaries, contact, deleteDiary } = useApp();

  const sorted = [...diaries].sort((a, b) => b.createdAt - a.createdAt);
  const partnerName = contact.nickname || '对方';
  const partnerAvatar = contact.theirAvatar;

  const renderAvatar = () => (
    <div className="w-10 h-10 rounded-full overflow-hidden bg-[#f0f2f5] shrink-0">
      {partnerAvatar ? (
        <img src={partnerAvatar} className="w-full h-full object-cover" alt="" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[#9ca3af]">
          <span className="text-sm font-medium">{partnerName[0]}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col min-h-dvh" style={{ backgroundColor: '#F7F8FA' }}>
      <header className="shrink-0 h-16 px-4 flex items-center bg-white border-b border-[#f0f2f5] z-10">
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f3f4f6] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[#374151]" />
        </button>
        <div className="flex-1 flex flex-col items-center justify-center pr-9">
          <h1 className="text-base font-semibold text-[#111827]">{partnerName}的日记</h1>
          <p className="text-[10px] text-[#9ca3af]">{sorted.length} 篇记录</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-[#9ca3af]">
            <div className="w-16 h-16 rounded-full bg-[#f0f2f5] flex items-center justify-center">
              <BookOpen className="w-8 h-8 opacity-50" />
            </div>
            <p className="text-sm">还没有日记，等对方写一篇吧～</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((entry) => (
              <button
                key={entry.id}
                onClick={() => navigate(`/diary/${entry.id}`)}
                className="w-full text-left"
              >
                <div className="bg-white rounded-2xl px-4 py-4 shadow-sm border border-[#f0f2f5] active:scale-[0.99] transition-transform">
                  <div className="flex items-start gap-3">
                    {renderAvatar()}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-[#111827] truncate">{partnerName}</span>
                        <span className="text-xs text-[#9ca3af] shrink-0">@{partnerName}</span>
                      </div>
                      <p className="text-[15px] leading-relaxed text-[#374151] text-pretty whitespace-pre-line">
                        {entry.title ? `${entry.title}\n${entry.content}` : entry.content}
                      </p>
                      <div className="flex items-center gap-5 mt-3 text-[#9ca3af]">
                        <span className="flex items-center gap-1.5 text-xs">
                          <CheckCircle className="w-3.5 h-3.5" />
                          {formatTimeAgo(entry.createdAt)}
                        </span>
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation();
                            if (window.confirm('确定删除这篇日记吗？')) {
                              deleteDiary(contact.id, entry.id);
                              toast.success('已删除');
                            }
                          }}
                          className="ml-auto flex items-center gap-1 text-xs text-[#c0c4cc] active:text-red-500"
                          aria-label="删除日记"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
