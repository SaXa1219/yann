import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreHorizontal, BookOpen, CheckCircle2, Send, Plus, X, Trash2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Textarea } from '@/components/ui/textarea';
import { generateId } from '@/utils/id';
import { toast } from 'sonner';

function isSameDay(a: number, b: number) {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

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

const LINE_HEIGHT = 32;
const LINE_COLOR = '#e5e7eb';

export default function PlayerDiaryPage() {
  const navigate = useNavigate();
  const { playerDiaries, addPlayerDiary, deletePlayerDiary } = useApp();
  const [content, setContent] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const sorted = useMemo(() => [...playerDiaries].sort((a, b) => b.createdAt - a.createdAt), [playerDiaries]);
  const todayEntry = useMemo(() => sorted.find(d => isSameDay(d.createdAt, Date.now())), [sorted]);

  const handleOpenEditor = () => {
    if (todayEntry) setContent(todayEntry.content);
    else setContent('');
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    if (!todayEntry) setContent('');
    setIsEditorOpen(false);
  };

  const handlePublish = () => {
    const c = content.trim();
    if (!c) {
      toast('先写点什么吧～');
      return;
    }
    if (todayEntry) {
      toast('今天已经写过日记啦');
      return;
    }
    addPlayerDiary({
      id: generateId(),
      title: '',
      content: c,
      createdAt: Date.now(),
      author: 'player',
    });
    toast('日记已保存');
    setContent('');
    setIsEditorOpen(false);
  };

  return (
    <div className="flex flex-col min-h-dvh" style={{ backgroundColor: '#F7F8FA' }}>
      <header className="shrink-0 h-14 px-4 flex items-center bg-white border-b border-[#f0f2f5] z-10">
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f3f4f6] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[#374151]" />
        </button>
        <h1 className="flex-1 text-center text-base font-semibold text-[#111827] pr-9">我的日记</h1>
        <button
          onClick={handleOpenEditor}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f3f4f6] transition-colors"
          aria-label="写日记"
        >
          <Plus className="w-5 h-5 text-[#374151]" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* 编辑器：点击加号后展开 */}
        {isEditorOpen && (
          <div className="bg-white rounded-[24px] border border-[#f0f2f5] shadow-sm overflow-hidden mb-4">
            <div className="px-5 pt-4 pb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-[0.1em] text-[#111827]">我的日记</h2>
              <button
                onClick={handleCloseEditor}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f3f4f6] transition-colors"
                aria-label="关闭"
              >
                <X className="w-4 h-4 text-[#9ca3af]" />
              </button>
            </div>
            <div className="px-5 pb-4">
              <div
                className="relative rounded-2xl border border-[#f0f2f5] overflow-hidden"
                style={{
                  backgroundImage: `repeating-linear-gradient(transparent, transparent ${LINE_HEIGHT - 1}px, ${LINE_COLOR} ${LINE_HEIGHT - 1}px, ${LINE_COLOR} ${LINE_HEIGHT}px)`,
                  backgroundPosition: '0 16px',
                  backgroundAttachment: 'local',
                }}
              >
                <Textarea
                  value={todayEntry ? todayEntry.content : content}
                  onChange={e => setContent(e.target.value)}
                  disabled={!!todayEntry}
                  placeholder={todayEntry ? '今天已落笔保存' : ''}
                  rows={10}
                  className="border-0 bg-transparent px-4 py-4 text-[16px] leading-[32px] placeholder:text-[#9ca3af] placeholder:leading-[32px] resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 pb-5">
              <button
                onClick={handleCloseEditor}
                className="flex-1 h-11 rounded-xl border border-[#e5e7eb] text-sm font-medium text-[#374151] hover:bg-[#f9fafb] active:scale-[0.99] transition-transform"
              >
                取消
              </button>
              <button
                onClick={handlePublish}
                disabled={!!todayEntry}
                className="flex-1 h-11 rounded-xl text-sm font-medium text-white active:scale-[0.99] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#3B82F6' }}
              >
                落笔保存
              </button>
            </div>
          </div>
        )}

        {/* 日记列表 */}
        <div className="space-y-3">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-[#9ca3af]">
              <div className="w-14 h-14 rounded-full bg-[#f0f2f5] flex items-center justify-center">
                <BookOpen className="w-7 h-7 opacity-50" />
              </div>
              <p className="text-sm">还没有日记，点击右上角 + 写下第一篇吧～</p>
            </div>
          ) : (
            sorted.map(entry => (
              <button
                key={entry.id}
                onClick={() => navigate(`/diary/${entry.id}`)}
                className="w-full text-left"
              >
                <div className="bg-white rounded-2xl px-4 py-4 shadow-sm border border-[#f0f2f5] active:scale-[0.99] transition-transform">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#eff6ff] flex items-center justify-center shrink-0">
                      <Send className="w-4 h-4" style={{ color: '#3B82F6' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-[#111827] truncate">我的日记</span>
                        <CheckCircle2 className="w-3 h-3 text-[#9ca3af]" />
                      </div>
                      <p className="text-[15px] leading-relaxed text-[#374151] text-pretty whitespace-pre-line line-clamp-3">
                        {entry.content}
                      </p>
                      <div className="flex items-center gap-5 mt-2.5 text-[#9ca3af]">
                        <span className="text-xs">{formatTimeAgo(entry.createdAt)}</span>
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation();
                            if (window.confirm('确定删除这篇日记吗？')) {
                              deletePlayerDiary(entry.id);
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}
