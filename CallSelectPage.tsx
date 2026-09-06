import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

export default function CallSelectPage() {
  const navigate = useNavigate();
  const { contacts, switchContact } = useApp();

  const handleSelect = (id: string) => {
    switchContact(id);
    window.dispatchEvent(new Event('startCall'));
    navigate('/');
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#2d1b36] via-[#4a2c55] to-[#2d1b36] text-white flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">选择通话对象</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        <p className="text-sm text-white/70 mb-4">选择要拨打的联系人</p>
        <div className="grid grid-cols-2 gap-3">
          {contacts.map(c => (
            <button
              key={c.id}
              onClick={() => handleSelect(c.id)}
              className="rounded-2xl bg-white/10 p-4 flex flex-col items-center gap-2 hover:bg-white/15 transition-all"
            >
              <div className="w-14 h-14 rounded-full bg-white/20 overflow-hidden">
                {c.theirAvatar ? (
                  <img src={c.theirAvatar} className="w-full h-full object-cover" alt={c.nickname} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/70 text-xs">{c.nickname?.slice(0, 1) || 'TA'}</div>
                )}
              </div>
              <span className="text-sm">{c.nickname || '未命名'}</span>
              <Phone className="w-4 h-4 text-white/60" />
            </button>
          ))}
          {contacts.length === 0 && (
            <div className="col-span-2 text-center text-white/50 text-sm py-6">暂无联系人，请先添加联系人</div>
          )}
        </div>
      </div>
    </div>
  );
}