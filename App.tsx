import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import IntersectObserver from '@/components/common/IntersectObserver';
import { Toaster } from '@/components/ui/sonner';
import { AppProvider } from '@/contexts/AppContext';
import CallOverlay from '@/components/CallOverlay';
import MusicFloat from '@/components/MusicFloat';
import MessageNotifications from '@/components/MessageNotifications';
import ErrorBoundary from '@/components/ErrorBoundary';
import LockScreen, { useLockScreen } from '@/components/LockScreen';
import KeepAliveDialog from '@/components/KeepAliveDialog';
import AnnouncementDialog from '@/components/AnnouncementDialog';
import { useApp } from '@/contexts/AppContext';

import { routes } from './routes';
import { useBackgroundKeepAlive } from '@/hooks/useBackgroundKeepAlive';
import GlobalStyleInjector from '@/components/GlobalStyleInjector';

function AppInner() {
  const { homeSettings, contact, appearance } = useApp();
  const { locked, unlock } = useLockScreen(homeSettings.lockScreenEnabled, homeSettings.lockScreenPassword || '');
  const navigate = useNavigate();
  const wasLockedRef = useRef(locked);

  // 全局后台保活：跟随联系人设置开关
  useBackgroundKeepAlive(contact.enableBackgroundKeepAlive === true);

  useEffect(() => {
    if (wasLockedRef.current && !locked) {
      // 解锁后始终回到主屏幕
      navigate('/', { replace: true });
    }
    wasLockedRef.current = locked;
  }, [locked, navigate]);

  // 全局夜间模式：为 <html> 切换 dark 类，使 Tailwind dark: 变体生效
  // 夜间模式仅由聊天页面自己控制，不再切换 html 的 dark 类，避免影响主屏幕。

  return (
    <>
      <GlobalStyleInjector />
      <IntersectObserver />
      <Routes>
        {routes.map((route, index) => (
          <Route key={index} path={route.path} element={route.element} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <CallOverlay />
      <MusicFloat />
      <MessageNotifications />
      <KeepAliveDialog />
      <AnnouncementDialog />
      <Toaster />
      {locked && <LockScreen onUnlock={unlock} />}
    </>
  );
}

const App: React.FC = () => {
  return (
    <Router>
      <ErrorBoundary>
        <AppProvider>
          <AppInner />
        </AppProvider>
      </ErrorBoundary>
    </Router>
  );
};

export default App;
