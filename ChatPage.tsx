import React, { useState, useRef, useEffect, useCallback } from 'react';
import { generateId } from '@/utils/id';
import { useNavigate } from 'react-router-dom';

import {
  Plus, Smile, MoreVertical, Mic, MicOff,
  ImageIcon, Phone, User, Mail,
  X, Reply, CornerUpLeft, CreditCard, Grid, ChevronDown,
  Music, Moon, Sun, ClipboardList, HelpCircle, Heart, MessageSquare, Trash2, Store, BookOpen, BookHeart,
  Activity, Link2, Camera, MessagesSquare,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import type { ChatMessage, EmojiPack, ContactSettings, CardItem, VoiceCard, Gift, AppearanceSettings } from '@/types/types';
import { toast } from 'sonner';
import { dbGet, dbSet } from '@/services/db';
import { generateSpeech } from '@/services/tts';
import { SYSTEM_FIXED } from '@/constants/behavior';
import { OPPONENT_QUESTIONS } from '@/constants/questions';


/* ── 小星星装饰 ── */
const STARS = [
  { top: '7%', left: '5%' }, { top: '4%', left: '84%' },
  { top: '17%', left: '91%' }, { top: '21%', left: '14%' },
  { top: '34%', left: '7%' }, { top: '29%', left: '77%' },
  { top: '47%', left: '87%' }, { top: '51%', left: '3%' },
  { top: '63%', left: '89%' }, { top: '69%', left: '11%' },
  { top: '81%', left: '74%' }, { top: '84%', left: '19%' },
  { top: '93%', left: '54%' }, { top: '14%', left: '44%' },
];
function Star({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={style} className="w-2.5 h-2.5 text-gray-200" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

/* ── 头像 ── */
function Avatar({ src, fallback }: { src: string; fallback: string }) {
  if (src) return <img src={src} className="w-full h-full object-cover" alt="avatar" />;
  return <span className="text-sm">{fallback}</span>;
}

/* ── 问卷气泡（白色/深色自适应） ── */
function QuestionnaireBubble({ msg, isUser, isDark }: { msg: ChatMessage; isUser: boolean; isDark: boolean }) {
  const { questionnaires, answerQuestionnaire } = useApp();
  const [showDetail, setShowDetail] = useState(false);
  const [data, setData] = useState<{
    title: string;
    questions: { text: string; options: string[]; id: string; type?: 'choice' | 'multi' | 'text' }[];
    status?: string;
  } | null>(null);
  const [selected, setSelected] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!msg.meta) return;
    try { setData(JSON.parse(msg.meta)); } catch { setData(null); }
  }, [msg.meta]);

  const questionnaireId = data?.title ? (msg.meta ? (() => { try { return JSON.parse(msg.meta).questionnaireId; } catch { return null; } })() : null) : null;
  const answeredQ = questionnaireId ? questionnaires.find(q => q.id === questionnaireId) : null;
  const isCompleted = data?.status === 'completed' || !!answeredQ?.answers;

  const getAnswer = (questionId: string) => {
    if (!answeredQ?.answers) return null;
    return answeredQ.answers.find(a => a.questionId === questionId);
  };

  const handleSubmitAnswers = () => {
    if (!questionnaireId || !data) return;
    const answeredIds = new Set(Object.keys(selected));
    const allAnswered = data.questions.every(q => answeredIds.has(q.id));
    if (!allAnswered) {
      toast.error('请回答所有问题');
      return;
    }
    const answers = data.questions.map(q => ({ questionId: q.id, optionIndex: selected[q.id] }));
    answerQuestionnaire(questionnaireId, answers);
    toast.success('回答已提交');
  };

  return (
    <>
      <button
        onClick={() => setShowDetail(true)}
        className="relative group text-left transition-all active:scale-[0.98] hover:-translate-y-0.5 max-w-[260px]"
      >
        {/* 外层卡片：白色 / 深色 */}
        <div
          className={`rounded-2xl p-4 ${isUser ? (isDark ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-100') : (isDark ? 'bg-gray-800 text-gray-100 border border-gray-700' : 'bg-white text-gray-900 border border-gray-100')}`}
          style={{ boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.05)' }}
        >
          {/* 顶部装饰 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-gray-500' : 'bg-gray-300'}`} />
              <div className={`h-px w-4 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`} />
              <div className={`w-1 h-1 rounded-full ${isDark ? 'bg-gray-500' : 'bg-gray-300'}`} />
            </div>
            <span className={`text-[9px] tracking-widest uppercase font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Quiz</span>
          </div>

          {/* 标题 */}
          <p className={`text-[15px] font-bold mb-3 leading-snug ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{msg.content}</p>

          {/* 问题预览 */}
          {data && (
            <div className="space-y-2">
              {data.questions?.slice(0, 2).map((q, i) => (
                <div key={i} className={`rounded-xl px-3 py-2 text-[11px] leading-relaxed border ${isDark ? 'bg-gray-700/50 text-gray-300 border-gray-600' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                  <span className={`inline-block w-4 h-4 rounded-full text-center text-[9px] leading-4 mr-1.5 ${isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                  {q.text}
                </div>
              ))}
              {(data.questions?.length || 0) > 2 && (
                <div className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'} pl-1`}>+ {data.questions!.length - 2} 道题</div>
              )}
            </div>
          )}

          {/* 底部状态条 */}
          <div className={`mt-3 flex items-center gap-1.5 pt-2 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isCompleted ? (isDark ? 'bg-green-400' : 'bg-green-400') : (isDark ? 'bg-amber-400 animate-pulse' : 'bg-amber-400 animate-pulse')}`} />
            <span className={`text-[10px] font-medium ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
              {isCompleted ? '对方已回答' : '对方正在填写中…'}
            </span>
          </div>
        </div>

        {/* 右下角折角装饰 */}
        <div className="absolute -bottom-1 -right-1 w-4 h-4 overflow-hidden pointer-events-none">
          <div className={`w-6 h-6 origin-bottom-left rotate-45 ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`} style={{ boxShadow: '-2px -2px 4px rgba(0,0,0,0.04)' }} />
        </div>
      </button>

      {/* 详情弹窗 */}
      {showDetail && data && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/30" onClick={() => setShowDetail(false)}>
          <div className={`rounded-t-[2rem] md:rounded-[2rem] max-w-sm w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl animate-slide-up ${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'}`} onClick={e => e.stopPropagation()}>
            {/* 底部指示条 */}
            <div className="flex justify-center mb-4">
              <div className={`w-10 h-1 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`} />
            </div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className={`text-[10px] font-semibold tracking-[0.15em] uppercase ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>Quiz</p>
                <h3 className={`text-lg font-bold mt-0.5 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{data.title}</h3>
              </div>
              <button onClick={() => setShowDetail(false)} className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              {data.questions?.map((q, i) => {
                const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
                const ans = getAnswer(q.id);
                const selectedArr = ans?.optionIndex !== undefined
                  ? (Array.isArray(ans.optionIndex) ? ans.optionIndex : [ans.optionIndex])
                  : [];
                const isText = q.type === 'text';
                const isMulti = q.type === 'multi';
                return (
                  <div key={i} className={`rounded-2xl p-4 border ${isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isDark ? 'bg-gray-600 text-gray-100' : 'bg-gray-200 text-gray-600'}`}>{i + 1}</span>
                      <p className={`text-sm font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{q.text}</p>
                      {isMulti && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-color)]/10 text-[var(--accent-color)] shrink-0">多选</span>}
                    </div>
                    {isText ? (
                      <div className={`ml-7 text-xs flex items-center gap-2 ${isDark ? 'text-[var(--accent-color)]' : 'text-[var(--accent-color)]'}`}>
                        <span className="px-2 py-1 rounded-lg bg-[var(--accent-color)]/10 text-[var(--accent-color)]">
                          {ans?.text ? ans.text : '等待字卡回答'}
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2 ml-7">
                        {q.options.map((opt, j) => {
                          const isSelected = selectedArr.includes(j);
                          const isAnswered = answeredQ?.answers !== undefined;
                          const optionDisabled = isAnswered || isUser;
                          return (
                            <button
                              key={j}
                              disabled={optionDisabled}
                              onClick={() => { if (!optionDisabled) setSelected(prev => ({ ...prev, [q.id]: j })); }}
                              className={`w-full flex items-center gap-2 text-xs text-left disabled:cursor-default ${isDark ? (isSelected ? 'text-gray-100' : 'text-gray-400') : (isSelected ? 'text-gray-800' : 'text-gray-500')}`}
                            >
                              <span className={`w-5 h-5 ${isMulti ? 'rounded-md' : 'rounded-full'} flex items-center justify-center text-[9px] shrink-0 font-medium border ${isSelected ? (isDark ? 'bg-green-500/20 border-green-400 text-green-400' : 'bg-green-50 border-green-400 text-green-500') : (isDark ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-white border-gray-200 text-gray-400')}`}>{labels[j]}</span>
                              <span className={isSelected ? 'font-semibold' : ''}>{opt}</span>
                              {isSelected && <span className={`text-[10px] ml-auto ${isDark ? 'text-green-400' : 'text-green-500'}`}>✓ 已选</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {isCompleted ? (
              <div className={`mt-5 flex items-center justify-center gap-1.5 text-xs ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                <span className={`w-2 h-2 rounded-full ${isDark ? 'bg-green-400' : 'bg-green-400'}`} />
                对方已回答
              </div>
            ) : isUser ? (
              <div className={`mt-5 flex items-center justify-center gap-1.5 text-xs ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                <span className={`w-2 h-2 rounded-full ${isDark ? 'bg-gray-500' : 'bg-gray-400'}`} />
                你发送的问卷，需要由对方回答
              </div>
            ) : (
              <div className="mt-5 flex flex-col gap-2">
                <p className={`text-xs text-center ${isDark ? 'text-amber-400' : 'text-amber-500'}`}>请回答所有问题</p>
                <button
                  onClick={handleSubmitAnswers}
                  className={`w-full h-10 rounded-xl text-sm font-semibold text-white ${isDark ? 'bg-[var(--accent-color)]' : 'bg-[var(--accent-color)]'}`}
                >
                  提交答案
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ── 语音气泡 ── */
function VoiceBubble({ duration, isPlaying, onPlay, color }: { duration: number; isPlaying: boolean; onPlay: () => void; color?: string }) {
  return (
    <button onClick={onPlay} className="flex items-center gap-2 min-w-[80px]" style={{ color }}>
      {isPlaying ? <MicOff className="w-4 h-4 shrink-0" /> : <Mic className="w-4 h-4 shrink-0" />}
      <span className="flex gap-0.5 items-end h-5">
        {[3, 5, 4, 6, 3, 5].map((h, i) => (
          <span key={i} className={`w-0.5 rounded-full ${isPlaying ? 'bg-current animate-pulse' : 'bg-current opacity-60'}`}
            style={{ height: `${h * 3}px` }} />
        ))}
      </span>
      <span className="text-xs shrink-0">{duration}″</span>
    </button>
  );
}

/* ── 转账卡片 ── */
/* ── 美化版微信转账风格卡片 ── */
function TransferCard({ msg, onClick, appearance, isDark }: { msg: ChatMessage; onClick: (id: string) => void; appearance: AppearanceSettings; isDark?: boolean }) {
  const fromSystem = msg.sender === 'system';
  const status = msg.transferStatus;
  const amount = msg.transferAmount ?? 0;
  const note = msg.transferNote || '转账';
  // 转账气泡使用 transferColor 并可自定义文字、图标、圆角
  const color = appearance.transferColor || '#F5A623';
  const textColor = appearance.transferTextColor ?? '#FFFFFF';
  const subTextColor = appearance.transferSubTextColor ?? 'rgba(255,255,255,0.7)';
  const iconColor = appearance.transferIconColor ?? '#FFFFFF';
  const radius = appearance.transferBorderRadius ?? 16;
  const isAccepted = status === 'accepted';
  const isRejected = status === 'rejected';

  return (
    <button onClick={() => onClick(msg.id)}
      className="sc-transfer overflow-hidden text-left active:opacity-80 transition-all shadow-sm"
      style={{ minWidth: 180, maxWidth: 240, background: color, border: 'none', borderRadius: radius }}>
      {/* 主体 */}
      <div className="px-3 pt-3 pb-2.5 flex items-start gap-2.5">
        {/* 左侧圆形图标 */}
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ background: iconColor ? `${iconColor}20` : 'rgba(255,255,255,0.20)' }}>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 10h10M7 14h6" />
            <rect x="3" y="6" width="18" height="12" rx="2" />
          </svg>
        </div>
        {/* 金额和说明 */}
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-[18px] font-bold leading-tight" style={{ color: textColor }}>
            <span className="text-[13px] font-semibold mr-0.5">¥</span>{amount.toFixed(2)}
          </p>
          <p className="text-[12px] mt-0.5 truncate" style={{ color: subTextColor }}>{note}</p>
        </div>
      </div>
      {/* 底部分割线 + 来源 */}
      <div className="mx-3 h-px" style={{ background: subTextColor.replace(')', ',0.3)').replace('rgb', 'rgba') }} />
      <div className="px-3 py-2 flex items-center justify-between">
        <span className="text-[11px]" style={{ color: subTextColor }}>字卡转账</span>
        {isAccepted ? (
          <span className="text-[12px] font-medium" style={{ color: textColor, opacity: 0.9 }}>已收款</span>
        ) : isRejected ? (
          <span className="text-[12px]" style={{ color: subTextColor }}>已退还</span>
        ) : fromSystem ? (
          <span className="text-[12px] font-medium" style={{ color: textColor, opacity: 0.9 }}>待收款</span>
        ) : (
          <span className="text-[12px]" style={{ color: subTextColor }}>待确认</span>
        )}
      </div>
    </button>
  );
}

export default function ChatPage() {
  const navigate = useNavigate();
  const { messages, cards, moodCards, voiceCards, appearance, contact, emojis, contacts, homeSettings, currentChatBoxId, questionnaires, addMessage, updateMessage, deleteMessage, addEmoji, deleteEmoji, pickContent, updateAppearance, updateContact, updateAnniversary, miniMaxSettings, addOpponentMoment } = useApp();
  const currentBoxName = contact.chatBoxes.find(b => b.id === currentChatBoxId)?.name || '主聊天框';
  // 心情：每次打开网站从心情字卡随机选，无字卡时显示默认
  const [mood, setMood] = useState('');
  useEffect(() => {
    const pool = moodCards.filter(c => c.content).map(c => c.content);
    const text = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : '此刻心情，如诗如画';
    setMood(text);
  }, [moodCards]);

  const [input, setInput] = useState('');
  const [multiSend, setMultiSend] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [displayCount, setDisplayCount] = useState(100);
  const qTypingRef = useRef(false);
  const replyPendingRef = useRef(false);
  // 记录主回复的预计触发时间戳；后台/切应用时浏览器会节流 setTimeout，
  // 页面重新可见后据此补偿触发，保证对方在设定时间内回复
  const mainReplyDueRef = useRef<number | null>(null);
  const fireMainReplyRef = useRef<(() => void) | null>(null);
  // 问卷未回答时保持「对方正在输入」状态，避免只显示几秒就消失；
  // 不再每 2 秒重复 setState，避免和 triggerReply 的输入状态冲突导致卡顿。
  useEffect(() => {
    const pending = questionnaires.find(q => !q.answeredAt);
    if (pending) {
      qTypingRef.current = true;
      setIsTyping(true);
      return () => { qTypingRef.current = false; setIsTyping(false); };
    }
    qTypingRef.current = false;
    return undefined;
  }, [questionnaires]);
  const replyTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const forceReplyRef = useRef(false);
  const [showPlus, setShowPlus] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferInput, setTransferInput] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [showStore, setShowStore] = useState(false);
  const [newGiftName, setNewGiftName] = useState('');
  const [newGiftIcon, setNewGiftIcon] = useState('🎁');
  const [newGiftImage, setNewGiftImage] = useState('');
  const [showAddGiftForm, setShowAddGiftForm] = useState(false);
  const [answerQuestionMsg, setAnswerQuestionMsg] = useState<ChatMessage | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [incomingQuestion, setIncomingQuestion] = useState<string | null>(null);
  const [questionAnswerText, setQuestionAnswerText] = useState('');
  const [showNotebook, setShowNotebook] = useState(false);
  const [quotedMsg, setQuotedMsg] = useState<ChatMessage | null>(null);
  const [longPressMsg, setLongPressMsg] = useState<ChatMessage | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordSecRef = useRef(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [sendPulse, setSendPulse] = useState(false);
  // 头像信息弹窗
  const [showAvatarInfo, setShowAvatarInfo] = useState(false);
  // 连接检测
  const [showConnectionTest, setShowConnectionTest] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ connected: boolean; depth: number; label: string } | null>(null);
  const [connectionProgress, setConnectionProgress] = useState(0);
  const [connectionPhase, setConnectionPhase] = useState('');
  const connectionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avatarPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avatarLongPressed = useRef(false);

  // 控制同时渲染的消息数量，避免消息过多导致页面卡顿；发送新消息时自动显示最新内容。
  useEffect(() => {
    setDisplayCount(prev => Math.max(prev, Math.min(messages.length, 100)));
  }, [messages.length]);

  const displayMessages = messages.slice(-Math.max(1, displayCount));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages.length]);

  /* ── 通话结束 → 追加通话记录消息 ── */
  useEffect(() => {
    const handler = (e: Event) => {
      const { duration } = (e as CustomEvent<{ duration: number }>).detail;
      const m = Math.floor(duration / 60).toString().padStart(2, '0');
      const s = (duration % 60).toString().padStart(2, '0');
      addMessage({
        id: generateId(),
        type: 'call',
        content: `通话时长 ${m}:${s}`,
        sender: 'user',
        timestamp: Date.now(),
      });
    };
    window.addEventListener('callEnded', handler);
    return () => window.removeEventListener('callEnded', handler);
  }, [addMessage]);

  /* ── 对方拍一拍我 ── */
  const theirTap = useCallback((senderName?: string) => {
    const raw = contact.tapMessages || [];
    const pool = raw.filter(Boolean).length > 0 ? raw.filter(Boolean) : [contact.tapMessageThem || contact.tapMessage || '轻轻拍了拍'];
    const action = pool[Math.floor(Math.random() * pool.length)];
    const name = senderName || contact.nickname;
    const text = `${name}${action}你`;
    addMessage({ id: generateId(), type: 'tap', content: text, sender: 'system', timestamp: Date.now(), senderName });
  }, [contact, addMessage]);

  /* ── 转账：我发给对方，对方50%概率收 ── */
  const handleSendTransfer = useCallback(() => {
    const amount = parseFloat(transferInput);
    if (isNaN(amount) || amount <= 0) { toast.error('请输入有效金额'); return; }

    // 群聊时随机选一个成员作为领取人
    let targetName: string | undefined;
    if (contact.isGroup && contact.groupMemberIds.length > 0) {
      const memberContacts = contacts.filter((c: ContactSettings) => contact.groupMemberIds.includes(c.id));
      if (memberContacts.length > 0) {
        const picked = memberContacts[Math.floor(Math.random() * memberContacts.length)];
        targetName = picked.nickname;
      }
    }

    const msg: ChatMessage = {
      id: generateId(), type: 'transfer', content: '',
      sender: 'user', timestamp: Date.now(),
      transferAmount: amount, transferNote: transferNote || '转账',
      transferStatus: 'pending',
      senderName: targetName,
    };
    addMessage(msg);
    setShowTransfer(false); setTransferInput(''); setTransferNote('');
    // 对方延迟后 50% 收 / 50% 拒
    setTimeout(() => {
      const accepted = Math.random() < 0.5;
      updateMessage(msg.id, { transferStatus: accepted ? 'accepted' : 'rejected' });
      const payerName = targetName || contact.nickname;
      // 仿"拍一拍"风格的居中气泡通知（tap 类型消息）
      addMessage({
        id: generateId(),
        type: 'tap',
        content: accepted
          ? `${payerName} 收了你的转账 ¥${amount.toFixed(2)}`
          : `${payerName} 拒绝了转账，已退还`,
        sender: 'system',
        timestamp: Date.now() + 1,
      });
    }, (contact.replyDelaySec || 2) * 1000);
  }, [transferInput, transferNote, contact, contacts, addMessage, updateMessage]);

  /* ── 点击转账消息进入详情页 ── */
  const handleTransferClick = useCallback((id: string) => {
    navigate(`/transfer/${id}`);
  }, [navigate]);

  /* ── 商店礼物 ── */
  const gifts = contact.gifts || [];
  const addGift = useCallback(async (e?: React.ChangeEvent<HTMLInputElement>) => {
    if (e?.target.files?.[0]) {
      try {
        const { compressImage } = await import('@/utils/imageUtils');
        const url = await compressImage(e.target.files[0], 600, 600, 0.85);
        setNewGiftImage(url);
      } catch {
        toast.error('图片处理失败');
      }
      return;
    }
    const name = newGiftName.trim();
    const icon = newGiftIcon.trim() || '🎁';
    const image = newGiftImage;
    if (!name) { toast.error('请输入物品名称'); return; }
    const item: Gift = { id: generateId(), name, icon, image, createdAt: Date.now() };
    updateContact({ ...contact, gifts: [...gifts, item] });
    setNewGiftName('');
    setNewGiftImage('');
    setNewGiftIcon('🎁');
    setShowAddGiftForm(false);
    toast.success('已添加物品');
  }, [contact, gifts, newGiftIcon, newGiftImage, newGiftName, updateContact]);

  const deleteGift = useCallback((id: string) => {
    updateContact({ ...contact, gifts: gifts.filter(g => g.id !== id) });
  }, [contact, gifts, updateContact]);

  const sendGift = useCallback((item: Gift) => {
    setShowPlus(false);
    setShowStore(false);
    const giftMsg: ChatMessage = {
      id: generateId(), type: 'gift', content: `送你一份${item.name}`,
      sender: 'user', timestamp: Date.now(),
      giftName: item.name, giftIcon: item.icon, giftImage: item.image, giftStatus: 'pending',
    };
    addMessage(giftMsg);
    const delay = (contact.replyDelaySec ?? 2) * 1000;
    setTimeout(() => {
      const accepted = Math.random() < 0.8;
      updateMessage(giftMsg.id, { giftStatus: accepted ? 'accepted' : 'rejected' });
      const pool = cards.filter(c => !c.blocked);
      const count = pool.length >= 2 && Math.random() < 0.5 ? 2 : 1;
      const selected: string[] = [];
      while (selected.length < count && selected.length < pool.length) {
        const c = pickContent(pool.filter(p => !selected.includes(p.content)));
        if (!c) break;
        selected.push(c);
      }
      if (selected.length === 0) selected.push(accepted ? '谢谢你送的礼物，我很喜欢～' : '心意收到啦，礼物就不收啦～');
      selected.forEach((content, i) => {
        addMessage({
          id: generateId(), type: 'text', content,
          sender: 'system', timestamp: Date.now() + i,
        });
      });
    }, delay);
  }, [addMessage, cards, contact.replyDelaySec, pickContent, updateMessage]);

  /* ── 对方主动转账（在回复时触发） ── */
  const triggerSystemTransfer = useCallback((delayMs: number, senderName?: string, transferChance?: number, transferAmounts?: string) => {
    const chance = transferChance ?? (contact.transferChance ?? 10);
    if (Math.random() * 100 >= chance) return;
    const pool = (transferAmounts ?? contact.transferAmounts ?? '')
      .split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n) && n > 0);
    if (pool.length === 0) return;
    const amount = pool[Math.floor(Math.random() * pool.length)];
    setTimeout(() => {
      const note = cards.length > 0 ? pickContent(cards) : '转账';
      const msg: ChatMessage = {
        id: generateId(), type: 'transfer', content: '',
        sender: 'system', timestamp: Date.now(),
        transferAmount: amount, transferNote: note,
        transferStatus: 'pending',
        senderName,
      };
      addMessage(msg);
    }, delayMs + 500);
  }, [contact, addMessage, pickContent]);

  /* ── 对方从商店抽取礼物送给玩家（2% 概率） ── */
  const triggerSystemShopGift = useCallback((delayMs: number, senderName?: string) => {
    if (Math.random() * 100 >= SYSTEM_FIXED.shopGiftChance) return;
    const pool = (contact.gifts || []).filter(g => g.name);
    if (pool.length === 0) return;
    const item = pool[Math.floor(Math.random() * pool.length)];
    setTimeout(() => {
      const giftMsg: ChatMessage = {
        id: generateId(), type: 'gift', content: `送你一份${item.name}`,
        sender: 'system', timestamp: Date.now(),
        giftName: item.name, giftIcon: item.icon, giftImage: item.image, giftStatus: 'pending',
        senderName,
      };
      addMessage(giftMsg);
    }, delayMs + 600);
  }, [contact, addMessage]);

  // 玩家接收/拒收对方送的礼物
  const acceptGift = useCallback((msg: ChatMessage) => {
    if (msg.giftStatus !== 'pending') return;
    updateMessage(msg.id, { giftStatus: 'accepted' });
    addMessage({ id: generateId(), type: 'text', content: `我收下啦，谢谢你送的${msg.giftName || '礼物'}～`, sender: 'user', timestamp: Date.now() });
  }, [addMessage, updateMessage]);
  const rejectGift = useCallback((msg: ChatMessage) => {
    if (msg.giftStatus !== 'pending') return;
    updateMessage(msg.id, { giftStatus: 'rejected' });
    addMessage({ id: generateId(), type: 'text', content: `心意收到啦，${msg.giftName || '礼物'}就不收啦～`, sender: 'user', timestamp: Date.now() });
  }, [addMessage, updateMessage]);

  /* ── 对面问一问：按设定概率从问题池随机抽一条提问 ── */
  const triggerSystemQuestion = useCallback((delayMs: number, senderName?: string) => {
    if (Math.random() * 100 >= 2) return;
    setTimeout(() => {
      const q = OPPONENT_QUESTIONS[Math.floor(Math.random() * OPPONENT_QUESTIONS.length)];
      // 不再把问题发到聊天框，改为弹出小窗让用户回答
      setIncomingQuestion(q);
      setQuestionAnswerText('');
    }, delayMs);
  }, []);

  /* ── 群聊成员随机选择 ── */
  const pickGroupMember = useCallback(() => {
    if (!contact.isGroup || contact.groupMemberIds.length === 0) return null;
    const memberContacts = contacts.filter((c: ContactSettings) => contact.groupMemberIds.includes(c.id));
    if (memberContacts.length === 0) return null;
    return memberContacts[Math.floor(Math.random() * memberContacts.length)];
  }, [contact, contacts]);

  // 按联系人ID读取字卡（用于群聊成员用自己的字卡；空时回退到全局字卡）
  const getMemberCards = useCallback((memberId: string) => {
    try {
      const d = dbGet(`soulcard_${memberId}_cards`);
      const memberCards = d ? (JSON.parse(d) as CardItem[]) : [];
      return memberCards.length > 0 ? memberCards : cards;
    } catch { return cards; }
  }, [cards]);

  // 按联系人ID读取语音字卡（空时回退到全局语音字卡）
  const getMemberVoiceCards = useCallback((memberId: string) => {
    try {
      const d = dbGet(`soulcard_${memberId}_voice_cards`);
      const memberVCs = d ? (JSON.parse(d) as VoiceCard[]) : [];
      return memberVCs.length > 0 ? memberVCs : voiceCards;
    } catch { return voiceCards; }
  }, [voiceCards]);

  /* ── 回复逻辑（拼字卡/引用/语音/文字/表情包/拍一拍 可组合） ── */
  const triggerReply = useCallback((lastUserMsg?: ChatMessage) => {
    if (replyPendingRef.current) return; // 正在回复中，防止积压
    replyPendingRef.current = true;

    // 如有未完成的问卷，给对方一段“犹豫”的输入时间，但不阻塞正常回复。
    // 问卷会在约 1 分钟内自动回答；期间用户发送的普通消息仍应得到回应，避免一直只显示输入中。
    const pendingQ = questionnaires.find(q => !q.answeredAt);
    if (pendingQ) {
      replyTimeoutsRef.current.push(setTimeout(() => {
        if (!qTypingRef.current) setIsTyping(false);
      }, 1500));
    }
    // 群聊时随机选一个成员，使用成员各自的设置和字卡
    const member = pickGroupMember();
    const senderName = member?.nickname;
    const memberId = member?.id || contact.id;

    // 取该成员的设置（群聊用成员自己的，单聊用当前联系人的）
    const settings = member || contact;
    const delayMs = (settings.replyDelaySec || 2) * 1000;

    // 取该成员的字卡池（群聊用成员自己的，单聊用当前联系人的），过滤被屏蔽的
    let memberCards = member ? getMemberCards(memberId) : cards;
    memberCards = memberCards.filter(c => !c.blocked);
    const memberVoiceCards = member ? getMemberVoiceCards(memberId) : voiceCards;

    if (memberCards.length === 0 && cards.filter(c => !c.blocked).length === 0) {
      toast.error('请先添加字卡内容');
      replyPendingRef.current = false;
      return;
    }

    // 不回复概率由联系人设置控制；同时限制对方连续发送 4 条后不再回复，避免刷屏
    const recentSystemCount = messages.slice(-4).filter(m => m.sender === 'system' && m.type !== 'tap' && m.type !== 'call').length;
    const noReplyChance = settings.noReplyChance ?? SYSTEM_FIXED.noReplyChance;
    const shouldForce = forceReplyRef.current;
    const noReply = !shouldForce && (Math.random() * 100 < noReplyChance || recentSystemCount >= 4);
    if (shouldForce) forceReplyRef.current = false;

    setIsTyping(true);

    // ── 主回复类型（拼字卡/引用/语音/普通文字）概率池中只选一种 ──
    // 各概率优先读取联系人设置，缺失时回退到系统固定值
    const combineChance = typeof settings.combineCardChance === 'number'
      ? settings.combineCardChance
      : 0;
    const combineMax = Math.min(typeof settings.combineCardMax === 'number'
      ? settings.combineCardMax
      : SYSTEM_FIXED.combineCardMax, 3);
    const replyQuoteChance = settings.replyQuoteChance ?? SYSTEM_FIXED.replyQuoteChance;
    const autoVoiceChance = settings.autoVoiceChance ?? SYSTEM_FIXED.autoVoiceChance;
    const canCombine = memberCards.length >= 2 && combineChance > 0;
    const canVoice = memberVoiceCards.length > 0 && autoVoiceChance > 0;
    const canQuote = replyQuoteChance > 0;
    const options: { type: 'combine' | 'quote' | 'voice' | 'normal'; weight: number }[] = [
      { type: 'combine', weight: canCombine ? combineChance : 0 },
      { type: 'quote', weight: canQuote ? replyQuoteChance : 0 },
      { type: 'voice', weight: canVoice ? autoVoiceChance : 0 },
      { type: 'normal', weight: Math.max(0, 100 - (canCombine ? combineChance : 0) - (canQuote ? replyQuoteChance : 0) - (canVoice ? autoVoiceChance : 0)) },
    ];
    const total = options.reduce((s, o) => s + o.weight, 0);
    const r = total > 0 ? Math.random() * total : 0;
    let cum = 0;
    let mainDelay = delayMs;
    let sentMain = false;
    const selected = options.find(o => o.weight > 0 && (cum += o.weight) > r)?.type || 'normal';

    const sendTextOrVoice = async (content: string, quotedId?: string) => {
      const hasTtsEnv = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
      const useVoice = miniMaxSettings.enabled && hasTtsEnv && Math.random() < 0.2;
      if (useVoice) {
        try {
          const { audioUrl, audioLength } = await generateSpeech({
            text: content,
            voiceId: miniMaxSettings.voiceId,
            apiKey: miniMaxSettings.apiKey,
            groupId: miniMaxSettings.groupId,
            speed: miniMaxSettings.speed,
          });
          const duration = audioLength > 0 ? Math.ceil(audioLength / 1000) : Math.max(1, Math.ceil(content.length / 3));
          addMessage({ id: generateId(), type: 'voice', content: audioUrl, sender: 'system', timestamp: Date.now(), duration, senderName, quotedId });
          return;
        } catch (err) {
          toast.error(err instanceof Error ? err.message : '语音发送失败，已发送文字');
        }
      }
      addMessage({ id: generateId(), type: 'text', content, sender: 'system', timestamp: Date.now(), senderName, quotedId });
    };

    // 统一的主回复调度：记录预计触发时间与执行函数，供后台节流后补偿
    const scheduleMain = (fn: () => void, delay: number) => {
      mainReplyDueRef.current = Date.now() + delay;
      fireMainReplyRef.current = fn;
      replyTimeoutsRef.current.push(setTimeout(() => {
        // 若已被可见性补偿提前触发，则跳过，避免重复回复
        if (fireMainReplyRef.current !== fn) return;
        mainReplyDueRef.current = null;
        fireMainReplyRef.current = null;
        fn();
      }, delay));
    };

    if (!noReply && selected === 'combine') {
      scheduleMain(() => {
        const maxC = Math.min(combineMax, memberCards.length);
        const count = 2 + Math.floor(Math.random() * (maxC - 1));
        const picked = [...memberCards].sort(() => Math.random() - 0.5).slice(0, count);
        const content = picked.map(c => c.content).join('，');
        void sendTextOrVoice(content);
      }, delayMs);
      sentMain = true;
    } else if (!noReply && selected === 'quote') {
      const target = lastUserMsg && lastUserMsg.sender === 'user' && !lastUserMsg.recalled
        ? lastUserMsg
        : messages.filter(m => m.sender === 'user' && !m.recalled && m.type !== 'tap' && m.type !== 'call').pop();
      if (target) {
        scheduleMain(() => {
          const content = pickContent(memberCards);
          void sendTextOrVoice(content, target.id);
        }, delayMs);
        sentMain = true;
      }
    } else if (!noReply && selected === 'voice') {
      scheduleMain(() => {
        const vc = memberVoiceCards[Math.floor(Math.random() * memberVoiceCards.length)];
        addMessage({ id: generateId(), type: 'voice', content: vc.data, sender: 'system', timestamp: Date.now(), duration: vc.duration, senderName });
      }, delayMs);
      sentMain = true;
    }
    if (!noReply && !sentMain) {
      // 按设置的句数区间发送独立字卡
      const min = Math.max(1, settings.sysMinSentences ?? 1);
      const max = Math.max(min, settings.sysMaxSentences ?? 1);
      const count = min === max ? min : min + Math.floor(Math.random() * (max - min + 1));
      const shuffled = [...memberCards].sort(() => Math.random() - 0.5).slice(0, count);
      const messageInterval = 500; // 句间固定 0.5 秒，避免总时长被设置放大
      shuffled.forEach((card, i) => {
        replyTimeoutsRef.current.push(setTimeout(() => {
          void sendTextOrVoice(card.content);
        }, delayMs + i * messageInterval));
      });
      mainDelay = delayMs + (count - 1) * messageInterval;
      sentMain = true;
    }

    // ── 拍一拍：独立概率，但受 noReply 控制 ──
    const tapW = settings.autoTapChance ?? SYSTEM_FIXED.autoTapChance;
    if (!noReply && tapW > 0 && Math.random() * 100 < tapW) {
      replyTimeoutsRef.current.push(setTimeout(() => { theirTap(senderName); }, delayMs + 400));
    }

    // ── 表情包：独立概率，但受 noReply 控制 ──
    const emojiChance = settings.autoEmojiChance ?? SYSTEM_FIXED.autoEmojiChance;
    const emojiW = emojis.length > 0 ? emojiChance : 0;
    if (!noReply && emojiW > 0 && Math.random() * 100 < emojiW) {
      replyTimeoutsRef.current.push(setTimeout(() => {
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        addMessage({ id: generateId(), type: 'emoji', content: emoji.url, sender: 'system', timestamp: Date.now(), senderName });
      }, delayMs + 800));
    }

    // ── 关闭输入中状态 ──
    replyTimeoutsRef.current.push(setTimeout(() => { setIsTyping(false); replyPendingRef.current = false; }, mainDelay + 200));

    // ── 转账：独立概率，但受 noReply 控制 ──
    if (!noReply) {
      const transferChance = settings.transferChance ?? SYSTEM_FIXED.transferChance;
      triggerSystemTransfer(mainDelay + 500, senderName, transferChance, settings.transferAmounts);
    }

    // ── 商店礼物：独立概率，但受 noReply 控制 ──
    if (!noReply) {
      triggerSystemShopGift(mainDelay + 700, senderName);
    }

    // ── 一起听歌邀请：独立概率（5%），不依赖 noReply ──
    if (contact.musicEnabled !== false && (contact.musicPlaylist?.length ?? 0) > 0 && Math.random() * 100 < 5) {
      replyTimeoutsRef.current.push(setTimeout(() => {
        const song = contact.musicPlaylist![Math.floor(Math.random() * contact.musicPlaylist!.length)];
        addMessage({
          id: generateId(),
          type: 'music_invite',
          content: song.id,
          sender: 'system',
          timestamp: Date.now(),
          senderName,
          meta: JSON.stringify({ songName: song.name, songUrl: song.url }),
        });
      }, delayMs + 600));
    }

    // ── 对面问一问：独立触发，不依赖 noReply ──
    triggerSystemQuestion(delayMs + 800, senderName);
  }, [cards, voiceCards, emojis, messages, contact, questionnaires, addMessage, theirTap, triggerSystemTransfer, triggerSystemQuestion, pickContent, pickGroupMember, contacts, getMemberCards, getMemberVoiceCards, miniMaxSettings]);

  // 切换联系人时立刻清掉旧定时器，防止上一联系人的回复误发到当前联系人
  useEffect(() => {
    replyTimeoutsRef.current.forEach(clearTimeout);
    replyTimeoutsRef.current = [];
    replyPendingRef.current = false;
    setIsTyping(false);
    resumedReplyRef.current = false;
  }, [contact.id]);

  // 卸载时清理未触发的回复定时器，防止退出重进后旧定时器捣乱
  useEffect(() => {
    return () => {
      replyTimeoutsRef.current.forEach(clearTimeout);
      replyTimeoutsRef.current = [];
    };
  }, []);

  // 后台/切应用时浏览器会节流 setTimeout，页面重新可见后若主回复已到点却没发出，立即补发
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const due = mainReplyDueRef.current;
      const fire = fireMainReplyRef.current;
      if (due && fire && Date.now() >= due) {
        mainReplyDueRef.current = null;
        fireMainReplyRef.current = null;
        fire();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);

  // 退出重进后恢复对方输入：若最后一条是用户消息且没有待回复，自动续上
  const resumedReplyRef = useRef(false);
  useEffect(() => {
    if (resumedReplyRef.current) return;
    const last = messages[messages.length - 1];
    if (last && last.sender === 'user' && !replyPendingRef.current) {
      resumedReplyRef.current = true;
      triggerReply(last);
    }
  }, [messages, triggerReply]);

  // 清理连接检测计时器
  useEffect(() => {
    return () => {
      if (connectionTimerRef.current) {
        clearInterval(connectionTimerRef.current);
        connectionTimerRef.current = null;
      }
    };
  }, []);

  const sendMsg = (msg: ChatMessage) => {
    addMessage(msg);
    setQuotedMsg(null);
    // 连续说模式下不触发对方回复，等用户点击「完成」后统一回复
    if (!multiSend) triggerReply(msg);
    setSendPulse(true);
    setTimeout(() => setSendPulse(false), 300);
  };

  const endMultiSend = () => {
    setMultiSend(false);
    toast.success('连续说已结束，对方将回复');
    triggerReply();
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    sendMsg({ id: generateId(), type: 'text', content: text, sender: 'user', timestamp: Date.now(), quotedId: quotedMsg?.id });
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // 继续说：不发送用户消息，强制触发对方回复；若当前正有回复队列，先清掉重新来
  const handleContinueTalk = () => {
    replyTimeoutsRef.current.forEach(clearTimeout);
    replyTimeoutsRef.current = [];
    setIsTyping(false);
    replyPendingRef.current = false;
    forceReplyRef.current = true;
    triggerReply();
  };

  // 提醒对方发朋友圈：30 秒后由系统生成一条对方朋友圈
  const handleRemindMoment = () => {
    toast.success('已提醒对方，30 秒后会发条朋友圈');
    setFabOpen(false);
    setTimeout(() => {
      const m = addOpponentMoment();
      if (m) toast.success('对方发了一条朋友圈');
    }, 30000);
  };

  /* ── 撤回 / 引用 ── */
  const handleRecall = (msg: ChatMessage) => { updateMessage(msg.id, { recalled: true }); setLongPressMsg(null); toast.success('消息已撤回'); };
  const handleQuote = (msg: ChatMessage) => { setQuotedMsg(msg); setLongPressMsg(null); };

  /* ── 长按 ── */
  const startLongPress = (e: React.TouchEvent | React.MouseEvent, msg: ChatMessage) => {
    longPressTimer.current = setTimeout(() => setLongPressMsg(msg), 500);
    void e;
  };
  const cancelLongPress = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

  /* ── 我拍一拍对方：只在聊天记录里出现居中灰字，不再弹浮层 ── */
  const handleTap = () => {
    const raw = contact.tapMessages || [];
    const pool = raw.filter(Boolean).length > 0 ? raw.filter(Boolean) : [contact.tapMessageMe || contact.tapMessage || '轻轻拍了拍'];
    const action = pool[Math.floor(Math.random() * pool.length)];
    const text = `你${action}${contact.nickname}`;
    addMessage({ id: generateId(), type: 'tap', content: text, sender: 'user', timestamp: Date.now() });
  };

  /* ── 对方头像：单击直接拍一拍 / 长按打开资料卡 ── */
  const startAvatarPress = () => {
    if (contact.isGroup) return;
    avatarLongPressed.current = false;
    avatarPressTimer.current = setTimeout(() => {
      avatarPressTimer.current = null;
      avatarLongPressed.current = true;
      setShowAvatarInfo(true);
    }, 500);
  };
  const endAvatarPress = () => {
    if (avatarPressTimer.current) { clearTimeout(avatarPressTimer.current); avatarPressTimer.current = null; }
  };
  const handleAvatarTap = () => {
    if (contact.isGroup) return;
    if (avatarLongPressed.current) { avatarLongPressed.current = false; return; }
    handleTap();
  };

  /* ── 发图片 ── */
  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('图片不能超过5MB'); return; }
    try {
      const { compressImage } = await import('@/utils/imageUtils');
      const url = await compressImage(file, 1600, 1600, 0.85);
      sendMsg({ id: generateId(), type: 'image', content: url, sender: 'user', timestamp: Date.now() });
      setShowPlus(false);
    } catch {
      toast.error('图片处理失败');
    }
  };

  /* ── 表情包 ── */
  const handleEmojiImport = async (files: FileList | null) => {
    if (!files) return;
    const toImport = Array.from(files);
    const { compressImage } = await import('@/utils/imageUtils');
    let success = 0;
    for (const file of toImport) {
      try {
        const url = await compressImage(file, 240, 240, 0.75);
        addEmoji({ id: generateId(), name: file.name, url } as EmojiPack);
        success++;
      } catch {
        toast.error(`${file.name} 压缩失败`);
      }
    }
    if (success > 0) toast.success(`已导入 ${success} 个表情`);
  };
  const sendEmoji = (url: string) => { sendMsg({ id: generateId(), type: 'emoji', content: url, sender: 'user', timestamp: Date.now() }); setShowEmoji(false); };

  /* ── 语音录制 ── */
  const startRecord = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error('当前浏览器不支持麦克风录音');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // 自动选择浏览器支持的最佳录音格式，无特定格式时降级为默认
      const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/aac',
        'audio/ogg;codecs=opus',
        'audio/ogg',
      ];
      const mimeType = candidates.find(t => MediaRecorder.isTypeSupported(t)) || '';
      const mr = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      const actualMimeType = mr.mimeType || mimeType || 'audio/webm';
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onerror = () => {
        toast.error('录音失败，请重试');
        stream.getTracks().forEach(t => t.stop());
        stopRecordState();
      };
      mr.onstop = () => {
        const sec = recordSecRef.current;
        if (sec < 1) {
          toast.error('录音时间太短');
          stream.getTracks().forEach(t => t.stop());
          stopRecordState();
          return;
        }
        const blob = new Blob(chunksRef.current, { type: actualMimeType });
        const reader = new FileReader();
        reader.onload = ev => {
          sendMsg({ id: generateId(), type: 'voice', content: ev.target?.result as string, sender: 'user', timestamp: Date.now(), duration: sec });
          stream.getTracks().forEach(t => t.stop());
          stopRecordState(); setShowPlus(false);
        };
        reader.onerror = () => {
          toast.error('语音读取失败');
          stream.getTracks().forEach(t => t.stop());
          stopRecordState();
        };
        reader.readAsDataURL(blob);
      };
      mr.start(); mediaRef.current = mr;
      setRecording(true); setRecordSeconds(0); recordSecRef.current = 0;
      timerRef.current = setInterval(() => { recordSecRef.current += 1; setRecordSeconds(recordSecRef.current); }, 1000);
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        toast.error('请允许麦克风权限');
      } else if (err?.name === 'NotFoundError') {
        toast.error('未找到麦克风设备');
      } else {
        toast.error('录音初始化失败，请检查浏览器权限');
      }
    }
  };
  const stopRecordState = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    setRecordSeconds(0); recordSecRef.current = 0;
  };
  const stopRecord = () => { mediaRef.current?.stop(); };

  /* ── 播放语音 ── */
  const playVoice = (msg: ChatMessage) => {
    if (playingId === msg.id) { audioRef.current?.pause(); setPlayingId(null); return; }
    audioRef.current?.pause();
    const a = new Audio(msg.content);
    a.onended = () => setPlayingId(null);
    a.onerror = () => {
      setPlayingId(null);
      toast.error('语音播放失败，格式可能不被当前浏览器支持');
    };
    a.play().catch(() => {
      setPlayingId(null);
      toast.error('语音播放失败，请检查浏览器权限');
    });
    audioRef.current = a; setPlayingId(msg.id);
  };

  const getMsg = (id?: string) => id ? messages.find(m => m.id === id) : null;

  const chatBgOpacity = appearance.backgroundOpacity ?? 1;
  const chatBgColor = (() => {
    const hex = appearance.backgroundColor || '#FFFFFF';
    const clean = hex.replace('#', '');
    const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
    const bigint = parseInt(full, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${chatBgOpacity})`;
  })();
  const bubbleStyle = (sender: 'user' | 'system'): React.CSSProperties => ({
    backgroundColor: sender === 'user' ? appearance.userBubbleColor : appearance.systemBubbleColor,
    color: sender === 'user' ? appearance.userBubbleTextColor : appearance.systemBubbleTextColor,
    borderRadius: appearance.borderRadius,
    fontFamily: appearance.fontFamily,
    fontSize: appearance.bubbleFontSize ?? 14,
    padding: appearance.bubblePadding ?? 10,
    boxShadow: appearance.shadowEnabled ? `0 ${appearance.shadowDepth}px ${appearance.shadowDepth * 3}px rgba(0,0,0,0.08)` : 'none',
  });

  const isUser = (msg: ChatMessage) => msg.sender === 'user';

  /* ── 连接检测 ── */
  const closeConnectionTest = useCallback(() => {
    if (connectionTimerRef.current) {
      clearInterval(connectionTimerRef.current);
      connectionTimerRef.current = null;
    }
    setShowConnectionTest(false);
  }, []);

  const runConnectionTest = useCallback(() => {
    if (connectionTimerRef.current) {
      clearInterval(connectionTimerRef.current);
      connectionTimerRef.current = null;
    }
    setConnectionResult(null);
    setConnectionProgress(0);
    setConnectionPhase('正在接入对方信号…');
    const finalDepth = +(Math.random() * 0.75 + 0.15).toFixed(2);
    const phases = ['正在接入对方信号…', '正在比对心跳频率…', '正在计算灵魂共振…'];
    const duration = 2800;
    const step = 40;
    const totalSteps = Math.ceil(duration / step);
    let stepCount = 0;
    connectionTimerRef.current = setInterval(() => {
      stepCount += 1;
      const progress = Math.min(100, Math.floor((stepCount / totalSteps) * 100));
      setConnectionProgress(progress);
      const phaseIndex = Math.min(phases.length - 1, Math.floor((stepCount / totalSteps) * phases.length));
      setConnectionPhase(phases[phaseIndex]);
      if (stepCount >= totalSteps) {
        if (connectionTimerRef.current) {
          clearInterval(connectionTimerRef.current);
          connectionTimerRef.current = null;
        }
        let label = '心意相通';
        if (finalDepth >= 0.9) label = '灵魂共振';
        else if (finalDepth >= 0.75) label = '深度连接';
        else if (finalDepth < 0.4) label = '连接较低';
        setConnectionResult({ connected: true, depth: finalDepth, label });
      }
    }, step);
  }, []);

  /* ── 加号面板配置 ── */
  const plusItemsRaw = [
    {
      icon: recording ? <MicOff className="w-6 h-6" strokeWidth={1.6} /> : <Mic className="w-6 h-6" strokeWidth={1.6} />,
      label: recording ? `${recordSeconds}s` : '语音',
      onClick: recording ? stopRecord : startRecord,
    },
    { icon: <ImageIcon className="w-6 h-6" strokeWidth={1.6} />, label: '图片', onClick: () => fileRef.current?.click() },
    { icon: <Phone className="w-6 h-6" strokeWidth={1.6} />, label: '通话', onClick: () => { setShowPlus(false); window.dispatchEvent(new CustomEvent('startCall')); } },
    { icon: <Mail className="w-6 h-6" strokeWidth={1.6} />, label: '写信', onClick: () => { setShowPlus(false); navigate('/letter/write'); } },
    { icon: <CreditCard className="w-6 h-6" strokeWidth={1.6} />, label: '转账', onClick: () => {
      setShowPlus(false);
      // 从字卡池选一句作为默认转账说明
      const randomNote = cards.length > 0 ? pickContent(cards) : '转账';
      setTransferNote(randomNote);
      setShowTransfer(true);
    } },
    { icon: <ClipboardList className="w-6 h-6" strokeWidth={1.6} />, label: '问卷', onClick: () => { setShowPlus(false); navigate('/questionnaire'); } },
    { icon: <Store className="w-6 h-6" strokeWidth={1.6} />, label: '商店', onClick: () => { setShowPlus(false); setShowStore(true); } },
    { icon: <BookOpen className="w-6 h-6" strokeWidth={1.6} />, label: '小本本', onClick: () => { setShowPlus(false); setShowNotebook(true); } },
    { icon: <BookHeart className="w-6 h-6" strokeWidth={1.6} />, label: '日记', onClick: () => { setShowPlus(false); navigate('/diary'); } },
    { icon: <Activity className="w-6 h-6" strokeWidth={1.6} />, label: '检测链接', onClick: () => { setShowPlus(false); setShowConnectionTest(true); runConnectionTest(); } },
    { icon: <Camera className="w-6 h-6" strokeWidth={1.6} />, label: '催发朋友圈', onClick: () => { setShowPlus(false); handleRemindMoment(); } },
    { icon: <MessagesSquare className="w-6 h-6" strokeWidth={1.6} />, label: multiSend ? '结束连续说' : '连续说', onClick: () => {
      setShowPlus(false);
      if (multiSend) {
        endMultiSend();
      } else {
        setMultiSend(true);
        toast.success('已开启连续说，可连续发送消息，点击「完成」结束');
      }
    } },
  ];
  // 群聊隐藏写信和问卷
  const plusItems = contact.isGroup ? plusItemsRaw.filter(item => item.label !== '写信' && item.label !== '问卷') : plusItemsRaw;

  const isDark = appearance.darkMode;

  return (
    <div className={`flex flex-col h-dvh w-full overflow-hidden ${isDark ? 'bg-[#0d0d0d]' : 'bg-white'}`}>
      {/* 全局气泡CSS（干净圆角样式 + 自定义CSS）注入 */}
      <style>{`.sc-bubble{border-radius:${appearance.borderRadius}px;font-family:${appearance.fontFamily};}.sc-user{background-color:${appearance.userBubbleColor} !important;color:${appearance.userBubbleTextColor};}.sc-sys{background-color:${appearance.systemBubbleColor} !important;color:${appearance.systemBubbleTextColor};}${appearance.customCss || ''}`}</style>

      {/* ── 顶部栏 ── */}
      <header className={`shrink-0 h-14 px-4 flex items-center justify-between ${isDark ? 'bg-[#1a1a1a] border-b border-gray-800' : 'bg-white border-b border-gray-100'} z-20 shadow-[0_1px_8px_rgba(0,0,0,0.04)]`} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {/* 左：返回桌面 + 联系人 */}
        <div className="flex items-center gap-2">
          <button
            className="w-8 h-8 flex items-center justify-center text-gray-500 active:bg-gray-50 rounded-full transition-colors"
            onClick={() => navigate('/')}
          >
            <ChevronDown className="w-4 h-4 rotate-90" />
          </button>
          <button
            className="flex items-center gap-1 text-gray-500 active:scale-95 transition-transform"
            onClick={() => navigate('/settings/contacts')}>
            <span className="text-sm font-medium">联系人</span>
          </button>
        </div>

        {/* 中：昵称 + 状态 */}
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center" onDoubleClick={handleTap}>
          {isTyping
            ? <span className={`text-xs animate-pulse ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>对方正在输入中…</span>
            : <>
                <span className={`text-[15px] font-bold leading-tight ${isDark ? 'text-gray-100' : 'text-gray-900'}`} style={{ fontFamily: appearance.fontFamily }}>
                  {contact.nickname}
                </span>
                <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{currentBoxName}</span>
                {contact.isGroup ? (
                  <span className={`text-[10px] mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{contact.groupMemberIds.length} 人</span>
                ) : (
                  <span className="flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="text-[10px] text-green-500 font-medium">在线</span>
                  </span>
                )}
              </>
          }
        </div>

        {/* 右：夜间模式 + 设置 */}
        <div className="flex items-center gap-1">
          <button
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${isDark ? 'text-yellow-400 active:bg-gray-800' : 'text-gray-400 active:bg-gray-50'}`}
            onClick={() => updateAppearance({ ...appearance, darkMode: !isDark })}
            title={isDark ? '切换日间模式' : '切换夜间模式'}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${isDark ? 'text-gray-400 active:bg-gray-800' : 'text-gray-400 active:bg-gray-50'}`}
            onClick={() => navigate('/chat/settings')}>
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── 聊天记录 ── */}
      <div className="flex-1 overflow-y-auto relative min-h-0">
        <div className="absolute inset-0 pointer-events-none z-0">
          {STARS.map((s, i) => <Star key={i} style={{ position: 'absolute', top: s.top, left: s.left }} />)}
        </div>
        <div className="relative z-10 px-3 py-4 space-y-3 min-h-full">
          {/* 背景层置于内容容器内：覆盖全部滚动内容高度，下滑时背景不再消失 */}
          {appearance.backgroundType === 'image' && appearance.backgroundImage && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ backgroundImage: `url(${appearance.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', opacity: chatBgOpacity }}
            />
          )}
          {appearance.backgroundType !== 'image' && (
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: chatBgColor }} />
          )}
          {messages.length === 0 && (
            <p className={`text-center text-sm mt-16 ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>发送消息，让灵魂为你指引方向</p>
          )}
          {displayCount < messages.length && (
            <div className="flex justify-center py-2">
              <button
                onClick={() => setDisplayCount(c => Math.min(messages.length, c + 100))}
                className={`text-xs px-3 py-1.5 rounded-full ${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-500 hover:bg-gray-50'} shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
              >
                加载更早的消息
              </button>
            </div>
          )}
          {displayMessages.map((msg, idx) => {
            if (msg.recalled) return (
              <div key={msg.id} className="flex justify-center">
                <span className={`text-xs rounded-full px-3 py-1 ${isDark ? 'text-gray-300 bg-white/10' : 'text-gray-500 bg-black/5'}`}>
                  {isUser(msg) ? '你撤回了一条消息' : '对方撤回了一条消息'}
                </span>
              </div>
            );
            if (msg.type === 'tap') return (
              <div key={msg.id} className="flex justify-center">
                <span className={`text-xs font-medium rounded-full px-3 py-1 ${isDark ? 'text-gray-100 bg-white/20' : 'text-gray-600 bg-black/10'}`}>{msg.content}</span>
              </div>
            );
            if (msg.type === 'call') return (
              <div key={msg.id} className="flex justify-center">
                <span className={`flex items-center gap-1.5 text-xs rounded-full px-3 py-1 ${isDark ? 'text-gray-500 bg-black/30' : 'text-gray-400 bg-white/70'}`}>
                  <Phone className="w-3 h-3" />{msg.content}
                </span>
              </div>
            );
            if (msg.type === 'music_invite') {
              const meta = (() => {
                try { return JSON.parse(msg.meta || '{}'); } catch { return {}; }
              })();
              const songName = meta.songName || '一首歌';
              const accept = () => {
                updateContact({ ...contact, musicEnabled: true });
                updateMessage(msg.id, { type: 'text', content: `已同意和 ${contact.nickname} 一起听《${songName}》`, meta: undefined });
              };
              const decline = () => {
                updateMessage(msg.id, { type: 'text', content: `你拒绝了 ${contact.nickname} 的听歌邀请`, meta: undefined });
              };
              return (
                <div key={msg.id} className="flex justify-center my-3">
                  <div className={`rounded-2xl px-4 py-3 text-center max-w-[80%] ${isDark ? 'bg-black/40 border border-white/10' : 'bg-white/90 border border-black/5'}`} style={{ boxShadow: '0 8px 28px rgba(0,0,0,0.08)' }}>
                    <p className={`text-xs mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{contact.nickname} 邀请你一起听</p>
                    <p className="text-sm font-semibold mb-3" style={{ color: 'var(--accent-color)' }}>🎵 {songName}</p>
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={accept} className="px-4 py-1.5 rounded-full text-xs text-white active:scale-95 transition-transform" style={{ backgroundColor: 'var(--accent-color)' }}>同意</button>
                      <button onClick={decline} className={`px-4 py-1.5 rounded-full text-xs border active:scale-95 transition-transform ${isDark ? 'border-white/20 text-gray-300' : 'border-gray-200 text-gray-600'}`}>拒绝</button>
                    </div>
                  </div>
                </div>
              );
            }
            const quoted = getMsg(msg.quotedId);
            const myMsg = isUser(msg);
            const timeStr = (() => {
              const d = new Date(msg.timestamp);
              const pad = (n: number) => String(n).padStart(2, '0');
              return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
            })();
            return (
              <div key={msg.id}
                className={`flex items-end gap-2 animate-fade-in-up ${myMsg ? 'flex-row-reverse' : 'flex-row'}`}
                style={{ animationDelay: `${idx * 0.04}s` }}
                onMouseDown={e => startLongPress(e, msg)} onMouseUp={cancelLongPress} onMouseLeave={cancelLongPress}
                onTouchStart={e => startLongPress(e, msg)} onTouchEnd={cancelLongPress}>
                {/* 头像 + 时间 */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className={`w-9 h-9 rounded-full overflow-hidden flex items-center justify-center ${isDark ? 'bg-gray-800' : 'bg-gray-100'} ${!myMsg ? 'cursor-pointer' : ''}`}
                    onClick={!myMsg ? handleAvatarTap : undefined}
                    onTouchStart={!myMsg ? (e) => { e.stopPropagation(); startAvatarPress(); } : undefined}
                    onTouchEnd={!myMsg ? (e) => { e.stopPropagation(); endAvatarPress(); } : undefined}
                    onMouseDown={!myMsg ? (e) => { e.stopPropagation(); startAvatarPress(); } : undefined}
                    onMouseUp={!myMsg ? (e) => { e.stopPropagation(); endAvatarPress(); } : undefined}>
                    {(() => {
                      // 优先使用联系人设置里的头像；主屏幕头像仅作为兜底
                      if (myMsg) return <Avatar src={contact.myAvatar || homeSettings.avatar} fallback={contact.myName.charAt(0) || '我'} />;
                      // 群聊时找对应成员头像
                      if (contact.isGroup && msg.senderName) {
                        const member = contacts.find((c: ContactSettings) => c.nickname === msg.senderName);
                        if (member) return <Avatar src={member.theirAvatar} fallback={member.nickname.charAt(0)} />;
                      }
                      return <Avatar src={contact.theirAvatar} fallback={contact.nickname.charAt(0)} />;
                    })()}
                  </div>
                  <span className="text-[9px] leading-none" style={{ color: appearance.timeLabelColor || (isDark ? '#4b5563' : '#d1d5db') }}>{timeStr}</span>
                </div>
                {/* 气泡 */}
                <div className={`flex flex-col max-w-[72%] gap-1 ${myMsg ? 'items-end' : 'items-start'}`}>
                  {/* 群聊显示发送者昵称 */}
                  {!myMsg && contact.isGroup && msg.senderName && (
                    <span className="text-[10px] ml-1" style={{ color: appearance.nicknameColor || (isDark ? '#6b7280' : '#9ca3af') }}>{msg.senderName}</span>
                  )}
                  {quoted && !quoted.recalled && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs max-w-full ${isDark ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>
                      <Reply className="w-3 h-3 shrink-0" />
                      <span className="truncate">{quoted.content.slice(0, 30)}</span>
                    </div>
                  )}
                  <div>
                    {msg.type === 'text' && (
                      <div className={`sc-bubble ${myMsg ? 'sc-user' : 'sc-sys'} leading-relaxed break-words whitespace-pre-wrap`}
                        style={{ backgroundColor: myMsg ? appearance.userBubbleColor : appearance.systemBubbleColor, fontSize: appearance.bubbleFontSize ?? 14, padding: appearance.bubblePadding ?? 10, borderRadius: appearance.borderRadius, fontFamily: appearance.fontFamily, color: myMsg ? appearance.userBubbleTextColor : appearance.systemBubbleTextColor, boxShadow: appearance.shadowEnabled ? `0 ${appearance.shadowDepth}px ${appearance.shadowDepth * 3}px rgba(0,0,0,0.08)` : 'none', '--bubble-color': myMsg ? appearance.userBubbleColor : appearance.systemBubbleColor, '--bubble-text': myMsg ? appearance.userBubbleTextColor : appearance.systemBubbleTextColor } as React.CSSProperties}
                      >{msg.content}</div>
                    )}
                    {msg.type === 'voice' && (
                      <div className={`sc-bubble ${myMsg ? 'sc-user' : 'sc-sys'}`}
                        style={{ backgroundColor: myMsg ? appearance.userBubbleColor : appearance.systemBubbleColor, fontSize: appearance.bubbleFontSize ?? 14, padding: appearance.bubblePadding ?? 10, borderRadius: appearance.borderRadius, fontFamily: appearance.fontFamily, color: myMsg ? appearance.userBubbleTextColor : appearance.systemBubbleTextColor, boxShadow: appearance.shadowEnabled ? `0 ${appearance.shadowDepth}px ${appearance.shadowDepth * 3}px rgba(0,0,0,0.08)` : 'none', '--bubble-color': myMsg ? appearance.userBubbleColor : appearance.systemBubbleColor, '--bubble-text': myMsg ? appearance.userBubbleTextColor : appearance.systemBubbleTextColor } as React.CSSProperties}>
                        <VoiceBubble duration={msg.duration || 0} isPlaying={playingId === msg.id} onPlay={() => playVoice(msg)} color={myMsg ? appearance.userBubbleTextColor : appearance.systemBubbleTextColor} />
                      </div>
                    )}
                    {msg.type === 'image' && (
                        <div className="rounded-xl overflow-hidden max-w-[240px]" style={{ borderRadius: appearance.borderRadius }}>
                          <img src={msg.content} className="w-full h-auto max-h-[300px] object-contain" alt="图片" />
                        </div>
                      )}
                    {msg.type === 'emoji' && <img src={msg.content} className="object-contain" alt="表情" style={{ width: appearance.emojiSize ?? 64, height: appearance.emojiSize ?? 64 }} />}
                    {msg.type === 'transfer' && <TransferCard msg={msg} onClick={handleTransferClick} appearance={appearance} isDark={isDark} />}
                    {msg.type === 'gift' && (
                      <div className="relative max-w-[78%] min-w-[160px]">
                        <div className={`relative overflow-hidden rounded-3xl text-center border ${isDark ? 'border-white/10' : 'border-black/5'}`} style={{ borderRadius: appearance.borderRadius, boxShadow: appearance.shadowEnabled ? `0 ${appearance.shadowDepth * 1.5}px ${appearance.shadowDepth * 4}px rgba(0,0,0,0.14)` : '0 10px 24px rgba(0,0,0,0.12)' }}>
                          <div className={`px-5 pt-4 pb-3 ${isDark ? 'bg-[#1a1a1a]/90' : 'bg-white'}`}>
                            {/* 礼盒装饰 */}
                            <div className="relative w-[120px] h-[100px] mx-auto mb-3">
                              <svg viewBox="0 0 120 100" className="w-full h-full drop-shadow-md">
                                <defs>
                                  <linearGradient id={`giftGrad-${msg.id}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={isDark ? '#3a3a3a' : '#FFF1F2'} />
                                    <stop offset="100%" stopColor={isDark ? '#2a2a2a' : '#FCE7F3'} />
                                  </linearGradient>
                                </defs>
                                <rect x="10" y="35" width="100" height="60" rx="10" fill={`url(#giftGrad-${msg.id})`} />
                                <rect x="55" y="35" width="10" height="60" fill="var(--accent-color)" opacity="0.9" />
                                <rect x="10" y="55" width="100" height="10" fill="var(--accent-color)" opacity="0.9" />
                                <path d="M35 35 C35 20 45 15 55 30 C60 15 70 20 75 30 C80 15 90 20 90 35 Z" fill="var(--accent-color)" opacity="0.85" />
                                <circle cx="60" cy="55" r="18" fill={isDark ? '#262626' : 'white'} />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center pt-2">
                                {msg.giftImage ? (
                                  <img src={msg.giftImage} alt={msg.giftName} className="w-9 h-9 object-cover rounded-full border-2 border-white shadow-sm" />
                                ) : (
                                  <span className="text-2xl">{msg.giftIcon}</span>
                                )}
                              </div>
                            </div>
                            <p className={`text-sm font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{msg.giftName}</p>
                            <p className={`text-[11px] mt-1 ${msg.giftStatus === 'accepted' ? 'text-green-500' : msg.giftStatus === 'rejected' ? 'text-red-400' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              {msg.giftStatus === 'accepted' ? '对方已开心地收下' : msg.giftStatus === 'rejected' ? '对方婉拒了礼物' : '等待你拆开'}
                            </p>
                            {!myMsg && msg.giftStatus === 'pending' && (
                              <div className="flex items-center justify-center gap-2 mt-2">
                                <button onClick={() => acceptGift(msg)} className="px-4 py-1.5 rounded-full text-xs text-white active:scale-95 transition-transform" style={{ backgroundColor: 'var(--accent-color)' }}>收下</button>
                                <button onClick={() => rejectGift(msg)} className={`px-4 py-1.5 rounded-full text-xs border active:scale-95 transition-transform ${isDark ? 'border-white/20 text-gray-300' : 'border-gray-200 text-gray-600'}`}>拒收</button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] border ${isDark ? 'bg-[#1a1a1a] border-white/10 text-gray-300' : 'bg-white border-gray-100 text-gray-500'}`} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                          礼物
                        </div>
                      </div>
                    )}
                    {msg.giftCard && (
                      <div className={`self-center rounded-2xl px-5 py-3 text-center max-w-[75%] border ${isDark ? 'bg-[#1a1a1a]/80 border-white/10' : 'bg-white border-black/5'}`} style={{ borderRadius: appearance.borderRadius }}>
                        <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{msg.content}</p>
                      </div>
                    )}
                    {msg.type === 'questionnaire' && (
                      <QuestionnaireBubble msg={msg} isUser={myMsg} isDark={isDark} />
                    )}
                    {msg.type === 'question' && (
                      <button
                        onClick={() => {
                          if (msg.meta) { const data = JSON.parse(msg.meta) as { answered?: boolean }; if (data.answered) return; }
                          setAnswerQuestionMsg(msg);
                          setAnswerText('');
                        }}
                        className="self-center text-center max-w-[80%]"
                      >
                        <div className={`rounded-2xl px-5 py-3 border text-left ${isDark ? 'bg-[#1a1a1a]/80 border-white/10' : 'bg-white border-black/5'} active:scale-[0.98] transition-transform`} style={{ borderRadius: appearance.borderRadius }}>
                          <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>问一问 · 点击回答</p>
                          <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{msg.content}</p>
                        </div>
                      </button>
                    )}
                  </div>
                  {/* 已读：放在气泡内部 */}
                  {myMsg && msg.read && appearance.readReceiptPosition === 'inside' && (
                    <span className="text-[10px] leading-none mt-0.5" style={{ color: appearance.readReceiptColor || 'var(--accent-color)', opacity: 0.7 }}>已读</span>
                  )}
                </div>
                {/* 已读：放在气泡左侧（独立元素） */}
                {myMsg && msg.read && (!appearance.readReceiptPosition || appearance.readReceiptPosition === 'outside') && (
                  <span className="text-[10px] leading-none mb-1" style={{ color: appearance.readReceiptColor || 'var(--accent-color)', opacity: 0.7 }}>已读</span>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── 转账弹窗 ── */}
      {showTransfer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={() => setShowTransfer(false)}>
          <div className={`w-full max-w-md rounded-t-3xl px-6 pt-5 pb-8 shadow-2xl ${isDark ? 'bg-[#1a1a1a]' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-[16px] font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>发起转账</h3>
              <button onClick={() => setShowTransfer(false)}><X className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={`text-xs mb-1 block ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>金额（元）</label>
                <input type="number" min={0.01} step={0.01} value={transferInput}
                  onChange={e => setTransferInput(e.target.value)}
                  placeholder="0.00"
                  className={`w-full h-12 px-4 rounded-2xl text-[22px] font-bold outline-none border transition-colors ${isDark ? 'bg-gray-800 text-gray-100 border-gray-700 focus:border-[var(--accent-color)]' : 'bg-gray-50 text-gray-900 border-gray-100 focus:border-[var(--accent-color)]'}`} />
              </div>
              <div>
                <label className={`text-xs mb-1 block ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>转账说明</label>
                <input type="text" value={transferNote}
                  onChange={e => setTransferNote(e.target.value)}
                  placeholder="转账"
                  className={`w-full h-10 px-4 rounded-2xl text-sm outline-none border transition-colors ${isDark ? 'bg-gray-800 text-gray-200 border-gray-700 focus:border-[var(--accent-color)]' : 'bg-gray-50 text-gray-700 border-gray-100 focus:border-[var(--accent-color)]'}`} />
              </div>
              <button onClick={handleSendTransfer}
                className="w-full h-12 rounded-2xl text-white text-base font-bold transition-opacity active:opacity-80"
                style={{ background: `linear-gradient(90deg,${appearance.buttonColor || 'var(--accent-color)'},var(--accent-color))` }}>
                转账
              </button>
              <p className={`text-center text-[11px] ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>对方可能收款，也可能拒绝</p>
            </div>
          </div>
        </div>
      )}

      {/* ── 商店弹窗 ── */}
      {showStore && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setShowStore(false)}>
          <div className={`w-full max-w-[calc(100%-2rem)] md:max-w-md rounded-t-[2rem] shadow-2xl overflow-hidden ${isDark ? 'bg-[#1a1a1a]' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            {/* 顶部渐变区 */}
            <div className="relative h-24 px-6 pt-5 pb-4 flex flex-col justify-end" style={{ background: `linear-gradient(135deg,${appearance.buttonColor || 'var(--accent-color)'} 0%,var(--accent-color) 100%)` }}>
              <button onClick={() => setShowStore(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                <X className="w-4 h-4" />
              </button>
              <p className="text-white/70 text-xs font-medium mb-1">给 {contact.nickname} 的小惊喜</p>
              <h3 className="text-white text-lg font-bold">精选礼物商店</h3>
            </div>
            <div className="px-5 pt-5 pb-8">
              <div className="grid grid-cols-3 gap-3 mb-5 max-h-[260px] overflow-y-auto p-1">
                {gifts.map(item => (
                  <div key={item.id} className="relative group">
                    <button onClick={() => sendGift(item)} className={`w-full flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all active:scale-95 ${isDark ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-100 hover:border-[var(--accent-color)] hover:shadow-md'}`}>
                      {item.image ? (
                        <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm"><img src={item.image} alt={item.name} className="w-full h-full object-cover" /></div>
                      ) : (
                        <span className={`text-2xl w-12 h-12 flex items-center justify-center rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>{item.icon}</span>
                      )}
                      <span className={`text-xs truncate w-full text-center ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{item.name}</span>
                    </button>
                    <button onClick={e => { e.stopPropagation(); deleteGift(item.id); }} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {/* 点击加号添加新物品 */}
                <button onClick={() => setShowAddGiftForm(v => !v)} className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border-2 border-dashed transition-all active:scale-95 ${isDark ? 'bg-gray-800/40 border-gray-700 text-gray-400 hover:bg-gray-800/60 hover:border-[var(--accent-color)] hover:text-[var(--accent-color)]' : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-white hover:border-[var(--accent-color)] hover:text-[var(--accent-color)] hover:shadow-sm'} ${showAddGiftForm ? (isDark ? 'border-[var(--accent-color)] text-[var(--accent-color)]' : 'border-[var(--accent-color)] text-[var(--accent-color)]') : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-gray-700/60' : 'bg-white'}`}>
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-medium">添加</span>
                </button>
              </div>
              {showAddGiftForm && (
                <div className={`rounded-2xl p-4 space-y-3 ${isDark ? 'bg-gray-800/60' : 'bg-gray-50'}`}>
                  <div className="flex flex-wrap gap-2">
                    <input type="text" value={newGiftIcon} onChange={e => setNewGiftIcon(e.target.value)} placeholder="🎁" className={`w-12 h-10 text-center rounded-xl outline-none border text-lg shrink-0 ${isDark ? 'bg-gray-800 text-gray-100 border-gray-700' : 'bg-white text-gray-800 border-gray-200'}`} />
                    <input type="text" value={newGiftName} onChange={e => setNewGiftName(e.target.value)} placeholder="物品名称" className={`flex-1 min-w-0 h-10 px-3 rounded-xl outline-none border text-sm ${isDark ? 'bg-gray-800 text-gray-100 border-gray-700' : 'bg-white text-gray-800 border-gray-200'}`} />
                    <div className="flex gap-2 w-full sm:w-auto shrink-0">
                      <label className={`flex-1 h-10 px-3 rounded-xl border flex items-center justify-center cursor-pointer active:scale-95 transition-transform ${isDark ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-700'}`}>
                        <ImageIcon className="w-4 h-4" />
                        <input type="file" accept="image/*" className="hidden" onChange={addGift} />
                      </label>
                      <button onClick={() => addGift()} className="h-10 px-4 rounded-xl text-white text-sm font-medium active:scale-95 transition-transform" style={{ backgroundColor: 'var(--accent-color)' }}>添加</button>
                    </div>
                  </div>
                  {newGiftImage && (
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden">
                      <img src={newGiftImage} alt="预览" className="w-full h-full object-cover" />
                      <button onClick={() => setNewGiftImage('')} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/50 flex items-center justify-center"><X className="w-2.5 h-2.5 text-white" /></button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 问一问回答弹窗 ── */}
      {answerQuestionMsg && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setAnswerQuestionMsg(null)}>
          <div className={`w-full max-w-md rounded-t-[2rem] shadow-2xl px-5 pt-5 pb-8 ${isDark ? 'bg-[#1a1a1a]' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-[16px] font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>回答</h3>
              <button onClick={() => setAnswerQuestionMsg(null)}><X className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} /></button>
            </div>
            <div className={`rounded-2xl p-3 mb-4 ${isDark ? 'bg-gray-800/60 text-gray-200' : 'bg-gray-50 text-gray-700'}`}>
              <p className="text-sm">{answerQuestionMsg.content}</p>
            </div>
            <textarea
              value={answerText}
              onChange={e => setAnswerText(e.target.value)}
              placeholder="输入你的回答…"
              rows={3}
              className={`w-full rounded-2xl px-4 py-3 text-sm outline-none border resize-none mb-4 ${isDark ? 'bg-gray-800 text-gray-100 border-gray-700' : 'bg-gray-50 text-gray-800 border-gray-200'}`}
            />
            <button
              onClick={() => {
                const text = answerText.trim();
                if (!text) { toast.error('请先输入回答'); return; }
                if (answerQuestionMsg) {
                  updateMessage(answerQuestionMsg.id, { meta: JSON.stringify({ answered: true }) });
                  sendMsg({ id: generateId(), type: 'text', content: text, sender: 'user', timestamp: Date.now(), quotedId: answerQuestionMsg.id });
                }
                setAnswerQuestionMsg(null);
                setAnswerText('');
              }}
              className="w-full h-12 rounded-2xl text-white text-base font-bold active:opacity-90 transition-opacity"
              style={{ backgroundColor: 'var(--accent-color)' }}
            >
              发送回答
            </button>
          </div>
        </div>
      )}

      {/* ── 问一问弹窗（新提问，不在聊天框中显示） ── */}
      {incomingQuestion && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setIncomingQuestion(null)}>
          <div className={`w-full max-w-md rounded-t-[2rem] shadow-2xl px-5 pt-5 pb-8 ${isDark ? 'bg-[#1a1a1a]' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-[16px] font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>对方想问你</h3>
              <button onClick={() => setIncomingQuestion(null)}><X className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} /></button>
            </div>
            <div className={`rounded-2xl p-3 mb-4 ${isDark ? 'bg-gray-800/60 text-gray-200' : 'bg-gray-50 text-gray-700'}`}>
              <p className="text-sm">{incomingQuestion}</p>
            </div>
            <textarea
              value={questionAnswerText}
              onChange={e => setQuestionAnswerText(e.target.value)}
              placeholder="输入你的回答…"
              rows={3}
              className={`w-full rounded-2xl px-4 py-3 text-sm outline-none border resize-none mb-4 ${isDark ? 'bg-gray-800 text-gray-100 border-gray-700' : 'bg-gray-50 text-gray-800 border-gray-200'}`}
            />
            <button
              onClick={() => {
                const text = questionAnswerText.trim();
                if (!text) { toast.error('请先输入回答'); return; }
                sendMsg({ id: generateId(), type: 'text', content: text, sender: 'user', timestamp: Date.now() });
                setIncomingQuestion(null);
                setQuestionAnswerText('');
              }}
              className="w-full h-12 rounded-2xl text-white text-base font-bold active:opacity-90 transition-opacity"
              style={{ backgroundColor: 'var(--accent-color)' }}
            >
              发送回答
            </button>
          </div>
        </div>
      )}

      {/* ── 小本本（通话时长记录） ── */}
      {showNotebook && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={() => setShowNotebook(false)}>
          <div className={`w-full max-w-md rounded-t-3xl px-5 pt-5 pb-8 shadow-2xl max-h-[80vh] flex flex-col ${isDark ? 'bg-[#1a1a1a]' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h3 className={`text-[16px] font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>小本本</h3>
              <button onClick={() => setShowNotebook(false)}><X className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} /></button>
            </div>
            <div className={`rounded-2xl p-4 flex items-center gap-4 shrink-0 ${isDark ? 'bg-gray-800/60' : 'bg-gray-50'}`}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent-color)' }}>
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>和 {contact.nickname} 的累计通话</p>
                <p className={`text-xl font-bold mt-0.5 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                  {Math.floor((contact.companionSeconds || 0) / 60)}<span className="text-sm font-normal ml-1">分钟</span>
                </p>
              </div>
            </div>
            <div className="mt-4 flex-1 min-h-0 overflow-y-auto">
              <p className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>通话记录</p>
              <div className="space-y-2">
                {(() => {
                  const records = messages
                    .filter(m => m.type === 'call')
                    .sort((a, b) => b.timestamp - a.timestamp);
                  if (records.length === 0) {
                    return <p className={`text-center text-[11px] py-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>还没有通话记录</p>;
                  }
                  return records.map(m => {
                    const d = new Date(m.timestamp);
                    const dateStr = `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
                    let sec = typeof m.duration === 'number' ? m.duration : 0;
                    if (sec <= 0 && typeof m.content === 'string') {
                      const match = m.content.match(/(\d+):(\d+)/);
                      if (match) sec = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
                    }
                    const min = Math.floor(sec / 60);
                    const s = sec % 60;
                    return (
                      <div key={m.id} className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${isDark ? 'bg-gray-800/40' : 'bg-gray-50'}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <Phone className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                          <span className={`text-xs truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{dateStr}</span>
                        </div>
                        <span className={`text-xs font-medium shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {min > 0 ? `${min}分` : ''}{s > 0 ? `${s}秒` : sec > 0 ? '0秒' : '0秒'}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 长按菜单 ── */}
      {longPressMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setLongPressMsg(null)}>
          <div className={`rounded-3xl shadow-2xl overflow-hidden min-w-[160px] ${isDark ? 'bg-[#1a1a1a]' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <button className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm ${isDark ? 'text-gray-200 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-50'}`} onClick={() => handleQuote(longPressMsg)}>
              <CornerUpLeft className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />引用
            </button>
            <button className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm text-red-500 hover:bg-red-500/10 border-t ${isDark ? 'border-gray-800' : 'border-gray-100'}`} onClick={() => { if (longPressMsg) { deleteMessage(longPressMsg.id); setLongPressMsg(null); } }}>
              <Trash2 className="w-4 h-4" />删除
            </button>
            {longPressMsg.sender === 'user' && (
              <button className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm text-red-500 hover:bg-red-500/10 border-t ${isDark ? 'border-gray-800' : 'border-gray-100'}`} onClick={() => handleRecall(longPressMsg)}>
                <X className="w-4 h-4" />撤回
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── 头像信息弹窗 ── */}
      {showAvatarInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setShowAvatarInfo(false)}>
          <div className="bg-white rounded-[2rem] max-w-[300px] w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* 顶部装饰 */}
            <div className="flex justify-center mb-4">
              <div className="w-12 h-1 rounded-full bg-[var(--accent-light)]" />
            </div>
            {/* 头像 */}
            <div className="flex flex-col items-center gap-2 mb-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-[var(--accent-light)] flex items-center justify-center">
                  {contact.theirAvatar
                    ? <img src={contact.theirAvatar} className="w-full h-full object-cover" alt={contact.nickname} />
                    : <span className="text-2xl text-[var(--accent-color)]">{contact.nickname.charAt(0)}</span>}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[var(--accent-color)] flex items-center justify-center">
                  <Music className="w-3 h-3 text-white" />
                </div>
              </div>
              <p className="text-lg font-bold text-gray-800">{contact.nickname}</p>
              {/* 心情 */}
              {mood && (
                <div className="flex items-center gap-1.5 bg-[var(--accent-light)] rounded-full px-3 py-1">
                  <Sun className="w-3 h-3 text-[var(--accent-color)]" />
                  <span className="text-[11px] text-[var(--accent-color)] font-medium max-w-[200px] truncate">{mood}</span>
                </div>
              )}
            </div>
            {/* 信息卡片 */}
            <div className="space-y-3">
              {/* 初聊时间 */}
              {(() => {
                const firstMsg = messages.filter(m => m.sender === 'system' || m.sender === 'user').sort((a, b) => a.timestamp - b.timestamp)[0];
                if (!firstMsg) return null;
                const d = new Date(firstMsg.timestamp);
                return (
                  <div className="flex items-center gap-3 bg-[var(--accent-light)] rounded-2xl p-3">
                    <div className="w-8 h-8 rounded-xl bg-[var(--accent-color)]/10 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4 text-[var(--accent-color)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-[var(--accent-color)] font-medium">初聊时间</p>
                      <p className="text-xs text-gray-700 font-semibold">{d.getFullYear()}.{String(d.getMonth()+1).padStart(2,'0')}.{String(d.getDate()).padStart(2,'0')} {String(d.getHours()).padStart(2,'0')}:{String(d.getMinutes()).padStart(2,'0')}</p>
                    </div>
                  </div>
                );
              })()}
              {/* 通话时长 */}
              {(() => {
                const totalSec = messages.filter(m => m.type === 'call' && typeof m.duration === 'number').reduce((sum, m) => sum + (m.duration || 0), 0);
                if (totalSec <= 0) return null;
                const h = Math.floor(totalSec / 3600);
                const m = Math.floor((totalSec % 3600) / 60);
                const s = totalSec % 60;
                return (
                  <div className="flex items-center gap-3 bg-[var(--accent-light)] rounded-2xl p-3">
                    <div className="w-8 h-8 rounded-xl bg-[var(--accent-color)]/10 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-[var(--accent-color)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-[var(--accent-color)] font-medium">打电话时长</p>
                      <p className="text-xs text-gray-700 font-semibold">
                        {h > 0 ? `${h}时` : ''}{m > 0 ? `${m}分` : ''}{s > 0 ? `${s}秒` : totalSec > 0 ? '0秒' : ''}
                      </p>
                    </div>
                  </div>
                );
              })()}
              {/* 纪念日 */}
              <div className="flex items-center gap-3 bg-[var(--accent-light)] rounded-2xl p-3">
                <div className="w-8 h-8 rounded-xl bg-[var(--accent-color)]/10 flex items-center justify-center shrink-0">
                  <Heart className="w-4 h-4 text-[var(--accent-color)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-[var(--accent-color)] font-medium">纪念日</p>
                  <input
                    type="date"
                    value={contact.anniversary || ''}
                    onChange={e => updateAnniversary(e.target.value)}
                    className="text-xs text-gray-700 font-semibold bg-transparent outline-none w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 引用预览条 ── */}
      {quotedMsg && (
        <div className={`shrink-0 flex items-center gap-2 px-4 py-2 border-t ${isDark ? 'bg-[#1a1a1a] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
          <Reply className="w-4 h-4 text-[var(--accent-color)] shrink-0" />
          <span className={`flex-1 min-w-0 text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{quotedMsg.content.slice(0, 40)}</span>
          <button onClick={() => setQuotedMsg(null)}><X className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} /></button>
        </div>
      )}

      {/* ── 加号面板 ── */}
      {showPlus && (
        <div className={`shrink-0 border-t ${isDark ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-between px-4 pt-3">
            <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>更多功能</span>
            <button
              type="button"
              onClick={() => { setShowPlus(false); setFabOpen(false); }}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-100'}`}
              aria-label="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className={`px-4 pb-5 pt-2 grid grid-cols-4 gap-3`}>
            {plusItems.map((item, i) => (
              <button key={i} onClick={item.onClick} className="flex flex-col items-center gap-2 active:scale-95 transition-transform">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <span className="text-[var(--accent-color)]">{item.icon}</span>
                </div>
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 表情面板 ── */}
      {showEmoji && (
        <div className={`shrink-0 border-t p-4 ${isDark ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>表情包</span>
            <label className="flex items-center gap-1 text-xs text-[var(--accent-color)] cursor-pointer">
              <Plus className="w-3.5 h-3.5" />导入
              <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleEmojiImport(e.target.files)} />
            </label>
          </div>
          {emojis.length === 0 ? (
            <div className="text-center py-6">
              <p className={`text-xs mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>点击「导入」添加表情包</p>
              <label className="inline-flex items-center gap-1 text-sm text-[var(--accent-color)] cursor-pointer">
                <Plus className="w-4 h-4" />导入表情包
                <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleEmojiImport(e.target.files)} />
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto">
              {emojis.map(e => (
                <div key={e.id} className="relative aspect-square">
                  <button onClick={() => sendEmoji(e.url)} className="w-full h-full active:scale-95 transition-transform">
                    <img src={e.url} className="w-full h-full object-contain" alt="emoji" />
                  </button>
                  <button
                    onClick={() => deleteEmoji(e.id)}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center z-10 shadow-sm"
                    style={{ touchAction: 'manipulation' }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 连续说提示条 ── */}
      {multiSend && (
        <div className="shrink-0 px-3 py-2 flex items-center gap-2 border-t" style={{ backgroundColor: isDark ? '#1a1a1a' : '#fff7ed', borderColor: isDark ? '#1f2937' : '#fed7aa' }}>
          <MessagesSquare className="w-4 h-4 shrink-0" style={{ color: isDark ? '#fbbf24' : '#b45309' }} />
          <span className="text-xs flex-1 min-w-0 truncate" style={{ color: isDark ? '#fbbf24' : '#b45309' }}>连续说中：连续发送消息，对方暂不回复</span>
          <button onClick={endMultiSend} className="shrink-0 text-xs px-3 py-1.5 rounded-full text-white" style={{ background: 'var(--accent-color)' }}>完成</button>
        </div>
      )}

      {/* ── 底部输入栏 ── */}
      <div className="sc-chat-input-bar shrink-0 px-3 py-2.5 flex items-center gap-2 border-t transition-colors" style={{ backgroundColor: appearance.chatInputBg || (isDark ? '#1a1a1a' : '#ffffff'), borderColor: isDark ? '#1f2937' : '#f3f4f6', paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)' }}>
        <button onClick={() => { setShowPlus(!showPlus); setShowEmoji(false); }}
          className={`sc-chat-input-plus w-8 h-8 flex items-center justify-center rounded-full border transition-colors shrink-0 ${isDark ? 'border-gray-700 text-gray-500 hover:bg-gray-800' : 'border-gray-200 text-gray-400 hover:bg-gray-50'}`}>
          <Plus className="w-4 h-4" />
        </button>
        <button onClick={handleContinueTalk} title="继续说"
          className={`sc-chat-input-continue w-8 h-8 flex items-center justify-center rounded-full transition-colors shrink-0 ${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          <MessageSquare className="w-4 h-4" />
        </button>
        <button onClick={() => { setShowEmoji(!showEmoji); setShowPlus(false); }}
          className={`sc-chat-input-emoji w-8 h-8 flex items-center justify-center transition-colors shrink-0 ${isDark ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-500'}`}>
          <Smile className="w-5 h-5" />
        </button>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
          onFocus={() => { setShowPlus(false); setShowEmoji(false); }}
          placeholder="消息…"
          className="sc-chat-input-field flex-1 min-w-0 h-9 px-4 rounded-full text-sm outline-none"
          style={{ fontFamily: appearance.fontFamily, backgroundColor: appearance.chatInputBg ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)') : (isDark ? '#1f2937' : '#EFEFEF'), color: appearance.chatInputTextColor || (isDark ? '#f3f4f6' : '#1f2937') }} />
        {/* 圆形渐变发送键 */}
        <button type="button" onClick={(e) => { e.preventDefault(); handleSend(); }}
          className={`sc-chat-input-send w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-150 ${sendPulse ? 'scale-90 opacity-70' : 'scale-100'} ${!input.trim() ? 'opacity-40' : 'opacity-100'}`}
          style={{ background: `linear-gradient(135deg,${appearance.buttonColor || 'var(--accent-color)'} 0%,var(--accent-color) 100%)`, boxShadow: input.trim() ? '0 2px 10px var(--accent-color)' : 'none' }}>
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>

      {/* ── 悬浮球：加号 / 继续说（iMessage 风格默认隐藏，由自定义 CSS 开启） ── */}
      <div className="sc-chat-input-fab hidden">
        {fabOpen && (
          <div className="sc-chat-input-fab-menu">
            <button
              type="button"
              onClick={() => { setShowPlus(true); setShowEmoji(false); setFabOpen(false); }}
              title="更多功能"
              className="sc-chat-input-fab-item"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => { handleContinueTalk(); setFabOpen(false); }}
              title="继续说"
              className="sc-chat-input-fab-item"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleRemindMoment}
              title="提醒对方发朋友圈"
              className="sc-chat-input-fab-item"
            >
              <Camera className="w-5 h-5" />
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            if (showPlus || showEmoji) {
              setShowPlus(false);
              setShowEmoji(false);
            } else {
              setFabOpen(prev => !prev);
            }
          }}
          className="sc-chat-input-fab-toggle"
          style={{ transform: fabOpen ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* 文件输入 */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />

      {/* ── 连接检测弹窗 ── */}
      {showConnectionTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={closeConnectionTest}>
          <div className="w-full max-w-[360px] rounded-[28px] bg-white p-6 shadow-2xl text-center" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[var(--accent-color)] to-purple-400 flex items-center justify-center mb-4 shadow-lg">
              <Link2 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-base font-bold text-gray-800 mb-1">连接检测</h3>
            <p className="text-xs text-gray-500 mb-5">探测你与{contact?.nickname || '对方'}之间的灵魂链接</p>

            {!connectionResult ? (
              <div className="space-y-5">
                <div className="flex items-center justify-center gap-1 h-24">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-[var(--accent-color)] rounded-full animate-pulse"
                      style={{ height: `${Math.max(16, Math.abs(Math.sin(i * 0.7)) * 80)}%`, animationDelay: `${i * 80}ms` }}
                    />
                  ))}
                </div>
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                    <circle
                      cx="60" cy="60" r="52"
                      fill="none"
                      stroke="url(#connectionGradientScan)"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={326}
                      strokeDashoffset={326 * (1 - connectionProgress / 100)}
                      className="transition-all duration-100 ease-out"
                    />
                    <defs>
                      <linearGradient id="connectionGradientScan" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--accent-color)" />
                        <stop offset="100%" stopColor="#a855f7" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-gray-800">{connectionProgress}%</span>
                  </div>
                </div>
                <div className="text-[var(--accent-color)] font-semibold text-sm">{connectionPhase}</div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative w-44 h-44 mx-auto">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                    <circle
                      cx="60" cy="60" r="52"
                      fill="none"
                      stroke="url(#connectionGradient)"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={326}
                      strokeDashoffset={326 * (1 - connectionResult.depth)}
                      className="transition-all duration-1000 ease-out"
                    />
                    <defs>
                      <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--accent-color)" />
                        <stop offset="100%" stopColor="#a855f7" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-gray-800">{Math.round(connectionResult.depth * 100)}%</span>
                    <span className="text-xs text-gray-500 mt-0.5">链接深度</span>
                  </div>
                </div>
                <div className="text-[var(--accent-color)] font-semibold text-sm">{connectionResult.label}</div>
                {connectionResult.depth < 0.4 ? (
                  <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">当前链接比较低，建议晚点聊。</p>
                ) : (
                  <p className="text-xs text-gray-500">检测显示你们的链接很深，继续保持这份默契吧</p>
                )}
              </div>
            )}

            <div className="mt-6">
              <button
                onClick={closeConnectionTest}
                className="w-full h-10 rounded-full bg-gray-100 text-gray-700 text-sm font-medium active:scale-95 transition-transform"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
