import React, { useRef } from 'react';
import { generateId } from '@/utils/id';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, ImageIcon } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import type { ImageCard } from '@/types/types';
import { compressImage } from '@/utils/imageUtils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export default function ImageCardPage() {
  const navigate = useNavigate();
  const { imageCards, addImageCard, deleteImageCard } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    for (const file of files) {
      try {
        const data = await compressImage(file, 1200, 1200, 0.85);
        const card: ImageCard = { id: generateId(), data, createdAt: Date.now() };
        addImageCard(card);
      } catch { toast.error('图片处理失败'); }
    }
    e.target.value = '';
    toast.success(`已添加 ${files.length} 张图片字卡`);
  };

  const handleDelete = (id: string) => {
    deleteImageCard(id);
    toast.success('已删除');
  };

  return (
    <div className="min-h-dvh bg-[#FAFAFA]">
      <header className="sticky top-0 z-10 px-4 h-12 flex items-center justify-between bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 -ml-1" onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}>
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Button>
          <h1 className="text-[15px] font-bold text-gray-900">图片字卡</h1>
        </div>
        <Button size="sm" className="h-8 rounded-lg bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white"
          onClick={() => inputRef.current?.click()}>
          <Plus className="w-3.5 h-3.5 mr-1" />添加图片
        </Button>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAdd} />
      </header>

      <div className="px-4 py-5">
        <p className="text-xs text-gray-400 mb-4">
          添加图片后，对方发朋友圈时有机会附上一张图片。
        </p>

        {imageCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">还没有图片字卡</p>
            <Button size="sm" className="h-9 rounded-xl bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white"
              onClick={() => inputRef.current?.click()}>
              <Plus className="w-4 h-4 mr-1" />添加第一张
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {imageCards.map(card => (
              <div key={card.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group">
                <img src={card.data} className="w-full h-full object-cover" alt="" />
                <div className="absolute inset-0 bg-black/0 group-active:bg-black/20 transition-colors" />
                <button
                  onClick={() => handleDelete(card.id)}
                  className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity">
                  <Trash2 className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            ))}
            {/* 添加按钮格 */}
            <button onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-xl bg-gray-100 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 active:bg-gray-200 transition-colors">
              <Plus className="w-5 h-5 text-gray-400" />
              <span className="text-[10px] text-gray-400">添加</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
