import { describe, it, expect, beforeEach } from 'vitest';
import { saveAppearance, getAppearance } from '@/services/storage';
import type { AppearanceSettings } from '@/types/types';

describe('外观持久化往返', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('保存背景图后能读回', async () => {
    const s: AppearanceSettings = {
      backgroundType: 'image',
      backgroundImage: 'data:image/png;base64,XYZ',
      backgroundColor: '#FFFFFF',
      backgroundOpacity: 0.3,
      darkMode: false,
    } as AppearanceSettings;
    await saveAppearance('default', s);
    const back = getAppearance('default');
    expect(back.backgroundType).toBe('image');
    expect(back.backgroundImage).toBe('data:image/png;base64,XYZ');
    expect(back.backgroundOpacity).toBe(0.3);
  });
});