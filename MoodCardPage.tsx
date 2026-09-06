import React, { useState, useMemo } from 'react';
import { generateId } from '@/utils/id';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, X, Check, Search, Sparkles, CopyPlus } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function MoodCardPage() {
  const navigate = useNavigate();
  const { moodCards, addMoodCard, addMoodCards, updateMoodCard, deleteMoodCard } = useApp();
  const [input, setInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [search, setSearch] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return moodCards;
    return moodCards.filter(c => (c.content || '').includes(search.trim()));
  }, [moodCards, search]);

  const handleAdd = () => {
    const text = input.trim();
    if (!text) { toast.error('请输入心情字卡'); return; }
    addMoodCard({ id: generateId(), content: text, createdAt: Date.now() });
    setInput('');
    toast.success('心情字卡已添加');
  };

  const startEdit = (id: string, content: string) => {
    setEditingId(id);
    setEditingContent(content);
  };

  const confirmEdit = () => {
    if (!editingId) return;
    const text = editingContent.trim();
    if (!text) { toast.error('内容不能为空'); return; }
    updateMoodCard({ id: editingId, content: text, createdAt: Date.now() });
    setEditingId(null);
    setEditingContent('');
    toast.success('已更新');
  };

  return (
    <div className="min-h-dvh bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 h-12 flex items-center gap-3">
          <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-base font-semibold text-gray-800 flex-1">心情字卡</h1>
          <span className="text-xs text-gray-400">{moodCards.length} 张</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* 单条 / 批量切换 */}
        <div className="flex items-center gap-2 bg-gray-100/60 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setBulkMode(false)}
            className={`flex-1 h-8 rounded-lg text-xs font-medium transition-colors ${!bulkMode ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
          >单条添加</button>
          <button
            type="button"
            onClick={() => setBulkMode(true)}
            className={`flex-1 h-8 rounded-lg text-xs font-medium transition-colors ${bulkMode ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
          >批量导入</button>
        </div>

        {!bulkMode ? (
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="输入心情字卡，如：今天的心情是粉色的"
              className="flex-1 h-10 px-3 rounded-xl text-sm bg-gray-50 border border-gray-100 outline-none focus:border-[#e8d0f0] focus:bg-white transition-colors"
            />
            <Button onClick={handleAdd} className="h-10 px-4 rounded-xl bg-[#c9a8e8] hover:bg-[#b898d8] text-white">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Textarea
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              placeholder="每行一条心情字卡，支持一次性粘贴多条"
              className="min-h-[120px] text-sm bg-gray-50 border-gray-100 focus:bg-white focus:border-[#e8d0f0] rounded-xl resize-none"
            />
            <Button
              onClick={() => {
                const lines = bulkText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
                if (lines.length === 0) { toast.error('请输入要导入的心情字卡'); return; }
                addMoodCards(lines.map(content => ({ id: generateId(), content, createdAt: Date.now() })));
                setBulkText('');
              }}
              className="w-full h-10 rounded-xl bg-[#c9a8e8] hover:bg-[#b898d8] text-white"
            >
              <CopyPlus className="w-4 h-4 mr-2" />
              批量导入 {bulkText.split(/\r?\n/).filter(Boolean).length > 0 && `(${bulkText.split(/\r?\n/).filter(Boolean).length})`}
            </Button>
          </div>
        )}

        {/* 搜索 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索心情字卡"
            className="w-full h-9 pl-9 pr-3 rounded-xl text-sm bg-gray-50 border border-gray-100 outline-none focus:border-[#e8d0f0] focus:bg-white transition-colors"
          />
        </div>

        {/* 列表 */}
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <Sparkles className="w-8 h-8 text-[#f0e0e8] mx-auto mb-2" />
              <p className="text-sm text-gray-300">还没有心情字卡</p>
              <p className="text-xs text-gray-300 mt-1">添加一些来表达不同的心情吧</p>
            </div>
          )}
          {filtered.map(card => (
            <div key={card.id} className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2.5 hover:border-[#f0e0e8] transition-colors">
              {editingId === card.id ? (
                <>
                  <input
                    value={editingContent}
                    onChange={e => setEditingContent(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); }}
                    className="flex-1 text-sm outline-none bg-transparent"
                    autoFocus
                  />
                  <button onClick={confirmEdit} className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#faf5fc] text-[#c9a8e8]">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setEditingId(null); setEditingContent(''); }} className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-50 text-gray-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-gray-700 truncate">{card.content}</span>
                  <button onClick={() => startEdit(card.id, card.content)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-50 text-gray-400 hover:bg-[#faf5fc] hover:text-[#c9a8e8] transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { deleteMoodCard(card.id); toast.success('已删除'); }} className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
