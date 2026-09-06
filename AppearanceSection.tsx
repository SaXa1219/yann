import React, { useCallback } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { compressImage } from '@/utils/imageUtils';
import { applyAppIcon, setStoredAppIcon } from '@/lib/appIcon';
import type { AppearanceSettings } from '@/types/types';

const FONT_OPTIONS = [
  { label: '系统默认', value: 'system-ui, -apple-system, sans-serif' },
  { label: '衬线体', value: 'Georgia, serif' },
  { label: '等宽体', value: 'monospace' },
];

const CALL_SAMPLES = [
  { label: '深海', value: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)' },
  { label: '霞光', value: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' },
  { label: '薄暮', value: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
  { label: '森绿', value: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)' },
  { label: '强调色', value: 'linear-gradient(135deg, var(--accent-color) 0%, #f3f4f6 100%)' },
];

interface AppearanceSectionProps {
  appearance: AppearanceSettings;
  setAppearance: (s: AppearanceSettings) => void;
}

export default function AppearanceSection({ appearance, setAppearance }: AppearanceSectionProps) {
  const set = useCallback(<K extends keyof AppearanceSettings>(key: K, value: AppearanceSettings[K]) => {
    setAppearance({ ...appearance, [key]: value });
  }, [appearance, setAppearance]);

  const isDark = appearance.darkMode;

  const handleChatBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('图片大小不能超过5MB'); return; }
    try {
      const compressed = await compressImage(file, 1600, 1600, 0.85);
      set('backgroundImage', compressed);
      set('backgroundType', 'image');
      toast.success('聊天背景已更新');
    } catch {
      toast.error('图片处理失败');
    }
    e.target.value = '';
  };

  const handleContactBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('图片大小不能超过5MB'); return; }
    try {
      const compressed = await compressImage(file, 1600, 1600, 0.85);
      set('contactBackgroundImage', compressed);
      set('contactBackgroundType', 'image');
      toast.success('联系人背景已更新');
    } catch {
      toast.error('图片处理失败');
    }
    e.target.value = '';
  };

  const handleCallBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 1920, 1080, 0.85);
      set('callBg', compressed);
      toast.success('来电背景已更新');
    } catch {
      toast.error('图片处理失败');
    }
    e.target.value = '';
  };

  const handleAppIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('图标大小不能超过2MB'); return; }
    try {
      const compressed = await compressImage(file, 192, 192, 0.9);
      set('appIcon', compressed);
      applyAppIcon(compressed, appearance.buttonColor);
      setStoredAppIcon(compressed);
      toast.success('应用图标已更新');
    } catch {
      toast.error('图标处理失败');
    }
    e.target.value = '';
  };

  const handleRemoveAppIcon = () => {
    set('appIcon', '');
    applyAppIcon('', appearance.buttonColor);
    setStoredAppIcon('');
    toast.success('已恢复默认图标');
  };

  const hexToRgba = (hex: string, alpha: number) => {
    const clean = hex.replace('#', '');
    const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
    const bigint = parseInt(full, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const previewBg: React.CSSProperties = appearance.backgroundType === 'image' && appearance.backgroundImage
    ? { backgroundImage: `url(${appearance.backgroundImage})`, backgroundSize: 'cover', opacity: appearance.backgroundOpacity ?? 1 }
    : { backgroundColor: hexToRgba(appearance.backgroundColor, appearance.backgroundOpacity ?? 1) };

  const bubbleStyleFor = (sender: 'user' | 'system'): React.CSSProperties => ({
    backgroundColor: sender === 'user' ? appearance.userBubbleColor : appearance.systemBubbleColor,
    fontSize: appearance.bubbleFontSize ?? 14,
    padding: appearance.bubblePadding ?? 10,
    borderRadius: appearance.borderRadius,
    fontFamily: appearance.fontFamily,
    color: sender === 'user' ? appearance.userBubbleTextColor : appearance.systemBubbleTextColor,
    boxShadow: appearance.shadowEnabled ? `0 ${appearance.shadowDepth}px ${appearance.shadowDepth * 3}px rgba(0,0,0,0.08)` : 'none',
  });

  // 预览用的全局样式，与聊天页注入的样式保持完全一致（干净圆角）
  const previewCss = `.sc-bubble{border-radius:${appearance.borderRadius}px;font-family:${appearance.fontFamily};}.sc-user{background-color:${appearance.userBubbleColor} !important;color:${appearance.userBubbleTextColor};}.sc-sys{background-color:${appearance.systemBubbleColor} !important;color:${appearance.systemBubbleTextColor};}${appearance.customCss || ''}`;

  const safeColor = (v?: string, fallback = '#FFFFFF') => v?.startsWith('#') ? v : fallback;

  return (
    <div className="space-y-4">
      {/* 实时预览 */}
      <Sec title="实时预览">
        <style>{previewCss}</style>
        <div className={`rounded-2xl p-4 space-y-3 ${isDark ? 'bg-[#0d0d0d]' : 'bg-white'}`} style={previewBg}>
          <div className="flex justify-end">
            <div className="sc-bubble sc-user max-w-[72%] leading-relaxed break-words whitespace-pre-wrap" style={{ ...bubbleStyleFor('user'), '--bubble-color': appearance.userBubbleColor, '--bubble-text': appearance.userBubbleTextColor } as React.CSSProperties}>你好，灵魂伴侣</div>
          </div>
          <div className="flex justify-start">
            <div className="sc-bubble sc-sys max-w-[72%] leading-relaxed break-words whitespace-pre-wrap" style={{ ...bubbleStyleFor('system'), '--bubble-color': appearance.systemBubbleColor, '--bubble-text': appearance.systemBubbleTextColor } as React.CSSProperties}>我在这里，一直都在。</div>
          </div>
          <div className="flex justify-start">
            <div className="sc-transfer overflow-hidden text-left shadow-sm" style={{ minWidth: 200, maxWidth: 240, background: appearance.transferColor || '#F5A623', borderRadius: appearance.transferBorderRadius ?? 16 }}>
              <div className="px-4 pt-4 pb-3 flex items-start gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: (appearance.transferIconColor ?? '#FFFFFF') + '20' }}>
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke={appearance.transferIconColor ?? '#FFFFFF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 10h10M7 14h6" /><rect x="3" y="6" width="18" height="12" rx="2" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-[20px] font-bold leading-tight" style={{ color: appearance.transferTextColor ?? '#FFFFFF' }}>
                    <span className="text-[15px] font-semibold mr-0.5">¥</span>520.00
                  </p>
                  <p className="text-[13px] mt-1 truncate" style={{ color: appearance.transferSubTextColor ?? 'rgba(255,255,255,0.7)' }}>转账</p>
                </div>
              </div>
              <div className="mx-4 h-px" style={{ background: (appearance.transferSubTextColor ?? 'rgba(255,255,255,0.7)').replace(')', ',0.3)').replace('rgb', 'rgba') }} />
              <div className="px-4 py-2.5 flex items-center justify-between">
                <span className="text-[12px]" style={{ color: appearance.transferSubTextColor ?? 'rgba(255,255,255,0.7)' }}>字卡转账</span>
                <span className="text-[12px] font-medium" style={{ color: appearance.transferTextColor ?? '#FFFFFF', opacity: 0.9 }}>待收款</span>
              </div>
            </div>
          </div>
        </div>
      </Sec>

      {/* 应用图标 */}
      <Sec title="应用图标">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
            {appearance.appIcon ? (
              <img src={appearance.appIcon} className="w-full h-full object-cover" alt="应用图标" />
            ) : (
              <span className="text-xs text-gray-400">默认</span>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-sm text-gray-700">PWA / 浏览器标签页图标</p>
            <div className="flex gap-2">
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs bg-white text-gray-700 border border-gray-200 hover:bg-gray-50">
                <Upload className="w-3.5 h-3.5" /> 上传图标
                <input type="file" accept="image/*" className="hidden" onChange={handleAppIconUpload} />
              </label>
              {appearance.appIcon && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleRemoveAppIcon}>
                  <X className="w-3.5 h-3.5 mr-1" /> 恢复默认
                </Button>
              )}
            </div>
            <p className="text-[10px] text-gray-400">建议 192×192 方形图片</p>
          </div>
        </div>
      </Sec>

      {/* 聊天背景 */}
      <Sec title="聊天背景">
        <div className="flex gap-2 mb-3">
          {(['color', 'image'] as const).map(t => (
            <button
              key={t}
              onClick={() => set('backgroundType', t)}
              className={`flex-1 h-9 rounded-xl text-xs border transition-colors ${
                appearance.backgroundType === t
                  ? 'bg-[var(--accent-color)] text-white border-[var(--accent-color)]'
                  : 'bg-white text-gray-700 border-gray-200'
              }`}
            >
              {t === 'color' ? '背景色' : '背景图片'}
            </button>
          ))}
        </div>
        {appearance.backgroundType === 'color' ? (
          <ColorField label="背景颜色" value={safeColor(appearance.backgroundColor, '#FFFFFF')} onChange={v => set('backgroundColor', v)} />
        ) : (
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-200">
              <Upload className="w-4 h-4 text-gray-400" />
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleChatBgUpload} />
            <span className="text-xs text-gray-500">{appearance.backgroundImage ? '已上传 · 点击替换' : '上传背景图片'}</span>
            {appearance.backgroundImage && (
              <button
                type="button"
                onClick={e => { e.preventDefault(); set('backgroundImage', ''); set('backgroundType', 'color'); }}
                className="ml-auto p-1.5 rounded-full hover:bg-gray-100"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </label>
        )}
        <Range label="背景透明度" min={0} max={1} step={0.05} value={appearance.backgroundOpacity ?? 1} onChange={v => set('backgroundOpacity', v)} suffix="%" scaled />
      </Sec>

      {/* 联系人背景 */}
      <Sec title="联系人背景">
        <div className="flex gap-2 mb-3">
          {(['color', 'image'] as const).map(t => (
            <button
              key={t}
              onClick={() => set('contactBackgroundType', t)}
              className={`flex-1 h-9 rounded-xl text-xs border transition-colors ${
                appearance.contactBackgroundType === t
                  ? 'bg-[var(--accent-color)] text-white border-[var(--accent-color)]'
                  : 'bg-white text-gray-700 border-gray-200'
              }`}
            >
              {t === 'color' ? '背景色' : '背景图片'}
            </button>
          ))}
        </div>
        {appearance.contactBackgroundType === 'color' ? (
          <ColorField label="背景颜色" value={safeColor(appearance.contactBackgroundColor, '#FAFAFA')} onChange={v => set('contactBackgroundColor', v)} />
        ) : (
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-200">
              <Upload className="w-4 h-4 text-gray-400" />
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleContactBgUpload} />
            <span className="text-xs text-gray-500">{appearance.contactBackgroundImage ? '已上传 · 点击替换' : '上传联系人背景'}</span>
            {appearance.contactBackgroundImage && (
              <button
                type="button"
                onClick={e => { e.preventDefault(); set('contactBackgroundImage', ''); set('contactBackgroundType', 'color'); }}
                className="ml-auto p-1.5 rounded-full hover:bg-gray-100"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </label>
        )}
        <Range label="背景透明度" min={0} max={1} step={0.05} value={appearance.contactBackgroundOpacity ?? 1} onChange={v => set('contactBackgroundOpacity', v)} suffix="%" scaled />
      </Sec>

      {/* 来电背景 */}
      <Sec title="来电背景">
        <div className="flex items-center gap-3">
          {appearance.callBg ? (
            <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-gray-200">
              <div className="w-full h-full" style={{ background: appearance.callBg, backgroundSize: 'cover' }} />
              <button type="button" onClick={() => set('callBg', '')} className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/50 rounded-full flex items-center justify-center">
                <X className="w-2.5 h-2.5 text-white" />
              </button>
            </div>
          ) : (
            <div className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 border-dashed border-2 border-gray-200 text-gray-400">
              <Upload className="w-5 h-5" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-600 mb-1">自定义来电全屏背景</p>
            <label className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl cursor-pointer bg-gray-100 text-gray-600 hover:bg-gray-200">
              <Upload className="w-3.5 h-3.5" /> 选择图片
              <input type="file" accept="image/*" className="hidden" onChange={handleCallBgUpload} />
            </label>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {CALL_SAMPLES.map(s => (
            <button
              key={s.label}
              type="button"
              onClick={() => set('callBg', appearance.callBg === s.value ? '' : s.value)}
              className={`flex items-center gap-1.5 h-8 px-2 rounded-lg text-xs border transition-colors ${appearance.callBg === s.value ? 'border-[var(--accent-color)] text-[var(--accent-color)] bg-[var(--accent-color)]/10' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <span className="w-4 h-4 rounded-full border border-black/5 shrink-0" style={{ background: s.value }} />
              {s.label}
            </button>
          ))}
        </div>
        <Range label="背景透明度" min={0} max={1} step={0.05} value={appearance.callBgOpacity ?? 1} onChange={v => set('callBgOpacity', v)} suffix="%" scaled />
      </Sec>

      {/* 夜间模式 / 消息弹窗 */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-3">
        <ToggleRow label="夜间模式" value={appearance.darkMode} onChange={v => set('darkMode', v)} />
        <ToggleRow label="消息弹窗通知" value={appearance.enableMessageNotifications !== false} onChange={v => set('enableMessageNotifications', v)} />
      </div>

      {/* 气泡颜色 */}
      <Sec title="气泡颜色">
        <div className="grid grid-cols-2 gap-3">
          <ColorField label="我的气泡" value={appearance.userBubbleColor} onChange={v => set('userBubbleColor', v)} />
          <ColorField label="我的文字" value={appearance.userBubbleTextColor} onChange={v => set('userBubbleTextColor', v)} />
          <ColorField label="对方气泡" value={appearance.systemBubbleColor} onChange={v => set('systemBubbleColor', v)} />
          <ColorField label="对方文字" value={appearance.systemBubbleTextColor} onChange={v => set('systemBubbleTextColor', v)} />
          <ColorField label="转账颜色" value={safeColor(appearance.transferColor, '#F5A623')} onChange={v => set('transferColor', v)} />
          <ColorField label="强调色（主题色）" value={safeColor(appearance.buttonColor, '#F2A2A2')} onChange={v => set('buttonColor', v)} />
        </div>
      </Sec>

      {/* 字体 */}
      <Sec title="字体">
        <div className="space-y-2">
          {FONT_OPTIONS.map(f => (
            <button key={f.value} type="button"
              className={`w-full text-left px-3 py-2.5 rounded-2xl text-sm transition-all ${appearance.fontFamily === f.value ? 'ring-2 ring-[var(--accent-color)] font-semibold' : 'text-gray-500'} bg-white`}
              style={{ fontFamily: f.value }} onClick={() => set('fontFamily', f.value)}>{f.label}</button>
          ))}
        </div>
      </Sec>

      {/* 尺寸 */}
      <Sec title="尺寸">
        <Range label="表情包大小" min={24} max={128} step={1} value={appearance.emojiSize ?? 64} onChange={v => set('emojiSize', v)} suffix="px" />
        <Range label="气泡字体大小" min={11} max={20} step={1} value={appearance.bubbleFontSize ?? 14} onChange={v => set('bubbleFontSize', v)} suffix="px" />
        <Range label="气泡内边距" min={4} max={24} step={1} value={appearance.bubblePadding ?? 10} onChange={v => set('bubblePadding', v)} suffix="px" />
        <Range label="气泡圆角" min={0} max={36} step={1} value={appearance.borderRadius} onChange={v => set('borderRadius', v)} suffix="px" />
      </Sec>

      {/* 阴影 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-3 space-y-3">
        <ToggleRow label="气泡阴影" value={appearance.shadowEnabled} onChange={v => set('shadowEnabled', v)} />
        <Range label="阴影深度" min={0} max={12} step={1} value={appearance.shadowDepth ?? 2} onChange={v => set('shadowDepth', v)} suffix="px" />
      </div>

      {/* 自定义 CSS */}
      <Sec title="自定义CSS">
        <textarea
          value={appearance.customCss || ''}
          onChange={e => set('customCss', e.target.value)}
          placeholder={'例如：\n.sc-bubble { letter-spacing: 0.5px; }\n.sc-user { box-shadow: 0 2px 8px rgba(0,0,0,0.15); }'}
          rows={5}
          spellCheck={false}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 font-mono text-xs text-gray-700 leading-relaxed outline-none focus:ring-2 focus:ring-[var(--accent-color)] resize-y"
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-gray-400">可自定义气泡、背景等全局样式，实时生效</p>
          <button type="button" onClick={() => set('customCss', '')} className="shrink-0 text-[11px] text-gray-400 hover:text-red-400 transition-colors">清空</button>
        </div>
      </Sec>
    </div>
  );
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
      <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">{title}</p>
      {children}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2">
      <span className="text-xs text-gray-600">{label}</span>
      <input
        type="color"
        value={value.startsWith('#') ? value : '#FFFFFF'}
        onChange={e => onChange(e.target.value)}
        className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
      />
    </div>
  );
}

function Range({ label, min, max, step, value, onChange, suffix, scaled }: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  suffix: string;
  scaled?: boolean;
}) {
  const display = scaled ? `${Math.round(value * 100)}${suffix}` : `${value}${suffix}`;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] text-gray-500">
        <span>{label}</span>
        <span>{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
        style={{ background: 'var(--accent-color)' }}
      />
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full p-0.5 transition-colors ${value ? 'bg-[var(--accent-color)]' : 'bg-gray-200'}`}
      >
        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${value ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}
