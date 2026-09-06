import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Sparkles, Mic, ImageIcon, BarChart2, User, Smile, ChevronRight, MessageSquare } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

const CONTENT_ITEMS = [
  { path: '/settings/cards', icon: BookOpen, label: '字卡管理', desc: '添加 / 编辑 / 删除文字字卡' },
  { path: '/settings/mood-cards', icon: Sparkles, label: '心情字卡', desc: '添加心情，每次打开显示一条' },
  { path: '/settings/voice-cards', icon: Mic, label: '语音字卡', desc: '导入语音，对方回复时发送' },
  { path: '/settings/image-cards', icon: ImageIcon, label: '图片字卡', desc: '添加图片，对方发动态时可能附图' },
  { path: '/settings/emoji', icon: Smile, label: '表情库', desc: '管理聊天中使用的表情包' },
  { path: '/settings/stats', icon: BarChart2, label: '高频话术', desc: '查看 TA 最常说的 Top3 话术' },
];

const CONTACT_ITEM = { path: '/settings/contact?mode=chat', icon: User, label: '联系人设置', desc: '头像、备注、拍一拍文案、转账金额池、拼字卡开关' };
const CHATBOX_ITEM = { path: '/settings/chat-boxes', icon: MessageSquare, label: '聊天框管理', desc: '新增、删除、切换不同聊天框' };

export default function ChatSettingsPage() {
  const navigate = useNavigate();
  const { appearance } = useApp();
  const isDark = appearance.darkMode;

  return (
    <div className={`min-h-dvh ${isDark ? 'bg-[#0d0d0d]' : 'bg-[#FAFAFA]'}`}>
      <header className={`sticky top-0 z-10 backdrop-blur-md border-b h-12 px-4 flex items-center justify-between ${isDark ? 'bg-[#1a1a1a]/90 border-gray-800' : 'bg-white/90 border-gray-100'}`}>
        <div className="flex items-center">
          <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')} className={`mr-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className={`text-[15px] font-bold tracking-tight ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>聊天设置</h1>
        </div>
      </header>

      {/* 内容管理 */}
      <div className={`mb-2.5 ${isDark ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
        <p className={`text-[11px] font-semibold px-4 pt-3 pb-1.5 uppercase tracking-widest ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>内容管理</p>
        {CONTENT_ITEMS.map((item, idx) => {
          const Icon = item.icon;
          const isLast = idx === CONTENT_ITEMS.length - 1;
          return (
            <button key={item.path} onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 transition-colors relative ${isDark ? 'active:bg-gray-800' : 'active:bg-gray-50'}`}>
              <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <Icon className="w-[18px] h-[18px] text-[var(--accent-color)]" strokeWidth={1.6} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className={`text-[14px] font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{item.label}</p>
                <p className={`text-[12px] truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{item.desc}</p>
              </div>
              {!isLast && <div className={`absolute left-[70px] right-0 bottom-0 h-px ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`} />}
              <ChevronRight className={`w-4 h-4 shrink-0 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
            </button>
          );
        })}
      </div>

      {/* 联系人设置 */}
      <div className={`mb-2.5 ${isDark ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
        <p className={`text-[11px] font-semibold px-4 pt-3 pb-1.5 uppercase tracking-widest ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>当前联系人</p>
        <button onClick={() => navigate(CONTACT_ITEM.path)}
          className={`w-full flex items-center gap-3.5 px-4 py-3 transition-colors relative ${isDark ? 'active:bg-gray-800' : 'active:bg-gray-50'}`}>
          <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <User className="w-[18px] h-[18px] text-[var(--accent-color)]" strokeWidth={1.6} />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className={`text-[14px] font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{CONTACT_ITEM.label}</p>
            <p className={`text-[12px] truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{CONTACT_ITEM.desc}</p>
          </div>
          <ChevronRight className={`w-4 h-4 shrink-0 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
        </button>
        <button onClick={() => navigate(CHATBOX_ITEM.path)}
          className={`w-full flex items-center gap-3.5 px-4 py-3 transition-colors ${isDark ? 'active:bg-gray-800' : 'active:bg-gray-50'}`}>
          <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <MessageSquare className="w-[18px] h-[18px] text-[var(--accent-color)]" strokeWidth={1.6} />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className={`text-[14px] font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{CHATBOX_ITEM.label}</p>
            <p className={`text-[12px] truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{CHATBOX_ITEM.desc}</p>
          </div>
          <ChevronRight className={`w-4 h-4 shrink-0 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
        </button>
      </div>

      <p className={`text-center text-[11px] py-8 ${isDark ? 'text-gray-700' : 'text-gray-300'}`}>yann语</p>
    </div>
  );
}
