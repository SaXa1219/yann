import React, { useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';

/**
 * 将当前联系人的自定义 CSS / 主题变量注入为全局 <style>，
 * 使美化设置能影响整体布局（而不是只在聊天页生效）。
 * 切换联系人时自动替换样式，避免旧主题残留。
 */
const GlobalStyleInjector: React.FC = () => {
  const { appearance, contact } = useApp();

  useEffect(() => {
    const styleId = 'yann-global-theme';
    let style = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }

    const accent = appearance?.buttonColor || contact?.companionTheme?.accentColor || '#F2A2A2';
    const button = appearance?.buttonColor || accent;
    const bg = appearance?.backgroundColor || '#FFFFFF';
    const isDark = !!appearance?.darkMode;

    style.textContent = `
      :root {
        --accent-color: ${accent};
        --accent-light: ${accent}20;
        --accent-hover: color-mix(in srgb, ${accent} 85%, black);
        --button-color: ${button};
        --chat-bg: ${bg};
      }
      ${appearance?.customCss || ''}
    `;

    // 同步浏览器主题色
    const themeMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (themeMeta) themeMeta.content = accent;

    // 同步 Tailwind dark 模式
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    return () => {
      // 组件卸载时保留，切换时会由下一次 effect 覆盖；
      // 这里不需要删除，避免页面闪白。
    };
  }, [appearance, contact]);

  return null;
};

export default GlobalStyleInjector;
