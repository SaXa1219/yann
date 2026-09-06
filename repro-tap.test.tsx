import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '@/contexts/AppContext';
import ChatPage from '@/pages/ChatPage';

function seedStorage() {
  const appearance = {
    backgroundType: 'color', backgroundImage: '', backgroundColor: '#FFFFFF', backgroundOpacity: 0.5, darkMode: false,
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

describe('拍一拍消息可见性', () => {
  beforeEach(() => {
    localStorage.clear();
    if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
    seedStorage();
  });

  it('双击标题拍一拍后，聊天列表出现可见的拍一拍文字', async () => {
    const { container } = render(<MemoryRouter><AppProvider><ChatPage /></AppProvider></MemoryRouter>);
    // 等待页头渲染（双击标题 = 拍一拍）
    await waitFor(() => {
      expect(container.querySelector('.absolute.left-1\\/2')).toBeTruthy();
    }, { timeout: 3000 });
    const title = container.querySelector('.absolute.left-1\\/2') as HTMLElement;
    fireEvent.doubleClick(title);
    await waitFor(() => {
      const spans = Array.from(document.querySelectorAll('span'));
      const tapEl = spans.find(s => s.textContent && /你.*拍.*对方/.test(s.textContent));
      expect(tapEl, '聊天列表中应出现拍一拍文字').toBeTruthy();
      const cls = tapEl!.className;
      console.log('TAP EL className:', cls);
      // 可见性判据：文字颜色必须是 gray-500 或更深（gray-300 几乎不可见）
      expect(cls.includes('text-gray-300'), '文字颜色不能是几乎不可见的 gray-300').toBe(false);
      expect(cls.includes('text-gray-500') || cls.includes('text-gray-600'), '文字应为可见的中灰色').toBe(true);
    }, { timeout: 3000 });
  });

  it('边界：深色模式下拍一拍文字为浅色可见', async () => {
    localStorage.clear();
    const appearance = {
      backgroundType: 'color', backgroundImage: '', backgroundColor: '#111111', backgroundOpacity: 0.5, darkMode: true,
    };
    const contact = {
      id: 'default', nickname: '对方', isGroup: false, groupMemberIds: [],
      companionTheme: { accentColor: '#F2A2A2', backgroundColor: '#FAFAFA', backgroundOpacity: 1, wallpaper: '', textColor: '#333', micColor: '#F2A2A2', micActiveColor: '#F2A2A2' },
      musicEnabled: false, musicPlaylist: [],
    };
    localStorage.setItem('soulcard_default_appearance', JSON.stringify(appearance));
    localStorage.setItem('soulcard_contacts', JSON.stringify([contact]));
    localStorage.setItem('soulcard_current_contact_id', 'default');
    const { container } = render(<MemoryRouter><AppProvider><ChatPage /></AppProvider></MemoryRouter>);
    await waitFor(() => {
      expect(container.querySelector('.absolute.left-1\\/2')).toBeTruthy();
    }, { timeout: 3000 });
    fireEvent.doubleClick(container.querySelector('.absolute.left-1\\/2') as HTMLElement);
    await waitFor(() => {
      const spans = Array.from(document.querySelectorAll('span'));
      const tapEl = spans.find(s => s.textContent && /你.*拍.*对方/.test(s.textContent));
      expect(tapEl, '聊天列表中应出现拍一拍文字').toBeTruthy();
      expect(tapEl!.className.includes('text-gray-100'), '深色模式文字应为浅色').toBe(true);
    }, { timeout: 3000 });
  });
});
