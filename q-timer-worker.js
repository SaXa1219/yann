// 问卷自动回答提醒 Worker：在页面后台/切出时仍保持心跳，
// 让主线程每 3 秒检查一次未完成的问卷定时器。
const INTERVAL = 3000;
let timer = null;

self.addEventListener('message', (event) => {
  if (event.data === 'start') {
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      self.postMessage('tick');
    }, INTERVAL);
  } else if (event.data === 'stop') {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }
});
