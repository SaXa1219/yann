import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Phone, MessageSquare } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

const LOCK_KEY = 'app_locked';

export function useLockScreen(enabled: boolean, password: string) {
  const [locked, setLocked] = useState<boolean>(() => {
    // 未开启锁屏时默认不锁屏
    if (!enabled) return false;
    return true;
  });

  const unlock = useCallback(() => {
    sessionStorage.setItem(LOCK_KEY, 'unlocked');
    setLocked(false);
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem(LOCK_KEY) === 'unlocked') {
      setLocked(false);
    }
  }, []);

  useEffect(() => {
    // 锁屏关闭后自动解锁
    if (!enabled) setLocked(false);
  }, [enabled]);

  // 首次开启锁屏后，当前会话立即上锁（避免保存后锁屏不弹出）
  const prevEnabledRef = useRef(enabled);
  useEffect(() => {
    const prev = prevEnabledRef.current;
    prevEnabledRef.current = enabled;
    if (!prev && enabled) {
      sessionStorage.removeItem(LOCK_KEY);
      setLocked(true);
    }
  }, [enabled]);

  return { locked, unlock };
}

function PhoneShortcut() {
  return <div className="w-12 h-12 rounded-full bg-current/10 flex items-center justify-center"><Phone className="w-5 h-5" /></div>;
}
function MessageShortcut() {
  return <div className="w-12 h-12 rounded-full bg-current/10 flex items-center justify-center"><MessageSquare className="w-5 h-5" /></div>;
}

interface LockScreenProps {
  onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const { homeSettings, contact } = useApp();
  const pinCode = homeSettings.lockScreenPassword || '';
  const [now, setNow] = useState(new Date());
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const weekNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const monthNames = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
  const is24 = homeSettings.lockScreenTimeFormat !== '12h';
  const hours = now.getHours();
  const timeStr = is24
    ? `${hours.toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`
    : `${(hours % 12 || 12).toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
  const ampm = hours >= 12 ? '下午' : '上午';
  const dateStr = `${monthNames[now.getMonth()]} ${now.getDate()}日 ${weekNames[now.getDay()]}`;

  const bgImage = homeSettings.lockScreenBg;
  const name = homeSettings.lockScreenName?.trim() || contact.nickname?.trim() || '';
  const message = homeSettings.lockScreenMessage?.trim() || '';
  const showShortcuts = homeSettings.lockScreenShortcuts;

  const handlePress = useCallback((key: string) => {
    setError(false);
    setPin(prev => {
      if (pinCode.length > 0 && prev.length >= pinCode.length) return prev;
      const next = prev + key;
      if (next.length === pinCode.length && pinCode.length > 0) {
        if (next === pinCode) {
          setUnlocking(true);
          setTimeout(() => onUnlock(), 200);
        } else {
          setError(true);
          setTimeout(() => setPin(''), 400);
        }
      }
      return next;
    });
  }, [onUnlock, pinCode]);

  const handleBackspace = useCallback(() => {
    setError(false);
    setPin(prev => prev.slice(0, -1));
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-between select-none transition-opacity duration-300 ${unlocking ? 'opacity-0' : 'opacity-100'} text-gray-800`}
      style={{
        backgroundImage: bgImage ? `url(${bgImage})` : undefined,
        backgroundColor: '#FFFFFF',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
      }}
      onClick={() => { if (!showPin) setShowPin(true); }}
    >
      {/* 暗色遮罩，仅在自定义壁纸时增强文字可读性 */}
      {bgImage && <div className="absolute inset-0 bg-black/20 pointer-events-none" />}

      {/* 顶部状态栏占位 */}
      <div className="relative z-10 w-full" style={{ height: 'max(40px, env(safe-area-inset-top))' }} />

      {/* 时间和日期 */}
      <div className="relative z-10 flex flex-col items-center mt-6">
        <p className={`text-[68px] font-thin leading-none tracking-tight drop-shadow-sm ${bgImage ? 'text-white' : 'text-gray-800'}`}>{timeStr}</p>
        {!is24 && <p className={`text-sm mt-1 font-medium ${bgImage ? 'text-white/80' : 'text-gray-500'}`}>{ampm}</p>}
        <p className={`text-[16px] mt-2 font-light drop-shadow-sm ${bgImage ? 'text-white/85' : 'text-gray-600'}`}>{dateStr}</p>
      </div>

      {/* 昵称 + 文案 */}
      {(name || message) && (
        <div className="relative z-10 flex flex-col items-center gap-2 mb-4">
          {name && <p className={`text-xl font-medium drop-shadow-sm ${bgImage ? 'text-white/95' : 'text-gray-800'}`}>{name}</p>}
          {message && <p className={`text-sm drop-shadow-sm max-w-[80vw] text-center px-4 ${bgImage ? 'text-white/70' : 'text-gray-500'}`}>{message}</p>}
        </div>
      )}

      {/* 解锁提示 */}
      {!showPin && (
        <div className="relative z-10 flex flex-col items-center gap-2 animate-pulse">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-sm ${bgImage ? 'border border-white/40 bg-white/10' : 'border border-gray-300 bg-gray-100'}`}>
            <div className={`w-2 h-2 rounded-full ${bgImage ? 'bg-white/90' : 'bg-gray-400'}`} />
          </div>
          <p className={`text-xs tracking-wide ${bgImage ? 'text-white/60' : 'text-gray-400'}`}>
            {pinCode.length > 0 ? '轻触输入密码' : '轻触解锁'}
          </p>
        </div>
      )}

      {/* 无密码时轻触解锁 */}
      {showPin && pinCode.length === 0 && (
        <div className="relative z-10 flex flex-col items-center gap-6 mb-2" onClick={e => e.stopPropagation()}>
          <p className={`text-sm ${bgImage ? 'text-white/80' : 'text-gray-500'}`}>已锁定，点击下方按钮解锁</p>
          <button
            onClick={onUnlock}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-light backdrop-blur-sm transition-colors border ${bgImage ? 'text-white bg-white/20 hover:bg-white/30 active:bg-white/40 border-white/10' : 'text-gray-800 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 border-gray-200'}`}
          >
            ↑
          </button>
        </div>
      )}

      {/* PIN 输入面板 */}
      {showPin && pinCode.length > 0 && (
        <div className="relative z-10 flex flex-col items-center gap-6 mb-2" onClick={e => e.stopPropagation()}>
          {/* 圆点：数量随密码长度变化 */}
          <div className="flex items-center gap-3">
            {Array.from({ length: Math.max(pinCode.length, 1) }).map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all ${i < pin.length ? (bgImage ? 'bg-white border-white scale-110' : 'bg-gray-800 border-gray-800 scale-110') : (bgImage ? 'border-white/70 bg-transparent' : 'border-gray-400 bg-transparent')}`}
              />
            ))}
          </div>
          {error && <p className="text-red-400 text-sm font-medium">密码错误</p>}
          {/* 数字键盘 */}
          <div className="grid grid-cols-3 gap-x-6 gap-y-4">
            {['1','2','3','4','5','6','7','8','9'].map(k => (
              <button
                key={k}
                onClick={() => handlePress(k)}
                className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-light backdrop-blur-sm transition-colors border ${bgImage ? 'text-white bg-white/10 hover:bg-white/20 active:bg-white/30 border-white/10' : 'text-gray-800 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 border-gray-200'}`}
              >
                {k}
              </button>
            ))}
            <button onClick={handleBackspace} className={`w-16 h-16 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors border ${bgImage ? 'text-white bg-white/10 hover:bg-white/20 active:bg-white/30 border-white/10' : 'text-gray-800 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 border-gray-200'}`}>
              ⌫
            </button>
            <button onClick={() => handlePress('0')} className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-light backdrop-blur-sm transition-colors border ${bgImage ? 'text-white bg-white/10 hover:bg-white/20 active:bg-white/30 border-white/10' : 'text-gray-800 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 border-gray-200'}`}>
              0
            </button>
            <button onClick={() => setShowPin(false)} className={`w-16 h-16 rounded-full flex items-center justify-center text-sm backdrop-blur-sm transition-colors border ${bgImage ? 'text-white/80 bg-white/10 hover:bg-white/20 active:bg-white/30 border-white/10' : 'text-gray-600 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 border-gray-200'}`}>
              取消
            </button>
          </div>
        </div>
      )}

      {showShortcuts && (
        <div className={`relative z-10 flex gap-6 mb-2 ${bgImage ? 'text-white/90' : 'text-gray-700'}`}>
          <PhoneShortcut />
          <span className="text-xs">电话</span>
          <MessageShortcut />
          <span className="text-xs">信息</span>
        </div>
      )}

      {/* 忘记密码入口 */}
      <button
        onClick={(e) => { e.stopPropagation(); onUnlock(); }}
        className={`relative z-10 text-xs underline-offset-2 mt-2 ${bgImage ? 'text-white/60 hover:text-white/90 underline-white/40' : 'text-gray-400 hover:text-gray-600 underline'}`}
      >
        忘记密码？直接进入
      </button>

      {/* 底部 Home Indicator 占位 */}
      <div className={`relative z-10 h-1 w-32 rounded-full ${bgImage ? 'bg-white/30' : 'bg-gray-300'}`} />
    </div>
  );
}
