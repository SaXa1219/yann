import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '@/contexts/AppContext';
import ChatPage from '@/pages/ChatPage';

function seedStorage() {
  const appearance = {
    backgroundType: 'image',
    backgroundImage: 'data:image/png;base64,CHATBG',
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
  localStorage.setItem('soulcard_default_appearance', JSON.stringify(appearance));
  localStorage.setItem('soulcard_contacts', JSON.stringify([contact]));
  localStorage.setItem('soulcard_current_contact_id', 'default');
}

describe('聊天页背景渲染复现', () => {
  beforeEach(() => {
    localStorage.clear();
    seedStorage();
    // jsdom 不支持 scrollIntoView
    if (!Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = () => {};
    }
  });

  it('聊天页渲染背景图层', async () => {
    render(
      <MemoryRouter>
        <AppProvider>
          <ChatPage />
        </AppProvider>
      </MemoryRouter>
    );
    await waitFor(() => {
      const els = document.querySelectorAll('[style*="CHATBG"]');
      expect(els.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });
});