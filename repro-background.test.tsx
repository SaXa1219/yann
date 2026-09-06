import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '@/contexts/AppContext';
import HomePage from '@/pages/HomePage';

// 预设 localStorage：让 AppProvider 读取到带背景图的设置
function seedStorage() {
  const home = {
    backgroundImage: 'data:image/png;base64,AAAA',
    darkMode: false,
    displayName: '测试',
  };
  const appearance = {
    backgroundType: 'image',
    backgroundImage: 'data:image/png;base64,BBBB',
    backgroundColor: '#FFFFFF',
    backgroundOpacity: 0.5,
    darkMode: false,
  };
  const contact = {
    id: 'default',
    nickname: '对方',
    isGroup: false,
    groupMemberIds: [],
    companionTheme: { accentColor: '#F2A2A2', backgroundColor: '#FAFAFA', backgroundOpacity: 1, wallpaper: '', textColor: '#333', micColor: '#F2A2A2', micActiveColor: '#F2A2A2' },
    musicEnabled: false,
    musicPlaylist: [],
  };
  localStorage.setItem('soulcard_home_settings', JSON.stringify(home));
  localStorage.setItem('soulcard_default_appearance', JSON.stringify(appearance));
  localStorage.setItem('soulcard_contacts', JSON.stringify([contact]));
  localStorage.setItem('soulcard_current_contact_id', 'default');
}

describe('背景渲染复现', () => {
  beforeEach(() => {
    localStorage.clear();
    seedStorage();
  });

  it('主屏幕渲染 HomeSettings 背景图', async () => {
    render(
      <MemoryRouter>
        <AppProvider>
          <HomePage />
        </AppProvider>
      </MemoryRouter>
    );
    await waitFor(() => {
      const imgs = document.querySelectorAll('img');
      const srcs = Array.from(imgs).map(i => i.getAttribute('src'));
      console.log('IMG SRCS:', JSON.stringify(srcs));
      const bgImgs = Array.from(imgs).filter(i => i.getAttribute('src') === 'data:image/png;base64,AAAA');
      expect(bgImgs.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });
});