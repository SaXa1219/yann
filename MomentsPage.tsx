import React, { useState, useRef, useEffect, useCallback } from 'react';
import { generateId } from '@/utils/id';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, ImageIcon, Send, MessageCircle, Heart, Trash2, X, Users } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import type { MomentPost, ContactSettings } from '@/types/types';
import { compressImage } from '@/utils/imageUtils';
import { toast } from 'sonner';
import { getMoments, saveMoments } from '@/services/storage';
import { SYSTEM_FIXED } from '@/constants/behavior';
import type { EmojiPack } from '@/types/types';

function pickRandomEmoji(emojis: EmojiPack[]): string | undefined {
  if (!emojis || emojis.length === 0) return undefined;
  const packs = emojis.filter(e => e.url);
  if (packs.length === 0) return undefined;
  return packs[Math.floor(Math.random() * packs.length)].url;
}

// ── 时间格式化 ─────────────────────────────────────────────
function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  const days = Math.floor(diff / 86400000);
  if (days < 7) return `${days}天前`;
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

// ── 九宫格图片 ─────────────────────────────────────────────
function ImageGrid({ images }: { images: string[] }) {
  const n = images.length;
  if (n === 0) return null;
  if (n === 1) return (
    <div className="mt-2 max-w-[210px]">
      <img src={images[0]} className="w-full rounded-md object-cover max-h-[210px]" alt="" />
    </div>
  );
  const cols = n === 2 ? 2 : n === 4 ? 2 : 3;
  return (
    <div className="mt-2 grid gap-0.5 max-w-[210px]"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {images.map((img, i) => (
        <div key={i} className="aspect-square overflow-hidden rounded-sm bg-gray-100">
          <img src={img} className="w-full h-full object-cover" alt="" />
        </div>
      ))}
    </div>
  );
}

// ── 发帖弹层 ─────────────────────────────────────────────────
interface PostModalProps {
  myName: string;
  myAvatar: string;
  onClose: () => void;
  onPost: (content: string, images: string[]) => void;
}
function PostModal({ myName, myAvatar, onClose, onPost }: PostModalProps) {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);

  const handlePickImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const remaining = 9 - images.length;
    const files = Array.from(e.target.files || []).slice(0, remaining);
    for (const f of files) {
      try {
        const c = await compressImage(f, 600, 600, 0.78);
        setImages(prev => [...prev, c]);
      } catch { toast.error('图片处理失败'); }
    }
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end">
      <div className="w-full bg-white rounded-t-3xl px-4 pt-4 pb-8 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="text-gray-400"><X className="w-5 h-5" /></button>
          <span className="text-sm font-semibold text-gray-800">发朋友圈</span>
          <button
            onClick={() => { if (content.trim() || images.length) { onPost(content, images); onClose(); } else toast.error('请输入内容或选图片'); }}
            className="text-sm font-semibold text-[var(--accent-color)]">发表</button>
        </div>
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
            {myAvatar ? <img src={myAvatar} className="w-full h-full object-cover" alt="我" />
              : <span className="text-sm text-gray-400">{myName.charAt(0)}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--accent-color)] mb-2">{myName}</p>
            <textarea
              value={content} onChange={e => setContent(e.target.value)}
              placeholder="这一刻的想法…" rows={4} autoFocus
              className="w-full resize-none bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-300 leading-relaxed"
            />
          </div>
        </div>
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 ml-13">
            {images.map((img, i) => (
              <div key={i} className="relative w-[72px] h-[72px] rounded-lg overflow-hidden">
                <img src={img} className="w-full h-full object-cover" alt="" />
                <button onClick={() => setImages(p => p.filter((_,j) => j!==i))}
                  className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center">
                  <X className="w-2.5 h-2.5 text-white" />
                </button>
              </div>
            ))}
            {images.length < 9 && (
              <label className="w-[72px] h-[72px] rounded-lg bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center cursor-pointer">
                <ImageIcon className="w-5 h-5 text-gray-400" />
                <input type="file" accept="image/*" multiple className="hidden" onChange={handlePickImg} />
              </label>
            )}
          </div>
        )}
        {images.length === 0 && (
          <label className="mt-3 ml-13 flex items-center gap-1 text-xs text-gray-400 cursor-pointer w-fit">
            <ImageIcon className="w-4 h-4" /> 添加图片
            <input type="file" accept="image/*" multiple className="hidden" onChange={handlePickImg} />
          </label>
        )}
      </div>
    </div>
  );
}

// ── 展示用的动态 ──
interface DisplayPost {
  id: string;           // 唯一 key
  post: MomentPost;     // 最新的 post 对象（含 liked / npcLikers / npcComments）
  author: { name: string; avatar: string };
  isMe: boolean;
  contactId: string;
}

// ── 生成 NPC 评论内容（10% 概率表情包） ──
function makeNpcComment(cards: { content: string }[], emojis: EmojiPack[], name: string): { id: string; name: string; content: string; emoji?: string } {
  if (emojis.length > 0 && Math.random() * 100 < SYSTEM_FIXED.momentsEmojiChance) {
    const url = pickRandomEmoji(emojis);
    if (url) return { id: generateId(), name, content: '', emoji: url };
  }
  const useCombine = cards.length >= 2 && Math.random() * 100 < SYSTEM_FIXED.momentsCombineChance;
  if (useCombine) {
    const count = 2 + Math.floor(Math.random() * 2);
    const picked = [...cards].sort(() => Math.random() - 0.5).slice(0, count);
    return { id: generateId(), name, content: picked.map(c => c.content).join('，') };
  }
  return { id: generateId(), name, content: cards[Math.floor(Math.random() * cards.length)].content };
}

// ── 确保每条帖子都有持久化的 NPC 互动数据 ──
// 规则：每个联系人只点赞/评论「我的动态」和「他自己的动态」，不跨联系人互动
function ensureNpcEngagement(
  post: MomentPost,
  contactId: string,
  allContacts: ContactSettings[],
  myName: string,
  cards: { content: string }[],
  emojis: EmojiPack[]
): MomentPost {
  const partner = allContacts.find(c => c.id === contactId);

  const existingLikers = post.npcLikers ?? null;
  const existingComments = post.npcComments ?? null;
  if (existingLikers !== null && existingComments !== null) return post;

  // 可互动的联系人：我的动态 → 所有联系人；联系人自己的动态 → 只有该联系人
  const allowedContacts = post.fromUser
    ? allContacts
    : partner
      ? [partner]
      : [];

  // 点赞列表
  const likers = allowedContacts.length > 0 ? allowedContacts.map(c => c.nickname) : [];
  const npcLikers = existingLikers ?? likers;

  // 评论：受 momentsNpcCommentChance 控制，默认 0 时不自动生成评论；自己的动态也不能自动评论
  let comments: { id: string; name: string; content: string; emoji?: string }[] = [];
  if (cards.length > 0) {
    allowedContacts.forEach(c => {
      const chance = c.momentsNpcCommentChance ?? 0;
      if (Math.random() * 100 < chance) {
        comments.push(makeNpcComment(cards, emojis, c.nickname));
      }
    });
  }
  const npcComments = existingComments ?? comments;

  const updated = { ...post, npcLikers, npcComments };
  const moments = getMoments(contactId);
  const saved = moments.map(m => m.id === post.id ? updated : m);
  saveMoments(contactId, saved);
  return updated;
}

// ── 主页面 ─────────────────────────────────────────────────
export default function MomentsPage() {
  const navigate = useNavigate();
  const { contact, contacts, updateContact, addMoment, deleteMoment, toggleMomentLike, addMomentComment, cards, emojis } = useApp();

  const [allPosts, setAllPosts] = useState<DisplayPost[]>([]);
  const [showPostModal, setShowPostModal] = useState(false);
  // commentingId 用完整的 "${contactId}-${postId}" 格式，避免不同联系人同 postId 冲突
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ name: string; commentId: string } | null>(null);
  const bgRef = useRef<HTMLInputElement>(null);

  const myName = contact.myName || '';

  // 聚合并刷新所有联系人的朋友圈（从存储读最新数据）
  const rebuildPosts = useCallback(() => {
    const list: DisplayPost[] = [];
    contacts.forEach(c => {
      const moments = getMoments(c.id);
      moments.forEach(post => {
        // 确保 NPC 互动数据已初始化
        const enriched = ensureNpcEngagement(post, c.id, contacts, myName, cards, emojis);
        list.push({
          id: `${c.id}-${post.id}`,
          post: enriched,
          author: post.fromUser
            ? { name: myName, avatar: contact.myAvatar }
            : { name: c.nickname, avatar: c.theirAvatar },
          isMe: !!post.fromUser,
          contactId: c.id,
        });
      });
    });
    list.sort((a, b) => b.post.timestamp - a.post.timestamp);
    setAllPosts(list);
  }, [contacts, contact.myAvatar, contact.myName, cards]);

  useEffect(() => { rebuildPosts(); }, [rebuildPosts]);

  // 换封面背景
  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const compressed = await compressImage(file, 1920, 1080, 0.92);
      updateContact({ ...contact, momentsBg: compressed });
    } catch { toast.error('背景图处理失败'); }
    e.target.value = '';
  };

  // 发布 → 保存后立即重建列表
  const handlePost = (content: string, images: string[]) => {
    addMoment({
      id: generateId(), content, images,
      timestamp: Date.now(), comments: [], liked: false, likedBySystem: true, fromUser: true,
    });
    toast.success('已发布');
    setTimeout(rebuildPosts, 50);
  };

  // 点赞（任意帖子均可点）
  const handleLike = (item: DisplayPost) => {
    toggleMomentLike(item.post.id, item.contactId);
    setTimeout(rebuildPosts, 50);
  };

  // 删除
  const handleDelete = (item: DisplayPost) => {
    deleteMoment(item.post.id);
    toast.success('已删除');
    setTimeout(rebuildPosts, 50);
  };

  // 提交评论（任意帖子均可评）
  const submitComment = (item: DisplayPost) => {
    const text = commentText.trim();
    if (!text) return;
    addMomentComment(item.post.id, {
      id: generateId(),
      sender: 'user',
      content: text,
      timestamp: Date.now(),
      replyToId: replyingTo?.commentId,
      replyToName: replyingTo?.name,
    }, item.contactId);
    setCommentText('');
    setCommentingId(null);
    setReplyingTo(null);
    setTimeout(rebuildPosts, 50);
  };

  return (
    <div className="min-h-dvh bg-white pb-10">

      {/* ══ 封面区 ══ */}
      <div className="relative w-full" style={{ height: '240px' }}>
        {contact.momentsBg
          ? <img src={contact.momentsBg} className="absolute inset-0 w-full h-full object-cover" alt="cover" />
          : <div className="absolute inset-0 bg-gradient-to-br from-[#e8dff5] via-[#ddeaf6] to-[#d5eee8]" />
        }
        <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')} className="absolute top-4 left-4 z-20 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          <button onClick={() => navigate('/multi-moments')} className="text-gray-400 p-1">
            <Users className="w-5 h-5" />
          </button>
          <button onClick={() => setShowPostModal(true)} className="text-gray-400 p-1">
            <Camera className="w-5 h-5" />
          </button>
          <label className="cursor-pointer p-1">
            <span className="text-[10px] text-gray-500 bg-white/70 px-2 py-0.5 rounded-full">换背景</span>
            <input ref={bgRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
          </label>
        </div>
        {/* 我的头像（无白边框，整体下移与列表重叠） */}
        <div className="absolute -bottom-5 right-4 z-10 flex items-end gap-2">
          <span className="text-sm text-gray-600 drop-shadow-sm mb-6">{myName}</span>
          <div className="w-[74px] h-[74px] rounded-xl overflow-hidden bg-gray-100 shadow-lg">
            {contact.myAvatar
              ? <img src={contact.myAvatar} className="w-full h-full object-cover" alt="我" />
              : <div className="w-full h-full flex items-center justify-center text-3xl">🙂</div>
            }
          </div>
        </div>
      </div>

      {/* ══ 动态列表 ══ */}
      <div className="bg-white">
        {allPosts.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-300">还没有动态，点右上角相机发一条吧～</p>
          </div>
        )}
        {allPosts.map(item => (
          <PostCard
            key={item.id}
            display={item}
            myName={myName}
            partnerName={item.isMe ? '' : (contacts.find(c => c.id === item.contactId)?.nickname || contact.nickname)}
            commentingId={commentingId}
            commentText={commentText}
            replyingTo={replyingTo}
            setCommentingId={setCommentingId}
            setCommentText={setCommentText}
            setReplyingTo={setReplyingTo}
            onLike={() => handleLike(item)}
            onDelete={() => handleDelete(item)}
            onComment={() => submitComment(item)}
          />
        ))}
      </div>

      {showPostModal && (
        <PostModal
          myName={myName}
          myAvatar={contact.myAvatar}
          onClose={() => setShowPostModal(false)}
          onPost={handlePost}
        />
      )}
    </div>
  );
}

// ── 单条动态卡片 ──────────────────────────────────────────
interface PostCardProps {
  display: DisplayPost;
  myName: string;
  partnerName: string;
  commentingId: string | null;
  commentText: string;
  replyingTo: { name: string; commentId: string } | null;
  setCommentingId: (id: string | null) => void;
  setCommentText: (t: string) => void;
  setReplyingTo: (r: { name: string; commentId: string } | null) => void;
  onLike: () => void;
  onDelete: () => void;
  onComment: () => void;
}

function PostCard({
  display, myName, partnerName,
  commentingId, commentText, replyingTo,
  setCommentingId, setCommentText, setReplyingTo,
  onLike, onDelete, onComment,
}: PostCardProps) {
  const { post, author, isMe, id: displayId } = display;
  const npcLikers = post.npcLikers ?? [];
  const npcComments = post.npcComments ?? [];
  const userComments = post.comments ?? [];
  const isLiked = !!post.liked;
  // 合并点赞列表：user 赞 + 对方赞 + 其他 NPC 赞（系统固定100%），去重避免重复名字
  const partnerLiked = post.fromUser ? post.likedBySystem : false;
  const allLikers = Array.from(new Set([...(isLiked ? [myName] : []), ...(partnerLiked ? [partnerName] : []), ...npcLikers]));

  return (
    <div className="px-4 pt-4 pb-3 border-b border-gray-100">
      <div className="flex gap-3">
        {/* 头像（无白边） */}
        <div className="w-11 h-11 rounded-lg overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
          {author.avatar
            ? <img src={author.avatar} className="w-full h-full object-cover" alt={author.name} />
            : <span className="text-base">{author.name.charAt(0)}</span>}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--accent-color)] mb-1">{author.name}</p>

          {(post.content || post.emojiImage) && (
            <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
              {post.content}
              {post.emojiImage && (
                <img src={post.emojiImage} alt="表情包" className="mt-2 h-20 w-auto rounded-lg object-cover" />
              )}
            </div>
          )}
          <ImageGrid images={post.emojiImage ? [] : post.images} />

          {/* 时间 + 删除 + 互动按钮 */}
          <div className="flex items-center justify-between mt-2.5">
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#ADADAD]">{timeAgo(post.timestamp)}</span>
              <button onClick={onDelete} className="text-xs text-[#ADADAD] flex items-center gap-0.5">
                <Trash2 className="w-3 h-3" />删除
              </button>
            </div>
            <div className="flex items-center gap-3">
              {/* 点赞按钮 - 所有动态均可点 */}
              <button onClick={onLike} className="flex items-center gap-1 text-xs text-gray-400 active:scale-90 transition-transform">
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-[var(--accent-color)] text-[var(--accent-color)]' : ''}`} />
              </button>
              {/* 评论按钮 - 所有动态均可评 */}
              <button
                onClick={() => {
                  setReplyingTo(null);
                  setCommentingId(commentingId === displayId ? null : displayId);
                  setCommentText('');
                }}
                className="flex items-center gap-1 text-xs text-gray-400 active:scale-90 transition-transform">
                <MessageCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 点赞 + 评论区 */}
          {(allLikers.length > 0 || userComments.length > 0 || npcComments.length > 0) && (
            <div className="mt-2 bg-[#F3F3F5] rounded px-3 py-2 space-y-1">
              {allLikers.length > 0 && (
                <div className="flex items-start gap-1">
                  <Heart className="w-3 h-3 fill-[var(--accent-color)] text-[var(--accent-color)] shrink-0 mt-0.5" />
                  <span className="text-xs text-[var(--accent-color)] leading-relaxed">{allLikers.join('、')}</span>
                </div>
              )}
              {allLikers.length > 0 && (userComments.length > 0 || npcComments.length > 0) && (
                <div className="h-px bg-[#E5E5E5] my-1" />
              )}
              {/* NPC 评论 */}
              {npcComments.map(c => (
                <div key={c.id} className="flex items-start gap-1 group">
                  <p className="flex-1 text-xs text-gray-900 leading-relaxed">
                    <span className="text-[var(--accent-color)] font-medium">{c.name}</span>
                    <span className="text-gray-900">：</span>
                    {c.content}
                    {c.emoji && <img src={c.emoji} alt="表情包" className="inline-block h-5 w-auto align-middle ml-1 rounded" />}
                  </p>
                  <button
                    onClick={() => {
                      setReplyingTo({ name: c.name, commentId: c.id });
                      setCommentingId(displayId);
                      setCommentText('');
                    }}
                    className="text-[10px] text-gray-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                    回复
                  </button>
                </div>
              ))}
              {/* 用户评论（含回复） */}
              {userComments.map(c => {
                const isFromPartner = c.sender === 'system';
                const commentName = isFromPartner ? partnerName : myName;
                return (
                  <div key={c.id} className="flex items-start gap-1 group">
                    <p className="flex-1 text-xs text-gray-900 leading-relaxed">
                      <span className="text-[var(--accent-color)] font-semibold">{commentName}</span>
                      {c.replyToName && (
                        <>
                          <span className="text-gray-500 mx-0.5">回复</span>
                          <span className="text-[var(--accent-color)] font-semibold">{c.replyToName}</span>
                        </>
                      )}
                      <span className="text-gray-900">：</span>
                      {c.content}
                      {c.emoji && <img src={c.emoji} alt="表情包" className="inline-block h-5 w-auto align-middle ml-1 rounded" />}
                    </p>
                    {/* 回复按钮（点击在对应评论下回复） */}
                    <button
                      onClick={() => {
                        setReplyingTo({ name: commentName, commentId: c.id });
                        setCommentingId(displayId);
                        setCommentText('');
                      }}
                      className="text-[10px] text-gray-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                      回复
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* 评论输入框 */}
          {commentingId === displayId && (
            <div className="flex flex-col gap-1.5 mt-2">
              {replyingTo && (
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <span>回复 <span className="text-[var(--accent-color)]">{replyingTo.name}</span></span>
                  <button onClick={() => setReplyingTo(null)} className="ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder={replyingTo ? `回复 ${replyingTo.name}…` : '评论…'}
                  autoFocus
                  className="flex-1 h-8 px-3 rounded bg-[#F3F3F5] text-xs text-gray-800 outline-none"
                  onKeyDown={e => { if (e.key === 'Enter') onComment(); }}
                />
                <button onClick={onComment}
                  className="w-8 h-8 rounded bg-[var(--accent-color)] flex items-center justify-center shrink-0">
                  <Send className="w-3.5 h-3.5 text-white" />
                </button>
                <button onClick={() => { setCommentingId(null); setCommentText(''); setReplyingTo(null); }}
                  className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center shrink-0">
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
