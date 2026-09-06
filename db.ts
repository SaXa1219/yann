/**
 * IndexedDB key-value 封装（内存缓存 + 异步落盘）
 * 替代 localStorage，突破 5MB 配额限制
 */

const DB_NAME = 'SoulCardDB';
const DB_VERSION = 1;
const STORE_NAME = 'kv';

let dbInstance: IDBDatabase | null = null;
const memoryCache: Record<string, string | undefined> = {};
let cacheReady = false;
const pendingWrites = new Set<Promise<void>>();

function trackWrite(promise: Promise<void>) {
  pendingWrites.add(promise);
  promise.then(() => pendingWrites.delete(promise)).catch(() => pendingWrites.delete(promise));
}

function hasPendingWrites(): boolean {
  return pendingWrites.size > 0;
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (event) => {
    if (hasPendingWrites()) {
      event.preventDefault();
      // eslint-disable-next-line no-param-reassign
      event.returnValue = '';
    }
  });
}

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      dbInstance = req.result;
      resolve(req.result);
    };
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function loadAllIntoCache() {
  const db = await openDB();
  const keys = await new Promise<string[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAllKeys();
    req.onsuccess = () => resolve((req.result as string[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  const values = await new Promise<unknown[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as unknown[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  keys.forEach((k, i) => {
    const v = values[i];
    if (typeof v === 'string') memoryCache[k] = v;
  });
}

async function asyncSet(key: string, value: string) {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[db] asyncSet failed for', key, e);
  }
}

async function asyncRemove(key: string) {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[db] asyncRemove failed for', key, e);
  }
}

export async function initDB(): Promise<void> {
  if (cacheReady) return;
  await loadAllIntoCache();
  cacheReady = true;
}

function ensureReady() {
  if (!cacheReady) {
    // 首次调用时同步初始化（在 AppContext useEffect 中 await initDB 已完成）
    // 若仍被同步调用，说明 init 还没跑完；fallback 到 localStorage
  }
}

/** 同步读（必须先 await initDB()） */
export function dbGet(key: string): string | null {
  ensureReady();
  return memoryCache[key] ?? null;
}

/** 同步写缓存 + 异步落盘，返回落盘 Promise */
export function dbSet(key: string, value: string): Promise<void> {
  ensureReady();
  memoryCache[key] = value;
  const p = asyncSet(key, value);
  trackWrite(p);
  return p;
}

/** 同步删缓存 + 异步落盘 */
export function dbRemove(key: string): Promise<void> {
  ensureReady();
  delete memoryCache[key];
  const p = asyncRemove(key);
  trackWrite(p);
  return p;
}

/** 存储任意可结构化克隆对象（用于 FileSystemFileHandle 等） */
export async function dbSetObject(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** 读取任意对象 */
export async function dbGetObject(key: string): Promise<unknown | null> {
  try {
    const db = await openDB();
    return await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[db] dbGetObject failed for', key, e);
    return null;
  }
}

/** 获取所有 soulcard_ 开头的键 */
export function dbKeys(): string[] {
  ensureReady();
  return Object.keys(memoryCache).filter(k => k.startsWith('soulcard_'));
}

/** 清空 IndexedDB + 缓存 */
export async function dbClearAll(): Promise<void> {
  Object.keys(memoryCache).forEach(k => delete memoryCache[k]);
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[db] clearAll failed', e);
  }
}

/** 计算所有 soulcard_ 键占用的字节数（从缓存） */
export function dbUsedBytes(): number {
  ensureReady();
  let total = 0;
  for (const key of Object.keys(memoryCache)) {
    if (key.startsWith('soulcard_')) {
      const v = memoryCache[key];
      if (v) total += new Blob([v]).size;
    }
  }
  return total;
}

/** 从 localStorage 迁移到 IndexedDB（启动时执行一次） */
export async function migrateFromLocalStorage(): Promise<void> {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('soulcard_')) keys.push(k);
  }
  if (keys.length === 0) return;
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v !== null) {
      memoryCache[k] = v;
      try { await asyncSet(k, v); localStorage.removeItem(k); } catch { /* 单条失败不阻塞 */ }
    }
  }
}
