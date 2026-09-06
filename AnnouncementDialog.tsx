import React, { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const SEEN_KEY = 'yannyu_announcement_seen';

function hasSeen(): boolean {
  try { return localStorage.getItem(SEEN_KEY) === 'true'; } catch { return true; }
}
function markSeen() {
  try { localStorage.setItem(SEEN_KEY, 'true'); } catch { /* ignore */ }
}

const ANNOUNCEMENT = `你们好，我是yann，欢迎玩我的网站。

希望你们：
1. 不要辱骂或者拉踩网站；
2. 不得使用任何手段攻击网站；
3. 多人朋友圈禁止公屏梦；
4. 二转/分享网站不得以任何形式收取费用；
5. 网站内的功能可以参考。

网站内的所有功能需要你自己探索，遇到网站打不开、对面一直不回复等情况可以多刷新或者换浏览器，因为浏览器的问题，有些人的版本会出现问题，还是多换浏览器。

如果你遇到bug或者不理解的地方，可以在抖音找我来询问：抖音号54044571207。

希望你们玩得开心，也希望你们不要忘记网站是yann做的，祝各位宝宝和自己的mj幸福。`;

/** 首次进入网站或清除数据后显示的公告弹窗 */
export default function AnnouncementDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!hasSeen()) {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    markSeen();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md rounded-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Megaphone className="w-5 h-5 text-[var(--accent-color)]" />
            公告
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {ANNOUNCEMENT}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleClose} className="w-full bg-[var(--accent-color)] text-white hover:bg-[var(--accent-hover)]">
            知道了
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
