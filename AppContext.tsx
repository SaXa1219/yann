import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { generateId } from '@/utils/id';
import { toast } from 'sonner';
import type { ChatMessage, CardItem, AppearanceSettings, ContactSettings, EmojiPack, MomentPost, VoiceCard, Letter, ImageCard, HomeSettings, QuestionnaireItem, QuestionnaireAnswer, MiniMaxSettings, DiaryEntry, DiaryComment } from '@/types/types';
import { DEFAULT_APPEARANCE, DEFAULT_CONTACT, DEFAULT_HOME, DEFAULT_MINIMAX_SETTINGS, QUOTES } from '@/types/types';
import { SYSTEM_FIXED } from '@/constants/behavior';
import { initDB, migrateFromLocalStorage, dbGet, dbSet } from '@/services/db';
import {
  migrateLegacyData, getContacts, saveContacts, normalizeContacts, getCurrentContactId, saveCurrentContactId,
  getMessages, saveMessages,
  getCards, saveCards,
  getMoodCards, saveMoodCards,
  getAppearance, saveAppearance,
  getEmojis, saveEmojis,
  getMoments, saveMoments,
  getVoiceCards, saveVoiceCards,
  getLetters, saveLetters,
  getImageCards, saveImageCards,
  exportBackup, getLastRunTime, saveLastRunTime,
  getHomeSettings, saveHomeSettings,
  getMiniMaxSettings, saveMiniMaxSettings,
  writeBackupToFile,
  getBackupFileHandle,
  requestBackupPermission,
  getQuestionnaires, saveQuestionnaires,
  getDiaries, saveDiaries, getPlayerDiaries, savePlayerDiaries,
} from '@/services/storage';


// 问卷自动回答定时器持久化：刷新页面后仍能在约定时间到期后自动回答
interface PendingQTimer { questionnaireId: string; contactId: string; chatBoxId: string; answerAt: number; }
const PENDING_Q_TIMERS_KEY = 'yannyu_pending_q_timers';
// 定时器存 localStorage：不依赖 IndexedDB，隐私模式/受限环境下也可靠，刷新后问卷仍能自动作答
function getPendingQTimers(): PendingQTimer[] {
  try {
    const raw = localStorage.getItem(PENDING_Q_TIMERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
function savePendingQTimer(timer: PendingQTimer) {
  try {
    const existing = getPendingQTimers().filter(t => t.questionnaireId !== timer.questionnaireId);
    localStorage.setItem(PENDING_Q_TIMERS_KEY, JSON.stringify([...existing, timer]));
  } catch { /* ignore */ }
}
function removePendingQTimer(qid: string) {
  try {
    const existing = getPendingQTimers();
    if (existing.some(t => t.questionnaireId === qid)) {
      localStorage.setItem(PENDING_Q_TIMERS_KEY, JSON.stringify(existing.filter(t => t.questionnaireId !== qid)));
    }
  } catch { /* ignore */ }
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function pickRandomEmoji(emojis: EmojiPack[]): string | undefined {
  if (!emojis || emojis.length === 0) return undefined;
  const packs = emojis.filter(e => e.url);
  if (packs.length === 0) return undefined;
  return packs[Math.floor(Math.random() * packs.length)].url;
}

function makeMomentContent(
  pool: CardItem[],
  imageCards: ImageCard[],
  emojis: EmojiPack[],
  isOpponent: boolean
): { content: string; images: string[]; emojiImage?: string } {
  // 对手发动态/评论时有 10% 概率发表情包
  if (isOpponent && Math.random() * 100 < SYSTEM_FIXED.momentsEmojiChance) {
    const emojiUrl = pickRandomEmoji(emojis);
    if (emojiUrl) return { content: '', images: [emojiUrl], emojiImage: emojiUrl };
  }
  const useCombine = pool.length >= 2 && Math.random() * 100 < SYSTEM_FIXED.momentsCombineChance;
  let content = '';
  if (useCombine) {
    const maxC = Math.min(SYSTEM_FIXED.momentsCombineMax, pool.length);
    const count = 2 + Math.floor(Math.random() * (maxC - 1));
    const picked = [...pool].sort(() => Math.random() - 0.5).slice(0, count);
    content = picked.map(c => c.content).join('，');
  } else {
    content = pool[Math.floor(Math.random() * pool.length)].content;
  }
  const useImg = imageCards.length > 0 && Math.random() * 100 < SYSTEM_FIXED.momentsImageChance;
  const images = useImg ? [imageCards[Math.floor(Math.random() * imageCards.length)].data] : [];
  return { content, images };
}

function makeCommentContent(pool: CardItem[], emojis: EmojiPack[]): { content: string; emoji?: string } {
  if (Math.random() * 100 < SYSTEM_FIXED.momentsEmojiChance) {
    const emojiUrl = pickRandomEmoji(emojis);
    if (emojiUrl) return { content: '', emoji: emojiUrl };
  }
  const useCombine = pool.length >= 2 && Math.random() * 100 < SYSTEM_FIXED.momentsCombineChance;
  if (useCombine) {
    const count = 2 + Math.floor(Math.random() * 2);
    const picked = [...pool].sort(() => Math.random() - 0.5).slice(0, count);
    return { content: picked.map(c => c.content).join('，') };
  }
  return { content: pool[Math.floor(Math.random() * pool.length)].content };
}

function migrateDockIcons(home: HomeSettings): HomeSettings {
  // 历史迁移逻辑已废弃：旧版会把"默认图标组合"整体重置，导致用户自定义的 Dock 图案
  // 在刷新后被清空。现在保留用户现有配置，仅由 ensureDockIcons 补齐缺失的必备入口。
  return home;
}

/** 确保 Dock 中始终同时保留「美化」和「设置」入口，防止误删后无法找回 */
function ensureDockIcons(home: HomeSettings): HomeSettings {
  const required = [
    { id: 'settings', name: '设置', iconImage: '', path: '/settings' },
    { id: 'beauty', name: '美化', iconImage: '', path: '__beauty__' },
  ];
  let dockIcons = home.dockIcons.slice();
  for (const icon of required) {
    if (dockIcons.some(i => i.id === icon.id)) continue;
    // 优先补齐到末尾；若已满则替换掉一个非必要的旧入口
    const protectedIds = new Set(required.map(r => r.id));
    let victimIdx = -1;
    if (dockIcons.length >= 4) {
      for (let i = dockIcons.length - 1; i >= 0; i--) {
        if (i >= 3 || !protectedIds.has(dockIcons[i].id)) { victimIdx = i; break; }
      }
    }
    if (victimIdx >= 0 && !protectedIds.has(dockIcons[victimIdx].id)) {
      dockIcons[victimIdx] = { ...icon };
    } else {
      dockIcons.push({ ...icon });
    }
  }
  // 修复路径漂移：如果现有入口路径不是当前标准路径，则按 id 更新
  const pathById: Record<string, string> = {
    chat: '/contacts/picker',
    moments: '/moments',
    days: '/days',
    beauty: '__beauty__',
    settings: '/settings',
  };
  dockIcons = dockIcons.map(i => ({
    ...i,
    path: pathById[i.id] ?? i.path,
  }));
  return { ...home, dockIcons };
}

interface AppContextType {
  messages: ChatMessage[];
  cards: CardItem[];
  moodCards: CardItem[];
  imageCards: ImageCard[];
  appearance: AppearanceSettings;
  contact: ContactSettings;
  emojis: EmojiPack[];
  moments: MomentPost[];
  voiceCards: VoiceCard[];
  letters: Letter[];
  contacts: ContactSettings[];
  currentContactId: string;
  currentChatBoxId: string;
  homeSettings: HomeSettings;
  miniMaxSettings: MiniMaxSettings;
  updateMiniMaxSettings: (s: MiniMaxSettings) => void;
  testPush: (title: string, body: string) => Promise<boolean>;
  updateContactById: (id: string, patch: Partial<ContactSettings>) => Promise<void>;
  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  deleteMessage: (id: string) => void;
  clearMessages: (contactId?: string) => void;
  markMessagesAsRead: () => void;
  addCard: (card: CardItem) => void;
  addCards: (cards: CardItem[]) => void;
  updateCard: (card: CardItem) => void;
  updateCardCategories: (ids: string[], category: string | undefined) => void;
  updateCardBlocks: (ids: string[], blocked: boolean) => void;
  deleteCard: (id: string) => void;
  deleteCards: (ids: string[]) => void;
  addMoodCard: (card: CardItem) => void;
  addMoodCards: (cards: CardItem[]) => void;
  updateMoodCard: (card: CardItem) => void;
  deleteMoodCard: (id: string) => void;
  updateAppearance: (s: AppearanceSettings) => Promise<void>;
  resetAppearance: () => Promise<void>;
  updateContact: (c: ContactSettings) => Promise<void>;
  updateAnniversary: (date: string) => void;
  addContact: (c: ContactSettings) => void;
  deleteContact: (id: string) => void;
  switchContact: (id: string) => void;
  switchChatBox: (id: string) => void;
  addChatBox: (name: string) => void;
  deleteChatBox: (id: string) => void;
  renameChatBox: (id: string, name: string) => void;
  addEmoji: (e: EmojiPack) => void;
  deleteEmoji: (id: string) => void;
  addMoment: (m: MomentPost) => void;
  addOpponentMoment: () => MomentPost | null;
  deleteMoment: (id: string) => void;
  toggleMomentLike: (id: string, contactId?: string) => void;
  addMomentComment: (momentId: string, comment: MomentPost['comments'][0], contactId?: string) => void;
  updateMomentNpc: (momentId: string, contactId: string, npcLikers: string[], npcComments: { id: string; name: string; content: string }[]) => void;
  addVoiceCard: (v: VoiceCard) => void;
  deleteVoiceCard: (id: string) => void;
  updateVoiceCard: (id: string, patch: Partial<VoiceCard>) => void;
  addImageCard: (img: ImageCard) => void;
  deleteImageCard: (id: string) => void;
  addLetter: (l: Letter) => void;
  deleteLetter: (id: string) => void;
  pickContent: (pool: CardItem[]) => string;
  updateHomeSettings: (s: HomeSettings) => Promise<void>;
  resetHomeSettings: () => Promise<void>;
  questionnaires: QuestionnaireItem[];
  addQuestionnaire: (q: QuestionnaireItem) => void;
  deleteQuestionnaire: (id: string) => void;
  sendQuestionnaire: (q: QuestionnaireItem) => void;
  answerQuestionnaire: (id: string, answers: QuestionnaireAnswer[]) => void;
  diaries: DiaryEntry[];
  playerDiaries: DiaryEntry[];
  addSystemDiary: (contactId: string, entry: DiaryEntry) => void;
  deleteDiary: (contactId: string, id: string) => void;
  addPlayerDiary: (entry: DiaryEntry) => void;
  deletePlayerDiary: (id: string) => void;
  addDiaryComment: (entryId: string, content: string, replyTo?: DiaryComment) => void;
  addSystemDiaryComment: (entryId: string, replyTo?: DiaryComment) => void;
  scheduleSystemDiaryComment: (entryId: string) => void;
}

// HMR 安全：用全局变量缓存 Context，避免热更新后 Provider 与消费者引用不匹配
const _g = (typeof window !== 'undefined' ? window : globalThis) as Record<string, unknown>;
const AppContext = (_g.__SoulCard_AppContext__ as React.Context<AppContextType | null> | undefined)
  || createContext<AppContextType | null>(null);
_g.__SoulCard_AppContext__ = AppContext;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [moodCards, setMoodCards] = useState<CardItem[]>([]);
  const [imageCards, setImageCards] = useState<ImageCard[]>([]);
  const [appearance, setAppearance] = useState<AppearanceSettings>(DEFAULT_APPEARANCE);
  const [contact, setContact] = useState<ContactSettings>(DEFAULT_CONTACT);
  const [emojis, setEmojis] = useState<EmojiPack[]>([]);
  const [moments, setMoments] = useState<MomentPost[]>([]);
  const [voiceCards, setVoiceCards] = useState<VoiceCard[]>([]);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [contacts, setContacts] = useState<ContactSettings[]>([]);
  const [currentContactId, setCurrentContactId] = useState<string>('');
  const [currentChatBoxId, setCurrentChatBoxId] = useState<string>('main');
  const [homeSettings, setHomeSettings] = useState<HomeSettings>(DEFAULT_HOME);
  const [miniMaxSettings, setMiniMaxSettings] = useState<MiniMaxSettings>(DEFAULT_MINIMAX_SETTINGS);
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireItem[]>([]);
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [playerDiaries, setPlayerDiaries] = useState<DiaryEntry[]>([]);

  // Refs 供 effects 和 callbacks 使用最新值
  const currentContactIdRef = useRef(currentContactId);
  const currentChatBoxIdRef = useRef(currentChatBoxId);
  const cardsRef = useRef(cards);
  const imageCardsRef = useRef(imageCards);
  const emojisRef = useRef(emojis);
  const contactRef = useRef(contact);
  const contactsRef = useRef(contacts);
  const scheduledDiaryCommentIdsRef = useRef<Set<string>>(new Set());
  currentContactIdRef.current = currentContactId;
  currentChatBoxIdRef.current = currentChatBoxId;
  cardsRef.current = cards;
  imageCardsRef.current = imageCards;
  emojisRef.current = emojis;
  contactRef.current = contact;
  contactsRef.current = contacts;

  // 加载单个联系人的核心数据（首屏需要），非关键数据延迟加载以减少初始化压力
  const loadContactData = useCallback((cid: string, boxId?: string) => {
    const c = contactsRef.current.find(x => x.id === cid) || DEFAULT_CONTACT;
    const bid = boxId || c?.currentChatBoxId || 'main';
    // 先清空旧联系人的状态，避免快速切换或异步延迟导致串卡/串消息
    setCards([]);
    setMessages([]);
    try {
      setMessages(getMessages(cid, bid));
    } catch { setMessages([]); }
    try {
      setCards(getCards(cid));
    } catch { setCards([]); }
    try {
      setMoodCards(getMoodCards(cid));
    } catch { setMoodCards([]); }
    try {
      setAppearance(getAppearance(cid));
    } catch { setAppearance(DEFAULT_APPEARANCE); }
    try {
      setEmojis(getEmojis());
    } catch { setEmojis([]); }
    try {
      setQuestionnaires(getQuestionnaires(cid));
    } catch { setQuestionnaires([]); }
    try {
      setDiaries(getDiaries(cid));
    } catch { setDiaries([]); }
    setContact(c);
    if (bid !== currentChatBoxIdRef.current) {
      setCurrentChatBoxId(bid);
    }

    // 延迟加载非首屏数据，避免启动时同时读取大量 base64 图片/语音导致卡退
    requestAnimationFrame(() => {
      try {
        setImageCards(getImageCards(cid));
      } catch { setImageCards([]); }
      try {
        setVoiceCards(getVoiceCards(cid));
      } catch { setVoiceCards([]); }
      try {
        setLetters(getLetters(cid));
      } catch { setLetters([]); }
      // 朋友圈：群聊聚合所有成员的朋友圈，单聊只显示自己的
      try {
        if (c.isGroup && c.groupMemberIds.length > 0) {
          const allMoments: MomentPost[] = [];
          c.groupMemberIds.forEach(mid => {
            try { allMoments.push(...getMoments(mid)); } catch { /* 忽略损坏的成员朋友圈 */ }
          });
          try { allMoments.push(...getMoments(cid)); } catch { /* 忽略 */ }
          allMoments.sort((a, b) => b.timestamp - a.timestamp);
          setMoments(allMoments);
        } else {
          setMoments(getMoments(cid));
        }
      } catch { setMoments([]); }
    });
  }, []);

  // 初始化：IndexedDB 加载 + 迁移旧数据 + 加载联系人列表 + 加载当前联系人数据
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { await initDB(); } catch (e) { console.error('initDB failed', e); }
      try { await migrateFromLocalStorage(); } catch (e) { console.error('migrateFromLocalStorage failed', e); }
      try { migrateLegacyData(); } catch (e) { console.error('migrateLegacyData failed', e); }
      if (cancelled) return;
      try {
        let loadedContacts = getContacts();
        let loadedId = getCurrentContactId();
        if (loadedContacts.length === 0) {
          loadedContacts = [{ ...DEFAULT_CONTACT, id: 'default' }];
          saveContacts(loadedContacts);
        }
        // 用当前默认联系人字段补齐旧数据；过滤可能的 null；将旧版默认的 5% 已读不回概率迁移为 1%
        loadedContacts = normalizeContacts(loadedContacts.filter(Boolean)).map(c =>
          c.noReplyChance === 5 ? { ...c, noReplyChance: 1 } : c
        );
        // 清理旧版默认 Demo / SoundHelix 歌曲，保留用户自己添加的歌曲
        loadedContacts = loadedContacts.map(c => ({
          ...c,
          musicPlaylist: (c.musicPlaylist || []).filter(s =>
            s.artist !== 'Demo' && !s.url?.includes('soundhelix.com') && !s.url?.includes('default-')
          ),
        }));
        saveContacts(loadedContacts);
        if (!loadedId || !loadedContacts.find(c => c.id === loadedId)) {
          loadedId = loadedContacts[0].id;
          saveCurrentContactId(loadedId);
        }
        setContacts(loadedContacts);
        setCurrentContactId(loadedId);
        contactsRef.current = loadedContacts;
        loadContactData(loadedId);
        try {
          const loadedHome = getHomeSettings();
          const migratedHome = ensureDockIcons(migrateDockIcons(loadedHome));
          if (migratedHome !== loadedHome) {
            saveHomeSettings(migratedHome);
          }
          setHomeSettings(migratedHome);
        } catch { setHomeSettings(ensureDockIcons(DEFAULT_HOME)); }
        try { setMiniMaxSettings(getMiniMaxSettings()); } catch { setMiniMaxSettings(DEFAULT_MINIMAX_SETTINGS); }
        try { setPlayerDiaries(getPlayerDiaries()); } catch { setPlayerDiaries([]); }
      } catch (e) {
        console.error('App initialization failed', e);
        setContacts([{ ...DEFAULT_CONTACT, id: 'default' }]);
        setCurrentContactId('default');
        setContact(DEFAULT_CONTACT);
      }
    })();
    return () => { cancelled = true; };
  }, [loadContactData]);

  // currentContactId 变化时重新加载数据
  useEffect(() => {
    if (!currentContactId) return;
    loadContactData(currentContactId);
  }, [currentContactId, loadContactData]);

  // ── 推送通知（页面在后台标签时显示系统通知；前台页面由 MessageNotifications 组件处理弹窗） ──
  const sendPush = useCallback((title: string, body: string) => {
    if (!contactRef.current.pushEnabled) return;
    if (!('Notification' in window)) return;
    // 前台页面已经有消息弹窗，不再重复发系统通知
    if (document.visibilityState === 'visible') return;
    const icon = contactRef.current.theirAvatar || undefined;
    const show = () => {
      if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(title, { body, icon, badge: icon, tag: 'yannyu-msg', renotify: true } as unknown as NotificationOptions);
        }).catch(() => {
          new Notification(title, { body, icon });
        });
      } else {
        new Notification(title, { body, icon });
      }
    };
    if (Notification.permission === 'granted') {
      show();
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(p => { if (p === 'granted') show(); });
    }
  }, []);

  // 测试推送（前台也能触发，供用户验证权限）
  const testPush = useCallback(async (title: string, body: string) => {
    if (!('Notification' in window)) { toast.error('当前浏览器不支持通知'); return false; }
    let permission = Notification.permission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') { toast.error('通知权限未开启'); return false; }
    const icon = contactRef.current.theirAvatar || undefined;
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title, { body, icon, badge: icon, tag: 'yannyu-test-push', renotify: true } as unknown as NotificationOptions);
      } else {
        new Notification(title, { body, icon, tag: 'yannyu-test-push' });
      }
      return true;
    } catch {
      toast.error('通知发送失败');
      return false;
    }
  }, []);

  // ── 消息 ──
  const markMessagesAsRead = useCallback(() => {
    const cid = currentContactIdRef.current;
    const bid = currentChatBoxIdRef.current;
    setMessages(prev => {
      const changed = prev.some(m => m.sender === 'user' && !m.read);
      if (!changed) return prev;
      const next = prev.map(m => m.sender === 'user' && !m.read ? { ...m, read: true } : m);
      saveMessages(cid, bid, next);
      return next;
    });
  }, []);

  // 把消息追加到指定联系人的指定聊天框，并仅在当前正在查看该聊天框时更新 messages 状态，
  // 避免异步任务（如主动消息）在切换联系人后把消息错存到别的联系人。
  const addMessageToContact = useCallback((cid: string, bid: string, msg: ChatMessage) => {
    const existing = getMessages(cid, bid);
    const next = [...existing, msg];
    saveMessages(cid, bid, next);
    if (cid === currentContactIdRef.current && bid === currentChatBoxIdRef.current) {
      setMessages(next);
    }
  }, []);

  const addMessage = useCallback((msg: ChatMessage) => {
    const cid = currentContactIdRef.current;
    const bid = currentChatBoxIdRef.current;
    setMessages(prev => {
      // 对方发消息时，自动将用户之前的未读消息标记为已读
      const needRead = msg.sender === 'system' && prev.some(m => m.sender === 'user' && !m.read);
      const base = [...prev, msg];
      const next = needRead ? base.map(m => m.sender === 'user' && !m.read ? { ...m, read: true } : m) : base;
      saveMessages(cid, bid, next);
      return next;
    });
    if (msg.sender === 'system' && (msg.type === 'text' || msg.type === 'voice' || msg.type === 'emoji' || msg.type === 'transfer')) {
      const name = contactRef.current.nickname || '对方';
      let body = '';
      if (msg.type === 'text') body = msg.content;
      else if (msg.type === 'voice') body = '[语音]';
      else if (msg.type === 'emoji') body = '[表情]';
      else if (msg.type === 'transfer') body = `[转账] ¥${msg.transferAmount?.toFixed(2) || '0.00'}`;
      sendPush(name, body);
    }
  }, [sendPush]);

  const updateMessage = useCallback((id: string, patch: Partial<ChatMessage>) => {
    const cid = currentContactIdRef.current;
    const bid = currentChatBoxIdRef.current;
    setMessages(prev => {
      const next = prev.map(m => m.id === id ? { ...m, ...patch } : m);
      saveMessages(cid, bid, next); return next;
    });
  }, []);

  const deleteMessage = useCallback((id: string) => {
    const cid = currentContactIdRef.current;
    const bid = currentChatBoxIdRef.current;
    setMessages(prev => {
      const next = prev.filter(m => m.id !== id);
      saveMessages(cid, bid, next); return next;
    });
  }, []);

  const clearMessages = useCallback((contactId?: string) => {
    const cid = contactId || currentContactIdRef.current;
    const bid = currentChatBoxIdRef.current;
    setMessages([]);
    saveMessages(cid, bid, []);
    toast.success('对话已清空');
  }, []);

  // ── 字卡 ──
  // 注意：写入目标统一取 currentContactIdRef.current（切换联系人后即时更新），
  // 而非闭包捕获的 cid，避免 setCards(prev) 的 prev 仍是旧联系人卡片时，
  // 把旧联系人字卡误存到新联系人名下（串字卡）。
  const addCard = useCallback((card: CardItem) => {
    setCards(prev => {
      const cid = currentContactIdRef.current;
      const cardText = (card.content || '').trim();
      if (prev.some(c => (c.content || '').trim() === cardText)) { toast.info('有1个重复'); return prev; }
      const next = [...prev, card];
      const saved = saveCards(cid, next);
      if (saved !== null && saved.length < next.length) {
        toast.warning(`存储空间不足，已自动清理最早的 ${next.length - saved.length} 张旧字卡`);
        return saved;
      }
      return next;
    });
  }, []);
  const addCards = useCallback((newCards: CardItem[]) => {
    setCards(prev => {
      const cid = currentContactIdRef.current;
      const existing = new Set(prev.map(c => (c.content || '').trim()));
      const unique = newCards.filter(c => !existing.has((c.content || '').trim()));
      const skipped = newCards.length - unique.length;
      if (skipped > 0) toast.info(`有${skipped}个重复`);
      if (unique.length === 0) return prev;
      const next = [...prev, ...unique];
      const saved = saveCards(cid, next);
      if (saved === null) {
        toast.error('存储空间不足，无法保存字卡');
        return prev;
      }
      if (saved.length < next.length) {
        toast.warning(`存储空间不足，已自动清理最早的 ${next.length - saved.length} 张旧字卡以腾出空间`);
      }
      toast.success(`已导入 ${Math.min(unique.length, saved.length - prev.length)} 张字卡`);
      return saved;
    });
  }, []);
  const updateCard = useCallback((card: CardItem) => {
    setCards(prev => {
      const cid = currentContactIdRef.current;
      const next = prev.map(c => c.id === card.id ? card : c);
      const saved = saveCards(cid, next);
      return saved ?? prev;
    });
  }, []);
  const updateCardCategories = useCallback((ids: string[], category: string | undefined) => {
    setCards(prev => {
      const cid = currentContactIdRef.current;
      const next = prev.map(c => ids.includes(c.id) ? { ...c, category } : c);
      const saved = saveCards(cid, next);
      return saved ?? prev;
    });
  }, []);
  const updateCardBlocks = useCallback((ids: string[], blocked: boolean) => {
    setCards(prev => {
      const cid = currentContactIdRef.current;
      const next = prev.map(c => ids.includes(c.id) ? { ...c, blocked } : c);
      const saved = saveCards(cid, next);
      return saved ?? prev;
    });
  }, []);
  const deleteCard = useCallback((id: string) => {
    setCards(prev => { const cid = currentContactIdRef.current; const next = prev.filter(c => c.id !== id); saveCards(cid, next); return next; });
  }, []);
  const deleteCards = useCallback((ids: string[]) => {
    setCards(prev => { const cid = currentContactIdRef.current; const next = prev.filter(c => !ids.includes(c.id)); saveCards(cid, next); return next; });
  }, []);

  // ── 心情字卡 ──
  const addMoodCard = useCallback((card: CardItem) => {
    const cid = currentContactIdRef.current;
    setMoodCards(prev => {
      const cardText = (card.content || '').trim();
      if (prev.some(c => (c.content || '').trim() === cardText)) { toast.info('该心情字卡已存在'); return prev; }
      const next = [...prev, card];
      saveMoodCards(cid, next);
      return next;
    });
  }, []);
  const addMoodCards = useCallback((newCards: CardItem[]) => {
    const cid = currentContactIdRef.current;
    setMoodCards(prev => {
      const existing = new Set(prev.map(c => (c.content || '').trim()));
      const unique = newCards.filter(c => !existing.has((c.content || '').trim()));
      const skipped = newCards.length - unique.length;
      if (skipped > 0) toast.info(`已跳过 ${skipped} 个重复的心情字卡`);
      if (unique.length === 0) return prev;
      const next = [...prev, ...unique];
      const saved = saveMoodCards(cid, next);
      if (saved === null) {
        toast.error('存储空间不足，无法保存心情字卡');
        return prev;
      }
      toast.success(`已导入 ${saved.length - prev.length} 张心情字卡`);
      return saved;
    });
  }, []);
  const updateMoodCard = useCallback((card: CardItem) => {
    const cid = currentContactIdRef.current;
    setMoodCards(prev => {
      const next = prev.map(c => c.id === card.id ? card : c);
      saveMoodCards(cid, next);
      return next;
    });
  }, []);
  const deleteMoodCard = useCallback((id: string) => {
    const cid = currentContactIdRef.current;
    setMoodCards(prev => { const next = prev.filter(c => c.id !== id); saveMoodCards(cid, next); return next; });
  }, []);

  // ── 外观 ──
  const updateAppearance = useCallback(async (s: AppearanceSettings) => {
    const cid = currentContactIdRef.current;
    setAppearance({ ...s });
    await saveAppearance(cid, s);
  }, []);
  const resetAppearance = useCallback(async () => {
    const cid = currentContactIdRef.current;
    setAppearance(DEFAULT_APPEARANCE);
    await saveAppearance(cid, DEFAULT_APPEARANCE);
  }, []);

  // ── CSS 变量注入（让全局组件能读取按键/强调色） ──
  useEffect(() => {
    const root = document.documentElement;
    const c = appearance?.buttonColor || contact?.companionTheme?.accentColor || '#F2A2A2';
    root.style.setProperty('--accent-color', c);
    // 计算 hover 暗色（降低 15% 亮度）
    const darken = (hex: string, amt: number) => {
      let h = hex.replace('#', '');
      if (h.length === 3) h = h.split('').map(ch => ch + ch).join('');
      const r = Math.max(0, Math.round(parseInt(h.slice(0, 2), 16) * (1 - amt)));
      const g = Math.max(0, Math.round(parseInt(h.slice(2, 4), 16) * (1 - amt)));
      const b = Math.max(0, Math.round(parseInt(h.slice(4, 6), 16) * (1 - amt)));
      return `rgb(${r},${g},${b})`;
    };
    root.style.setProperty('--accent-hover', darken(c, 0.15));
    root.style.setProperty('--accent-light', c + '20'); // 12% 透明度背景
  }, [appearance.buttonColor, contact?.companionTheme?.accentColor]);

  const updateHomeSettings = useCallback(async (s: HomeSettings) => {
    const normalized = ensureDockIcons(s);
    setHomeSettings({ ...normalized });
    await saveHomeSettings(normalized);
  }, []);
  const resetHomeSettings = useCallback(async () => {
    const normalized = ensureDockIcons(DEFAULT_HOME);
    setHomeSettings(normalized);
    await saveHomeSettings(normalized);
  }, []);

  const updateMiniMaxSettings = useCallback((s: MiniMaxSettings) => {
    setMiniMaxSettings(s); saveMiniMaxSettings(s);
  }, []);

  const updateContactById = useCallback(async (id: string, patch: Partial<ContactSettings>) => {
    const nextContact = { ...contactRef.current, ...patch };
    const next = contactsRef.current.map(x => x.id === id ? { ...x, ...patch } : x);
    setContacts(next);
    await saveContacts(next);
    if (currentContactIdRef.current === id) {
      setContact(nextContact);
    }
  }, []);

  // ── 联系人 ──
  const updateContact = useCallback(async (c: ContactSettings) => {
    setContact(c);
    setContacts(prev => prev.map(x => x.id === c.id ? c : x));
    await saveContacts(contactsRef.current.map(x => x.id === c.id ? c : x));
  }, []);

  const updateAnniversary = useCallback(async (date: string) => {
    const cid = currentContactIdRef.current;
    setContact(prev => {
      const next = { ...prev, anniversary: date };
      return next;
    });
    const nextContacts = contactsRef.current.map(x => x.id === cid ? { ...contactRef.current, anniversary: date } : x);
    setContacts(nextContacts);
    await saveContacts(nextContacts);
  }, []);

  const addContact = useCallback(async (c: ContactSettings) => {
    const next = [...contactsRef.current, c];
    setContacts(next);
    await saveContacts(next);
    setCurrentContactId(c.id);
    saveCurrentContactId(c.id);
  }, []);

  const deleteContact = useCallback(async (id: string) => {
    const next = contactsRef.current.filter(c => c.id !== id);
    setContacts(next);
    await saveContacts(next);
    // 如果删的是当前联系人，切到第一个
    if (currentContactIdRef.current === id && next.length > 0) {
      setCurrentContactId(next[0].id);
      saveCurrentContactId(next[0].id);
    }
  }, []);

  const switchContact = useCallback((id: string) => {
    setCurrentContactId(id);
    saveCurrentContactId(id);
  }, []);

  const updateCurrentContact = useCallback((nextContacts: ContactSettings[]) => {
    const cid = currentContactIdRef.current;
    const c = nextContacts.find(x => x.id === cid) || DEFAULT_CONTACT;
    setContact(c);
  }, []);

  const switchChatBox = useCallback((id: string) => {
    const cid = currentContactIdRef.current;
    setContacts(prev => {
      const next = prev.map(c => c.id === cid ? { ...c, currentChatBoxId: id } : c);
      saveContacts(next);
      updateCurrentContact(next);
      return next;
    });
    setCurrentChatBoxId(id);
    setMessages(getMessages(cid, id));
  }, [updateCurrentContact]);

  const addChatBox = useCallback((name: string) => {
    const cid = currentContactIdRef.current;
    const newBox = { id: generateId(), name: name.trim() || '新聊天框', createdAt: Date.now() };
    setContacts(prev => {
      const next = prev.map(c => c.id === cid ? { ...c, chatBoxes: [...c.chatBoxes, newBox], currentChatBoxId: newBox.id } : c);
      saveContacts(next);
      updateCurrentContact(next);
      return next;
    });
    setCurrentChatBoxId(newBox.id);
    setMessages([]);
  }, [updateCurrentContact]);

  const deleteChatBox = useCallback((id: string) => {
    const cid = currentContactIdRef.current;
    setContacts(prev => {
      const c = prev.find(x => x.id === cid);
      if (!c) return prev;
      if (id === 'main') { toast.error('主聊天框不可删除'); return prev; }
      const nextBoxes = c.chatBoxes.filter(b => b.id !== id);
      const nextId = c.currentChatBoxId === id ? 'main' : c.currentChatBoxId;
      const next = prev.map(x => x.id === cid ? { ...x, chatBoxes: nextBoxes, currentChatBoxId: nextId } : x);
      saveContacts(next);
      updateCurrentContact(next);
      if (c.currentChatBoxId === id) {
        setCurrentChatBoxId('main');
        setMessages(getMessages(cid, 'main'));
      }
      return next;
    });
  }, [updateCurrentContact]);

  const renameChatBox = useCallback((id: string, name: string) => {
    const cid = currentContactIdRef.current;
    setContacts(prev => {
      const next = prev.map(c => c.id === cid ? { ...c, chatBoxes: c.chatBoxes.map(b => b.id === id ? { ...b, name: name.trim() || b.name } : b) } : c);
      saveContacts(next);
      updateCurrentContact(next);
      return next;
    });
  }, [updateCurrentContact]);

  // ── 表情包（全局共享）──
  // 用 emojisRef 读取最新列表，避免批量导入时闭包里的旧状态互相覆盖（多选只存一个的 bug）
  const addEmoji = useCallback(async (e: EmojiPack) => {
    const next = [...emojisRef.current, e];
    const ok = await saveEmojis(next);
    if (!ok) {
      toast.error('存储空间不足，表情包保存失败');
      return;
    }
    emojisRef.current = next;
    setEmojis(next);
  }, []);
  const deleteEmoji = useCallback(async (id: string) => {
    const next = emojisRef.current.filter(e => e.id !== id);
    await saveEmojis(next);
    emojisRef.current = next;
    setEmojis(next);
  }, []);

  // ── 朋友圈 ──
  // 用户发布动态后，对方主动评论（无需用户先评论），延迟触发并在后台执行
  const scheduleOpponentMomentComment = useCallback((cid: string, momentId: string) => {
    const pool = cardsRef.current.filter(c => !c.blocked && c.content.trim());
    if (pool.length === 0) return;
    window.setTimeout(() => {
      const reply = makeCommentContent(pool, emojisRef.current);
      const all = getMoments(cid);
      const withComment = all.map(m => {
        if (m.id !== momentId) return m;
        const systemComment: MomentPost['comments'][0] = {
          id: generateId(),
          sender: 'system',
          content: reply.content,
          timestamp: Date.now(),
          emoji: reply.emoji,
        };
        return { ...m, comments: [...m.comments, systemComment] };
      });
      saveMoments(cid, withComment);
      if (cid === currentContactIdRef.current) {
        setMoments(withComment);
      }
      toast.info(`${contactRef.current.nickname || '对方'} 评论了你的朋友圈`, { duration: 4000 });
    }, SYSTEM_FIXED.momentsReplyDelayMs);
  }, []);

  const addMoment = useCallback((m: MomentPost) => {
    const cid = currentContactIdRef.current;
    // 从存储读取最新数据，避免 state 过期导致覆盖丢失
    const stored = getMoments(cid);
    const next = [m, ...stored];
    saveMoments(cid, next);
    if (cid === currentContactIdRef.current) setMoments(next);

    // 用户发布动态后，对方主动评论（无需用户先评论）
    if (m.fromUser) {
      scheduleOpponentMomentComment(cid, m.id);
    }
  }, []);
  const addOpponentMoment = useCallback(() => {
    const pool = cards.filter(c => !c.blocked && c.content.trim());
    if (pool.length === 0) return null;
    const { content, images, emojiImage } = makeMomentContent(pool, imageCards, emojis, true);
    const m: MomentPost = {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      content,
      images: emojiImage ? [emojiImage] : images,
      timestamp: Date.now(),
      comments: [],
      liked: false,
      fromUser: false,
      emojiImage,
    };
    addMoment(m);
    return m;
  }, [cards, imageCards, emojis, addMoment]);
  const deleteMoment = useCallback((id: string) => {
    const cid = currentContactIdRef.current;
    const stored = getMoments(cid);
    const next = stored.filter(m => m.id !== id);
    saveMoments(cid, next);
    if (cid === currentContactIdRef.current) setMoments(next);
  }, []);
  const toggleMomentLike = useCallback((id: string, contactId?: string) => {
    const cid = contactId || currentContactIdRef.current;
    const allMoments = getMoments(cid);
    const updated = allMoments.map(m => m.id === id ? { ...m, liked: !m.liked } : m);
    saveMoments(cid, updated);
    // 若是当前联系人才更新 state（触发本地重渲染）
    if (cid === currentContactIdRef.current) {
      setMoments(updated);
    }
  }, []);
  const addMomentComment = useCallback((momentId: string, comment: MomentPost['comments'][0], contactId?: string) => {
    const cid = contactId || currentContactIdRef.current;
    const allMoments = getMoments(cid);
    const updated = allMoments.map(m => m.id === momentId ? { ...m, comments: [...m.comments, comment] } : m);
    saveMoments(cid, updated);
    if (cid === currentContactIdRef.current) {
      setMoments(updated);
    }
    // 对方 100% 回复评论，延迟 1 分钟；退出页面后仍会在后台触发
    const pool = cardsRef.current.filter(c => !c.blocked);
    if (pool.length > 0) {
      window.setTimeout(() => {
        const reply = makeCommentContent(pool, emojisRef.current);
        const all = getMoments(cid);
        const withReply = all.map(m => {
          if (m.id !== momentId) return m;
          const systemComment: MomentPost['comments'][0] = {
            id: generateId(),
            sender: 'system',
            content: reply.content,
            timestamp: Date.now(),
            emoji: reply.emoji,
            replyToId: comment.id,
            replyToName: comment.sender === 'user' ? (contactRef.current.myName || '我') : contactRef.current.nickname,
          };
          return { ...m, comments: [...m.comments, systemComment] };
        });
        saveMoments(cid, withReply);
        if (cid === currentContactIdRef.current) {
          setMoments(withReply);
        }
        toast.info(`${contactRef.current.nickname || '对方'} 回复了你的朋友圈`, { duration: 4000 });
      }, SYSTEM_FIXED.momentsReplyDelayMs);
    }
  }, []);
  const updateMomentNpc = useCallback((momentId: string, contactId: string, npcLikers: string[], npcComments: { id: string; name: string; content: string }[]) => {
    const allMoments = getMoments(contactId);
    const updated = allMoments.map(m => m.id === momentId ? { ...m, npcLikers, npcComments } : m);
    saveMoments(contactId, updated);
    if (contactId === currentContactIdRef.current) {
      setMoments(updated);
    }
  }, []);

  // ── 语音字卡 ──
  const addVoiceCard = useCallback((v: VoiceCard) => {
    const cid = currentContactIdRef.current;
    const stored = getVoiceCards(cid);
    const next = [...stored, v];
    const ok = saveVoiceCards(cid, next);
    if (!ok) {
      toast.error('存储空间不足，语音字卡保存失败');
      return;
    }
    if (cid === currentContactIdRef.current) setVoiceCards(next);
  }, []);
  const deleteVoiceCard = useCallback((id: string) => {
    const cid = currentContactIdRef.current;
    const stored = getVoiceCards(cid);
    const next = stored.filter(v => v.id !== id);
    saveVoiceCards(cid, next);
    if (cid === currentContactIdRef.current) setVoiceCards(next);
  }, []);
  const updateVoiceCard = useCallback((id: string, patch: Partial<VoiceCard>) => {
    const cid = currentContactIdRef.current;
    const stored = getVoiceCards(cid);
    const next = stored.map(v => (v.id === id ? { ...v, ...patch } : v));
    saveVoiceCards(cid, next);
    if (cid === currentContactIdRef.current) setVoiceCards(next);
  }, []);

  // ── 图片字卡 ──
  const addImageCard = useCallback((img: ImageCard) => {
    const cid = currentContactIdRef.current;
    const stored = getImageCards(cid);
    const next = [...stored, img];
    saveImageCards(cid, next);
    if (cid === currentContactIdRef.current) setImageCards(next);
  }, []);
  const deleteImageCard = useCallback((id: string) => {
    const cid = currentContactIdRef.current;
    const stored = getImageCards(cid);
    const next = stored.filter(i => i.id !== id);
    saveImageCards(cid, next);
    if (cid === currentContactIdRef.current) setImageCards(next);
  }, []);

  // ── 写信 ──
  const addLetter = useCallback((l: Letter) => {
    const cid = currentContactIdRef.current;
    const stored = getLetters(cid);
    const next = [...stored, l];
    saveLetters(cid, next);
    if (cid === currentContactIdRef.current) setLetters(next);
  }, []);
  const deleteLetter = useCallback((id: string) => {
    const cid = currentContactIdRef.current;
    const stored = getLetters(cid);
    const next = stored.filter(l => l.id !== id);
    saveLetters(cid, next);
    if (cid === currentContactIdRef.current) setLetters(next);
  }, []);

  // ── 对方日记 ──
  const generateDiaryEntry = useCallback((contactId: string, pool: CardItem[] = []): DiaryEntry => {
    const moods = ['开心', '想念', '平静', '有点小情绪', '期待', '温柔'];
    const weathers = ['晴', '多云', '阴', '小雨', '微风'];
    const titles = ['今天也想见到你', '深夜随笔', '今天的小确幸', '写给今天', '零散的心情', ' quietly thinking of you'];
    const fallbackBodies = QUOTES.length > 0 ? QUOTES : ['今天也有在想你。'];
    const bodyPool = pool.length > 0 ? pool.filter(c => !c.blocked) : [];
    let body = '';
    if (bodyPool.length > 0) {
      const count = Math.floor(Math.random() * 4) + 5; // 5~8 张字卡
      const picked = [...bodyPool].sort(() => Math.random() - 0.5).slice(0, count);
      body = picked.map(c => c.content).join('，');
    } else {
      const count = Math.min(3, Math.floor(Math.random() * 3) + 1);
      const picked = [...fallbackBodies].sort(() => Math.random() - 0.5).slice(0, count);
      body = picked.join('，');
    }
    const title = titles[Math.floor(Math.random() * titles.length)];
    const mood = moods[Math.floor(Math.random() * moods.length)];
    const weather = weathers[Math.floor(Math.random() * weathers.length)];
    return {
      id: generateId(),
      title,
      content: body,
      createdAt: Date.now(),
      author: 'system',
      contactId,
      mood,
      weather,
    };
  }, []);

  const addSystemDiary = useCallback((contactId: string, entry: DiaryEntry) => {
    setDiaries(prev => {
      if (contactId !== currentContactIdRef.current) return prev;
      const next = [entry, ...prev];
      saveDiaries(contactId, next);
      return next;
    });
  }, []);
  const deleteDiary = useCallback((contactId: string, id: string) => {
    setDiaries(prev => {
      if (contactId !== currentContactIdRef.current) return prev;
      const next = prev.filter(d => d.id !== id);
      saveDiaries(contactId, next);
      return next;
    });
  }, []);

  // ── 玩家日记 ──
  const addPlayerDiary = useCallback((entry: DiaryEntry) => {
    setPlayerDiaries(prev => {
      const next = [entry, ...prev];
      savePlayerDiaries(next);
      return next;
    });
  }, []);
  const deletePlayerDiary = useCallback((id: string) => {
    setPlayerDiaries(prev => {
      const next = prev.filter(d => d.id !== id);
      savePlayerDiaries(next);
      return next;
    });
  }, []);

  // ── 日记评论 ──
  const addDiaryComment = useCallback((entryId: string, content: string, replyTo?: DiaryComment) => {
    const playerName = contactRef.current.myName || '我';
    const partnerName = contactRef.current.nickname || '对方';
    const newComment: DiaryComment = {
      id: generateId(),
      author: 'player',
      authorName: playerName,
      content: content.trim(),
      createdAt: Date.now(),
      replyToId: replyTo?.id,
      replyToName: replyTo?.authorName,
    };

    const updateEntry = (prev: DiaryEntry[]): DiaryEntry[] => {
      const idx = prev.findIndex(d => d.id === entryId);
      if (idx < 0) return prev;
      const entry = prev[idx];
      const nextEntry = { ...entry, comments: [...(entry.comments || []), newComment] };
      const next = [...prev];
      next[idx] = nextEntry;
      return next;
    };

    let belongsToDiaries = false;
    setDiaries(prev => {
      const idx = prev.findIndex(d => d.id === entryId);
      if (idx < 0) return prev;
      belongsToDiaries = true;
      const next = updateEntry(prev);
      saveDiaries(currentContactIdRef.current, next);
      return next;
    });
    if (!belongsToDiaries) {
      setPlayerDiaries(prev => {
        const idx = prev.findIndex(d => d.id === entryId);
        if (idx < 0) return prev;
        const next = updateEntry(prev);
        savePlayerDiaries(next);
        return next;
      });
    }

    // 若评论的是对方日记，或回复的是对方评论，则对方自动回复
    const shouldReply = replyTo?.author === 'system' || belongsToDiaries;
    if (!shouldReply) return;

    const pool = cardsRef.current.filter(c => !c.blocked);
    if (pool.length === 0) return;
    // 延迟 1 分钟回复，离开页面后仍会在后台触发，并弹出提示
    window.setTimeout(() => {
      const replyContent = makeCommentContent(pool, emojisRef.current);
      const replyComment: DiaryComment = {
        id: generateId(),
        author: 'system',
        authorName: partnerName,
        content: replyContent.content,
        createdAt: Date.now(),
        replyToId: newComment.id,
        replyToName: newComment.authorName,
      };
      const replyUpdate = (prev: DiaryEntry[]): DiaryEntry[] => {
        const idx = prev.findIndex(d => d.id === entryId);
        if (idx < 0) return prev;
        const entry = prev[idx];
        return prev.map((d, i) => i === idx ? { ...d, comments: [...(d.comments || []), replyComment] } : d);
      };
      if (belongsToDiaries) {
        setDiaries(prev => { const next = replyUpdate(prev); saveDiaries(currentContactIdRef.current, next); return next; });
      } else {
        setPlayerDiaries(prev => { const next = replyUpdate(prev); savePlayerDiaries(next); return next; });
      }
      toast.info(`${partnerName} 回复了你的日记`, { duration: 4000 });
    }, SYSTEM_FIXED.diaryReplyDelayMs);
  }, []);

  const addSystemDiaryComment = useCallback((entryId: string, replyTo?: DiaryComment) => {
    const partnerName = contactRef.current.nickname || '对方';
    const pool = cardsRef.current.filter(c => !c.blocked);
    const fallback = ['今天也有在想你。'];
    const bodyPool = pool.length > 0 ? pool : [];
    let content = '';
    if (bodyPool.length > 0) {
      const count = bodyPool.length >= 2 && Math.random() * 100 < SYSTEM_FIXED.momentsCombineChance
        ? 2 + Math.floor(Math.random() * 2)
        : 1;
      const picked = [...bodyPool].sort(() => Math.random() - 0.5).slice(0, Math.min(count, bodyPool.length));
      content = picked.map(c => c.content).join('，');
    } else {
      content = fallback[Math.floor(Math.random() * fallback.length)];
    }
    const comment: DiaryComment = {
      id: generateId(),
      author: 'system',
      authorName: partnerName,
      content,
      createdAt: Date.now(),
      replyToId: replyTo?.id,
      replyToName: replyTo?.authorName,
    };
    const append = (prev: DiaryEntry[]): DiaryEntry[] => {
      const idx = prev.findIndex(d => d.id === entryId);
      if (idx < 0) return prev;
      const entry = prev[idx];
      return prev.map((d, i) => i === idx ? { ...d, comments: [...(d.comments || []), comment] } : d);
    };
    let isOpponent = false;
    setDiaries(prev => {
      const idx = prev.findIndex(d => d.id === entryId);
      if (idx < 0) return prev;
      isOpponent = true;
      const next = append(prev);
      saveDiaries(currentContactIdRef.current, next);
      return next;
    });
    if (!isOpponent) {
      setPlayerDiaries(prev => {
        const idx = prev.findIndex(d => d.id === entryId);
        if (idx < 0) return prev;
        const next = append(prev);
        savePlayerDiaries(next);
        return next;
      });
    }
    toast.info(`${partnerName} 评论了你的日记`, { duration: 4000 });
  }, []);

  // 延迟 1 分钟自动评论玩家日记，即使离开详情页也会触发；通过 ref 去重避免重复调度
  const scheduleSystemDiaryComment = useCallback((entryId: string) => {
    if (scheduledDiaryCommentIdsRef.current.has(entryId)) return;
    const allDiaries = [...diaries, ...playerDiaries];
    const entry = allDiaries.find(d => d.id === entryId);
    if (!entry || entry.author !== 'player' || (entry.comments?.length || 0) > 0) return;
    scheduledDiaryCommentIdsRef.current.add(entryId);
    window.setTimeout(() => {
      scheduledDiaryCommentIdsRef.current.delete(entryId);
      addSystemDiaryComment(entryId);
    }, SYSTEM_FIXED.diaryReplyDelayMs);
  }, [addSystemDiaryComment, diaries, playerDiaries]);

  // ── 问卷 ──
  const addQuestionnaire = useCallback((q: QuestionnaireItem) => {
    const cid = currentContactIdRef.current;
    const stored = getQuestionnaires(cid);
    const next = [...stored, q];
    saveQuestionnaires(cid, next);
    if (cid === currentContactIdRef.current) setQuestionnaires(next);
  }, []);
  const deleteQuestionnaire = useCallback((id: string) => {
    const cid = currentContactIdRef.current;
    const stored = getQuestionnaires(cid);
    const next = stored.filter(x => x.id !== id);
    saveQuestionnaires(cid, next);
    if (cid === currentContactIdRef.current) setQuestionnaires(next);
  }, []);

  // 自动生成问卷答案（选择题随机选，开放式问题用字卡回答）
  const generateAutoAnswers = useCallback((q: QuestionnaireItem): QuestionnaireAnswer[] => {
    const pool = cardsRef.current.filter(c => !c.blocked);
    return q.questions.map((question) => {
      if (question.type === 'text') {
        const card = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
        return { questionId: question.id, text: card ? card.content : '……' };
      }
      const len = question.options.length;
      if (len <= 1) return { questionId: question.id, optionIndex: 0 };
      // 多选题：随机选 2 ~ min(len,4) 个选项；单选题：随机选 1 个
      if (question.type === 'multi' && len >= 2) {
        const maxCount = Math.min(len, 4);
        const count = Math.min(len, 2 + Math.floor(Math.random() * (maxCount - 1)));
        const indexPool = Array.from({ length: len }, (_, i) => i).sort(() => Math.random() - 0.5);
        return { questionId: question.id, optionIndex: indexPool.slice(0, count).sort((a, b) => a - b) };
      }
      const idx = Math.floor(Math.random() * len);
      return { questionId: question.id, optionIndex: idx };
    });
  }, []);

  /** 提交问卷答案：每个问题都必须有答案 */
  const submitQuestionnaireAnswers = useCallback((qid: string, answers: QuestionnaireAnswer[], targetCid?: string, targetChatBoxId?: string) => {
    const cid = targetCid ?? currentContactIdRef.current;
    const chatBoxId = targetChatBoxId ?? currentChatBoxIdRef.current;
    // 从存储读取最新问卷，避免 state 过期导致找不到问卷而提前返回
    const q = getQuestionnaires(cid).find(x => x.id === qid);
    if (!q) return;
    // 验证每个问题都已回答
    const answeredIds = new Set(answers.map(a => a.questionId));
    const allAnswered = q.questions.every(qq => answeredIds.has(qq.id));
    if (!allAnswered) {
      toast.error('请回答所有问题');
      return;
    }
    const answeredQ: QuestionnaireItem = { ...q, answers, answeredAt: Date.now() };
    // 从存储读取最新问卷列表，避免 state 过期导致答案未写入
    const storedQs = getQuestionnaires(cid);
    const next = storedQs.map(x => x.id === qid ? answeredQ : x);
    saveQuestionnaires(cid, next);
    if (cid === currentContactIdRef.current) setQuestionnaires(next);
    removePendingQTimer(qid);
    // 发送评价消息到聊天：选择题展示选项，开放式问题用字卡回复
    const pool = cardsRef.current.filter(c => !c.blocked);
    q.questions.forEach((question, idx) => {
      const answer = answers.find(a => a.questionId === question.id);
      let content = '';
      if (question.type === 'text') {
        content = answer?.text || '……';
      } else {
        const selected = Array.isArray(answer?.optionIndex) ? answer.optionIndex : [answer?.optionIndex ?? 0];
        content = selected.map(i => question.options[i]).filter(Boolean).join('，');
      }
      if (!content) {
        const card = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
        content = card ? card.content : '……';
      }
      const evalMsg: ChatMessage = {
        id: generateId(),
        type: 'text',
        content: `${idx + 1}.${content}`,
        sender: 'system',
        timestamp: Date.now() + idx * 800,
        senderName: contactRef.current.isGroup ? (contactRef.current.nickname || '对方') : undefined,
      };
      addMessageToContact(cid, chatBoxId, evalMsg);
    });
    // 更新聊天中问卷消息的 meta 为已完成
    // 仅当正在查看该聊天时更新界面状态；否则直接改存储，避免把当前聊天的消息错存到其他联系人名下
    const markCompleted = (list: ChatMessage[]) => list.map(m => {
      if (m.type === 'questionnaire' && m.meta) {
        try {
          const data = JSON.parse(m.meta) as { questionnaireId?: string };
          if (data.questionnaireId === qid) {
            return { ...m, meta: JSON.stringify({ ...data, status: 'completed' }) };
          }
        } catch { /* ignore */ }
      }
      return m;
    });
    if (cid === currentContactIdRef.current && chatBoxId === currentChatBoxIdRef.current) {
      setMessages(prevM => {
        const nextM = markCompleted(prevM);
        saveMessages(cid, chatBoxId, nextM);
        return nextM;
      });
    } else {
      saveMessages(cid, chatBoxId, markCompleted(getMessages(cid, chatBoxId)));
    }
  }, [addMessageToContact]);

  // 用 ref 保存最新的提交函数，供持久化定时器回调使用
  const submitQuestionnaireAnswersRef = useRef(submitQuestionnaireAnswers);
  useEffect(() => { submitQuestionnaireAnswersRef.current = submitQuestionnaireAnswers; }, [submitQuestionnaireAnswers]);

  // 轮询未完成的问卷定时器，确保页面在后台/切出/刷新后仍能在 1 分钟内自动回答
  useEffect(() => {
    let running = false;
    const checkTimers = () => {
      if (running) return;
      running = true;
      try {
        const timers = getPendingQTimers();
        if (timers.length === 0) return;
        const now = Date.now();
        for (const timer of timers) {
          if (timer.answerAt > now) continue;
          // 从存储读取目标联系人的问卷，不依赖当前界面 state（跨联系人/刷新后 state 可能没有）
          const q = getQuestionnaires(timer.contactId).find(x => x.id === timer.questionnaireId && !x.answeredAt);
          if (!q) {
            removePendingQTimer(timer.questionnaireId);
            continue;
          }
          const answers = generateAutoAnswers(q);
          submitQuestionnaireAnswersRef.current(q.id, answers, timer.contactId, timer.chatBoxId);
        }
      } finally {
        running = false;
      }
    };

    checkTimers();

    let worker: Worker | null = null;
    const cleanup = () => {
      if (worker) {
        try { worker.postMessage('stop'); } catch { /* ignore */ }
        try { worker.terminate(); } catch { /* ignore */ }
        worker = null;
      }
    };

    if (typeof Worker !== 'undefined') {
      try {
        worker = new Worker('/q-timer-worker.js');
        worker.addEventListener('message', () => checkTimers());
        worker.postMessage('start');
      } catch {
        cleanup();
      }
    }

    // 降级：主线程轮询（页面隐藏时可能被节流，Worker 优先）
    const fallback = worker ? null : setInterval(checkTimers, 3000);
    const handleVis = () => { if (!document.hidden) checkTimers(); };
    document.addEventListener('visibilitychange', handleVis);
    return () => {
      cleanup();
      if (fallback) clearInterval(fallback);
      document.removeEventListener('visibilitychange', handleVis);
    };
  }, []);

  /** 发送问卷到聊天，并设置约 1 分钟内自动回答 */
  const sendQuestionnaire = useCallback((q: QuestionnaireItem) => {
    const cid = currentContactIdRef.current;
    const chatBoxId = currentChatBoxIdRef.current;
    // 1. 发送问卷消息到聊天
    const meta = JSON.stringify({
      questionnaireId: q.id,
      title: q.title,
      questions: q.questions,
      status: 'filling',
    });
    const msg: ChatMessage = {
      id: generateId(),
      type: 'questionnaire',
      content: q.title,
      sender: 'user',
      timestamp: Date.now(),
      meta,
    };
    addMessage(msg);
    // 2. 保存问卷到本地（从存储读取，避免 state 过期覆盖）
    const storedQs = getQuestionnaires(cid);
    const nextQs = [...storedQs, q];
    saveQuestionnaires(cid, nextQs);
    if (cid === currentContactIdRef.current) setQuestionnaires(nextQs);
    // 3. 约 1 分钟内必须回答（随机选每个问题的选项）
    const delayMs = 1000 + Math.floor(Math.random() * 59000);
    const answerAt = Date.now() + delayMs;
    savePendingQTimer({ questionnaireId: q.id, contactId: cid, chatBoxId, answerAt });
    // 当前页面打开时直接触发随机回答（无需等 Worker 轮询或刷新）
    setTimeout(() => {
      // 从存储读取最新问卷，避免依赖界面 state（刷新/切换联系人后 state 可能不含该问卷）
      const currentQ = getQuestionnaires(cid).find(x => x.id === q.id && !x.answeredAt);
      if (!currentQ) return;
      const answers = generateAutoAnswers(currentQ);
      submitQuestionnaireAnswersRef.current(q.id, answers, cid, chatBoxId);
    }, Math.min(delayMs, 3000 + Math.floor(Math.random() * 4000)));
  }, [addMessage]);

  /** 从字卡池里按 min/max 句数拼一句话（逗号拼接），自动过滤被屏蔽的字卡 */
  const pickContent = useCallback((pool: CardItem[]): string => {
    const active = pool.filter(c => !c.blocked);
    if (active.length === 0) return pool.length > 0 ? pool[0].content : '';
    const min = Math.min(3, Math.max(1, contactRef.current.sysMinSentences ?? 1));
    const max = Math.min(3, Math.max(min, contactRef.current.sysMaxSentences ?? 1));
    const count = min === max ? min : min + Math.floor(Math.random() * (max - min + 1));
    const shuffled = [...active].sort(() => Math.random() - 0.5).slice(0, count);
    return shuffled.map(c => c.content).join('，');
  }, []);

  // ── 自动备份：优先写入玩家指定的文件，无权限时提示授权而非直接下载 ──
  const autoBackup = useCallback(async () => {
    try {
      const data = exportBackup();
      const handle = await getBackupFileHandle();
      if (handle) {
        const res = await writeBackupToFile(data);
        if (res.ok) {
          toast.success('已自动备份到指定文件');
          return;
        }
        if (res.reason === 'no_permission') {
          toast('自动备份文件需要写入权限', {
            duration: 10000,
            action: {
              label: '授权并更新',
              onClick: async () => {
                const granted = await requestBackupPermission();
                if (!granted) {
                  toast.error('权限未授予，无法自动更新文件');
                  return;
                }
                const again = await writeBackupToFile(data);
                if (again.ok) toast.success('已自动备份到指定文件');
                else toast.error('备份文件写入失败');
              },
            },
          });
          return;
        }
      }
      // 降级：未指定文件时按文件名下载
      const blob = new Blob([data], { type: 'application/json' });
      const a = document.createElement('a');
      const prefix = contactRef.current.autoBackupFileName || 'soulcard_backup';
      const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
      a.href = URL.createObjectURL(blob);
      a.download = `${prefix}_${ts}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success('自动备份已导出');
    } catch { /* ignore */ }
  }, []);

  // ── 统一后台定时器（每10秒检查一次，用 localStorage 时间戳补偿离线遗漏） ──
  useEffect(() => {
    // 离线补发：页面关闭/后台期间错过的任务一次性补发
    const runCatchUp = () => {
      const cid = currentContactIdRef.current;
      const now = Date.now();
      const pool = cardsRef.current.filter(c => !c.blocked);

      // 1. 朋友圈：由在线 check 按每周随机处理；离线超过一周则重置起点
      if (pool.length > 0) {
        const lastMomentTime = getLastRunTime(cid, 'moments');
        const dayMs = 24 * 3600 * 1000;
        const missedDays = lastMomentTime === 0 ? 0 : Math.floor((now - lastMomentTime) / dayMs);
        if (lastMomentTime === 0) {
          saveLastRunTime(cid, 'moments', now);
        } else if (missedDays > 7) {
          saveLastRunTime(cid, 'moments', now);
        }
      }

      // 2. 主动发消息补发
      const msgMinutes = contactRef.current.proactiveMsgIntervalMinutes ?? 0;
      if (msgMinutes > 0 && pool.length > 0) {
        const intervalMs = msgMinutes * 60 * 1000;
        const lastTime = getLastRunTime(cid, 'proactive_msg');
        if (lastTime === 0) {
          saveLastRunTime(cid, 'proactive_msg', now);
        } else {
          const missedCount = Math.floor((now - lastTime) / intervalMs);
          const maxCatchUp = 20;
          const execCount = Math.min(missedCount, maxCatchUp);
          if (execCount > 0) {
            const newMsgs: ChatMessage[] = [];
            for (let r = 0; r < execCount; r++) {
              const msgCount = 1 + Math.floor(Math.random() * 3);
              const baseTs = lastTime + (r + 1) * intervalMs;
              for (let i = 0; i < msgCount; i++) {
                newMsgs.push({
                  id: generateId(), type: 'text', content: pickContent(pool),
                  sender: 'system', timestamp: baseTs + i * 2000,
                  meta: JSON.stringify({ silent: true }),
                });
              }
            }
            if (newMsgs.length > 0) {
              const bid = currentChatBoxIdRef.current;
              const existing = getMessages(cid, bid);
              const next = [...existing, ...newMsgs];
              saveMessages(cid, bid, next);
              if (cid === currentContactIdRef.current) setMessages(next);
              // 离线补发结束后，给用户一条系统通知提示（如果开启了后台推送）
              const name = contactRef.current.nickname || '对方';
              sendPush(name, `对方在离线期间发来 ${newMsgs.length} 条消息`);
            }
            saveLastRunTime(cid, 'proactive_msg', lastTime + execCount * intervalMs);
          }
        }
      }

      // 3. 自动备份补发
      const backupHours = contactRef.current.autoBackupIntervalHours ?? 0;
      if (backupHours > 0) {
        const intervalMs = backupHours * 3600 * 1000;
        const lastTime = getLastRunTime(cid, 'auto_backup');
        if (lastTime === 0) {
          saveLastRunTime(cid, 'auto_backup', now);
        } else {
          const missedCount = Math.floor((now - lastTime) / intervalMs);
          const maxCatchUp = 3;
          const execCount = Math.min(missedCount, maxCatchUp);
          if (execCount > 0) {
            for (let i = 0; i < execCount; i++) autoBackup();
            saveLastRunTime(cid, 'auto_backup', lastTime + execCount * intervalMs);
          }
        }
      }
    };

    runCatchUp(); // 启动时先补发离线遗漏

    // 暴露给 Service Worker 后台同步调用
    (window as unknown as { __yannyu_run_catchup__?: () => void }).__yannyu_run_catchup__ = runCatchUp;

    const lastIntervalRef = { current: contactRef.current.proactiveMsgIntervalMinutes ?? 0 };

    const check = () => {
      const cid2 = currentContactIdRef.current;
      const now2 = Date.now();
      const pool2 = cardsRef.current.filter(c => !c.blocked);

      // 1. 朋友圈：每天 1~3 条，按生成的随机时间戳发布
      if (pool2.length > 0) {
        const nowDate = new Date(now2);
        const dayId = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}-${String(nowDate.getDate()).padStart(2, '0')}`;
        const dayKey = `soulcard_${cid2}_moment_day`;
        const targetTimesKey = `soulcard_${cid2}_moment_target_times`;
        const sentKey = `soulcard_${cid2}_moment_sent`;
        const targetCount = SYSTEM_FIXED.momentsDailyMin + Math.floor(Math.random() * (SYSTEM_FIXED.momentsDailyMax - SYSTEM_FIXED.momentsDailyMin + 1));

        const dayStart = new Date(now2);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        // 从当前时间开始生成，避免上线后一次性补发过去的时间点
        const generationStart = Math.max(dayStart.getTime(), now2);

        let storedDay = dbGet(dayKey);
        let sent = parseInt(dbGet(sentKey) || '0', 10);
        let targetTimes: number[] = [];

        if (storedDay !== dayId) {
          storedDay = dayId;
          sent = 0;
          // 为本天生成 1~3 个随机时间点（均晚于当前时间）
          targetTimes = [];
          for (let i = 0; i < targetCount; i++) {
            const t = generationStart + Math.random() * (dayEnd.getTime() - generationStart);
            targetTimes.push(t);
          }
          targetTimes.sort((a, b) => a - b);
          dbSet(dayKey, dayId);
          dbSet(targetTimesKey, JSON.stringify(targetTimes));
          dbSet(sentKey, '0');
        } else {
          try { targetTimes = JSON.parse(dbGet(targetTimesKey) || '[]'); } catch { targetTimes = []; }
        }

        // 跳过错过的 past 时间点，避免用户上线后集中触发
        const missed = targetTimes.filter((t, i) => i >= sent && t <= now2).length;
        if (missed > 0) {
          sent += missed;
          dbSet(sentKey, String(sent));
        }

        // 每次最多发一条，避免集中一次性发完
        const nextIndex = targetTimes.findIndex((t, i) => i >= sent && t <= now2);
        if (nextIndex !== -1 && nextIndex < targetCount) {
          const { content, images, emojiImage } = makeMomentContent(pool2, imageCardsRef.current, emojisRef.current, true);
          const newMoment: MomentPost = {
            id: generateId(), content, images,
            timestamp: now2, comments: [], liked: false, likedBySystem: true, fromUser: false,
            emojiImage,
          };
          // 从存储读取最新朋友圈，避免 React state 与当前联系人错位导致覆盖丢失
          const storedMoments = getMoments(cid2);
          const nextMoments = [newMoment, ...storedMoments];
          saveMoments(cid2, nextMoments);
          if (cid2 === currentContactIdRef.current) setMoments(nextMoments);
          dbSet(sentKey, String(nextIndex + 1));
          saveLastRunTime(cid2, 'moments', now2);
        }
      }

      // 2. 对方日记：每个联系人每天一篇，按生成的随机时间戳发布
      const nowDateDiary = new Date(now2);
      const dayIdDiary = `${nowDateDiary.getFullYear()}-${String(nowDateDiary.getMonth() + 1).padStart(2, '0')}-${String(nowDateDiary.getDate()).padStart(2, '0')}`;
      const diaryDayStart = new Date(now2);
      diaryDayStart.setHours(0, 0, 0, 0);
      const diaryDayEnd = new Date(diaryDayStart.getTime() + 24 * 60 * 60 * 1000);
      contactsRef.current.forEach(c => {
        if (!c || c.isGroup) return;
        const cid = c.id;
        const dayKey = `soulcard_${cid}_diary_day`;
        const targetKey = `soulcard_${cid}_diary_target_time`;
        const storedDay = dbGet(dayKey);
        let targetTime = 0;
        if (storedDay !== dayIdDiary) {
          dbSet(dayKey, dayIdDiary);
          targetTime = diaryDayStart.getTime() + Math.random() * (diaryDayEnd.getTime() - diaryDayStart.getTime());
          dbSet(targetKey, String(targetTime));
        } else {
          targetTime = parseInt(dbGet(targetKey) || '0', 10);
        }
        if (targetTime > 0 && targetTime <= now2) {
          const existing = getDiaries(cid);
          const todayStart = diaryDayStart.getTime();
          if (!existing.some(d => d.author === 'system' && d.createdAt >= todayStart && d.createdAt < diaryDayEnd.getTime())) {
            const pool = getCards(cid).filter(card => !card.blocked);
            const entry = generateDiaryEntry(cid, pool);
            const next = [entry, ...existing];
            saveDiaries(cid, next);
            if (cid === currentContactIdRef.current) {
              setDiaries(next);
            }
          }
        }
      });

      // 3. 主动发消息（在线时正常触发）
      const msgMinutes = contactRef.current.proactiveMsgIntervalMinutes ?? 0;
      if (msgMinutes > 0 && pool2.length > 0) {
        const intervalMs = msgMinutes * 60 * 1000;
        let lastTime = getLastRunTime(cid2, 'proactive_msg');

        // 用户缩短间隔后应及时生效：若上次运行时间按新间隔已经过期，则重置到刚好过期
        if (lastIntervalRef.current !== msgMinutes && lastTime > 0) {
          lastIntervalRef.current = msgMinutes;
          if (now2 - lastTime >= intervalMs) {
            saveLastRunTime(cid2, 'proactive_msg', now2 - intervalMs);
            lastTime = now2 - intervalMs;
          }
        }

        if (lastTime === 0) {
          saveLastRunTime(cid2, 'proactive_msg', now2);
        } else if (now2 - lastTime >= intervalMs) {
          const msgCount = 1 + Math.floor(Math.random() * 3);
          for (let i = 0; i < msgCount; i++) {
            setTimeout(() => {
              const content = pickContent(pool2);
              const msg: ChatMessage = {
                id: generateId(), type: 'text', content,
                sender: 'system', timestamp: Date.now(),
              };
              addMessageToContact(cid2, currentChatBoxIdRef.current, msg);
            }, i * (2000 + Math.floor(Math.random() * 3000)));
          }
          saveLastRunTime(cid2, 'proactive_msg', now2);
        }
      } else {
        // 禁用或无可发送内容时同步当前间隔，避免重新启用后误判
        lastIntervalRef.current = msgMinutes;
      }

      // 4. 自动备份
      const backupHours = contactRef.current.autoBackupIntervalHours ?? 0;
      if (backupHours > 0) {
        const intervalMs = backupHours * 3600 * 1000;
        const lastTime = getLastRunTime(cid2, 'auto_backup');
        if (lastTime === 0) {
          saveLastRunTime(cid2, 'auto_backup', now2);
        } else if (now2 - lastTime >= intervalMs) {
          autoBackup();
          saveLastRunTime(cid2, 'auto_backup', now2);
        }
      }
    };
    const timer = setInterval(check, 10000);
    check(); // 立即执行一次在线检查
    const handleVis = () => {
      if (!document.hidden) {
        runCatchUp(); // 从后台返回时先补偿离线遗漏
        check();
      }
    };
    document.addEventListener('visibilitychange', handleVis);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVis);
      delete (window as unknown as { __yannyu_run_catchup__?: () => void }).__yannyu_run_catchup__;
    };
  }, [pickContent, sendPush, autoBackup]);

  // ── 对方主动回信（系统固定：每天 0~3 封） ──
  useEffect(() => {
    const dayMs = 24 * 60 * 60 * 1000;

    const getDayKey = (d = new Date()) => {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const sendLetter = (timestamp: number) => {
      const pool = cardsRef.current.filter(c => !c.blocked);
      if (pool.length === 0) return;
      const count = 5 + Math.floor(Math.random() * 8); // 5〜12 句
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const picked = shuffled.slice(0, Math.min(count, shuffled.length));
      const content = picked.map(c => c.content).join('。') + (picked.length > 0 ? '。' : '');
      const letter: Letter = { id: generateId(), fromUser: false, content, timestamp };
      const cid2 = currentContactIdRef.current;
      // 从存储读取最新信件，避免 React state 与当前联系人错位导致覆盖丢失
      const stored = getLetters(cid2);
      const next = [...stored, letter];
      saveLetters(cid2, next);
      if (cid2 === currentContactIdRef.current) setLetters(next);
    };

    const checkLetter = () => {
      const pool = cardsRef.current.filter(c => !c.blocked);
      if (pool.length === 0) return;
      const now = Date.now();
      const cid = currentContactIdRef.current;
      const dayKey = getDayKey();
      const dayStoreKey = `soulcard_${cid}_letter_day_id`;
      const targetKey = `soulcard_${cid}_letter_day_target`;
      const sentKey = `soulcard_${cid}_letter_day_sent`;
      const lastKey = `soulcard_${cid}_letter_last_ts`;

      const storedDay = dbGet(dayStoreKey);
      let target: number;
      if (storedDay === dayKey) {
        target = +(dbGet(targetKey) || SYSTEM_FIXED.letterDailyMin);
      } else {
        target = SYSTEM_FIXED.letterDailyMin + Math.floor(Math.random() * (SYSTEM_FIXED.letterDailyMax - SYSTEM_FIXED.letterDailyMin + 1));
        dbSet(dayStoreKey, dayKey);
        dbSet(targetKey, String(target));
        dbSet(sentKey, '0');
      }
      const sent = +(dbGet(sentKey) || 0);
      if (sent >= target) return;

      // 同一封信之间至少间隔 15 分钟，避免集中刷屏
      const lastTs = +(dbGet(lastKey) || 0);
      if (now - lastTs < 15 * 60 * 1000) return;

      // 当天越靠后概率越高，确保大概率能完成目标
      const hours = new Date().getHours();
      const baseChance = 0.12;
      const chance = baseChance + (hours / 24) * 0.45;
      if (Math.random() >= chance) return;

      sendLetter(now);
      dbSet(sentKey, String(sent + 1));
      dbSet(lastKey, String(now));
      saveLastRunTime(cid, 'proactive_letter', now);
    };

    // 启动时立即检查一次，补偿离线/后台期间遗漏的信件
    const catchUpLetters = () => {
      const cid = currentContactIdRef.current;
      const pool = cardsRef.current.filter(c => !c.blocked);
      if (pool.length === 0) return;
      const lastTime = getLastRunTime(cid, 'proactive_letter');
      const now = Date.now();
      if (lastTime === 0) {
        saveLastRunTime(cid, 'proactive_letter', now);
        return;
      }
      const missedDays = Math.floor((now - lastTime) / dayMs);
      if (missedDays <= 0) return;
      // 离线期间每天最多补 3 封，整体上限 9 封
      const maxCatchUp = Math.min(missedDays * SYSTEM_FIXED.letterDailyMax, 9);
      for (let i = 0; i < maxCatchUp; i++) {
        const ts = lastTime + Math.floor(Math.random() * (now - lastTime));
        sendLetter(ts);
      }
      saveLastRunTime(cid, 'proactive_letter', now);
    };

    catchUpLetters();
    checkLetter();
    const t = setInterval(checkLetter, 60 * 60 * 1000); // 每小时检查
    const handleVis = () => {
      if (!document.hidden) {
        catchUpLetters();
        checkLetter();
      }
    };
    document.addEventListener('visibilitychange', handleVis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', handleVis); };
  }, [sendPush]);

  const value = useMemo(() => ({
    messages, cards, moodCards, imageCards, appearance, contact, emojis, moments, voiceCards, letters,
    contacts, currentContactId, currentChatBoxId, homeSettings, miniMaxSettings, questionnaires, diaries, playerDiaries,
    addMessage, updateMessage, deleteMessage, clearMessages, markMessagesAsRead,
    addCard, addCards, updateCard, updateCardCategories, updateCardBlocks, deleteCard, deleteCards,
    addMoodCard, addMoodCards, updateMoodCard, deleteMoodCard,
    updateAppearance, resetAppearance,
    updateContact, updateContactById, updateAnniversary, addContact, deleteContact, switchContact,
    switchChatBox, addChatBox, deleteChatBox, renameChatBox,
    addEmoji, deleteEmoji,
    addMoment, addOpponentMoment, deleteMoment, toggleMomentLike, addMomentComment, updateMomentNpc,
    addVoiceCard, deleteVoiceCard, updateVoiceCard,
    addImageCard, deleteImageCard,
    addLetter, deleteLetter,
    pickContent,
    updateHomeSettings, resetHomeSettings,
    updateMiniMaxSettings, testPush,
    addQuestionnaire, deleteQuestionnaire, sendQuestionnaire, answerQuestionnaire: submitQuestionnaireAnswers,
    addSystemDiary, deleteDiary, addPlayerDiary, deletePlayerDiary, addDiaryComment, addSystemDiaryComment, scheduleSystemDiaryComment,
  }), [
    messages, cards, moodCards, imageCards, appearance, contact, emojis, moments, voiceCards, letters,
    contacts, currentContactId, currentChatBoxId, homeSettings, miniMaxSettings, questionnaires, diaries, playerDiaries,
    addMessage, updateMessage, deleteMessage, clearMessages, markMessagesAsRead, addCard, addCards, updateCard, updateCardCategories, updateCardBlocks, deleteCard, deleteCards,
    addMoodCard, addMoodCards, updateMoodCard, deleteMoodCard,
    updateAppearance, resetAppearance, updateContact, updateContactById, updateAnniversary, addContact, deleteContact, switchContact,
    switchChatBox, addChatBox, deleteChatBox, renameChatBox,
    addEmoji, deleteEmoji, addMoment, addOpponentMoment, deleteMoment, toggleMomentLike, addMomentComment, updateMomentNpc,
    addVoiceCard, deleteVoiceCard, updateVoiceCard, addImageCard, deleteImageCard, addLetter, deleteLetter, pickContent,
    updateHomeSettings, resetHomeSettings, updateMiniMaxSettings,
    addQuestionnaire, deleteQuestionnaire, sendQuestionnaire, submitQuestionnaireAnswers,
    addSystemDiary, deleteDiary, addPlayerDiary, deletePlayerDiary, addDiaryComment, addSystemDiaryComment, scheduleSystemDiaryComment,
    testPush,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
