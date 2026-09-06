import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, List, MessageSquare } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

export default function StatsPage() {
  const navigate = useNavigate();
  const { messages, contact } = useApp();

  const top10 = useMemo(() => {
    const counter: Record<string, number> = {};
    messages
      .filter(m => m.sender === 'system' && m.type === 'text')
      .forEach(m => { const k = (m.content || '').trim(); if (k) counter[k] = (counter[k] || 0) + 1; });
    return Object.entries(counter)
      .sort((a, b) => b[1] - a[1])
      .filter(([, n]) => n > 0)
      .slice(0, 10)
      .map(([content, count]) => ({ content, count }));
  }, [messages]);

  const maxCount = top10[0]?.count || 1;
  const theirName = contact.nickname || 'TA';

  return (
    <div className="min-h-dvh bg-white">
      {/* 顶栏 */}
      <header className="sticky top-0 z-10 px-4 h-12 flex items-center justify-between bg-white border-b border-gray-50">
        <div className="flex items-center gap-2">
          <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')} className="text-gray-400 active:opacity-60 transition-opacity">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[15px] font-bold text-gray-800 tracking-tight">高频词 TOP 10</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-5">
        {/* 信息卡片 */}
        <div className="rounded-2xl p-5 bg-white border border-gray-100 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
            {contact.theirAvatar
              ? <img src={contact.theirAvatar} className="w-full h-full rounded-full object-cover" alt={theirName} />
              : <span className="text-lg text-gray-400">{theirName.charAt(0)}</span>}
          </div>
          <div className="flex-1 flex flex-col gap-0.5">
            <p className="text-[15px] font-bold text-gray-800">{theirName}</p>
            <p className="text-[12px] text-gray-400">
              共使用 <span className="text-gray-700 font-semibold">{top10.length}</span> 种高频话术
            </p>
          </div>
        </div>

        {/* 排行榜 */}
        {top10.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
              <MessageSquare className="w-7 h-7 text-gray-200" />
            </div>
            <p className="text-[14px] text-gray-300">还没有聊天记录，快去聊天吧～</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 p-5 space-y-4">
            {/* 标题 */}
            <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
              <List className="w-4 h-4 text-[var(--accent-color)]" />
              <span className="text-sm font-semibold text-gray-700">高频词 TOP 10</span>
            </div>
            {top10.map((item, idx) => {
              const pct = Math.round((item.count / maxCount) * 100);
              const isTop3 = idx < 3;
              return (
                <div key={item.content} className="flex items-center gap-3">
                  {/* 排名 */}
                  <span className={`w-6 text-center text-sm font-bold shrink-0 ${isTop3 ? 'text-[var(--accent-color)]' : 'text-gray-400'}`}>
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  {/* 词 */}
                  <span className="text-sm text-gray-800 w-16 shrink-0 truncate">{item.content}</span>
                  {/* 进度条 */}
                  <div className="flex-1 h-2.5 bg-gray-50 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: isTop3 ? 'linear-gradient(90deg, color-mix(in srgb, var(--accent-color) 50%, white), var(--accent-color))' : 'var(--accent-light)',
                      }}
                    />
                  </div>
                  {/* 次数 */}
                  <span className="w-6 text-right text-sm text-gray-500 shrink-0">{item.count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
