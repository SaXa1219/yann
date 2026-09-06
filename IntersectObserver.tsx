import { useEffect } from 'react';
import { Observer } from 'tailwindcss-intersect';

// 用纯 DOM 事件监听路由变化，避免在 React 渲染阶段调用 useContext/useLocation
// 防止 ReactCurrentDispatcher.current 为 null 时 hooks 崩溃
const IntersectObserver = () => {
  useEffect(() => {
    Observer.start();

    const restart = () => {
      setTimeout(() => Observer.restart(), 100);
    };

    // 监听浏览器前进/后退导航
    window.addEventListener('popstate', restart);

    // 拦截 history.pushState / replaceState（SPA 路由跳转）
    const origPush = history.pushState.bind(history);
    const origReplace = history.replaceState.bind(history);
    history.pushState = (...args) => { origPush(...args); restart(); };
    history.replaceState = (...args) => { origReplace(...args); restart(); };

    return () => {
      window.removeEventListener('popstate', restart);
      history.pushState = origPush;
      history.replaceState = origReplace;
    };
  }, []);

  return null;
};

export default IntersectObserver;
