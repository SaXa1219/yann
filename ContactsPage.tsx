import React, { useState } from 'react';
import { generateId } from '@/utils/id';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, User, ChevronRight, Trash2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { DEFAULT_CONTACT } from '@/types/types';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ContactsPage() {
  const navigate = useNavigate();
  const { contacts, currentContactId, switchContact, addContact, deleteContact } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [newNickname, setNewNickname] = useState('');

  const handleAdd = () => {
    const name = newNickname.trim();
    if (!name) { toast.error('请输入联系人昵称'); return; }
    const id = generateId();
    addContact({
      id,
      myAvatar: '',
      theirAvatar: '',
      nickname: name,
      myName: '我',
      tapMessage: '轻轻拍了拍你',
      tapMessageMe: '轻轻拍了拍',
      tapMessageThem: '轻轻拍了拍',
      tapMessages: DEFAULT_CONTACT.tapMessages,
      companionTheme: DEFAULT_CONTACT.companionTheme,
      replyDelaySec: 2,
      noReplyChance: 1,
      autoTapChance: 5,
      autoVoiceChance: 5,
      autoCallChance: 5,
      hangupChance: 6,
      momentsPostTimes: [],
      momentsReplyDelay: 30000,
      momentsBio: '在星光下，我们的灵魂共舞',
      momentsBg: '',
      myBio: '',
      letterReplyDelaySec: 5,
      letterProactiveChance: 20,
      letterProactiveIntervalDays: 1,
      proactiveMsgIntervalMinutes: 0,
      sysMinSentences: 1,
      sysMaxSentences: 1,
      combineCardChance: 0,
      combineCardMax: 3,
      transferChance: 10,
      transferAmounts: '520,1314,66.6,188,888',
      momentsImageChance: 20,
      momentsCombineChance: 10,
      momentsCombineMax: 3,
      momentsNpcLikeChance: 100,
      momentsNpcCommentChance: 0,
      momentsCommentNoReplyChance: 0,
      pushEnabled: false,
      autoBackupIntervalHours: 0,
      autoBackupFileName: 'soulcard_backup',
      replyQuoteChance: 20,
      autoEmojiChance: 35,
      enableBackgroundKeepAlive: false,
      musicPlaylist: [...DEFAULT_CONTACT.musicPlaylist],
      musicEnabled: true,
      pickerTagline: DEFAULT_CONTACT.pickerTagline,
      pinned: false,
      isGroup: false,
      groupMemberIds: [],
      anniversary: '', daysMatterEvents: [],
      chatBoxes: [{ id: 'main', name: '主聊天框', createdAt: Date.now() }], currentChatBoxId: 'main',
    });
    setNewNickname('');
    setShowAdd(false);
    toast.success(`已添加联系人：${name}`);
  };

  const handleDelete = (id: string) => {
    if (contacts.length <= 1) { toast.error('至少保留一个联系人'); return; }
    deleteContact(id);
    toast.success('已删除');
  };

  return (
    <div className="min-h-dvh bg-[#FAFAFA]">
      <header className="sticky top-0 z-10 px-4 h-12 flex items-center justify-between bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 -ml-1" onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}>
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Button>
          <h1 className="text-[15px] font-bold text-gray-900">联系人</h1>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShowAdd(true)}>
          <Plus className="w-5 h-5 text-[var(--accent-color)]" />
        </Button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-3">
        {contacts.map(c => (
          <div
            key={c.id}
            className={`rounded-2xl p-4 flex items-center gap-3 bg-white shadow-sm border transition-all ${c.id === currentContactId ? 'border-[var(--accent-color)]' : 'border-gray-100'}`}
          >
            <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
              {c.theirAvatar
                ? <img src={c.theirAvatar} className="w-full h-full object-cover" alt={c.nickname} />
                : <User className="w-5 h-5 text-gray-300" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{c.nickname}</p>
              {c.id === currentContactId && (
                <p className="text-[11px] text-[var(--accent-color)]">当前联系人</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {c.id !== currentContactId && (
                <Button variant="ghost" size="sm" className="h-8 text-xs text-[var(--accent-color)] rounded-lg"
                  onClick={() => { switchContact(c.id); navigate('/chat'); toast.success(`已切换到 ${c.nickname}`); }}>
                  切换
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400"
                onClick={() => handleDelete(c.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* 添加弹窗 */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-md bg-white rounded-t-3xl px-6 pt-5 pb-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-bold text-gray-900">添加联系人</h3>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <label className="text-xs text-gray-400 block">对方昵称</label>
              <input
                type="text" value={newNickname}
                onChange={e => setNewNickname(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                placeholder="输入昵称…"
                className="w-full h-10 px-3 rounded-xl bg-gray-50 text-sm text-gray-800 outline-none border border-gray-100 focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/20 transition-colors"
              />
              <Button onClick={handleAdd} className="w-full rounded-xl bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white h-10">
                <Plus className="w-4 h-4 mr-1" />添加
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
