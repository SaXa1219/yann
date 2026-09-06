import React, { useEffect, useState } from 'react';
import { Shield, Battery, Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useApp } from '@/contexts/AppContext';

const PROMPTED_KEY = 'yannyu_keep_alive_prompted';

function hasPrompted(): boolean {
  try { return localStorage.getItem(PROMPTED_KEY) === 'true'; } catch { return true; }
}
function markPrompted() {
  try { localStorage.setItem(PROMPTED_KEY, 'true'); } catch { /* ignore */ }
}

export default function KeepAliveDialog() {
  const { contact, updateContact } = useApp();
  const [open, setOpen] = useState(false);
  const enabled = contact.enableBackgroundKeepAlive === true;

  useEffect(() => {
    if (!hasPrompted()) {
      setOpen(true);
      markPrompted();
    }
  }, []);

  async function requestSystemNotification() {
    if (!('Notification' in window)) return false;
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }

  async function showKeepAliveNotification() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const title = '后台保活已开启';
    const options: NotificationOptions = {
      body: 'yann语 将在后台保持运行，请勿关闭此标签页。',
      icon: '/favicon.png',
      tag: 'keep-alive',
      requireInteraction: true,
    };
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title, options);
      } catch {
        new Notification(title, options);
      }
    } else {
      new Notification(title, options);
    }
  }

  const handleToggle = async (v: boolean) => {
    updateContact({ ...contact, enableBackgroundKeepAlive: v });
    if (v) {
      const granted = await requestSystemNotification();
      if (granted) await showKeepAliveNotification();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md rounded-[28px] p-0 overflow-hidden">
        <div className="relative h-28 bg-gradient-to-br from-[var(--accent-color)] to-[var(--accent-color)]/70 flex items-center justify-center">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-4 left-6 w-16 h-16 rounded-full bg-white blur-xl" />
            <div className="absolute bottom-2 right-8 w-12 h-12 rounded-full bg-white blur-lg" />
          </div>
          <Shield className="relative w-12 h-12 text-white drop-shadow-md" />
        </div>

        <button
          onClick={() => setOpen(false)}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-6 pb-6 pt-2">
          <DialogHeader className="text-left mb-4">
            <DialogTitle className="text-lg font-bold text-[var(--foreground)]">保持后台运行</DialogTitle>
            <DialogDescription className="text-sm text-[var(--muted-foreground)] leading-relaxed">
              开启后系统将不会暂停此页面，主动来信与主动消息可在后台继续运行。
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between rounded-2xl bg-[var(--muted)]/50 px-4 py-3.5 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[var(--accent-color)]/10 flex items-center justify-center">
                <Battery className="w-5 h-5 text-[var(--accent-color)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">后台保活</p>
                <p className="text-xs text-[var(--muted-foreground)]">防止系统自动休眠此标签页</p>
              </div>
            </div>
            <Switch checked={enabled} onCheckedChange={handleToggle} />
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-[var(--accent-color)]/5 px-3 py-2.5 text-[var(--accent-color)]">
            <Bell className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              开启时会请求系统通知权限，成功后将以手机/浏览器弹窗提示保活状态。
            </p>
          </div>

          <Button
            onClick={() => setOpen(false)}
            className="w-full mt-5 rounded-full bg-[var(--accent-color)] text-[var(--primary-foreground)] hover:bg-[var(--accent-hover)]"
          >
            知道了
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
