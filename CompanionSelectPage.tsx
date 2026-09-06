import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Pencil, ImagePlus } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { COMPANION_SCENES, type CompanionScene, DEFAULT_COMPANION_CONFIG, COMPANION_BACKGROUNDS } from '@/types/types';
import { generateId } from '@/utils/id';
import { saveActiveCompanionSession } from '@/services/storage';
import { toast } from 'sonner';

export default function CompanionSelectPage() {
  const navigate = useNavigate();
  const { contacts } = useApp();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedScene, setSelectedScene] = useState<CompanionScene | null>(null);
  const [activity, setActivity] = useState('');
  const [background, setBackground] = useState<string>(COMPANION_BACKGROUNDS[0].value);

  const onPickImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setBackground(`url(${reader.result as string})`);
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const start = () => {
    if (!selectedContactId || (!selectedScene && !activity.trim())) {
      toast.error('请选择陪伴对象，并选择场景或填写陪伴内容');
      return;
    }
    const session = {
      id: generateId(),
      contactId: selectedContactId,
      scene: selectedScene || '休息',
      activity: activity.trim() || undefined,
      background,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      config: DEFAULT_COMPANION_CONFIG,
      heartbeat: [],
      temperature: [],
      direction: [],
      distance: [],
      log: [{ time: Date.now(), text: `开始陪伴：${activity.trim() || selectedScene}` }],
    };
    saveActiveCompanionSession(session);
    navigate('/companion/session');
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#2d1b36] via-[#4a2c55] to-[#2d1b36] text-white flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">陪伴模式</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        <div className="flex flex-col items-center pt-6 pb-8">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-pink-200" />
          </div>
          <p className="text-sm text-white/70">选择陪伴对象与场景，开始一起专注</p>
        </div>

        <section className="mb-6">
          <h2 className="text-sm font-medium text-white/80 mb-3">选择陪伴对象</h2>
          <div className="grid grid-cols-2 gap-3">
            {contacts.map(c => (
              <Card
                key={c.id}
                onClick={() => setSelectedContactId(c.id)}
                className={`cursor-pointer border-0 transition-all ${selectedContactId === c.id ? 'bg-white/20 ring-2 ring-pink-200' : 'bg-white/10 hover:bg-white/15'}`}
              >
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-white/20 overflow-hidden">
                    {c.theirAvatar ? (
                      <img src={c.theirAvatar} className="w-full h-full object-cover" alt={c.nickname} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/70 text-xs">{c.nickname?.slice(0, 1) || 'TA'}</div>
                    )}
                  </div>
                  <span className="text-sm text-center text-white">{c.nickname || '未命名'}</span>
                </CardContent>
              </Card>
            ))}
            {contacts.length === 0 && (
              <div className="col-span-2 text-center text-white/50 text-sm py-6">暂无联系人，请先添加联系人</div>
            )}
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-sm font-medium text-white/80 mb-3">选择陪伴场景</h2>
          <div className="grid grid-cols-2 gap-3">
            {COMPANION_SCENES.map(scene => (
              <button
                key={scene}
                onClick={() => setSelectedScene(scene)}
                className={`rounded-2xl py-4 text-center text-sm font-medium transition-all ${selectedScene === scene ? 'bg-white/20 ring-2 ring-pink-200 text-white' : 'bg-white/10 text-white/80 hover:bg-white/15'}`}
              >
                {scene}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-sm font-medium text-white/80 mb-3 flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            自定义陪伴做什么
          </h2>
          <input
            value={activity}
            onChange={e => setActivity(e.target.value)}
            placeholder="例如：一起看电影、一起背单词、一起发呆…"
            className="w-full rounded-2xl bg-white/10 border border-white/10 text-white placeholder:text-white/40 px-4 py-3 text-sm outline-none focus:bg-white/15"
          />
        </section>

        <section className="mb-6">
          <h2 className="text-sm font-medium text-white/80 mb-3">选择陪伴背景</h2>
          <div className="grid grid-cols-3 gap-3">
            {COMPANION_BACKGROUNDS.map(bg => (
              <button
                key={bg.id}
                onClick={() => setBackground(bg.value)}
                className={`h-16 rounded-2xl border-2 transition-all ${background === bg.value ? 'border-pink-200 ring-2 ring-pink-200' : 'border-white/10 hover:border-white/30'}`}
                style={{ backgroundImage: bg.value }}
              >
                <span className="sr-only">{bg.name}</span>
              </button>
            ))}
            <button
              onClick={onPickImage}
              className={`h-16 rounded-2xl border-2 border-dashed flex items-center justify-center text-white/60 transition-all ${background.startsWith('url(') ? 'border-pink-200 ring-2 ring-pink-200' : 'border-white/20 hover:border-white/40'}`}
            >
              <ImagePlus className="w-5 h-5" />
            </button>
          </div>
        </section>

        <Button
          onClick={start}
          disabled={!selectedContactId || (!selectedScene && !activity.trim())}
          className="w-full rounded-full py-6 text-base font-semibold bg-white/20 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed text-white"
        >
          开始陪伴
        </Button>
      </div>
    </div>
  );
}