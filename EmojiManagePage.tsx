import React, { useRef, useState, useCallback } from 'react';
import { generateId } from '@/utils/id';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Image as ImageIcon, X, Check } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';

export default function EmojiManagePage() {
  const navigate = useNavigate();
  const { emojis, addEmoji, deleteEmoji } = useApp();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressTargetId = useRef<string>('');

  const handleImport = async (files: FileList | null) => {
    if (!files) return;
    const toImport = Array.from(files);
    const { compressImage } = await import('@/utils/imageUtils');
    let success = 0;
    let failed = 0;
    for (const file of toImport) {
      try {
        const url = await compressImage(file, 240, 240, 0.75);
        await addEmoji({ id: generateId(), name: file.name, url });
        success++;
      } catch {
        failed++;
      }
    }
    if (success > 0) toast.success(`已导入 ${success} 个表情`);
    if (failed > 0) toast.error(`${failed} 个表情压缩失败`);
  };

  const deleteSelected = () => {
    selected.forEach(id => deleteEmoji(id));
    setSelected(new Set());
    toast.success('已删除');
  };

  // 按下启动定时器；松手时定时器还在(<500ms)则算点击，已触发则算长按
  const startPress = useCallback((id: string) => {
    pressTargetId.current = id;
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null;
      setSelected(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
      toast('已选中');
    }, 500);
  }, []);

  const endPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      const id = pressTargetId.current;
      if (id) {
        setSelected(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id); else next.add(id);
          return next;
        });
      }
    }
    pressTargetId.current = '';
  }, []);

  // 每个表情右上角直接显示删除按钮（使用onPointerDown避免移动端click被阻断）
  const quickDelete = (id: string) => {
    deleteEmoji(id);
    toast.success('已删除');
  };

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 h-12 px-4 flex items-center gap-3">
        <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')} className="text-gray-700"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="flex-1 text-center text-base font-bold text-gray-900">
          {multiSelectMode ? `已选 ${selected.size} 项` : '表情库'}
        </h1>
        {multiSelectMode ? (
          <button onClick={() => { setMultiSelectMode(false); setSelected(new Set()); }} className="text-sm font-semibold text-gray-500">完成</button>
        ) : selected.size > 0 ? (
          <div className="flex items-center gap-3">
            <button onClick={() => setMultiSelectMode(true)} className="text-sm font-semibold text-[var(--accent-color)]">多选</button>
            <button onClick={deleteSelected} className="text-sm font-semibold text-red-500">删除</button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button onClick={() => setMultiSelectMode(true)} className="text-sm font-semibold text-[var(--accent-color)]">多选</button>
            <button onClick={() => fileRef.current?.click()} className="text-sm font-semibold text-[var(--accent-color)]">添加</button>
          </div>
        )}
      </header>

      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleImport(e.target.files)} />

      <div className="flex-1 p-4">
        {emojis.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3">
            <ImageIcon className="w-12 h-12" />
            <p className="text-sm">还没有表情包</p>
            <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1 px-4 h-9 rounded-full bg-[var(--accent-color)] text-white text-sm">
              <Plus className="w-4 h-4" /> 导入表情包
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {emojis.map(e => (
              <div key={e.id} className="relative aspect-square">
                {/* 多选模式下点击直接切换选中；非多选模式下支持长按 */}
                <div
                  onPointerDown={() => {
                    if (multiSelectMode) return;
                    startPress(e.id);
                  }}
                  onPointerUp={() => {
                    if (multiSelectMode) return;
                    endPress();
                  }}
                  onPointerLeave={() => {
                    if (multiSelectMode) return;
                    endPress();
                  }}
                  onClick={() => {
                    if (!multiSelectMode) return;
                    setSelected(prev => {
                      const next = new Set(prev);
                      if (next.has(e.id)) next.delete(e.id); else next.add(e.id);
                      return next;
                    });
                  }}
                  onContextMenu={e => e.preventDefault()}
                  role="button"
                  tabIndex={0}
                  className={`w-full h-full rounded-xl overflow-hidden border-2 transition-all ${selected.has(e.id) ? 'border-[var(--accent-color)] ring-2 ring-[var(--accent-color)]/20' : 'border-transparent'}`}
                  style={{ WebkitTouchCallout: 'none', userSelect: 'none', touchAction: 'none' }}
                >
                  <img src={e.url} className="w-full h-full object-contain" alt="emoji" style={{ WebkitTouchCallout: 'none', userSelect: 'none', pointerEvents: 'none' }} />
                </div>
                {/* 选中角标（多选模式或长按选中时） */}
                {selected.has(e.id) && (
                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[var(--accent-color)] flex items-center justify-center z-10">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                {/* 非多选模式下显示右上角删除按钮 */}
                {!multiSelectMode && (
                  <button
                    onClick={ev => { ev.stopPropagation(); quickDelete(e.id); }}
                    onPointerDown={ev => { ev.stopPropagation(); }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center z-20 shadow-sm"
                    style={{ touchAction: 'manipulation' }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
