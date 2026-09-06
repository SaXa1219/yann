const CACHE_NAME = 'yannyu-cache-v437';
const urlsToCache = ['/', '/index.html', '/favicon.png', '/offline.html', '/q-timer-worker.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  // 新版本安装后立即接管，确保修复第一时间到达用户（旧缓存长期霸占会导致看不到新版修复）
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Vite 开发时动态模块不缓存
  if (url.searchParams.has('v') || url.pathname.includes('/node_modules/.pnpm/')) {
    return;
  }

  // 导航请求 / HTML 始终走网络，避免旧版本 HTML 被缓存
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/offline.html') || fetch(request))
        )
    );
    return;
  }

  // JS/CSS/静态资源采用 network-first：优先拿最新版本，网络不通时才回退缓存
  // 这样可以避免旧版本资源卧底导致白屏或 React 多实例报错
  event.respondWith(
    fetch(request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(request).then((res) => res || fetch(request)))
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'proactive-sync') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({ type: 'RUN_CATCHUP' });
        });
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        const client = clientList[0];
        if ('focus' in client) client.focus();
        if ('navigate' in client) client.navigate('/');
      } else {
        self.clients.openWindow('/');
      }
    })
  );
});
