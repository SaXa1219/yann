import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Pencil, Check, X, MessageSquare } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { generateId } from '@/utils/id';

export default function ChatBoxManagePage() {
  const navigate = useNavigate();
  const { contact, currentChatBoxId, switchChatBox, addChatBox, deleteChatBox, renameChatBox, appearance } = useApp();
  const isDark = appearance.darkMode;
  const [newName, setNewName] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) { toast.error('请输入聊天框名称'); return; }
    addChatBox(name);
    setNewName('');
    setShowAdd(false);
    toast.success('已创建新聊天框');
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const saveEdit = () => {
    if (!editingId) return;
    const name = editingName.trim();
    if (!name) { toast.error('名称不能为空'); return; }
    renameChatBox(editingId, name);
    setEditingId(null);
    setEditingName('');
  };

  return (
    <div className={`min-h-dvh ${isDark ? 'bg-[#0d0d0d]' : 'bg-[#FAFAFA]'}`}>
      <header className={`sticky top-0 z-10 backdrop-blur-md border-b h-12 px-4 flex items-center justify-between ${isDark ? 'bg-[#1a1a1a]/90 border-gray-800' : 'bg-white/90 border-gray-100'}`}>
        <div className="flex items-center">
          <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')} className={`mr-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className={`text-[15px] font-bold tracking-tight ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>聊天框管理</h1>
        </div>
        <button onClick={() => setShowAdd(true)} className="text-[var(--accent-color)]">
          <Plus className="w-5 h-5" />
        </button>
      </header>

      <div className="p-4 space-y-3">
        {showAdd && (
          <div className={`rounded-2xl p-3 flex items-center gap-2 ${isDark ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-white border border-gray-100'}`}>
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="新聊天框名称" className="flex-1" />
            <Button size="icon" variant="ghost" onClick={handleAdd}><Check className="w-4 h-4 text-green-500" /></Button>
            <Button size="icon" variant="ghost" onClick={() => { setShowAdd(false); setNewName(''); }}><X className="w-4 h-4 text-gray-400" /></Button>
          </div>
        )}

        {contact.chatBoxes.map(box => (
          <div key={box.id} className={`rounded-2xl p-3 flex items-center gap-3 ${isDark ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-white border border-gray-100'}`}>
            <MessageSquare className="w-5 h-5 text-[var(--accent-color)]" />
            {editingId === box.id ? (
              <Input value={editingName} onChange={e => setEditingName(e.target.value)} className="flex-1" />
            ) : (
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{box.name}</p>
                <p className="text-xs text-gray-400">{box.id === currentChatBoxId ? '当前使用' : '点击切换'}</p>
              </div>
            )}
            {editingId === box.id ? (
              <>
                <Button size="icon" variant="ghost" onClick={saveEdit}><Check className="w-4 h-4 text-green-500" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}><X className="w-4 h-4 text-gray-400" /></Button>
              </>
            ) : (
              <>
                {box.id !== 'main' && (
                  <Button size="icon" variant="ghost" onClick={() => startEdit(box.id, box.name)}><Pencil className="w-4 h-4 text-gray-400" /></Button>
                )}
                {box.id !== currentChatBoxId && (
                  <Button size="icon" variant="ghost" onClick={() => { switchChatBox(box.id); toast.success(`已切换到 ${box.name}`); }}><Check className="w-4 h-4 text-[var(--accent-color)]" /></Button>
                )}
                {box.id !== 'main' && (
                  <Button size="icon" variant="ghost" onClick={() => deleteChatBox(box.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <p className={`text-center text-[11px] py-6 ${isDark ? 'text-gray-700' : 'text-gray-300'}`}>主聊天框不可删除</p>
    </div>
  );
}
