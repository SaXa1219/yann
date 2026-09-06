import React, { useState, useRef, useEffect, useMemo } from 'react';
import { generateId } from '@/utils/id';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, User, Trash2, Search, Star, Users, Pencil, MoreHorizontal, MessageSquare, AlertCircle, Pin } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { DEFAULT_CONTACT } from '@/types/types';
import type { ChatMessage } from '@/types/types';
import { toast } from 'sonner';
import { compressImage } from '@/utils/imageUtils';
import { getMessages } from '@/services/storage';

export default function ContactPickerPage() {
  const navigate = useNavigate();
  const { contacts, contact, currentContactId, switchContact, addContact, deleteContact, updateContact, clearMessages } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [showGroup, setShowGroup] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [confirm, setConfirm] = useState<{ open: boolean; title: string; desc: string; onConfirm: () => void } | null>(null);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [lastMessages, setLastMessages] = useState<Record<string, ChatMessage | null>>({});
  const [searchResults, setSearchResults] = useState<{ contact: typeof contacts[0]; msg: ChatMessage }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);

  const allMessages = useMemo(() => {
    const map: Record<string, ChatMessage[]> = {};
    contacts.forEach(c => {
      map[c.id] = (c.chatBoxes || []).flatMap(b => getMessages(c.id, b.id));
    });
    return map;
  }, [contacts]);

  useEffect(() => {
    const map: Record<string, ChatMessage | null> = {};
    contacts.forEach(c => {
      const msgs = allMessages[c.id] || [];
      const sorted = msgs.filter(m => m.sender === 'user' || m.sender === 'system').sort((a, b) => b.timestamp - a.timestamp);
      map[c.id] = sorted[0] || null;
    });
    setLastMessages(map);
  }, [contacts, allMessages]);

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) { setSearchResults([]); return; }
    const results: { contact: typeof contacts[0]; msg: ChatMessage }[] = [];
    contacts.forEach(c => {
      (allMessages[c.id] || []).forEach(msg => {
        if (msg.type === 'text' && (msg.content || '').toLowerCase().includes(q)) {
          results.push({ contact: c, msg });
        }
      });
    });
    setSearchResults(results.sort((a, b) => b.msg.timestamp - a.msg.timestamp).slice(0, 30));
  }, [searchQuery, contacts, allMessages]);

  const handleSelect = (id: string, highlightMsgId?: string) => {
    switchContact(id);
    navigate('/chat', { state: highlightMsgId ? { highlightMsgId } : undefined });
  };

  const handleAdd = () => {
    const name = newNickname.trim();
    if (!name) { toast.error('请输入联系人昵称'); return; }
    const id = generateId();
    addContact({
      id, myAvatar: '', theirAvatar: '', nickname: name, myName: '我',
      tapMessage: '轻轻拍了拍你', tapMessageMe: '轻轻拍了拍', tapMessageThem: '轻轻拍了拍',
      tapMessages: DEFAULT_CONTACT.tapMessages,
      companionTheme: DEFAULT_CONTACT.companionTheme,
      replyDelaySec: 2, noReplyChance: 1, autoTapChance: 5, autoVoiceChance: 5,
      autoCallChance: 5, hangupChance: 6, momentsPostTimes: [],
      momentsReplyDelay: 30000, momentsBio: '在星光下，我们的灵魂共舞', momentsBg: '', myBio: '',
      letterReplyDelaySec: 5, letterProactiveChance: 20, letterProactiveIntervalDays: 1, proactiveMsgIntervalMinutes: 0,
      sysMinSentences: 1, sysMaxSentences: 1, combineCardChance: 0, combineCardMax: 3,
      transferChance: 10, transferAmounts: '520,1314,66.6,188,888',
      momentsImageChance: 20, momentsCombineChance: 10, momentsCombineMax: 3,
      momentsNpcLikeChance: 100, momentsNpcCommentChance: 0, momentsCommentNoReplyChance: 0,
      pushEnabled: false, autoBackupIntervalHours: 0, autoBackupFileName: 'soulcard_backup',
      replyQuoteChance: 20, autoEmojiChance: 35, enableBackgroundKeepAlive: false, musicPlaylist: [...DEFAULT_CONTACT.musicPlaylist], musicEnabled: true, pickerTagline: DEFAULT_CONTACT.pickerTagline, pinned: false, isGroup: false, groupMemberIds: [], anniversary: '', daysMatterEvents: [],
      chatBoxes: [{ id: 'main', name: '主聊天框', createdAt: Date.now() }], currentChatBoxId: 'main',
    });
    setNewNickname('');
    setShowAdd(false);
    toast.success(`已添加联系人：${name}`);
  };

  const toggleMember = (id: string) => {
    const next = new Set(selectedMembers);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedMembers(next);
  };

  const handleCreateGroup = () => {
    const name = groupName.trim();
    if (!name) { toast.error('请输入群聊名称'); return; }
    if (selectedMembers.size < 2) { toast.error('至少选择2个成员'); return; }
    const id = generateId();
    addContact({
      id, myAvatar: '', theirAvatar: '', nickname: name, myName: '我',
      tapMessage: '轻轻拍了拍你', tapMessageMe: '轻轻拍了拍', tapMessageThem: '轻轻拍了拍',
      tapMessages: DEFAULT_CONTACT.tapMessages,
      companionTheme: DEFAULT_CONTACT.companionTheme,
      replyDelaySec: 2, noReplyChance: 1, autoTapChance: 5, autoVoiceChance: 5,
      autoCallChance: 5, hangupChance: 6, momentsPostTimes: [],
      momentsReplyDelay: 30000, momentsBio: '', momentsBg: '', myBio: '',
      letterReplyDelaySec: 5, letterProactiveChance: 20, letterProactiveIntervalDays: 1, proactiveMsgIntervalMinutes: 0,
      sysMinSentences: 1, sysMaxSentences: 1, combineCardChance: 0, combineCardMax: 3,
      transferChance: 10, transferAmounts: '520,1314,66.6,188,888',
      momentsImageChance: 20, momentsCombineChance: 10, momentsCombineMax: 3,
      momentsNpcLikeChance: 100, momentsNpcCommentChance: 0, momentsCommentNoReplyChance: 0,
      pushEnabled: false, autoBackupIntervalHours: 0, autoBackupFileName: 'soulcard_backup',
      replyQuoteChance: 20, autoEmojiChance: 35, enableBackgroundKeepAlive: false, musicPlaylist: [...DEFAULT_CONTACT.musicPlaylist], musicEnabled: true, pickerTagline: DEFAULT_CONTACT.pickerTagline, pinned: false, isGroup: true,
      groupMemberIds: Array.from(selectedMembers), anniversary: '', daysMatterEvents: [],
      chatBoxes: [{ id: 'main', name: '主聊天框', createdAt: Date.now() }], currentChatBoxId: 'main',
    });
    setGroupName('');
    setSelectedMembers(new Set());
    setShowGroup(false);
    toast.success(`已创建群聊：${name}`);
  };

  const askDeleteContact = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionMenu(null);
    if (contacts.length <= 1) { toast.error('至少保留一个联系人'); return; }
    setConfirm({
      open: true,
      title: '删除联系人',
      desc: `确定要删除「${name}」吗？所有对话记录也将被清除。`,
      onConfirm: () => { deleteContact(id); setConfirm(null); toast.success('已删除'); }
    });
  };

  const askClearChat = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionMenu(null);
    setConfirm({
      open: true,
      title: '删除对话',
      desc: `确定要清空与「${name}」的对话记录吗？联系人仍会保留。`,
      onConfirm: () => { clearMessages(id); setConfirm(null); toast.success('对话已删除'); }
    });
  };

  const updateNickname = (id: string, name: string) => {
    const c = contacts.find(x => x.id === id);
    if (!c || c.nickname === name) return;
    updateContact({ ...c, nickname: name });
  };

  const togglePin = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const c = contacts.find(x => x.id === id);
    if (!c) return;
    updateContact({ ...c, pinned: !c.pinned });
    toast.success(c.pinned ? '已取消置顶' : '已置顶');
  };

  const updateStatus = (id: string, text: string) => {
    const c = contacts.find(x => x.id === id);
    if (!c || c.tapMessage === text) return;
    updateContact({ ...c, tapMessage: text });
  };

  const updateTagline = (text: string) => {
    if (contact.pickerTagline === text) return;
    updateContact({ ...contact, pickerTagline: text });
  };

  const handleAvatarUpload = async (file: File | null) => {
    if (!file || !uploadTarget) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('图片不能超过5MB'); return; }
    try {
      const url = await compressImage(file, 800, 800, 0.92);
      if (uploadTarget === 'header') {
        updateContact({ ...contact, theirAvatar: url });
      } else {
        const c = contacts.find(x => x.id === uploadTarget);
        if (c) updateContact({ ...c, theirAvatar: url });
      }
      setUploadTarget(null);
    } catch {
      toast.error('图片处理失败');
    }
  };

  const formatPreview = (msg: ChatMessage | null, fallback: string) => {
    if (!msg) return fallback;
    switch (msg.type) {
      case 'text': return msg.content || '';
      case 'voice': return '[语音]';
      case 'image': return '[图片]';
      case 'emoji': return '[表情]';
      case 'transfer': return `[转账] ¥${msg.transferAmount?.toFixed(2) || '0.00'}`;
      case 'call': return msg.duration ? `[通话] ${Math.floor(msg.duration / 60)}:${String(msg.duration % 60).padStart(2, '0')}` : '[通话]';
      case 'tap': return msg.content || '[拍一拍]';
      default: return msg.content || '';
    }
  };

  const formatTime = (timestamp: number) => {
    if (!timestamp) return '';
    const now = new Date();
    const d = new Date(timestamp);
    const isToday = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    if (isToday) return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.getFullYear() === yesterday.getFullYear() && d.getMonth() === yesterday.getMonth() && d.getDate() === yesterday.getDate();
    if (isYesterday) return '昨天';
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  const sortByPin = (list: typeof contacts) => [...list].sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));
  const filtered = sortByPin(contacts.filter(c => c.nickname.toLowerCase().includes(searchQuery.toLowerCase())));
  const nonGroup = sortByPin(filtered.filter(c => !c.isGroup));
  const groups = sortByPin(filtered.filter(c => c.isGroup));

  const pinnedContacts = sortByPin(contacts.filter(c => c.pinned));
  const recentContacts = useMemo(() => {
    if (pinnedContacts.length > 0) return [];
    return [...contacts].sort((a, b) => (lastMessages[b.id]?.timestamp || 0) - (lastMessages[a.id]?.timestamp || 0));
  }, [contacts, lastMessages, pinnedContacts.length]);
  const topContacts = pinnedContacts.length > 0 ? pinnedContacts : recentContacts;

  return (
    <div className="min-h-dvh bg-[#FAFAFA] flex flex-col relative">
      {/* 返回按钮 */}
      <button className="absolute top-4 left-4 z-20 h-9 w-9 flex items-center justify-center rounded-full active:bg-gray-100 bg-white/80 backdrop-blur" onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}>
        <ArrowLeft className="w-5 h-5 text-gray-500" />
      </button>

      {/* ── 内容区 ── */}
      <div className="flex-1 overflow-y-auto pt-14">
        {/* 顶部联系人展示区：置顶 > 最近聊天 */}
        <div className="py-6 flex flex-wrap items-start justify-center gap-6 px-4">
          {topContacts.length === 0 && (
            <p className="text-sm text-gray-400 text-center w-full">还没有置顶或最近聊天的人</p>
          )}
          {topContacts.map(c => (
            <div key={c.id} className="flex flex-col items-center gap-2 w-16">
              <button
                className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-100 border-2 border-white shadow-sm"
                onClick={() => { if (editMode) { setUploadTarget(c.id); fileRef.current?.click(); } else handleSelect(c.id); }}
              >
                {c.theirAvatar ? (
                  <img src={c.theirAvatar} className="w-full h-full object-cover" alt={c.nickname} />
                ) : (
                  <User className="w-7 h-7 text-gray-300 m-4" />
                )}
                {editMode && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Pencil className="w-3 h-3 text-white" /></div>}
              </button>
              {editMode ? (
                <input
                  value={c.nickname}
                  onChange={e => updateNickname(c.id, e.target.value)}
                  className="text-xs text-center text-gray-700 bg-transparent outline-none border-b border-gray-200 w-16"
                />
              ) : (
                <span className="text-xs text-gray-600 truncate w-full text-center">{c.nickname}</span>
              )}
              {!editMode && lastMessages[c.id] && (
                <span className="text-[10px] text-gray-400">{formatTime(lastMessages[c.id]!.timestamp)}</span>
              )}
            </div>
          ))}
        </div>

        {/* 标语 */}
        <div className="px-6 pb-6 text-center">
          {editMode ? (
            <input
              value={contact.pickerTagline}
              onChange={e => updateTagline(e.target.value)}
              className="w-full text-center text-sm text-gray-500 bg-transparent outline-none border-b border-gray-200"
            />
          ) : (
            <p className="text-sm text-gray-500">{contact.pickerTagline}</p>
          )}
        </div>

        {/* 搜索栏 */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 h-9">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索聊天记录"
              className="flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* 搜索结果 / 联系人列表 */}
        <div className="px-4 pb-24 space-y-2">
          {searchQuery.trim() && (
            <div className="space-y-2">
              {searchResults.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">没有找到相关聊天记录</p>
              ) : (
                searchResults.map(({ contact: rc, msg }) => (
                  <button
                    key={`${rc.id}-${msg.id}`}
                    onClick={() => handleSelect(rc.id, msg.id)}
                    className="w-full flex items-start gap-3 p-3 bg-white rounded-2xl border border-gray-100 text-left active:scale-[0.99] transition-transform"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 shrink-0 border border-gray-50">
                      {rc.theirAvatar ? <img src={rc.theirAvatar} className="w-full h-full object-cover" alt={rc.nickname} /> : <User className="w-4 h-4 text-gray-300 m-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="text-[14px] font-medium text-gray-900 truncate">{rc.nickname}</p>
                        <p className="text-[11px] text-gray-400 shrink-0">{formatTime(msg.timestamp)}</p>
                      </div>
                      <p className="text-[13px] text-gray-600 text-left truncate">{formatPreview(msg, '')}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {!searchQuery.trim() && nonGroup.map(c => {
            const last = lastMessages[c.id];
            return (
              <div
                key={c.id}
                onClick={() => { if (!editMode) handleSelect(c.id); }}
                className="group flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 active:scale-[0.99] transition-transform cursor-pointer"
              >
                <button
                  className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-100 shrink-0 border border-gray-50"
                  onClick={e => { e.stopPropagation(); if (editMode) { setUploadTarget(c.id); fileRef.current?.click(); } }}
                >
                  {c.theirAvatar ? (
                    <img src={c.theirAvatar} className="w-full h-full object-cover" alt={c.nickname} />
                  ) : (
                    <User className="w-5 h-5 text-gray-300 m-3" />
                  )}
                  {editMode && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Pencil className="w-3 h-3 text-white" /></div>}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    {editMode ? (
                      <input
                        value={c.nickname}
                        onChange={e => updateNickname(c.id, e.target.value)}
                        className="text-[15px] font-medium text-gray-900 bg-transparent outline-none border-b border-gray-200 w-24"
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <div className="flex items-center gap-1 min-w-0">
                        <p className="text-[15px] font-medium text-gray-900 truncate">{c.nickname}</p>
                        {c.pinned && <Pin className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0" />}
                      </div>
                    )}
                    {editMode ? (
                      <input
                        value={formatTime(last?.timestamp || 0)}
                        readOnly
                        className="text-[11px] text-gray-400 bg-transparent outline-none border-b border-gray-200 w-12 text-right"
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <p className="text-[11px] text-gray-400 shrink-0">{formatTime(last?.timestamp || 0)}</p>
                    )}
                  </div>
                  {editMode ? (
                    <input
                      value={c.tapMessage || ''}
                      onChange={e => updateStatus(c.id, e.target.value)}
                      className="w-full text-[12px] text-gray-500 bg-transparent outline-none border-b border-gray-200"
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <p className="text-[12px] text-gray-500 truncate">{formatPreview(last, c.tapMessage || '轻轻拍了拍你')}</p>
                  )}
                </div>
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-300 hover:text-gray-600 hover:bg-gray-100 shrink-0 transition-colors"
                  onClick={e => { e.stopPropagation(); setActionMenu(c.id); }}
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
            );
          })}

          {!searchQuery.trim() && groups.map(c => (
            <div
              key={c.id}
              onClick={() => { if (!editMode) handleSelect(c.id); }}
              className="group flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 active:scale-[0.99] transition-transform cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center border border-gray-50">
                <Users className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                {editMode ? (
                  <input
                    value={c.nickname}
                    onChange={e => updateNickname(c.id, e.target.value)}
                    className="text-[15px] font-medium text-gray-900 bg-transparent outline-none border-b border-gray-200 w-32"
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <div className="flex items-center gap-1 min-w-0">
                    <p className="text-[15px] font-medium text-gray-900 truncate">{c.nickname}</p>
                    {c.pinned && <Pin className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0" />}
                  </div>
                )}
                <p className="text-[12px] text-gray-500">{c.groupMemberIds.length} 人</p>
              </div>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-300 hover:text-gray-600 hover:bg-gray-100 shrink-0 transition-colors"
                onClick={e => { e.stopPropagation(); setActionMenu(c.id); }}
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          ))}

          {!searchQuery.trim() && filtered.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">没有找到联系人</p>
          )}
        </div>
      </div>

      {/* 底部添加按钮 */}
      <div className="fixed bottom-6 right-6 flex items-center gap-3">
        <button
          className="w-12 h-12 rounded-full bg-gray-900 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          onClick={() => setShowGroup(true)}
        >
          <Users className="w-5 h-5" />
        </button>
        <button
          className="w-12 h-12 rounded-full bg-gray-900 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          onClick={() => setShowAdd(true)}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* 隐藏文件输入 */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { handleAvatarUpload(e.target.files?.[0] || null); e.target.value = ''; }} />

      {/* ── 添加联系人弹窗 ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-md bg-white rounded-t-3xl px-6 pt-5 pb-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">添加联系人</h3>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <input
              type="text"
              value={newNickname}
              onChange={e => setNewNickname(e.target.value)}
              placeholder="请输入昵称"
              className="w-full h-11 px-4 rounded-xl bg-gray-100 text-gray-800 outline-none mb-4"
            />
            <button onClick={handleAdd} className="w-full h-11 rounded-xl bg-gray-900 text-white font-medium">添加</button>
          </div>
        </div>
      )}

      {/* ── 创建群聊弹窗 ── */}
      {showGroup && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={() => setShowGroup(false)}>
          <div className="w-full max-w-md bg-white rounded-t-3xl px-6 pt-5 pb-8 shadow-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">创建群聊</h3>
              <button onClick={() => setShowGroup(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <input
              type="text"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="群聊名称"
              className="w-full h-11 px-4 rounded-xl bg-gray-100 text-gray-800 outline-none mb-3"
            />
            <p className="text-xs text-gray-500 mb-2">选择成员</p>
            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              {contacts.filter(c => !c.isGroup).map(c => (
                <label key={c.id} className="flex items-center gap-3 p-2 rounded-xl bg-gray-50 cursor-pointer">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100">
                    {c.theirAvatar ? <img src={c.theirAvatar} className="w-full h-full object-cover" alt={c.nickname} /> : <User className="w-4 h-4 text-gray-300 m-2" />}
                  </div>
                  <span className="flex-1 text-sm text-gray-800">{c.nickname}</span>
                  <input type="checkbox" checked={selectedMembers.has(c.id)} onChange={() => toggleMember(c.id)} className="w-4 h-4 accent-gray-900" />
                </label>
              ))}
            </div>
            <button onClick={handleCreateGroup} className="w-full h-11 rounded-xl bg-gray-900 text-white font-medium">创建</button>
          </div>
        </div>
      )}

      {/* ── 操作菜单 ── */}
      {actionMenu && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/20" onClick={() => setActionMenu(null)}>
          <div className="w-full max-w-md bg-white rounded-t-3xl px-4 py-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            {((): React.ReactNode => {
              const c = contacts.find(x => x.id === actionMenu);
              if (!c) return null;
              return (
                <>
                  <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-4" />
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-gray-700 active:bg-gray-50 rounded-xl"
                    onClick={e => { e.stopPropagation(); togglePin(c.id); setActionMenu(null); }}
                  >
                    <Pin className={`w-4 h-4 ${c.pinned ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'}`} />{c.pinned ? '取消置顶' : '置顶'}
                  </button>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-gray-700 active:bg-gray-50 rounded-xl mt-1"
                    onClick={e => { e.stopPropagation(); clearMessages(c.id); setActionMenu(null); toast.success('对话已删除'); }}
                  >
                    <MessageSquare className="w-4 h-4 text-gray-400" />删除对话
                  </button>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-red-500 active:bg-red-50 rounded-xl mt-1"
                    onClick={e => askDeleteContact(c.id, c.nickname, e)}
                  >
                    <Trash2 className="w-4 h-4" />删除联系人
                  </button>
                  <button className="w-full mt-3 py-3 text-sm text-gray-500" onClick={() => setActionMenu(null)}>取消</button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── 确认弹窗 ── */}
      {confirm?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setConfirm(null)}>
          <div className="bg-white rounded-3xl max-w-[300px] w-full p-6 text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">{confirm.title}</h3>
            <p className="text-sm text-gray-500 mb-5">{confirm.desc}</p>
            <div className="flex items-center gap-3">
              <button className="flex-1 h-10 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium" onClick={() => setConfirm(null)}>取消</button>
              <button className="flex-1 h-10 rounded-xl bg-red-500 text-white text-sm font-medium" onClick={confirm.onConfirm}>确定</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
