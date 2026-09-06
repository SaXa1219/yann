import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import { APP_VERSION } from "./constants/version";
import { unlockAudioPlayback } from "./services/audio.ts";
import { initDB } from "./services/db.ts";
import { applyAppIcon, getStoredAppIcon } from "./lib/appIcon.ts";

unlockAudioPlayback();

// 尽早初始化 IndexedDB 并恢复用户自定义图标（favicon / manifest）
if (typeof window !== 'undefined') {
  initDB().then(() => {
    const icon = getStoredAppIcon();
    if (icon) applyAppIcon(icon);
  }).catch(() => {});
}

// 清理旧版本缓存：确保即使在隐私模式/不支持 SW 的情况下也不报错
function clearOldCaches() {
  try {
    if ('caches' in window) {
      caches.keys().then(names => Promise.all(names.map(n => caches.delete(n)))).catch(() => {});
    }
  } catch { /* ignore */ }
}


// 仅在生产环境注册 Service Worker，避免 Vite 预览/dev 时旧 SW 缓存与新模块冲突导致白屏
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // 记录加载时是否已有旧 SW 控制：有 → 之后的 controllerchange 意味着新版本接管，需要刷新一次拿新代码；
  // 无 → 首次安装，无需刷新
  const hadController = !!navigator.serviceWorker.controller;
  // 注册同一 sw.js URL，浏览器会在内容变化时自动更新，无需依赖查询参数
  navigator.serviceWorker.register('/sw.js')
    .then((registration) => {
      // 注册后台同步，用于在页面从后台/离线恢复时补发遗漏的消息与来信
      if ('sync' in registration) {
        (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('proactive-sync').catch(() => {});
      }
    })
    .catch(() => {
      // SW 注册失败不影响应用正常使用
    });
  // 新版本 Service Worker 接管后：若页面此前被旧版控制，刷新一次以加载新代码（每个版本只发生一次），
  // 避免旧缓存长期霸占导致用户看不到修复
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    clearOldCaches();
    if (hadController) window.location.reload();
  });
  // 接收 SW 后台同步通知：触发前端补偿逻辑
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'RUN_CATCHUP') {
      (window as unknown as { __yannyu_run_catchup__?: () => void }).__yannyu_run_catchup__?.();
    }
  });
}

// 版本一致性校验：若本地记录的旧版本号与当前版本不一致，
// 静默清理旧缓存与旧 Service Worker（不刷新页面，避免会话中途打断 / 丢输入）。
try {
  const storedVersion = localStorage.getItem('yannyu_app_version');
  if (storedVersion && storedVersion !== APP_VERSION) {
    localStorage.setItem('yannyu_app_version', APP_VERSION);
    clearOldCaches();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        Promise.all(regs.map(r => r.unregister())).catch(() => {});
      }).catch(() => {});
    }
  } else {
    localStorage.setItem('yannyu_app_version', APP_VERSION);
  }
} catch {
  // 隐私模式下 localStorage 可能不可用，忽略错误
}

createRoot(document.getElementById("root")!).render(
  <AppWrapper>
    <App />
  </AppWrapper>
);
(window as any).__yannyu_render_ok__ = true;
