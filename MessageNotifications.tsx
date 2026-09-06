import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, X } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import type { ChatMessage } from '@/types/types';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  avatar?: string;
  count: number;
}

const isSystemNotifyMsg = (msg: ChatMessage) => {
  if (msg.sender !== 'system') return false;
  if (msg.type !== 'text' && msg.type !== 'voice' && msg.type !== 'emoji' && msg.type !== 'transfer') return false;
  if (msg.recalled) return false;
  if (msg.meta) {
    try { const meta = JSON.parse(msg.meta); if (meta.silent) return false; }
    catch { /* ignore */ }
  }
  return true;
};

export default function MessageNotifications() {
  const { messages, contact, appearance, currentContactId } = useApp();
  const navigate = useNavigate();
  const [item, setItem] = useState<NotificationItem | null>(null);
  const [offset, setOffset] = useState(0);
  const queueRef = useRef<NotificationItem[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isBusyRef = useRef(false);
  const prevIdsRef = useRef<Set<string>>(new Set());
  const isDark = appearance.darkMode;
  const enabled = appearance.enableMessageNotifications !== false;
  const pushEnabled = contact.pushEnabled === true;
  const isDragging = useRef(false);
  const initializedRef = useRef(false);
  const sessionStartRef = useRef(Date.now());

  // 切换联系人时重置状态，避免把上一个联系人的历史消息当成新消息弹窗
  useEffect(() => {
    prevIdsRef.current = new Set();
    initializedRef.current = false;
    sessionStartRef.current = Date.now();
  }, [currentContactId]);

  // 展示队列中的下一条
  const showNext = () => {
    if (isBusyRef.current) return;
    const next = queueRef.current.shift();
    if (next) {
      isBusyRef.current = true;
      setItem(next);
      setOffset(0);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => closeCurrent(), 5000);
    }
  };

  // 关闭当前弹窗并展示下一条
  const closeCurrent = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    isBusyRef.current = false;
    setItem(null);
    setOffset(0);
    setTimeout(() => showNext(), 260);
  };

  // 判断是否为当前会话产生的实时新消息，而非历史/离线补发的旧消息
  const isRealTimeNew = (msg: ChatMessage) => {
    // 历史消息的时间戳早于会话开始太久，视为旧消息不弹窗
    const sessionStart = sessionStartRef.current;
    if (msg.timestamp && msg.timestamp < sessionStart - 30000) return false;
    return true;
  };

  // 消息变化时检测真正新增的消息（与上一次 messages 做 diff）
  useEffect(() => {
    const currentIds = new Set(messages.map(m => m.id));

    if (!enabled) {
      // 禁用时仍同步 prevIds，避免重新开启后把历史消息当成新消息
      prevIdsRef.current = currentIds;
      initializedRef.current = true;
      return;
    }

    // 首次初始化时只同步已有消息 ID，避免把历史消息当成新消息弹窗。
    // 注意：第一次渲染时 messages 可能还没从 IndexedDB 加载出来（为空），
    // 这时不能标记为初始化完成，否则后续历史消息涌入会被全部当成新消息。
    if (!initializedRef.current) {
      prevIdsRef.current = currentIds;
      if (currentIds.size > 0) {
        initializedRef.current = true;
      }
      return;
    }

    const newMessages: ChatMessage[] = [];
    messages.forEach((msg) => {
      if (!prevIdsRef.current.has(msg.id) && isSystemNotifyMsg(msg) && isRealTimeNew(msg)) {
        newMessages.push(msg);
      }
    });

    // 清理已删除的消息 ID（避免 ID 复用时误判）
    prevIdsRef.current = currentIds;

    if (newMessages.length === 0) return;

    const name = contact.nickname || '对方';
    const newest = newMessages[newMessages.length - 1];
    let body = '';
    if (newest.type === 'text') body = newest.content || '';
    else if (newest.type === 'voice') body = '[语音]';
    else if (newest.type === 'emoji') body = '[表情]';
    else if (newest.type === 'transfer') body = `[转账] ¥${newest.transferAmount?.toFixed(2) || '0.00'}`;

    const id = `notif-${newest.id}-${Date.now()}`;
    const notif: NotificationItem = {
      id,
      title: newest.senderName ? `${newest.senderName} (${name})` : name,
      body,
      avatar: contact.theirAvatar,
      count: newMessages.length,
    };

    // 若队列里已有旧通知，直接替换为最新一条，确保用户看到的是刚发的消息
    queueRef.current = queueRef.current.length > 0 && isBusyRef.current ? [notif] : [...queueRef.current, notif];
    if (!isBusyRef.current) showNext();

    // 若联系人开启了后台推送，再触发浏览器原生通知
    if (pushEnabled && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(notif.title, {
          body: notif.body,
          icon: notif.avatar,
          tag: `soulcard-${newest.id}`,
        });
      } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, contact, enabled, pushEnabled, currentContactId]);

  // 上滑/拖拽手势（触摸 + 鼠标）
  const startY = useRef(0);
  const startX = useRef(0);

  const beginDrag = (clientY: number, clientX: number) => {
    if (!item) return;
    isDragging.current = true;
    startY.current = clientY;
    startX.current = clientX;
    setOffset(0);
  };

  const moveDrag = (clientY: number, clientX: number) => {
    if (!isDragging.current || !item) return;
    const dy = startY.current - clientY;
    const dx = Math.abs(startX.current - clientX);
    if (dy > 0 && dx < dy * 0.6) {
      setOffset(-dy);
    }
  };

  const endDrag = (clientY: number, clientX: number) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const dy = startY.current - clientY;
    const dx = Math.abs(startX.current - clientX);
    if (dy > 24 && dx < 40) {
      closeCurrent();
    } else {
      setOffset(0);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => beginDrag(e.touches[0].clientY, e.touches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => moveDrag(e.touches[0].clientY, e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => endDrag(e.changedTouches[0].clientY, e.changedTouches[0].clientX);

  const handleMouseDown = (e: React.MouseEvent) => beginDrag(e.clientY, e.clientX);
  const handleMouseMove = (e: React.MouseEvent) => moveDrag(e.clientY, e.clientX);
  const handleMouseUp = (e: React.MouseEvent) => endDrag(e.clientY, e.clientX);
  const handleMouseLeave = () => { if (isDragging.current) setOffset(0); isDragging.current = false; };

  const handleClick = () => {
    closeCurrent();
    navigate('/chat');
  };

  if (!enabled || !item) return null;

  const bg = isDark ? 'rgba(30,30,30,0.96)' : 'rgba(255,255,255,0.96)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const titleColor = isDark ? '#fff' : '#111';
  const bodyColor = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)';
  const timeColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';
  const shadow = isDark ? '0 12px 40px rgba(0,0,0,0.45)' : '0 12px 40px rgba(0,0,0,0.14)';
  const dy = Math.abs(offset);
  const opacity = dy > 60 ? Math.max(0, 1 - (dy - 60) / 50) : 1;
  const transition = isDragging.current
    ? 'none'
    : 'transform 0.25s cubic-bezier(0.4,0,0.2,1), opacity 0.2s';

  return (
    <div className="fixed top-4 left-0 right-0 z-[300] flex justify-center px-4 pointer-events-none">
      <button
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className="pointer-events-auto w-full max-w-[360px] flex items-center gap-3 pl-3 pr-2.5 py-2.5 rounded-[22px] text-left select-none relative overflow-hidden"
        style={{
          background: bg,
          border: `1px solid ${borderColor}`,
          boxShadow: shadow,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          color: titleColor,
          transform: `translateY(${offset}px)`,
          transition,
          opacity,
        }}
      >
        <div
          className="shrink-0 w-11 h-11 rounded-full overflow-hidden flex items-center justify-center border"
          style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
        >
          {item.avatar ? (
            <img src={item.avatar} className="w-full h-full object-cover" alt="avatar" />
          ) : (
            <User className="w-5 h-5" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.35)' }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold truncate" style={{ color: titleColor }}>{item.title}</p>
          <p className="text-[13px] truncate mt-0.5" style={{ color: bodyColor }}>
            {item.count > 1 ? `[${item.count}条新消息] ${item.body}` : item.body}
          </p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <span className="text-[11px] font-medium" style={{ color: timeColor }}>刚刚</span>
          <div
            onClick={e => { e.stopPropagation(); closeCurrent(); }}
            className="w-5 h-5 rounded-full flex items-center justify-center active:scale-90"
            style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
          >
            <X className="w-3 h-3" style={{ color: timeColor }} />
          </div>
        </div>
      </button>
    </div>
  );
}