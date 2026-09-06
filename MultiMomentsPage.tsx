import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, Heart, MessageCircle, Trash2, Send, Plus, X, ImagePlus, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  createPublicComment,
  createPublicMoment,
  deletePublicComment,
  deletePublicMoment,
  fetchPublicMoments,
  getCommentDeleteToken,
  getMomentDeleteToken,
  getPublicNickname,
  setPublicNickname,
  togglePublicLike,
  uploadPublicMomentImage,
  cleanupMyMomentsCache,
  mergeCachedMyData,
} from '@/services/multiMoments';
import { compressImage } from '@/utils/imageUtils';
import { supabase } from '@/db/supabase';
import type { PublicMoment, PublicMomentComment } from '@/types/types';

const NICKNAME_STORE = 'yannyu_public_nickname';

function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`;
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function Avatar({ name }: { name: string }) {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  return (
    <div className="w-10 h-10 rounded-full bg-[var(--accent-color)]/20 text-[var(--accent-color)] flex items-center justify-center text-sm font-bold shrink-0">
      {initial}
    </div>
  );
}

function ImageGrid({ images }: { images: string[] }) {
  if (!images.length) return null;
  const gridClass = images.length === 1
    ? 'grid-cols-1'
    : images.length === 2
      ? 'grid-cols-2'
      : 'grid-cols-3';
  return (
    <div className={`grid ${gridClass} gap-1 mt-2`}>
      {images.map((url, idx) => (
        <div
          key={idx}
          className={`relative overflow-hidden rounded-xl bg-stone-100 ${images.length === 1 ? 'aspect-video' : 'aspect-square'}`}
        >
          <img src={url} alt="动态图片" className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
  );
}

export default function MultiMomentsPage() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [nicknameInput, setNicknameInput] = useState('');
  const [showNickname, setShowNickname] = useState(false);
  const [moments, setMoments] = useState<PublicMoment[]>([]);
  const [loading, setLoading] = useState(false);
  const [postOpen, setPostOpen] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postImages, setPostImages] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [replyTo, setReplyTo] = useState<Record<string, PublicMomentComment | null>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const listTopRef = useRef<HTMLDivElement>(null);
  const pendingIdsRef = useRef<Set<string>>(new Set());

  const isOwnMoment = (m: PublicMoment) => getMomentDeleteToken(m.id) !== null;
  const isOwnComment = (c: PublicMomentComment) => getCommentDeleteToken(c.id) !== null;

  // 将服务端数据与本地缓存的自己动态/评论进行合并，确保退出重进后仍能看到自己的内容
  const mergeServerMoments = (server: PublicMoment[]) => {
    cleanupMyMomentsCache(server);
    setMoments(() => mergeCachedMyData(server));
  };

  const refreshingRef = useRef(false);
  const debounceTimerRef = useRef<number | null>(null);

  const load = async (silent = false) => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    if (!silent) setLoading(true);
    try {
      const data = await fetchPublicMoments();
      mergeServerMoments(data);
    } catch (e) {
      console.error(e);
      if (!silent) toast.error('刷新失败，请检查网络');
    } finally {
      refreshingRef.current = false;
      if (!silent) setLoading(false);
    }
  };

  // Realtime 事件密集触发时合并为一次加载，避免频繁拉取导致卡顿/白屏
  const scheduleDebouncedLoad = () => {
    if (debounceTimerRef.current) return;
    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null;
      load(true);
    }, 1200);
  };

  useEffect(() => {
    const saved = getPublicNickname();
    if (saved) {
      setNickname(saved);
    } else {
      setShowNickname(true);
    }
  }, []);

  useEffect(() => {
    if (!nickname) return;
    load();
    // Realtime 不可用时（部分浏览器/代理），靠轮询兜底；间隔放宽以降低卡顿
    const interval = window.setInterval(() => load(true), 15000);

    // Realtime 订阅：新动态/点赞/评论变化时防抖刷新，并给非本人操作弹提示
    const channel = supabase
      .channel('public-moments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'public_moments' }, (payload) => {
        if (payload.eventType === 'INSERT' && payload.new && (payload.new as any).nickname !== nickname) {
          toast.info(`${(payload.new as any).nickname} 发布了新动态`);
        }
        scheduleDebouncedLoad();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'public_moment_comments' }, (payload) => {
        if (payload.eventType === 'INSERT' && payload.new && (payload.new as any).nickname !== nickname) {
          toast.info(`${(payload.new as any).nickname} 评论了动态`);
        }
        scheduleDebouncedLoad();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'public_moment_likes' }, (payload) => {
        if (payload.eventType === 'INSERT' && payload.new && (payload.new as any).nickname !== nickname) {
          toast.info(`${(payload.new as any).nickname || '有人'} 点赞了动态`);
        }
        scheduleDebouncedLoad();
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('public-moments realtime channel error');
        }
      });

    return () => {
      window.clearInterval(interval);
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [nickname]);

  const handleSetNickname = () => {
    const name = nicknameInput.trim();
    if (!name) {
      toast.error('请输入昵称');
      return;
    }
    setPublicNickname(name);
    setNickname(name);
    setShowNickname(false);
  };

  const handleImageSelect = async (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files).slice(0, 9);
    for (const file of list) {
      try {
        const dataUrl = await compressImage(file, 1200, 1200, 0.8);
        setPostImages(prev => [...prev, dataUrl]);
      } catch {
        toast.error(`${file.name} 处理失败`);
      }
    }
  };

  const handlePost = async () => {
    if (!nickname) return;
    const content = postContent.trim();
    if (!content && postImages.length === 0) {
      toast.error('请填写内容或上传图片');
      return;
    }
    setPosting(true);
    const imageUrls: string[] = [];
    for (const dataUrl of postImages) {
      const url = await uploadPublicMomentImage(dataUrl, nickname);
      if (url) imageUrls.push(url);
    }
    const moment = await createPublicMoment(content, imageUrls, nickname);
    if (moment) {
      toast.success('发布成功');
      setPostContent('');
      setPostImages([]);
      setPostOpen(false);
      // 乐观更新立即显示，并标记为待同步
      pendingIdsRef.current.add(moment.id);
      setMoments(prev => [moment, ...prev]);
      listTopRef.current?.scrollIntoView({ behavior: 'smooth' });
      // 延迟 2 秒后同步，绕过 read replica 延迟，避免刚发的动怋被空数据覆盖
      setTimeout(() => { pendingIdsRef.current.delete(moment.id); load(); }, 2000);
    } else {
      toast.error('发布失败');
    }
    setPosting(false);
  };

  const handleDeleteMoment = async (m: PublicMoment) => {
    const token = getMomentDeleteToken(m.id);
    if (!token) {
      toast.error('只能删除自己发布的内容');
      return;
    }
    if (!confirm('确定删除这条动态吗？')) return;
    const ok = await deletePublicMoment(m.id, token);
    if (ok) {
      toast.success('已删除');
      setMoments(prev => prev.filter(x => x.id !== m.id));
    } else {
      toast.error('删除失败');
    }
  };

  const handleLike = async (m: PublicMoment) => {
    if (!nickname) {
      setShowNickname(true);
      return;
    }
    const liked = await togglePublicLike(m.id, nickname);
    setMoments(prev => prev.map(x => x.id === m.id ? {
      ...x,
      liked,
      likes_count: liked ? x.likes_count + 1 : Math.max(x.likes_count - 1, 0),
    } : x));
  };

  const handleComment = async (momentId: string) => {
    if (!nickname) {
      setShowNickname(true);
      return;
    }
    const content = (commentText[momentId] || '').trim();
    if (!content) return;
    const parent = replyTo[momentId];
    const comment = await createPublicComment(momentId, content, nickname, parent ? { id: parent.id, nickname: parent.nickname } : undefined);
    if (comment) {
      setCommentText(prev => ({ ...prev, [momentId]: '' }));
      setReplyTo(prev => ({ ...prev, [momentId]: null }));
      pendingIdsRef.current.add(comment.id);
      setMoments(prev => prev.map(m => {
        if (m.id !== momentId) return m;
        const existing = m.comments || [];
        // 如果已经通过 Realtime 同步过来，跳过重复插入
        if (existing.some(c => c.id === comment.id)) return m;
        return {
          ...m,
          comments_count: m.comments_count + 1,
          comments: [...existing, comment],
        };
      }));
      // 延迟 1.5 秒后同步，绕过 read replica 延迟
      setTimeout(() => { pendingIdsRef.current.delete(comment.id); load(); }, 1500);
    } else {
      toast.error('评论失败');
    }
  };

  const handleDeleteComment = async (m: PublicMoment, c: PublicMomentComment) => {
    const token = getCommentDeleteToken(c.id);
    if (!token) {
      toast.error('只能删除自己发布的评论');
      return;
    }
    if (!confirm('确定删除这条评论吗？')) return;
    const ok = await deletePublicComment(c.id, token);
    if (ok) {
      setMoments(prev => prev.map(x => x.id === m.id ? {
        ...x,
        comments_count: Math.max(x.comments_count - 1, 0),
        comments: (x.comments || []).filter(cc => cc.id !== c.id),
      } : x));
    } else {
      toast.error('删除失败');
    }
  };

  const startReply = (m: PublicMoment, c: PublicMomentComment) => {
    setReplyTo(prev => ({ ...prev, [m.id]: c }));
    document.getElementById(`comment-input-${m.id}`)?.focus();
  };

  const renderComments = (m: PublicMoment, parentId?: string) => {
    const list = (m.comments || []).filter(c => (c.parent_id ? c.parent_id === parentId : !parentId));
    if (!list.length) return null;
    return (
      <div className={`space-y-3 ${parentId ? 'pl-4 border-l-2 border-border/50' : ''}`}>
        {list.map(c => (
          <div key={c.id} className="group">
            <div className="flex items-start gap-2 text-sm">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${c.nickname === nickname ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {c.nickname.slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold shrink-0 text-xs">{c.nickname}</span>
                  {c.reply_to_nickname && (
                    <span className="text-[10px] text-muted-foreground shrink-0 bg-muted px-1.5 py-0.5 rounded-full">回复 {c.reply_to_nickname}</span>
                  )}
                </div>
                <p className="text-sm text-foreground/90 break-words mt-0.5">{c.content}</p>
                <div className="flex items-center gap-3 mt-1">
                  <button onClick={() => startReply(m, c)} className="text-xs text-muted-foreground hover:text-primary">回复</button>
                  {isOwnComment(c) && (
                    <button onClick={() => handleDeleteComment(m, c)} className="text-xs text-muted-foreground hover:text-destructive">删除</button>
                  )}
                </div>
              </div>
            </div>
            {renderComments(m, c.id)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-dvh w-full bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold">多人朋友圈</h1>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => load()}
            disabled={loading}
            className="px-2"
            aria-label="刷新"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-xs">刷新</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/moments')}>
            个人朋友圈
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setNicknameInput(nickname); setShowNickname(true); }}>
            {nickname || '设置昵称'}
          </Button>
        </div>
      </div>

      {/* Feed */}
      <div ref={feedRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div ref={listTopRef} />
        {loading && moments.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-10">加载中…</div>
        )}
        {!loading && moments.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-12">
            还没有动态，快来发布第一条吧～
          </div>
        )}
        {moments.map(m => (
          <div key={m.id} className="bg-card rounded-2xl p-4 border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Avatar name={m.nickname} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{m.nickname}</p>
                <p className="text-xs text-muted-foreground">{formatTime(m.created_at)}</p>
              </div>
              {isOwnMoment(m) && (
                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => handleDeleteMoment(m)}>
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              )}
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
            <ImageGrid images={m.images} />

            {/* Actions */}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
              <button
                onClick={() => handleLike(m)}
                className={`flex items-center gap-1 text-sm ${m.liked ? 'text-destructive' : 'text-muted-foreground'}`}
              >
                <Heart className={`w-4 h-4 ${m.liked ? 'fill-current' : ''}`} />
                <span>{m.likes_count || '点赞'}</span>
              </button>
              <button className="flex items-center gap-1 text-sm text-muted-foreground">
                <MessageCircle className="w-4 h-4" />
                <span>{m.comments_count || '评论'}</span>
              </button>
            </div>

            {/* Comments */}
            {(m.comments || []).length > 0 && (
              <div className="mt-3 bg-muted/50 rounded-xl p-3">
                {renderComments(m)}
              </div>
            )}

            {/* Add comment */}
            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1 relative">
                {replyTo[m.id] && (
                  <div className="absolute -top-5 left-0 text-xs text-muted-foreground flex items-center gap-1">
                    回复 {replyTo[m.id]!.nickname}
                    <button onClick={() => setReplyTo(prev => ({ ...prev, [m.id]: null }))}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <Input
                  id={`comment-input-${m.id}`}
                  value={commentText[m.id] || ''}
                  onChange={e => setCommentText(prev => ({ ...prev, [m.id]: e.target.value }))}
                  placeholder={replyTo[m.id] ? `回复 ${replyTo[m.id]!.nickname}…` : '写评论…'}
                  className="flex-1 h-9 text-sm"
                  onKeyDown={e => { if (e.key === 'Enter') handleComment(m.id); }}
                />
              </div>
              <Button size="icon" className="h-9 w-9 shrink-0" onClick={() => handleComment(m.id)}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Post FAB */}
      <button
        onClick={() => { if (!nickname) { setShowNickname(true); return; } setPostOpen(true); }}
        className="fixed right-4 bottom-20 z-30 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-90 transition-transform"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Nickname dialog */}
      <Dialog open={showNickname} onOpenChange={setShowNickname}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader>
            <DialogTitle>设置你的昵称</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              value={nicknameInput}
              onChange={e => setNicknameInput(e.target.value)}
              placeholder="怎么称呼你？"
              maxLength={20}
              onKeyDown={e => { if (e.key === 'Enter') handleSetNickname(); }}
            />
            <Button className="w-full" onClick={handleSetNickname}>确定</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Post dialog */}
      <Dialog open={postOpen} onOpenChange={setPostOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>发布动态</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Textarea
              value={postContent}
              onChange={e => setPostContent(e.target.value)}
              placeholder="分享你的想法…"
              rows={3}
              className="resize-none"
            />
            {postImages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {postImages.map((url, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden">
                    <img src={url} alt="预览" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setPostImages(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/50 text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <ImagePlus className="w-4 h-4 mr-1" />
                图片
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => { handleImageSelect(e.target.files); e.target.value = ''; }}
              />
              <Button onClick={handlePost} disabled={posting}>
                {posting ? '发布中…' : '发布'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
