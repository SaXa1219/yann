import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '@/contexts/AppContext';
import ChatPage from '@/pages/ChatPage';

function seedStorage(opacity: number) {
  const appearance = {
    backgroundType: 'color',
    backgroundImage: '',
    backgroundColor: '#FF0000',
    backgroundOpacity: opacity,
    darkMode: false,
  };
  const contact = {
    id: 'default', nickname: '对方', isGroup: false, groupMemberIds: [],
    companionTheme: { accentColor: '#F2A2A2', backgroundColor: '#FAFAFA', backgroundOpacity: 1, wallpaper: '', textColor: '#333', micColor: '#F2A2A2', micActiveColor: '#F2A2A2' },
    musicEnabled: false, musicPlaylist: [],
  };
  localStorage.setItem('soulcard_default_appearance', JSON.stringify(appearance));
  localStorage.setItem('soulcard_contacts', JSON.stringify([contact]));
  localStorage.setItem('soulcard_current_contact_id', 'default');
}

describe('聊天页纯色背景透明度', () => {
  beforeEach(() => {
    localStorage.clear();
    if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
  });

  it('opacity=0.3 时背景层 rgba alpha 为 0.3', async () => {
    seedStorage(0.3);
    render(<MemoryRouter><AppProvider><ChatPage /></AppProvider></MemoryRouter>);
    await waitFor(() => {
      const match = document.body.innerHTML.includes('rgba(255, 0, 0, 0.3)');
      expect(match).toBe(true);
    }, { timeout: 3000 });
  });
});