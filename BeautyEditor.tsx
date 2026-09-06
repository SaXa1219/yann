import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, ImageIcon, Pencil, Trash2, LayoutTemplate, Smartphone, Palette, Lock } from 'lucide-react';
import type { HomeSettings, AppearanceSettings } from '@/types/types';
import { Button } from '@/components/ui/button';
import AppearanceSection from './AppearanceSection';

type EditorTab = 'main' | 'custom' | 'lock' | 'appearance';

interface BeautyEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: HomeSettings;
  setDraft: React.Dispatch<React.SetStateAction<HomeSettings>>;
  appearance: AppearanceSettings;
  setAppearance: (s: AppearanceSettings) => void;
  onSave: () => void;
  onCancel: () => void;
  onRequestUpload: (target: string) => void;
}

export default function BeautyEditor({ open, onOpenChange, draft, setDraft, appearance, setAppearance, onSave, onCancel, onRequestUpload }: BeautyEditorProps) {
  const [tab, setTab] = useState<EditorTab>('custom');

  const setAppName = (idx: number, name: string) => {
    const next = [...draft.customApps];
    next[idx] = { ...next[idx], name };
    setDraft(prev => ({ ...prev, customApps: next }));
  };
  const setAppPath = (idx: number, path: string) => {
    const next = [...draft.customApps];
    next[idx] = { ...next[idx], path };
    setDraft(prev => ({ ...prev, customApps: next }));
  };
  const clearAppIcon = (idx: number) => {
    const next = [...draft.customApps];
    next[idx] = { ...next[idx], iconImage: '' };
    setDraft(prev => ({ ...prev, customApps: next }));
  };

  const APP_PATH_OPTIONS = [
    { label: '陪伴模式', value: '/companion/select' },
    { label: '微信', value: '/contacts/picker' },
    { label: '信箱', value: '/letter/inbox' },
    { label: '打电话', value: '/call/select' },
    { label: '美化面板', value: '__beauty__' },
    { label: '设置', value: '/settings' },
    { label: '我的日记', value: '/my-diary' },
    { label: '朋友圈', value: '/moments' },
    { label: '倒数日', value: '/days' },
    { label: '多人朋友圈', value: '/multi-moments' },
    { label: '字卡管理', value: '/settings/cards' },
    { label: '联系人管理', value: '/settings/contacts' },
    { label: '表情库', value: '/settings/emoji' },
    { label: '语音字卡', value: '/settings/voice-cards' },
    { label: '图片字卡', value: '/settings/image-cards' },
    { label: '心情字卡', value: '/settings/mood-cards' },
    { label: '问卷', value: '/questionnaire' },
  ];

  const setDockName = (idx: number, name: string) => {
    const next = [...draft.dockIcons];
    next[idx] = { ...next[idx], name };
    setDraft(prev => ({ ...prev, dockIcons: next }));
  };
  const clearDockIcon = (idx: number) => {
    const next = [...draft.dockIcons];
    next[idx] = { ...next[idx], iconImage: '' };
    setDraft(prev => ({ ...prev, dockIcons: next }));
  };

  const textInput = (label: string, value: string, onChange: (v: string) => void, placeholder?: string) => (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-gray-500">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 px-3 rounded-2xl text-sm text-gray-700 bg-gray-50 border border-gray-200 outline-none focus:border-[var(--accent-color)]"
      />
    </div>
  );

  const imageBox = (src: string | undefined, label: string, target: string, fallback: React.ReactNode) => (
    <button
      type="button"
      onClick={() => onRequestUpload(target)}
      className="relative w-full h-24 rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center group"
    >
      {src ? <img src={src} className="w-full h-full object-cover" alt={label} /> : fallback}
      <div className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 text-[var(--accent-color)] shadow-sm border border-gray-200">
        <Pencil className="w-3.5 h-3.5" />
      </div>
    </button>
  );

  const renderMainScreenSection = () => (
    <div className="space-y-4">
      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">原主屏幕</h3>
      {imageBox(draft.backgroundImage, '主屏幕背景', 'main-bg', (
        <div className="flex flex-col items-center gap-1 text-gray-400">
          <ImageIcon className="w-6 h-6" />
          <span className="text-[10px]">点击上传主屏幕背景</span>
        </div>
      ))}
      {imageBox(draft.topBannerImage, '顶部横幅', 'main-topBanner', <span className="text-[10px] text-gray-400">顶部横幅</span>)}
      <div className="grid grid-cols-2 gap-3">
        {imageBox(draft.avatar, '我的头像', 'main-avatar', <span className="text-[10px] text-gray-400">我的头像</span>)}
        {imageBox(draft.theirAvatar, '对方头像', 'main-theirAvatar', <span className="text-[10px] text-gray-400">对方头像</span>)}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {imageBox(draft.polaroidImage, '照片 1', 'main-polaroid', <span className="text-[10px] text-gray-400">照片 1</span>)}
        {imageBox(draft.polaroidImage2, '照片 2', 'main-polaroid2', <span className="text-[10px] text-gray-400">照片 2</span>)}
      </div>
      {textInput('昵称', draft.displayName, v => setDraft(prev => ({ ...prev, displayName: v })), '昵称')}
      {textInput('@用户名', draft.handle, v => setDraft(prev => ({ ...prev, handle: v })), '@用户名')}
      {textInput('签名', draft.signature, v => setDraft(prev => ({ ...prev, signature: v })), '签名')}
      {textInput('对方昵称', draft.relationName, v => setDraft(prev => ({ ...prev, relationName: v })), '如：宝宝、亲爱的')}
      {textInput('对方气泡预览', draft.chatPreview1, v => setDraft(prev => ({ ...prev, chatPreview1: v })), '对方说的话')}
      {textInput('我的气泡预览', draft.chatPreview2, v => setDraft(prev => ({ ...prev, chatPreview2: v })), '我说的话')}
      <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-3">
        <span className="text-sm text-gray-700">暗色模式</span>
        <button
          onClick={() => setDraft(prev => ({ ...prev, darkMode: !prev.darkMode }))}
          className={`w-11 h-6 rounded-full p-0.5 transition-colors ${draft.darkMode ? 'bg-[var(--accent-color)]' : 'bg-gray-200'}`}
        >
          <div className={`w-5 h-5 rounded-full bg-white transition-transform ${draft.darkMode ? 'translate-x-5' : ''}`} />
        </button>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] text-gray-500">
          <span>卡片透明度</span>
          <span>{Math.round((draft.cardOpacity ?? 1) * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round((draft.cardOpacity ?? 1) * 100)}
          onChange={e => setDraft(prev => ({ ...prev, cardOpacity: Math.round(parseInt(e.target.value, 10)) / 100 }))}
          className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
          style={{ background: 'var(--accent-color)' }}
        />
      </div>

      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide pt-2">底部 Dock 图标</h3>
      <div className="grid grid-cols-2 gap-3">
        {(draft.dockIcons.length ? draft.dockIcons : [
          { id: 'companion', name: '陪伴模式', iconImage: '', path: '/companion/select' },
          { id: 'moments', name: '朋友圈', iconImage: '', path: '/moments' },
          { id: 'days', name: '倒数日', iconImage: '', path: '/days' },
          { id: 'beauty', name: '美化', iconImage: '', path: '__beauty__' },
          { id: 'settings', name: '设置', iconImage: '', path: '/settings' },
        ]).map((app, idx) => (
          <div key={app.id} className="rounded-2xl border border-gray-200 bg-white p-3 space-y-2">
            <button
              type="button"
              onClick={() => onRequestUpload(`dock-${idx}`)}
              className="w-full h-16 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center relative"
            >
              {app.iconImage ? (
                <img src={app.iconImage} className="w-full h-full object-cover" alt={app.name} />
              ) : (
                <span className="text-[10px] text-gray-400">点击上传图标</span>
              )}
              {app.iconImage && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); clearDockIcon(idx); }}
                  className="absolute top-1 right-1 p-1 rounded-full bg-white/80 text-gray-500 shadow-sm"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </button>
            {textInput('名称', app.name, v => setDockName(idx, v), app.name)}
          </div>
        ))}
      </div>
    </div>
  );

  const renderCustomScreenSection = () => (
    <div className="space-y-4">
      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">新主屏幕</h3>
      <p className="text-[11px] text-gray-500">新主屏幕与原主屏幕共用同一张壁纸，请在「原主屏幕」Tab 中设置背景。</p>
      <div className="flex gap-2">
        {(['dots', 'solid', 'image'] as const).map(p => (
          <button
            key={p}
            onClick={() => setDraft(prev => ({ ...prev, customScreenPattern: p }))}
            className={`flex-1 h-9 rounded-xl text-xs border transition-colors ${
              draft.customScreenPattern === p
                ? 'bg-[var(--accent-color)] text-white border-[var(--accent-color)]'
                : 'bg-white text-gray-700 border-gray-200'
            }`}
          >
            {p === 'dots' ? '圆点' : p === 'solid' ? '纯色' : '图片'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {imageBox(draft.customAvatar, '头像', 'custom-avatar', <span className="text-[10px] text-gray-400">头像</span>)}
        {imageBox(draft.customPolaroidImage, '拍立得', 'custom-polaroid', <span className="text-[10px] text-gray-400">拍立得</span>)}
      </div>
      {textInput('昵称', draft.customDisplayName, v => setDraft(prev => ({ ...prev, customDisplayName: v })), '昵称')}
      {textInput('位置', draft.customLocation, v => setDraft(prev => ({ ...prev, customLocation: v })), '如：Tokyo')}

      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide pt-2">双头像组件</h3>
      <div className="grid grid-cols-2 gap-3">
        {imageBox(draft.customWidgetAvatarLeft, '左侧头像', 'custom-widgetAvatarLeft', <span className="text-[10px] text-gray-400">左侧头像</span>)}
        {imageBox(draft.customWidgetAvatarRight, '右侧头像', 'custom-widgetAvatarRight', <span className="text-[10px] text-gray-400">右侧头像</span>)}
      </div>
      {textInput('左侧对话框', draft.customWidgetBubbleLeft, v => setDraft(prev => ({ ...prev, customWidgetBubbleLeft: v })), '左侧气泡')}
      {textInput('右侧对话框', draft.customWidgetBubbleRight, v => setDraft(prev => ({ ...prev, customWidgetBubbleRight: v })), '右侧气泡')}
      {textInput('下方文案', draft.customWidgetText, v => setDraft(prev => ({ ...prev, customWidgetText: v })), '组件下方文案')}

      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide pt-2">应用图标</h3>
      <div className="grid grid-cols-2 gap-3">
        {draft.customApps.map((app, idx) => (
          <div key={app.id} className="rounded-2xl border border-gray-200 bg-white p-3 space-y-2">
            <button
              type="button"
              onClick={() => onRequestUpload(`customApp-${idx}`)}
              className="w-full h-16 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center relative"
            >
              {app.iconImage ? (
                <img src={app.iconImage} className="w-full h-full object-cover" alt={app.name} />
              ) : (
                <span className="text-[10px] text-gray-400">点击上传图标</span>
              )}
              {app.iconImage && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); clearAppIcon(idx); }}
                  className="absolute top-1 right-1 p-1 rounded-full bg-white/80 text-gray-500 shadow-sm"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </button>
            {textInput('名称', app.name, v => setAppName(idx, v), app.name)}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-500">跳转路径</label>
              <select
                value={app.path}
                onChange={e => setAppPath(idx, e.target.value)}
                className="w-full h-10 px-3 rounded-2xl text-xs text-gray-700 bg-gray-50 border border-gray-200 outline-none focus:border-[var(--accent-color)]"
              >
                {APP_PATH_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderLockScreenSection = () => (
    <div className="space-y-4">
      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">锁屏</h3>
      {imageBox(draft.lockScreenBg, '锁屏壁纸', 'lock-bg', (
        <div className="flex flex-col items-center gap-1 text-gray-400">
          <ImageIcon className="w-6 h-6" />
          <span className="text-[10px]">点击上传锁屏壁纸</span>
        </div>
      ))}
      {textInput('昵称', draft.lockScreenName, v => setDraft(prev => ({ ...prev, lockScreenName: v })), '昵称')}
      {textInput('文案', draft.lockScreenMessage, v => setDraft(prev => ({ ...prev, lockScreenMessage: v })), '文案')}
      <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-3">
        <span className="text-sm text-gray-700">启用锁屏</span>
        <button
          onClick={() => setDraft(prev => ({ ...prev, lockScreenEnabled: !prev.lockScreenEnabled }))}
          className={`w-11 h-6 rounded-full p-0.5 transition-colors ${draft.lockScreenEnabled ? 'bg-[var(--accent-color)]' : 'bg-gray-200'}`}
        >
          <div className={`w-5 h-5 rounded-full bg-white transition-transform ${draft.lockScreenEnabled ? 'translate-x-5' : ''}`} />
        </button>
      </div>
      <div className="space-y-1">
        <label className="text-[11px] font-medium text-gray-500">锁屏密码</label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={8}
          value={draft.lockScreenPassword}
          onChange={e => setDraft(prev => ({ ...prev, lockScreenPassword: e.target.value.replace(/\D/g, '').slice(0, 8) }))}
          placeholder="留空则轻触解锁"
          className="w-full h-10 px-3 rounded-2xl text-sm text-gray-700 bg-gray-50 border border-gray-200 outline-none focus:border-[var(--accent-color)]"
        />
        <p className="text-[10px] text-gray-400">设置几位就输入几位（最多 8 位），留空则轻触即可解锁</p>
      </div>
      <div className="space-y-1">
        <label className="text-[11px] font-medium text-gray-500">时间格式</label>
        <div className="flex gap-2">
          {(['24h', '12h'] as const).map(f => (
            <button
              key={f}
              onClick={() => setDraft(prev => ({ ...prev, lockScreenTimeFormat: f }))}
              className={`flex-1 h-9 rounded-xl text-xs border transition-colors ${
                draft.lockScreenTimeFormat === f
                  ? 'bg-[var(--accent-color)] text-white border-[var(--accent-color)]'
                  : 'bg-white text-gray-700 border-gray-200'
              }`}
            >
              {f === '24h' ? '24 小时制' : '12 小时制'}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-3">
        <span className="text-sm text-gray-700">快捷入口</span>
        <button
          onClick={() => setDraft(prev => ({ ...prev, lockScreenShortcuts: !prev.lockScreenShortcuts }))}
          className={`w-11 h-6 rounded-full p-0.5 transition-colors ${draft.lockScreenShortcuts ? 'bg-[var(--accent-color)]' : 'bg-gray-200'}`}
        >
          <div className={`w-5 h-5 rounded-full bg-white transition-transform ${draft.lockScreenShortcuts ? 'translate-x-5' : ''}`} />
        </button>
      </div>
    </div>
  );

  const renderAppearanceSection = () => (
    <AppearanceSection appearance={appearance} setAppearance={setAppearance} />
  );

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onCancel(); else onOpenChange(v); }}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] rounded-[28px] p-0 bg-white border border-gray-200 overflow-hidden flex flex-col gap-0">
        <DialogHeader className="px-6 pb-3 pt-5 border-b border-gray-200 bg-white shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-gray-700 text-base font-bold">美化设置</DialogTitle>
            <button onClick={onCancel} className="p-2 rounded-full text-gray-500 hover:bg-gray-50">
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        {/* Tab 切换 */}
        <div className="px-6 pt-4 pb-1 bg-white shrink-0">
          <div className="rounded-[24px] p-1 flex gap-1 border bg-white border-gray-200">
            {[
              { key: 'custom', label: '新主屏幕', icon: <LayoutTemplate className="w-3.5 h-3.5" /> },
              { key: 'main', label: '原主屏幕', icon: <Smartphone className="w-3.5 h-3.5" /> },
              { key: 'lock', label: '锁屏', icon: <Lock className="w-3.5 h-3.5" /> },
              { key: 'appearance', label: '外观', icon: <Palette className="w-3.5 h-3.5" /> },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as EditorTab)}
                className={`flex-1 h-9 rounded-[20px] text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                  tab === t.key
                    ? 'bg-[var(--accent-color)] text-white'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          {tab === 'main' && renderMainScreenSection()}
          {tab === 'custom' && renderCustomScreenSection()}
          {tab === 'lock' && renderLockScreenSection()}
          {tab === 'appearance' && renderAppearanceSection()}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-white/60 flex gap-3 shrink-0">
          <Button variant="outline" onClick={onCancel} className="flex-1 rounded-full border-gray-200 bg-white hover:bg-gray-50">取消</Button>
          <Button onClick={onSave} className="flex-1 rounded-full bg-[var(--accent-color)] text-white hover:bg-[var(--accent-hover)]">保存</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
