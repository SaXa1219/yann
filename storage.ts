import type { ChatMessage, CardItem, AppearanceSettings, ContactSettings, EmojiPack, MomentPost, VoiceCard, Letter, ImageCard, HomeSettings, QuestionnaireItem, MiniMaxSettings, DiaryEntry, CompanionSession, CompanionScene } from '@/types/types';
import { DEFAULT_APPEARANCE, DEFAULT_CONTACT, DEFAULT_HOME, DEFAULT_MINIMAX_SETTINGS } from '@/types/types';
import { generateId } from '@/utils/id';
import { APP_VERSION } from '@/constants/version';
import { dbGet, dbSet, dbRemove, dbClearAll, dbKeys, dbGetObject, dbSetObject } from './db';

const META_KEYS = {
  CONTACTS: 'soulcard_contacts',
  CURRENT_CONTACT_ID: 'soulcard_current_contact_id',
};

// 关键数据双写：IndexedDB 失败后回退到 localStorage，读取时优先 IndexedDB
function localStorageGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function localStorageSet(key: string, value: string): boolean {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}
function localStorageRemove(key: string) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

/** 优先读取 IndexedDB，缺失时回退 localStorage */
function robustGet(key: string): string | null {
  const fromDb = dbGet(key);
  if (fromDb !== null) return fromDb;
  return localStorageGet(key);
}

/** 写入 IndexedDB 并同步备份到 localStorage（防止预览/隐私模式导致 IndexedDB 丢失） */
async function robustSet(key: string, value: string): Promise<boolean> {
  try {
    await dbSet(key, value);
    localStorageSet(key, value);
    return true;
  } catch {
    return localStorageSet(key, value);
  }
}
function robustRemove(key: string) {
  try { dbRemove(key); } catch { /* ignore */ }
  localStorageRemove(key);
}

function contactKey(contactId: string, suffix: string) {
  return `soulcard_${contactId}_${suffix}`;
}

// ── 联系人列表 ──
export function getContacts(): ContactSettings[] {
  try {
    const d = robustGet(META_KEYS.CONTACTS);
    if (!d) return [];
    const parsed = JSON.parse(d);
    const arr = Array.isArray(parsed) ? parsed : [];
    return arr.filter(c => c && c.id);
  } catch { return []; }
}
export function saveContacts(list: ContactSettings[]): Promise<boolean> {
  return robustSet(META_KEYS.CONTACTS, JSON.stringify(list));
}

const DEFAULT_MUSIC_URLS = new Map(DEFAULT_CONTACT.musicPlaylist.map(s => [s.id, s]));

/** 将默认网易云旧 URL 替换为新版可播放的演示曲目 */
function migrateDefaultMusic(playlist: typeof DEFAULT_CONTACT.musicPlaylist) {
  return playlist.map(s => {
    const fallback = DEFAULT_MUSIC_URLS.get(s.id);
    if (fallback && s.url && s.url.includes('music.163.com')) {
      return { ...fallback, name: s.name || fallback.name };
    }
    return s;
  });
}

/** 将联系人补齐为当前版本的默认字段，防止旧备份缺少字段导致 bug */
export function normalizeContacts(list: ContactSettings[]): ContactSettings[] {
  return list.map(c => {
    const raw = c as ContactSettings & { proactiveMsgIntervalHours?: number };
    // 旧版使用小时，自动转换为分钟
    const proactiveMsgIntervalMinutes = typeof raw.proactiveMsgIntervalHours === 'number'
      ? raw.proactiveMsgIntervalHours * 60
      : (c.proactiveMsgIntervalMinutes ?? DEFAULT_CONTACT.proactiveMsgIntervalMinutes);
    return {
      ...DEFAULT_CONTACT,
      ...c,
      proactiveMsgIntervalMinutes,
      // 嵌套对象需要深合并，避免旧备份只存了部分字段
      companionTheme: { ...DEFAULT_CONTACT.companionTheme, ...(c.companionTheme || {}) },
      musicPlaylist: migrateDefaultMusic(c.musicPlaylist?.length ? c.musicPlaylist : DEFAULT_CONTACT.musicPlaylist),
      chatBoxes: c.chatBoxes?.length ? c.chatBoxes : [{ id: 'main', name: '主聊天框', createdAt: Date.now() }],
      currentChatBoxId: c.currentChatBoxId || c.chatBoxes?.[0]?.id || 'main',
      gifts: Array.isArray(c.gifts) ? c.gifts : [],
      companionSeconds: typeof c.companionSeconds === 'number' ? c.companionSeconds : 0,
    };
  });
}

export function getCurrentContactId(): string {
  try { return robustGet(META_KEYS.CURRENT_CONTACT_ID) || 'default'; }
  catch { return 'default'; }
}
export function saveCurrentContactId(id: string): boolean {
  const ok = localStorageSet(META_KEYS.CURRENT_CONTACT_ID, id);
  robustSet(META_KEYS.CURRENT_CONTACT_ID, id).catch(() => {});
  return ok;
}

// ── 数据迁移：旧版单联系人 → 新版多联系人（仅在 initDB 前从 localStorage 读取一次） ──
const LEGACY_KEYS = ['soulcard_messages', 'soulcard_cards', 'soulcard_image_cards', 'soulcard_appearance', 'soulcard_contact', 'soulcard_emojis', 'soulcard_moments', 'soulcard_voice_cards', 'soulcard_letters'];

export function migrateLegacyData() {
  // 如果 IndexedDB 中已有联系人列表，说明已经初始化过了
  const hasContacts = !!dbGet(META_KEYS.CONTACTS);
  if (hasContacts) return; // 已迁移

  const hasLegacy = LEGACY_KEYS.some(k => !!localStorage.getItem(k));
  if (!hasLegacy) {
    // 全新用户：创建默认联系人
    saveContacts([DEFAULT_CONTACT]);
    saveCurrentContactId('default');
    return;
  }

  // 有旧数据：读取旧联系人，创建 default 联系人
  const oldContactRaw = localStorage.getItem('soulcard_contact');
  const oldContact = oldContactRaw ? { ...DEFAULT_CONTACT, ...JSON.parse(oldContactRaw) } : DEFAULT_CONTACT;
  const defaultContact: ContactSettings = { ...oldContact, id: 'default' };
  saveContacts([defaultContact]);
  saveCurrentContactId('default');

  // 迁移各数据到新 key
  const legacyMap: Record<string, string> = {
    'soulcard_messages': 'messages',
    'soulcard_cards': 'cards',
    'soulcard_image_cards': 'image_cards',
    'soulcard_appearance': 'appearance',
    'soulcard_emojis': 'emojis',
    'soulcard_moments': 'moments',
    'soulcard_voice_cards': 'voice_cards',
    'soulcard_letters': 'letters',
  };

  Object.entries(legacyMap).forEach(([oldKey, suffix]) => {
    const v = localStorage.getItem(oldKey);
    if (v !== null) {
      dbSet(contactKey('default', suffix), v);
      localStorage.removeItem(oldKey);
    }
  });
  localStorage.removeItem('soulcard_contact');
}

// ── 聊天消息 ──
export function getMessages(contactId: string, chatBoxId = 'main'): ChatMessage[] {
  try {
    const key = contactKey(`${contactId}:${chatBoxId}`, 'messages');
    let d = dbGet(key);
    // 主聊天框兼容旧数据
    if (chatBoxId === 'main' && d === null) {
      d = dbGet(contactKey(contactId, 'messages'));
    }
    const parsed = d ? JSON.parse(d) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
export function saveMessages(contactId: string, chatBoxId: string, m: ChatMessage[]): boolean {
  try { dbSet(contactKey(`${contactId}:${chatBoxId}`, 'messages'), JSON.stringify(m)); return true; }
  catch { return false; }
}

// ── 字卡 ──
export function getCards(contactId: string): CardItem[] {
  try {
    const d = dbGet(contactKey(contactId, 'cards'));
    const parsed = d ? JSON.parse(d) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
export function saveCards(contactId: string, c: CardItem[]): CardItem[] | null {
  try { dbSet(contactKey(contactId, 'cards'), JSON.stringify(c)); return c; }
  catch { return null; }
}

// ── 心情字卡 ──
export function getMoodCards(contactId: string): CardItem[] {
  try {
    const d = dbGet(contactKey(contactId, 'mood_cards'));
    const parsed = d ? JSON.parse(d) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
export function saveMoodCards(contactId: string, c: CardItem[]): CardItem[] | null {
  try { dbSet(contactKey(contactId, 'mood_cards'), JSON.stringify(c)); return c; }
  catch { return null; }
}

// ── 外观 ──
export function getAppearance(contactId: string): AppearanceSettings {
  try { return { ...DEFAULT_APPEARANCE, ...JSON.parse(robustGet(contactKey(contactId, 'appearance')) || '{}') }; }
  catch { return DEFAULT_APPEARANCE; }
}
export function saveAppearance(contactId: string, s: AppearanceSettings): Promise<boolean> {
  return robustSet(contactKey(contactId, 'appearance'), JSON.stringify(s));
}

// ── 表情包（全局共享） ──
export function getEmojis(): EmojiPack[] {
  try {
    const d = robustGet('soulcard_emojis') || '[]';
    const parsed = JSON.parse(d);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
export async function saveEmojis(e: EmojiPack[]): Promise<boolean> {
  return robustSet('soulcard_emojis', JSON.stringify(e));
}

// ── 朋友圈 ──
export function getMoments(contactId: string): MomentPost[] {
  try {
    const d = dbGet(contactKey(contactId, 'moments'));
    const parsed = d ? JSON.parse(d) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
export function saveMoments(contactId: string, m: MomentPost[]) {
  try { dbSet(contactKey(contactId, 'moments'), JSON.stringify(m)); }
  catch { /* 放弃 */ }
}

// ── 对方日记（按联系人） ──
export function getDiaries(contactId: string): DiaryEntry[] {
  try {
    const d = dbGet(contactKey(contactId, 'diaries')) || '[]';
    const parsed = JSON.parse(d);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
export function saveDiaries(contactId: string, diaries: DiaryEntry[]): boolean {
  try { dbSet(contactKey(contactId, 'diaries'), JSON.stringify(diaries)); return true; }
  catch { return false; }
}

// ── 玩家日记（全局） ──
export function getPlayerDiaries(): DiaryEntry[] {
  try {
    const d = dbGet('soulcard_player_diaries') || '[]';
    const parsed = JSON.parse(d);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
export function savePlayerDiaries(diaries: DiaryEntry[]): boolean {
  try { dbSet('soulcard_player_diaries', JSON.stringify(diaries)); return true; }
  catch { return false; }
}

// ── 语音字卡 ──
export function getVoiceCards(contactId: string): VoiceCard[] {
  try {
    const d = dbGet(contactKey(contactId, 'voice_cards')) || '[]';
    const parsed = JSON.parse(d);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
export function saveVoiceCards(contactId: string, v: VoiceCard[]): boolean {
  try { dbSet(contactKey(contactId, 'voice_cards'), JSON.stringify(v)); return true; }
  catch { return false; }
}

// ── 写信 ──
export function getLetters(contactId: string): Letter[] {
  try {
    const d = dbGet(contactKey(contactId, 'letters')) || '[]';
    const parsed = JSON.parse(d);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
export function saveLetters(contactId: string, l: Letter[]): boolean {
  try { dbSet(contactKey(contactId, 'letters'), JSON.stringify(l)); return true; }
  catch { return false; }
}

// ── 图片字卡 ──
export function getImageCards(contactId: string): ImageCard[] {
  try {
    const d = dbGet(contactKey(contactId, 'image_cards')) || '[]';
    const parsed = JSON.parse(d);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
export function saveImageCards(contactId: string, imgs: ImageCard[]) {
  try { dbSet(contactKey(contactId, 'image_cards'), JSON.stringify(imgs)); }
  catch { /* 放弃 */ }
}

// ── 备份 / 还原 ──
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(n => parseInt(n, 10) || 0);
  const pb = b.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na !== nb) return na > nb ? 1 : -1;
  }
  return 0;
}

export function exportBackup(): string {
  const data: Record<string, unknown> = { __version: APP_VERSION, __exportedAt: Date.now() };
  const keys = dbKeys();
  keys.forEach(k => {
    const v = dbGet(k);
    if (v !== null) {
      try { data[k] = JSON.parse(v); } catch { data[k] = v; }
    }
  });
  return JSON.stringify(data, null, 2);
}

function migrateDockIcons(home: HomeSettings): HomeSettings {
  const oldDefaultIds = ['chat', 'moments', 'letter', 'settings'];
  const ids = home.dockIcons.map(i => i.id);
  const isOldDefault = ids.length === 4 && ids.every(id => oldDefaultIds.includes(id));
  if (isOldDefault) return { ...home, dockIcons: DEFAULT_HOME.dockIcons.map(i => ({ ...i })) };
  return home;
}

function ensureDockIcons(home: HomeSettings): HomeSettings {
  const hasSettings = home.dockIcons.some(i => i.id === 'settings');
  if (hasSettings) return home;
  const settingsIcon = DEFAULT_HOME.dockIcons.find(i => i.id === 'settings');
  if (!settingsIcon) return home;
  const dockIcons = home.dockIcons.slice();
  if (dockIcons.length >= 4) dockIcons[dockIcons.length - 1] = { ...settingsIcon };
  else dockIcons.push({ ...settingsIcon });
  return { ...home, dockIcons };
}

function normalizeHome(home: HomeSettings): HomeSettings {
  return ensureDockIcons(migrateDockIcons(home));
}

export async function importBackup(json: string) {
  const data = JSON.parse(json) as Record<string, unknown>;

  // 完整恢复备份：先清空 IndexedDB 和 localStorage 中的旧数据，再写入备份中的键，确保状态与备份一致
  await dbClearAll();
  try {
    const lsKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('soulcard_')) lsKeys.push(k);
    }
    lsKeys.forEach(k => localStorage.removeItem(k));
  } catch { /* ignore */ }
  const writes: Promise<void>[] = [];
  Object.entries(data).forEach(([k, v]) => {
    if (k.startsWith('__')) return;
    writes.push(dbSet(k, JSON.stringify(v)));
  });
  await Promise.all(writes);

  // 统一规范化联系人字段，确保旧数据与当前版本兼容
  const finalContacts = getContacts();
  if (finalContacts.length > 0) {
    saveContacts(normalizeContacts(finalContacts));
  }

  // 规范化桌面设置，确保设置入口不丢失
  try {
    const home = getHomeSettings();
    const normalized = normalizeHome(home);
    if (normalized !== home) saveHomeSettings(normalized);
  } catch { /* ignore */ }

  // 确保当前联系人 ID 有效
  const restoredId = dbGet(META_KEYS.CURRENT_CONTACT_ID) || '';
  const contacts = getContacts();
  if (!restoredId || !contacts.find(c => c.id === restoredId)) {
    saveCurrentContactId(contacts[0]?.id || 'default');
  }
}

// ── 自动备份目标文件句柄（File System Access API）──
const BACKUP_HANDLE_KEY = 'soulcard_backup_file_handle';

/** 选择自动备份文件（返回是否成功） */
export async function pickBackupFile(): Promise<{ success: boolean; fileName?: string; error?: string }> {
  try {
    const picker = (window as unknown as { showSaveFilePicker?: (opts: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker;
    if (!picker) return { success: false, error: '当前浏览器不支持文件选择，请使用下载方式' };
    const handle = await picker({
      suggestedName: 'soulcard_backup.json',
      types: [{ description: 'JSON 备份文件', accept: { 'application/json': ['.json'] } }],
    });
    await dbSetObject(BACKUP_HANDLE_KEY, handle);
    return { success: true, fileName: handle.name };
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return { success: false, error: '已取消' };
    return { success: false, error: '选择文件失败' };
  }
}

/** 获取已保存的备份文件句柄 */
export async function getBackupFileHandle(): Promise<FileSystemFileHandle | null> {
  try {
    const handle = await dbGetObject(BACKUP_HANDLE_KEY);
    return handle instanceof FileSystemFileHandle ? handle : null;
  } catch {
    return null;
  }
}

export type WriteBackupResult = { ok: true } | { ok: false; reason: 'no_handle' | 'no_permission' };

/** 将备份内容写入已选文件；失败返回原因，不自动弹出权限请求 */
export async function writeBackupToFile(content: string): Promise<WriteBackupResult> {
  try {
    const handle = await getBackupFileHandle();
    if (!handle) return { ok: false, reason: 'no_handle' };
    const permHandle = handle as unknown as FileSystemFileHandle & {
      queryPermission?: (opts: { mode: 'readwrite' }) => Promise<string>;
      requestPermission?: (opts: { mode: 'readwrite' }) => Promise<string>;
    };
    const current = permHandle.queryPermission ? await permHandle.queryPermission({ mode: 'readwrite' }) : 'prompt';
    if (current === 'denied' || current === 'prompt') {
      return { ok: false, reason: 'no_permission' };
    }
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
    return { ok: true };
  } catch {
    return { ok: false, reason: 'no_permission' };
  }
}

/** 请求已选备份文件的写入权限；需要用户手势触发 */
export async function requestBackupPermission(): Promise<boolean> {
  try {
    const handle = await getBackupFileHandle();
    if (!handle) return false;
    const permHandle = handle as unknown as FileSystemFileHandle & {
      requestPermission?: (opts: { mode: 'readwrite' }) => Promise<string>;
    };
    const perm = await permHandle.requestPermission?.({ mode: 'readwrite' });
    return perm === 'granted';
  } catch {
    return false;
  }
}

export function clearAllData() {
  const keys = dbKeys();
  keys.forEach(k => dbRemove(k));
}

// ── 后台定时器时间戳（用于页面关闭/后台后补偿错过的触发） ──
function tsKey(contactId: string, task: string) {
  return `soulcard_${contactId}_last_${task}`;
}
export function getLastRunTime(contactId: string, task: string): number {
  try { return parseInt(dbGet(tsKey(contactId, task)) || '0', 10); } catch { return 0; }
}
export function saveLastRunTime(contactId: string, task: string, time: number): boolean {
  try { dbSet(tsKey(contactId, task), String(time)); return true; }
  catch { return false; }
}

// ── 主页设置（全局） ──
const MINIMAX_KEY = 'soulcard_minimax_settings';

export function getMiniMaxSettings(): MiniMaxSettings {
  try {
    const raw = dbGet(MINIMAX_KEY);
    if (!raw) return DEFAULT_MINIMAX_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<MiniMaxSettings>;
    return { ...DEFAULT_MINIMAX_SETTINGS, ...parsed };
  } catch { return DEFAULT_MINIMAX_SETTINGS; }
}

export function saveMiniMaxSettings(s: MiniMaxSettings): boolean {
  try { dbSet(MINIMAX_KEY, JSON.stringify(s)); return true; }
  catch { return false; }
}

export function getHomeSettings(): HomeSettings {
  try {
    const raw = JSON.parse(robustGet('soulcard_home_settings') || '{}');
    // 清理 undefined 值，防止覆盖 DEFAULT_HOME 的默认值
    const cleaned: Record<string, unknown> = {};
    Object.keys(raw).forEach(k => {
      if (raw[k] !== undefined) cleaned[k] = raw[k];
    });
    const result = { ...DEFAULT_HOME, ...cleaned };
    // 兼容旧数据：若已设置密码且没有显式关闭锁屏，则自动启用锁屏
    if (cleaned.lockScreenEnabled === undefined && result.lockScreenPassword) {
      result.lockScreenEnabled = true;
    }
    // 补齐 dockIcons 字段（防止旧数据缺少 path）
    const defaultPaths = DEFAULT_HOME.dockIcons;
    if (Array.isArray(result.dockIcons)) {
      result.dockIcons = result.dockIcons.map((icon: { id?: string; name?: string; iconImage?: string; path?: string }, idx: number) => ({
        ...defaultPaths[idx],
        ...icon,
      }));
    } else {
      result.dockIcons = [...defaultPaths];
    }
    return result;
  } catch { return DEFAULT_HOME; }
}
export function saveHomeSettings(s: HomeSettings): Promise<boolean> {
  try {
    // 清理不可序列化的值和 undefined，防止 JSON.stringify 失败
    const cleaned = JSON.parse(JSON.stringify(s));
    return robustSet('soulcard_home_settings', JSON.stringify(cleaned));
  } catch { return Promise.resolve(false); }
}

// ── 问卷 ──
export function getQuestionnaires(contactId: string): QuestionnaireItem[] {
  try {
    const d = dbGet(contactKey(contactId, 'questionnaires')) || '[]';
    const parsed = JSON.parse(d);
    if (!Array.isArray(parsed)) return [];
    // 兼容旧数据：旧格式只有 question/answer/timestamp，无 title/questions
    return parsed.map((item: unknown) => {
      const old = item as Record<string, unknown>;
      if (old.question && !old.title) {
        // 旧格式迁移
        const migrated: QuestionnaireItem = {
          id: String(old.id || generateId()),
          title: '问卷',
          questions: [{ id: generateId(), text: String(old.question), options: ['是', '否'] }],
          answers: old.answer ? [{ questionId: 'legacy', optionIndex: String(old.answer) === '是' ? 0 : 1 }] : undefined,
          sentAt: Number(old.timestamp || Date.now()),
          answeredAt: old.answer ? Number(old.timestamp || Date.now()) : undefined,
        };
        return migrated;
      }
      return old as unknown as QuestionnaireItem;
    });
  } catch { return []; }
}
export function saveQuestionnaires(contactId: string, q: QuestionnaireItem[]): boolean {
  try { dbSet(contactKey(contactId, 'questionnaires'), JSON.stringify(q)); return true; }
  catch { return false; }
}

// 陪伴记录
const COMPANION_SESSIONS_KEY = 'companion_sessions';
const ACTIVE_COMPANION_SESSION_KEY = 'companion_active_session';

export function getCompanionSessions(): CompanionSession[] {
  try {
    const raw = robustGet(COMPANION_SESSIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}

export function saveCompanionSessions(sessions: CompanionSession[]): Promise<boolean> {
  return robustSet(COMPANION_SESSIONS_KEY, JSON.stringify(sessions));
}

export async function addCompanionSession(session: CompanionSession): Promise<boolean> {
  const sessions = getCompanionSessions();
  return saveCompanionSessions([session, ...sessions]);
}

export function getActiveCompanionSession(): CompanionSession | null {
  try {
    const raw = robustGet(ACTIVE_COMPANION_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function saveActiveCompanionSession(session: CompanionSession | null): Promise<boolean> {
  if (!session) return Promise.resolve(false);
  return robustSet(ACTIVE_COMPANION_SESSION_KEY, JSON.stringify(session));
}

export function clearActiveCompanionSession() {
  robustRemove(ACTIVE_COMPANION_SESSION_KEY);
}

// 默认朋友圈
function getDefaultMoments(): MomentPost[] {
  return [
    { id: '1', content: '今天的天空很好看，想到了你 🌸', images: [], timestamp: Date.now() - 3 * 3600000, comments: [] },
    { id: '2', content: '如果什么都是淡淡的就好了，不开心是淡淡的，痛苦是淡淡的，哪怕幸福也好一直淡淡的。', images: [], timestamp: Date.now() - 86400000, comments: [] },
  ];
}