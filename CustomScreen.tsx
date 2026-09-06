import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { MapPin, MessageCircle, Mail, Phone, Heart, Sparkles, User, Settings, BookHeart, Calendar, Users } from 'lucide-react';
import type { HomeSettings } from '@/types/types';

const CUSTOM_ICON_MAP: Record<string, React.ReactNode> = {
  chat: <MessageCircle className="w-6 h-6 text-[var(--accent-color)]" />,
  mailbox: <Mail className="w-6 h-6 text-[var(--accent-color)]" />,
  worldbook: <Mail className="w-6 h-6 text-[var(--accent-color)]" />,
  call: <Phone className="w-6 h-6 text-[var(--accent-color)]" />,
  companion: <Users className="w-6 h-6 text-[var(--accent-color)]" />,
  settings: <Settings className="w-6 h-6 text-[var(--accent-color)]" />,
  beauty: <Sparkles className="w-6 h-6 text-[var(--accent-color)]" />,
  mydiary: <BookHeart className="w-6 h-6 text-[var(--accent-color)]" />,
  moments: <Heart className="w-6 h-6 text-[var(--accent-color)]" />,
  days: <Calendar className="w-6 h-6 text-[var(--accent-color)]" />,
};

interface CustomScreenProps {
  draft: HomeSettings;
  onOpenBeauty: () => void;
}

export default function CustomScreen({ draft, onOpenBeauty }: CustomScreenProps) {
  const navigate = useNavigate();
  const { contact } = useApp();

  const avatar = draft.customAvatar || draft.avatar || contact.myAvatar || '';
  const displayName = draft.customDisplayName || draft.displayName || contact.myName || '';
  const location = draft.customLocation || '';
  const polaroid = draft.customPolaroidImage || draft.polaroidImage || '';
  const theirAvatar = draft.theirAvatar || contact.theirAvatar || '';

  const bgImage = draft.backgroundImage || '';
  const pattern = draft.customScreenPattern;
  const showDots = !bgImage && pattern !== 'solid';

  const handleAppClick = (app: HomeSettings['customApps'][number]) => {
    if (app.path === '__beauty__') {
      onOpenBeauty();
      return;
    }
    navigate(app.path);
  };

  // 主屏幕入口全部可由用户自定义：名称、图标、跳转路径均读取 draft.customApps
  const defaultApps: HomeSettings['customApps'] = [
    { id: 'companion', name: '陪伴模式', iconImage: '', path: '/companion/select' },
    { id: 'mailbox', name: '信箱', iconImage: '', path: '/letter/inbox' },
    { id: 'beauty', name: '美化', iconImage: '', path: '__beauty__' },
    { id: 'settings', name: '设置', iconImage: '', path: '/settings' },
    { id: 'mydiary', name: '日记', iconImage: '', path: '/my-diary' },
    { id: 'moments', name: '朋友圈', iconImage: '', path: '/moments' },
  ];

  const overrides = new Map(draft.customApps.map(a => [a.id, a]));
  const displayApps: HomeSettings['customApps'] = defaultApps.map(app => {
    const ov = overrides.get(app.id);
    return ov
      ? { ...app, name: ov.name || app.name, iconImage: ov.iconImage ?? app.iconImage, path: ov.path || app.path }
      : app;
  });

  return (
    <div
      className="relative flex-1 flex flex-col overflow-y-auto"
      style={{
        touchAction: 'pan-y',
        backgroundColor: '#FFFFFF',
        backgroundImage: showDots
          ? 'radial-gradient(var(--accent-color) 1.5px, transparent 1.5px)'
          : undefined,
        backgroundSize: '22px 22px',
      }}
    >
      {bgImage && (
        <>
          <img src={bgImage} className="absolute inset-0 w-full h-full object-cover" alt="bg" />
          <div className="absolute inset-0 bg-white/40" />
        </>
      )}

      <div className="relative z-10 flex flex-col items-center px-5 pb-6 pt-2 gap-4">
        {/* 顶部头像 + 拍立得 */}
        <div className="w-full max-w-sm flex items-start justify-between">
          <div className="flex flex-col items-center">
            <div className="w-[72px] h-[72px] rounded-full overflow-hidden border-[3px] border-white shadow-[0_4px_16px_rgba(244,178,199,0.35)] bg-gray-100">
              {avatar ? (
                <img src={avatar} className="w-full h-full object-cover" alt="me" />
              ) : (
                <div className="w-full h-full bg-gray-100 text-[var(--accent-color)] flex items-center justify-center"><User className="w-8 h-8" /></div>
              )}
            </div>
            {displayName && <h2 className="mt-2 text-lg font-bold text-gray-800 text-balance">{displayName}</h2>}
            {location && (
              <div className="flex items-center gap-1 text-[11px] text-gray-500">
                <MapPin className="w-3 h-3" />
                <span>{location}</span>
              </div>
            )}
          </div>

          <div className="mt-2 w-[100px] h-[120px] bg-white p-2 rounded-lg shadow-[0_4px_14px_rgba(90,74,82,0.06)] transform rotate-3 border border-gray-200">
            {polaroid ? (
              <img src={polaroid} className="w-full h-full object-cover rounded" alt="polaroid" />
            ) : (
              <div className="w-full h-full rounded bg-gray-100" />
            )}
          </div>
        </div>

        {/* 双头像 + 对话框组件 */}
        <div className="w-full max-w-sm rounded-[28px] bg-white/70 border border-gray-200 p-4 shadow-[0_4px_18px_rgba(90,74,82,0.05)]">
          <div className="flex items-center justify-between px-2">
            <div className="relative flex flex-col items-center">
              {draft.customWidgetBubbleLeft && (
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-white text-[10px] text-gray-800 whitespace-nowrap border border-gray-200 shadow-sm">
                  {draft.customWidgetBubbleLeft}
                </span>
              )}
              <div className="w-12 h-12 rounded-full overflow-hidden border-[2.5px] border-white shadow-[0_4px_12px_rgba(244,178,199,0.35)] bg-gray-100">
                {draft.customWidgetAvatarLeft ? <img src={draft.customWidgetAvatarLeft} className="w-full h-full object-cover" alt="left" /> : avatar ? <img src={avatar} className="w-full h-full object-cover" alt="left" /> : <div className="w-full h-full bg-gray-100 text-[var(--accent-color)] flex items-center justify-center"><User className="w-5 h-5" /></div>}
              </div>
            </div>

            <div className="flex-1 mx-2 h-8 flex items-center justify-center">
              <svg viewBox="0 0 120 24" className="w-full h-full" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke="var(--accent-color)"
                  strokeWidth="1.5"
                  points="0,12 20,12 28,6 36,18 48,8 58,16 72,10 84,14 100,12 120,12"
                />
              </svg>
            </div>

            <div className="relative flex flex-col items-center">
              {draft.customWidgetBubbleRight && (
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-white text-[10px] text-gray-800 whitespace-nowrap border border-gray-200 shadow-sm">
                  {draft.customWidgetBubbleRight}
                </span>
              )}
              <div className="w-12 h-12 rounded-full overflow-hidden border-[2.5px] border-white shadow-[0_4px_12px_rgba(244,178,199,0.35)] bg-gray-100">
                {draft.customWidgetAvatarRight ? <img src={draft.customWidgetAvatarRight} className="w-full h-full object-cover" alt="right" /> : theirAvatar ? <img src={theirAvatar} className="w-full h-full object-cover" alt="right" /> : <div className="w-full h-full bg-gray-100 text-[var(--accent-color)] flex items-center justify-center"><User className="w-5 h-5" /></div>}
              </div>
            </div>
          </div>
          {draft.customWidgetText && (
            <p className="mt-3 text-center text-xs text-gray-800 text-balance">{draft.customWidgetText}</p>
          )}
        </div>

        {/* 缩小后的应用网格，可在一屏内容纳更多入口 */}
        <div className="w-full max-w-sm grid grid-cols-3 gap-3">
          {displayApps.map((app) => (
            <button
              key={app.id}
              onClick={() => handleAppClick(app)}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/90 border border-gray-200 shadow-[0_4px_14px_rgba(90,74,82,0.05)] flex items-center justify-center overflow-hidden transition-transform active:scale-90">
                {app.iconImage ? (
                  <img src={app.iconImage} className="w-full h-full object-cover" alt={app.name} />
                ) : (
                  CUSTOM_ICON_MAP[app.id] || <Sparkles className="w-6 h-6 text-[var(--accent-color)]" />
                )}
              </div>
              <span className="text-[10px] text-gray-800 text-center leading-tight line-clamp-2">{app.name}</span>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
