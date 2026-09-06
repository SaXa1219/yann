import React, { useState, useEffect, useRef } from 'react';
import { Wifi, Battery, Signal } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import { compressImage } from '@/utils/imageUtils';
import { applyAppIcon, setStoredAppIcon } from '@/lib/appIcon';
import MainScreen from '@/components/home/MainScreen';
import CustomScreen from '@/components/home/CustomScreen';
import HomeDock from '@/components/home/HomeDock';
import BeautyEditor from '@/components/home/BeautyEditor';
import type { HomeSettings, AppearanceSettings } from '@/types/types';

export default function HomePage() {
  const { contact, homeSettings, updateHomeSettings, appearance, updateAppearance } = useApp();
  const HOME_PAGE_KEY = 'soulcard_home_page_index';

  const [now, setNow] = useState(new Date());
  const [page, setPage] = useState(() => {
    try { return Number(sessionStorage.getItem(HOME_PAGE_KEY) || '0') || 0; }
    catch { return 0; }
  });
  const [draft, setDraft] = useState<HomeSettings>(homeSettings);
  const [appearanceDraft, setAppearanceDraft] = useState<AppearanceSettings>(appearance);
  const [showEditor, setShowEditor] = useState(false);
  const [uploadTarget, setUploadTarget] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const swipeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    try { sessionStorage.setItem(HOME_PAGE_KEY, String(page)); }
    catch { /* noop */ }
  }, [page]);

  useEffect(() => { setDraft(homeSettings); }, [homeSettings]);
  useEffect(() => { setAppearanceDraft(appearance); }, [appearance]);

  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const isDark = draft.darkMode;

  const handleRequestUpload = (target: string) => {
    setUploadTarget(target);
    fileRef.current?.click();
  };

  const handleUpload = async (file: File | null) => {
    if (!file || !uploadTarget) return;
    try {
      let url = '';
      if (uploadTarget === 'main-bg') {
        url = await compressImage(file, 1600, 1200, 0.92);
        setDraft(prev => ({ ...prev, backgroundImage: url }));
      } else if (uploadTarget === 'main-topBanner') {
        url = await compressImage(file, 1200, 600, 0.9);
        setDraft(prev => ({ ...prev, topBannerImage: url }));
      } else if (uploadTarget === 'main-avatar') {
        url = await compressImage(file, 400, 400, 0.85);
        setDraft(prev => ({ ...prev, avatar: url }));
      } else if (uploadTarget === 'main-theirAvatar') {
        url = await compressImage(file, 400, 400, 0.85);
        setDraft(prev => ({ ...prev, theirAvatar: url }));
      } else if (uploadTarget === 'main-polaroid') {
        url = await compressImage(file, 400, 400, 0.85);
        setDraft(prev => ({ ...prev, polaroidImage: url }));
      } else if (uploadTarget === 'main-polaroid2') {
        url = await compressImage(file, 400, 400, 0.85);
        setDraft(prev => ({ ...prev, polaroidImage2: url }));
      } else if (uploadTarget === 'lock-bg') {
        url = await compressImage(file, 1080, 1920, 0.9);
        setDraft(prev => ({ ...prev, lockScreenBg: url }));
      } else if (uploadTarget === 'custom-avatar') {
        url = await compressImage(file, 400, 400, 0.85);
        setDraft(prev => ({ ...prev, customAvatar: url }));
      } else if (uploadTarget === 'custom-polaroid') {
        url = await compressImage(file, 400, 400, 0.85);
        setDraft(prev => ({ ...prev, customPolaroidImage: url }));
      } else if (uploadTarget === 'custom-widgetAvatarLeft' || uploadTarget === 'custom-widgetAvatarRight') {
        url = await compressImage(file, 200, 200, 0.85);
        const field = uploadTarget === 'custom-widgetAvatarLeft' ? 'customWidgetAvatarLeft' : 'customWidgetAvatarRight';
        setDraft(prev => ({ ...prev, [field]: url }));
      } else if (uploadTarget.startsWith('customApp-')) {
        const idx = parseInt(uploadTarget.split('-')[1], 10);
        url = await compressImage(file, 128, 128, 0.85);
        const next = [...draft.customApps];
        if (!Number.isNaN(idx) && next[idx]) {
          next[idx] = { ...next[idx], iconImage: url };
          setDraft(prev => ({ ...prev, customApps: next }));
        }
      } else if (uploadTarget.startsWith('dock-')) {
        const idx = parseInt(uploadTarget.split('-')[1], 10);
        url = await compressImage(file, 128, 128, 0.85);
        const next = [...draft.dockIcons];
        if (!Number.isNaN(idx) && next[idx]) {
          next[idx] = { ...next[idx], iconImage: url };
          setDraft(prev => ({ ...prev, dockIcons: next }));
        }
      }
    } catch {
      toast.error('图片处理失败');
    }
    setUploadTarget('');
  };

  const save = async () => {
    await updateHomeSettings(draft);
    await updateAppearance(appearanceDraft);
    const accentColor = appearanceDraft.buttonColor || contact?.companionTheme?.accentColor || '#F2A2A2';
    if (appearanceDraft.appIcon) {
      applyAppIcon(appearanceDraft.appIcon, accentColor);
      setStoredAppIcon(appearanceDraft.appIcon);
    } else {
      applyAppIcon('', accentColor);
      setStoredAppIcon('');
    }
    setShowEditor(false);
    toast.success('已保存');
  };

  const cancelEditor = () => {
    setDraft(homeSettings);
    setAppearanceDraft(appearance);
    setShowEditor(false);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const node = swipeRef.current;
    if (!node) return;
    node.dataset.startX = String(e.touches[0].clientX);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const node = swipeRef.current;
    if (!node) return;
    const startX = parseFloat(node.dataset.startX || '0');
    const delta = e.changedTouches[0].clientX - startX;
    if (page === 0 && delta < -60) setPage(1);
    if (page === 1 && delta > 60) setPage(0);
  };

  return (
    <div
      className={`relative h-dvh w-full overflow-hidden flex flex-col ${isDark ? 'text-stone-100' : 'text-stone-800'}`}
      style={{ backgroundColor: isDark ? '#1A1A1A' : (appearance.backgroundColor || '#FFFFFF') }}
    >
      {/* 全屏壁纸背景层：覆盖状态栏与 Dock，避免上下出现不同颜色的框 */}
      {draft.backgroundImage && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img src={draft.backgroundImage} className="w-full h-full object-cover" alt="bg" />
        </div>
      )}
      {/* 顶部状态栏 */}
      <div className="relative z-20 flex items-center justify-between px-6 pt-3 pb-1 shrink-0" style={{ paddingTop: 'calc(12px + env(safe-area-inset-top))' }}>
        <p className={`text-[15px] font-semibold tracking-wide ${isDark ? 'text-stone-100' : 'text-stone-800'}`}>{timeStr}</p>
        <div className="flex items-center gap-1.5">
          <Signal className={`w-4 h-4 ${isDark ? 'text-stone-300' : 'text-stone-700'}`} />
          <Wifi className={`w-4 h-4 ${isDark ? 'text-stone-300' : 'text-stone-700'}`} />
          <Battery className={`w-5 h-5 ${isDark ? 'text-stone-300' : 'text-stone-700'}`} />
        </div>
      </div>

      {/* 页面指示器 */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 pointer-events-none">
        <div className={`w-1.5 h-1.5 rounded-full transition-colors ${page === 0 ? (isDark ? 'bg-stone-200' : 'bg-stone-800') : (isDark ? 'bg-stone-600' : 'bg-stone-300')}`} />
        <div className={`w-1.5 h-1.5 rounded-full transition-colors ${page === 1 ? (isDark ? 'bg-stone-200' : 'bg-stone-800') : (isDark ? 'bg-stone-600' : 'bg-stone-300')}`} />
      </div>

      {/* 左右双屏容器 */}
      <div
        ref={swipeRef}
        className="relative flex-1 min-h-0 w-full overflow-hidden"
        style={{ touchAction: 'pan-y' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className={`flex w-[200%] h-full transition-transform duration-300 ease-out ${page === 1 ? '-translate-x-1/2' : ''}`}
        >
          <div className="w-1/2 h-full flex flex-col">
            <MainScreen draft={draft} />
          </div>
          <div className="w-1/2 h-full flex flex-col">
            <CustomScreen draft={draft} onOpenBeauty={() => setShowEditor(true)} />
          </div>
        </div>
      </div>

      {/* 公共 Dock 栏 */}
      <HomeDock draft={draft} isDark={isDark} onOpenBeauty={() => setShowEditor(true)} />

      {/* 美化编辑器：仅在需要时挂载，避免初始渲染时 useState 命中 null dispatcher */}
      {showEditor && <BeautyEditor
        open={showEditor}
        onOpenChange={setShowEditor}
        draft={draft}
        setDraft={setDraft}
        appearance={appearanceDraft}
        setAppearance={setAppearanceDraft}
        onSave={save}
        onCancel={cancelEditor}
        onRequestUpload={handleRequestUpload}
      />}

      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { handleUpload(e.target.files?.[0] || null); e.target.value = ''; }} />
    </div>
  );
}
