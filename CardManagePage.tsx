import React, { useRef, useState, useMemo } from 'react';
import { generateId } from '@/utils/id';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, X, Check, CopyPlus, FileText, Search, Square, SquareCheck, Eye, EyeOff, Download, Upload, CopyCheck } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as mammoth from 'mammoth';

export default function CardManagePage() {
  const navigate = useNavigate();
  const { cards, addCard, addCards, updateCard, updateCardCategories, updateCardBlocks, deleteCard, deleteCards } = useApp();
  const [singleContent, setSingleContent] = useState('');
  const [batchContent, setBatchContent] = useState('');
  const [tab, setTab] = useState<'single' | 'batch'>('single');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const fileImportRef = useRef<HTMLInputElement>(null);
  const jsonImportRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [selMode, setSelMode] = useState(false);
  const [selIds, setSelIds] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [moveCategory, setMoveCategory] = useState('');
  const [showMoveInput, setShowMoveInput] = useState(false);

  // 提取所有现有分类
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    cards.forEach(c => { if (c.category) set.add(c.category); });
    return Array.from(set);
  }, [cards]);

  const filteredCards = useMemo(() => {
    let list = cards;
    if (search.trim()) {
      list = list.filter(c => (c.content || '').includes(search.trim()));
    }
    if (selectedCategory !== '全部') {
      list = list.filter(c => c.category === selectedCategory);
    }
    return list;
  }, [cards, search, selectedCategory]);



  const handleAddSingle = () => {
    const text = singleContent.trim();
    if (!text) { toast.error('请输入字卡内容'); return; }
    addCard({ id: generateId(), content: text, createdAt: Date.now(), category: category.trim() || undefined });
    setSingleContent('');
    toast.success('字卡已添加');
  };

  const handleAddBatch = () => {
    const lines = batchContent.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) { toast.error('请输入内容，每行一张字卡'); return; }
    const cat = category.trim() || undefined;
    const newCards = lines.map(content => ({ id: generateId(), content, createdAt: Date.now(), category: cat }));
    addCards(newCards);
    setBatchContent('');
    toast.success(`已添加 ${lines.length} 张字卡`);
  };

  const exportCards = () => {
    if (cards.length === 0) { toast.error('当前无字卡可导出'); return; }
    const payload = { version: 1, exportedAt: Date.now(), cards };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yann字卡_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`已导出 ${cards.length} 张字卡`);
  };

  const handleJsonImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const raw = Array.isArray(parsed) ? parsed : parsed.cards;
      if (!Array.isArray(raw)) { toast.error('文件格式不正确'); return; }
      const valid = raw.filter((c: any) => typeof c?.content === 'string' && c.content.trim()).map((c: any) => ({
        id: generateId(),
        content: c.content.trim(),
        createdAt: typeof c.createdAt === 'number' ? c.createdAt : Date.now(),
        category: typeof c.category === 'string' && c.category.trim() ? c.category.trim() : undefined,
        blocked: !!c.blocked,
      }));
      if (!valid.length) { toast.error('文件为空或无有效内容'); return; }
      addCards(valid);
      toast.success(`已导入 ${valid.length} 张字卡`);
    } catch {
      toast.error('文件解析失败，请确认是导出的 .json 文件');
    }
    e.target.value = '';
  };

  const extractCardsFromDocx = async (arrayBuffer: ArrayBuffer): Promise<string[]> => {
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value || '';
    // 每行一张字卡；同时把空行过滤掉
    return text
      .split(/\r?\n/)
      .map(l => l.trim().replace(/\s+/g, ' '))
      .filter(Boolean);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      let lines: string[] = [];
      const name = file.name.toLowerCase();
      if (name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        lines = await extractCardsFromDocx(arrayBuffer);
      } else {
        // 纯文本（.txt/.md/.csv 等）：每行一张字卡
        const text = await file.text();
        lines = text
          .split(/\r?\n/)
          .map(l => l.trim().replace(/\s+/g, ' '))
          .filter(Boolean);
      }
      if (!lines.length) { toast.error('文件内容为空'); return; }
      const cat = category.trim() || undefined;
      const newCards = lines.map(content => ({ id: generateId(), content, createdAt: Date.now(), category: cat }));
      addCards(newCards);
      toast.success(`已从文件导入 ${newCards.length} 张字卡`);
    } catch {
      toast.error('文件解析失败，请确认是 .txt/.md/.docx 格式');
    }
    e.target.value = '';
  };

  // 手动查重：按内容（去空格、忽略大小写）去重，每组保留最早的一张，其余删除
  const handleDedup = () => {
    if (cards.length === 0) { toast.error('当前无字卡'); return; }
    const seen = new Map<string, string>(); // key -> 保留的 id
    const toDelete: string[] = [];
    for (const c of cards) {
      const key = (c.content || '').trim().toLowerCase();
      if (!key) continue;
      if (seen.has(key)) {
        toDelete.push(c.id);
      } else {
        seen.set(key, c.id);
      }
    }
    if (toDelete.length === 0) { toast.success('没有发现重复字卡'); return; }
    deleteCards(toDelete);
    toast.success(`已删除 ${toDelete.length} 张重复字卡，保留 ${seen.size} 张`);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const text = editingContent.trim();
    if (!text) { toast.error('内容不能为空'); return; }
    updateCard({ id: editingId, content: text, createdAt: Date.now() });
    setEditingId(null);
    toast.success('字卡已更新');
  };

  const toggleSel = (id: string) => {
    setSelIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAll = () => setSelIds(new Set(filteredCards.map(c => c.id)));
  const deselectAll = () => setSelIds(new Set());
  const deleteSelected = () => {
    if (selIds.size === 0) return;
    deleteCards(Array.from(selIds));
    toast.success(`已删除 ${selIds.size} 张字卡`);
    setSelIds(new Set());
    setSelMode(false);
  };

  return (
    <div className="min-h-dvh bg-[#FAFAFA]">
      <header className="sticky top-0 z-10 px-4 h-12 flex items-center justify-between bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 -ml-1" onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}>
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Button>
          <h1 className="text-[15px] font-bold text-gray-900">字卡管理</h1>
        </div>
        <span className="text-xs text-gray-400">{cards.length} 张</span>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* 添加区 */}
        <div className="rounded-2xl p-4 bg-white shadow-sm space-y-3 border border-gray-100">
          {/* 标签切换 */}
          <div className="flex rounded-2xl bg-gray-100 p-1 gap-1">
            {(['single', 'batch'] as const).map(t => (
              <button key={t} type="button"
                className={`flex-1 py-1.5 rounded-xl text-sm font-medium transition-all ${tab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'}`}
                onClick={() => setTab(t)}>
                {t === 'single' ? '单条添加' : '批量添加'}
              </button>
            ))}
          </div>

          {/* 分类输入 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 shrink-0">分类</span>
            <input
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="输入分类名称（可选）"
              className="flex-1 min-w-0 h-8 rounded-xl px-3 text-sm outline-none bg-gray-50 text-gray-700 border border-gray-100 focus:border-[var(--accent-color)]"
            />
          </div>

          {tab === 'single' ? (
            <div className="flex gap-2">
              <textarea value={singleContent} onChange={e => setSingleContent(e.target.value)}
                placeholder="输入字卡内容…" rows={2}
                className="flex-1 min-w-0 resize-none rounded-2xl px-3 py-2.5 text-sm outline-none bg-gray-50 text-gray-800 focus:ring-2 focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/20" />
              <Button onClick={handleAddSingle} className="shrink-0 h-auto px-4 rounded-2xl bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white">
                <Plus className="w-4 h-4 mr-1" />添加
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">每行一张字卡，无数量限制</p>
              <textarea value={batchContent} onChange={e => setBatchContent(e.target.value)}
                placeholder={"我在这里，一直都在。\n你的灵魂比星光更璀璨。\n宇宙为你安排了一切美好。"}
                rows={5}
                className="w-full resize-none rounded-2xl px-3 py-2.5 text-sm outline-none bg-gray-50 text-gray-800 focus:ring-2 focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/20" />
              <div className="flex gap-2">
                <Button onClick={handleAddBatch} className="flex-1 rounded-2xl bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white">
                  <CopyPlus className="w-4 h-4 mr-1" />批量添加
                </Button>
                <label className="shrink-0">
                  <Button asChild className="rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600">
                    <span className="cursor-pointer">
                      <FileText className="w-4 h-4 mr-1" />导入文件
                    </span>
                  </Button>
                  <input ref={fileImportRef} type="file" accept=".txt,.md,.csv,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/octet-stream" className="hidden" onChange={handleFileImport} />
                </label>
              </div>
              <p className="text-[11px] text-gray-300">支持 .txt/.md/.csv/.docx；每行（回车）自动导入为一张字卡</p>
            </div>
          )}

          {/* 导出 / 导入 JSON 备份 */}
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2">备份与恢复</p>
            <div className="flex gap-2">
              <Button onClick={exportCards} variant="outline" className="flex-1 rounded-2xl">
                <Download className="w-4 h-4 mr-1" />导出字卡
              </Button>
              <label className="flex-1 shrink-0">
                <Button asChild variant="outline" className="w-full rounded-2xl">
                  <span className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-1" />导入字卡
                  </span>
                </Button>
                <input ref={jsonImportRef} type="file" accept="application/json,.json" className="hidden" onChange={handleJsonImport} />
              </label>
            </div>
          </div>
        </div>

        {/* 搜索、分类筛选与多选工具栏 */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-0 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索字卡内容…"
              className="w-full h-9 rounded-xl pl-9 pr-3 text-sm outline-none bg-white border border-gray-100 text-gray-800 placeholder:text-gray-300 focus:ring-2 focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/20"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="h-9 rounded-xl px-2 text-sm outline-none bg-white border border-gray-100 text-gray-700 focus:border-[var(--accent-color)]"
          >
            <option value="全部">全部分类</option>
            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <Button variant="ghost" size="sm" className="h-9 text-xs text-gray-500 rounded-xl"
            onClick={() => { setSelMode(!selMode); if (selMode) setSelIds(new Set()); }}>
            {selMode ? '取消' : '多选'}
          </Button>
          <Button variant="ghost" size="sm" className="h-9 text-xs text-[var(--accent-color)] rounded-xl" onClick={handleDedup} title="自动查重，每组重复保留最早一张">
            <CopyCheck className="w-4 h-4 mr-1" />查重
          </Button>
        </div>

        {selMode && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-500 rounded-lg" onClick={selectAll}>
                全选
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-500 rounded-lg" onClick={deselectAll}>
                取消全选
              </Button>
              <span className="text-xs text-gray-400">已选 {selIds.size} 张</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" className="h-8 text-xs text-orange-500 rounded-lg"
                onClick={() => {
                  if (selIds.size === 0) return;
                  updateCardBlocks(Array.from(selIds), true);
                  toast.success(`已屏蔽 ${selIds.size} 张字卡`);
                  setSelIds(new Set());
                }} disabled={selIds.size === 0}>
                一键屏蔽
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs text-green-600 rounded-lg"
                onClick={() => {
                  if (selIds.size === 0) return;
                  updateCardBlocks(Array.from(selIds), false);
                  toast.success(`已取消屏蔽 ${selIds.size} 张字卡`);
                  setSelIds(new Set());
                }} disabled={selIds.size === 0}>
                取消屏蔽
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs text-[var(--accent-color)] rounded-lg"
                onClick={() => setShowMoveInput(v => !v)} disabled={selIds.size === 0}>
                移到分类
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs text-red-500 rounded-lg"
                onClick={deleteSelected} disabled={selIds.size === 0}>
                <Trash2 className="w-3.5 h-3.5 mr-1" />删除
              </Button>
            </div>
          </div>
        )}
        {selMode && showMoveInput && (
          <div className="flex items-center gap-2">
            <select
              value={moveCategory}
              onChange={e => setMoveCategory(e.target.value)}
              className="h-8 rounded-lg px-2 text-sm outline-none bg-white border border-gray-200 text-gray-700 flex-1"
            >
              <option value="">选择或输入新分类</option>
              {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              value={moveCategory}
              onChange={e => setMoveCategory(e.target.value)}
              placeholder="输入分类名称"
              className="h-8 rounded-lg px-2 text-sm outline-none bg-gray-50 border border-gray-200 text-gray-700 flex-1"
            />
            <Button
              size="sm"
              className="h-8 rounded-lg bg-[var(--accent-color)] text-white text-xs px-3"
              onClick={() => {
                if (!moveCategory.trim() || selIds.size === 0) return;
                updateCardCategories(Array.from(selIds), moveCategory.trim());
                toast.success(`已将 ${selIds.size} 张字卡移到「${moveCategory.trim()}」`);
                setShowMoveInput(false);
                setMoveCategory('');
                setSelIds(new Set());
              }}
              disabled={!moveCategory.trim() || selIds.size === 0}
            >
              确认
            </Button>
          </div>
        )}

        <p className="text-xs px-1 text-gray-400">共 {filteredCards.length} 张字卡{search ? '（搜索中）' : ''}</p>

        {filteredCards.length === 0 ? (
          <div className="text-center py-12 opacity-50"><p className="text-sm text-gray-400">
            {search ? '没有匹配的字卡' : '暂无字卡，请添加'}</p></div>
        ) : (
          <div className="space-y-2">
            {filteredCards.map((card, idx) => (
              <div key={card.id}
                className="rounded-2xl p-4 flex items-start gap-3 bg-white shadow-sm border border-gray-100"
                style={{ animationDelay: `${idx * 0.03}s` }}>
                {selMode && (
                  <button onClick={() => toggleSel(card.id)} className="shrink-0 mt-0.5">
                    {selIds.has(card.id)
                      ? <SquareCheck className="w-5 h-5 text-[var(--accent-color)]" />
                      : <Square className="w-5 h-5 text-gray-300" />}
                  </button>
                )}
                {editingId === card.id ? (
                  <>
                    <textarea value={editingContent} onChange={e => setEditingContent(e.target.value)}
                      rows={2} className="flex-1 min-w-0 resize-none rounded-xl px-3 py-2 text-sm outline-none bg-gray-50 text-gray-800" />
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSaveEdit}>
                        <Check className="w-4 h-4 text-green-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingId(null)}>
                        <X className="w-4 h-4 text-gray-400" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-relaxed break-words ${card.blocked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{card.content}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {card.category && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-color)]/10 text-[var(--accent-color)]">
                            {card.category}
                          </span>
                        )}
                        {card.blocked && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-400">已屏蔽</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => {
                          updateCard({ ...card, blocked: !card.blocked });
                          toast.success(card.blocked ? '已解除屏蔽' : '已屏蔽');
                        }}
                        title={card.blocked ? '解除屏蔽' : '屏蔽'}>
                        {card.blocked
                          ? <Eye className="w-4 h-4 text-green-500" />
                          : <EyeOff className="w-4 h-4 text-gray-400" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => { setEditingId(card.id); setEditingContent(card.content); }}>
                        <Pencil className="w-4 h-4 text-gray-400" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => { deleteCard(card.id); toast.success('已删除'); }}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
