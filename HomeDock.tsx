import React from 'react';
import { Camera, Settings, Sparkles, CalendarHeart, Users } from 'lucide-react';
import { ChatIcon, LetterIcon, ShopIcon } from '@/components/icons/DockIcons';
import type { HomeSettings } from '@/types/types';

const FALLBACK: Record<string, { name: string; icon: React.ReactNode }> = {
  companion: { name: '陪伴模式', icon: <Users className="w-6 h-6 text-current" /> },
  chat: { name: '微信', icon: <ChatIcon className="w-6 h-6 text-current" /> },
  moments: { name: '朋友圈', icon: <Camera className="w-6 h-6 text-current" /> },
  letter: { name: '信箱', icon: <LetterIcon className="w-6 h-6 text-current" /> },
  days: { name: '倒数日', icon: <CalendarHeart className="w-6 h-6 text-current" /> },
  beauty: { name: '美化', icon: <Sparkles className="w-6 h-6 text-current" /> },
  settings: { name: '设置', icon: <Settings className="w-6 h-6 text-current" /> },
};

interface HomeDockProps {
  draft: HomeSettings;
  isDark?: boolean;
  onOpenBeauty?: () => void;
}

// 用原生 history API 导航，避免调用 useNavigate/useContext 触发 null dispatcher 崩溃
function navigateTo(path: string) {
  history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export default function HomeDock({ draft, isDark, onOpenBeauty }: HomeDockProps) {
  // 兜底：确保 Dock 中始终同时包含「美化」和「设置」入口
  const defaultDock = [
    { id: 'companion', name: '陪伴模式', iconImage: '', path: '/companion/select' },
    { id: 'moments', name: '朋友圈', iconImage: '', path: '/moments' },
    { id: 'days', name: '倒数日', iconImage: '', path: '/days' },
    { id: 'beauty', name: '美化', iconImage: '', path: '__beauty__' },
    { id: 'settings', name: '设置', iconImage: '', path: '/settings' },
  ];
  let base = draft.dockIcons.length ? draft.dockIcons : defaultDock;
  // 补齐缺失的必备入口
  const required = [
    { id: 'beauty', name: '美化', iconImage: '', path: '__beauty__' },
    { id: 'settings', name: '设置', iconImage: '', path: '/settings' },
  ];
  for (const icon of required) {
    if (!base.some(i => i.id === icon.id || i.path === icon.path)) {
      base = [...base, { ...icon }];
    }
  }
  // 修复路径漂移
  const pathById: Record<string, string> = {
    companion: '/companion/select',
    chat: '/contacts/picker',
    moments: '/moments',
    days: '/days',
    beauty: '__beauty__',
    settings: '/settings',
  };
  const items = base.map(i => ({ ...i, path: pathById[i.id] ?? i.path }));

  return (
    <div className={`relative z-30 px-5 pt-2 shrink-0 ${isDark ? 'text-stone-100' : 'text-stone-800'}`} style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}>
      <div
        className={`rounded-[28px] px-5 py-3 flex items-center justify-around border ${
          isDark
            ? 'bg-stone-800/70 border-stone-700/40 shadow-[0_4px_20px_rgba(0,0,0,0.2)]'
            : 'bg-white/70 border-stone-100/40 shadow-[0_4px_20px_rgba(0,0,0,0.04)]'
        }`}
        style={{ backdropFilter: 'blur(12px)' }}
      >
        {items.map((app) => {
          const fb = FALLBACK[app.id] || { name: app.name, icon: <Sparkles className="w-6 h-6 text-current" /> };
          return (
            <button
              key={app.id}
              onClick={() => {
                if (app.id === 'beauty' && onOpenBeauty) {
                  onOpenBeauty();
                } else {
                  navigateTo(app.path);
                }
              }}
              className="flex flex-col items-center gap-1.5 relative"
            >
              <div
                className={`w-12 h-12 rounded-[16px] overflow-hidden flex items-center justify-center shadow-sm transition-transform active:scale-90 border ${
                  isDark ? 'bg-stone-700 border-stone-600' : 'bg-stone-50 border-stone-100'
                }`}
              >
                {app.iconImage ? (
                  <img src={app.iconImage} className="w-full h-full object-cover" alt={app.name} />
                ) : (
                  <div className="text-[var(--accent-color)]">{fb.icon}</div>
                )}
              </div>
              <span className={`text-[10px] ${isDark ? 'text-stone-400' : 'text-stone-400'}`}>{app.name || fb.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

