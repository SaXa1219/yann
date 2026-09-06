import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Camera, Clock, Plus, X, Layers, CreditCard, Music } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import type { ContactSettings, Song } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { compressImage } from '@/utils/imageUtils';
import { toast } from 'sonner';
import { pickBackupFile, getBackupFileHandle } from '@/services/storage';

function SmartNum({ value, onChange, min = 0, max = Infinity, width = 'w-16' }: { value: number; onChange: (v: number) => void; min?: number; max?: number; width?: string }) {
  const [raw, setRaw] = useState(String(value));
  useEffect(() => { setRaw(String(value)); }, [value]);
  return (
    <input
      type="text" inputMode="numeric" pattern="[0-9]*"
      value={raw}
      onChange={e => {
        const v = e.target.value;
        if (v === '' || /^\d+$/.test(v)) {
          setRaw(v);
          if (v !== '') onChange(Math.min(max, Math.max(min, +v)));
        }
      }}
      onBlur={() => {
        if (raw === '') { setRaw(String(min)); onChange(min); }
      }}
      className={`${width} h-9 px-2 rounded-xl bg-gray-50 text-sm text-gray-800 text-center outline-none border border-gray-100 focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/20 transition-colors`}
    />
  );
}

export default function ContactPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') === 'chat' ? 'chat' : 'main';
  const { contact, updateContact, testPush } = useApp();
  const isDark = false;

  const [form, setForm] = useState<ContactSettings>(contact);
  const [newSongName, setNewSongName] = useState('');
  const [newSongUrl, setNewSongUrl] = useState('');
  const [backupFileName, setBackupFileName] = useState<string | null>(null);

  useEffect(() => { setForm(contact); }, [contact]);
  useEffect(() => {
    getBackupFileHandle().then(h => setBackupFileName(h?.name ?? null));
  }, []);

  // 输入项 800ms 无改动后自动保存，防止忘记点右上角保存导致开关/头像不生效
  useEffect(() => {
    const timer = setTimeout(() => {
      if (JSON.stringify(form) !== JSON.stringify(contact)) {
        updateContact(form);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [form, contact, updateContact]);

  const set = <K extends keyof ContactSettings>(key: K, val: ContactSettings[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = () => {
    updateContact(form);
    toast.success(mode === 'chat' ? '联系人设置已保存' : '全局设置已保存');
  };

  const handleAvatarUpload = (key: 'myAvatar' | 'theirAvatar') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const compressed = await compressImage(file, 200, 200, 0.75);
      set(key, compressed);
    } catch { toast.error('头像处理失败，请重试'); }
    e.target.value = '';
  };

  const addSong = () => {
    const name = newSongName.trim();
    let url = newSongUrl.trim();
    if (!name || !url) { toast.error('请填写歌曲名和链接'); return; }
    // 自动补全网易云外链格式
    if (/^\d+$/.test(url)) url = `https://music.163.com/song/media/outer/url?id=${url}.mp3`;
    else if (url.includes('music.163.com/song?id=') && !url.includes('.mp3')) {
      const m = url.match(/[?&]id=(\d+)/);
      if (m) url = `https://music.163.com/song/media/outer/url?id=${m[1]}.mp3`;
    }
    const newSong: Song = { id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, name, url };
    set('musicPlaylist', [...(form.musicPlaylist || []), newSong]);
    setNewSongName('');
    setNewSongUrl('');
    toast.success(`已添加「${name}」`);
  };

  const removeSong = (id: string) => {
    set('musicPlaylist', (form.musicPlaylist || []).filter(s => s.id !== id));
  };

  const minS = form.sysMinSentences ?? 1;
  const maxS = form.sysMaxSentences ?? 1;

  return (
    <div className="min-h-dvh bg-[#FAFAFA]">
      <header className={`sticky top-0 z-10 px-4 h-12 flex items-center justify-between backdrop-blur-md border-b ${isDark ? 'bg-black/40 border-white/10' : 'bg-white/90 border-gray-100'}`}>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 -ml-1" onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}>
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Button>
          <h1 className="text-[15px] font-bold text-gray-900">{mode === 'chat' ? '联系人设置' : '全局联系人设置'}</h1>
        </div>
        <Button size="sm" className="h-8 rounded-lg bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white" onClick={handleSave}>
          <Save className="w-3.5 h-3.5 mr-1" />保存
        </Button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {mode === 'chat' && (
        <Sec title="头像">
          <div className="flex gap-8 justify-center py-2">
            {([['theirAvatar', '对方'], ['myAvatar', '我']] as const).map(([key, label]) => (
              <div key={key} className="flex flex-col items-center gap-2">
                <label className="relative cursor-pointer">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-200">
                    {form[key] ? <img src={form[key]} className="w-full h-full object-cover" alt={label} /> : <Camera className="w-6 h-6 text-gray-300" />}
                  </div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 bg-[var(--accent-color)] rounded-full flex items-center justify-center">
                    <Camera className="w-3 h-3 text-white" />
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload(key)} />
                </label>
                <span className="text-xs text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </Sec>
        )}

        {mode === 'chat' && (
        <Sec title="基本信息">
          <Field label="对方备注" value={form.nickname} onChange={v => set('nickname', v)} placeholder="对方的备注名" />
          <Field label="我的名字" value={form.myName} onChange={v => set('myName', v)} placeholder="我的名字" />
        </Sec>
        )}

        {mode === 'chat' && (
        <Sec title="拍一拍文案">
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide block mb-1">
              拍一拍文案池（{(form.tapMessages || []).length} 条）
            </label>
            <p className="text-[11px] text-gray-300">每行一条文案，发送时会按顺序选择。留空则使用默认文案。</p>
            <textarea
              value={(form.tapMessages || []).join('\n')}
              onChange={e => {
                // 保留换行，只去掉行尾空格，不过滤空行，让用户自由编辑
                const lines = e.target.value.split('\n').map(l => l.trimEnd());
                set('tapMessages', lines);
              }}
              placeholder={"轻轻拍了拍\n捏了捏你的脸\n戳了戳你\n抱了抱你\n摸了摸你的头"}
              rows={6}
              className="w-full resize-none rounded-xl px-3 py-2.5 text-sm outline-none bg-gray-50 text-gray-800 border border-gray-100 focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/20 transition-colors"
            />
            <div className="flex gap-4 text-[11px] text-gray-300">
              <span>你<span className="text-gray-400 mx-0.5">[文案]</span>{form.nickname}</span>
              <span>{form.nickname}<span className="text-gray-400 mx-0.5">[文案]</span>你</span>
            </div>
          </div>
        </Sec>
        )}

        {mode === 'main' && (<>

        {/* 回复延迟 */}
        <Sec title="对方回复延迟">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-[var(--accent-color)] shrink-0" />
              <span className="flex-1 text-sm text-gray-500">消息回复延迟</span>
              <div className="flex items-center gap-1 shrink-0">
                <SmartNum value={form.replyDelaySec} onChange={v => set('replyDelaySec', Math.max(0, v))} min={0} max={300} width="w-20" />
                <span className="text-sm text-gray-400">秒</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-[var(--accent-color)] shrink-0" />
              <span className="flex-1 text-sm text-gray-500">对方回信延迟</span>
              <div className="flex items-center gap-1 shrink-0">
                <SmartNum value={form.letterReplyDelaySec ?? 5} onChange={v => set('letterReplyDelaySec', Math.max(1, v))} min={1} max={3600} width="w-20" />
                <span className="text-sm text-gray-400">秒</span>
              </div>
            </div>
          </div>
        </Sec>

        {/* 每条消息句数 */}
        <Sec title="每条消息句数">
          <p className="text-[11px] text-gray-400 -mt-1 mb-1">对方每次发消息时，会发几句字卡</p>
          <div className="flex items-center gap-3">
            <Layers className="w-4 h-4 text-[var(--accent-color)] shrink-0" />
            <span className="flex-1 text-sm text-gray-500">最少句数</span>
            <div className="flex items-center gap-1 shrink-0">
              <SmartNum value={minS} onChange={v => {
                set('sysMinSentences', v);
                if (v > maxS) set('sysMaxSentences', v);
              }} min={1} width="w-20" />
              <span className="text-sm text-gray-400">句</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Layers className="w-4 h-4 text-[var(--accent-color)] shrink-0" />
            <span className="flex-1 text-sm text-gray-500">最多句数</span>
            <div className="flex items-center gap-1 shrink-0">
              <SmartNum value={maxS} onChange={v => set('sysMaxSentences', Math.max(minS, v))} min={1} width="w-20" />
              <span className="text-sm text-gray-400">句</span>
            </div>
          </div>
          <p className="text-[11px] text-gray-300 mt-1">当前：{minS === maxS ? `固定 ${minS} 句` : `${minS}~${maxS} 句`}</p>
        </Sec>

        </>)}

        {mode === 'chat' && (
        <Sec title="转账金额池">
          <div className="mt-2">
            <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide block mb-1.5">
              <CreditCard className="w-3 h-3 inline mr-1" />转账金额池（逗号分隔）
            </label>
            <input
              value={form.transferAmounts ?? ''}
              onChange={e => set('transferAmounts', e.target.value)}
              placeholder="例如：520,1314,66.6,188,888"
              className="w-full h-10 px-3 rounded-xl bg-gray-50 text-sm text-gray-800 outline-none border border-gray-100 focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/20 transition-colors"
            />
            <p className="text-[11px] text-gray-300 mt-1">每次转账时从池中选取一个金额</p>
          </div>
        </Sec>
        )}

        {mode === 'chat' && (
        <Sec title="拼字卡">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700">开启拼字卡</p>
              <p className="text-[11px] text-gray-400 mt-0.5">开启后对方会把多张字卡拼成一句话发给你</p>
            </div>
            <Switch checked={(form.combineCardChance ?? 0) > 0} onCheckedChange={v => set('combineCardChance', v ? 0.02 : 0)} />
          </div>
        </Sec>
        )}

        {mode === 'main' && (<>

        {/* 主动发消息 */}
        <Sec title="对方主动发消息">
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-[var(--accent-color)] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700">主动发消息间隔</p>
              <p className="text-[11px] text-gray-400 mt-0.5">每隔 N 分钟自动发1~3条字卡（0 = 关闭）</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <SmartNum value={form.proactiveMsgIntervalMinutes ?? 0} onChange={v => set('proactiveMsgIntervalMinutes', Math.max(0, v))} min={0} max={1440} width="w-20" />
              <span className="text-sm text-gray-400">分钟</span>
            </div>
          </div>
        </Sec>

        {/* 自动备份 */}
        <Sec title="自动备份">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700">自动备份间隔</p>
              <p className="text-[11px] text-gray-400 mt-0.5">每隔 N 小时自动导出一次备份（0 = 关闭）</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <SmartNum value={form.autoBackupIntervalHours ?? 0} onChange={v => set('autoBackupIntervalHours', Math.max(0, v))} min={0} max={72} width="w-16" />
              <span className="text-sm text-gray-400">小时</span>
            </div>
          </div>
          <div className="mt-2">
            <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide block mb-1.5">
              备份目标文件
            </label>
            <button
              type="button"
              onClick={async () => {
                const res = await pickBackupFile();
                if (res.success && res.fileName) {
                  setBackupFileName(res.fileName);
                  toast.success(`已指定备份文件：${res.fileName}`);
                } else if (res.error) {
                  toast.error(res.error);
                }
              }}
              className="w-full h-10 rounded-xl bg-gray-50 text-sm text-gray-700 border border-gray-100 hover:bg-gray-100 flex items-center justify-center gap-1.5 transition-colors"
            >
              {backupFileName ? `已选择：${backupFileName}` : '选择自动备份文件'}
            </button>
            <p className="text-[11px] text-gray-300 mt-1">支持 File System Access API 的浏览器会自动写入同一文件；不支持时将降级为按文件名下载</p>
          </div>
          <div className="mt-3">
            <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide block mb-1.5">
              降级备份文件名前缀
            </label>
            <input
              value={form.autoBackupFileName || 'soulcard_backup'}
              onChange={e => set('autoBackupFileName', e.target.value)}
              placeholder="例如：my_backup"
              className="w-full h-10 px-3 rounded-xl bg-gray-50 text-sm text-gray-800 outline-none border border-gray-100 focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/20 transition-colors"
            />
            <p className="text-[11px] text-gray-300 mt-1">未指定文件或不支持时，实际文件名会自动附加时间戳，如 my_backup_2026-05-31-12-00-00.json</p>
          </div>
        </Sec>

        {/* 后台保活 */}
        <Sec title="后台保活">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700">保持网站在后台运行</p>
              <p className="text-[11px] text-gray-400 mt-0.5">开启后会请求系统通知权限，并以系统弹窗提示保活状态</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                const next = !form.enableBackgroundKeepAlive;
                set('enableBackgroundKeepAlive', next);
                if (next) {
                  if ('Notification' in window) {
                    const perm = await Notification.requestPermission();
                    if (perm === 'granted') {
                      const options: NotificationOptions = { body: 'yann语 后台保活已开启，请勿关闭此标签页。', icon: '/favicon.png', tag: 'keep-alive', requireInteraction: true };
                      if ('serviceWorker' in navigator) {
                        try {
                          const reg = await navigator.serviceWorker.ready;
                          await reg.showNotification('后台保活已开启', options);
                        } catch {
                          new Notification('后台保活已开启', options);
                        }
                      } else {
                        new Notification('后台保活已开启', options);
                      }
                    }
                  }
                }
              }}
              className={`relative w-12 h-7 rounded-full transition-colors ${form.enableBackgroundKeepAlive ? 'bg-[var(--accent-color)]' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${form.enableBackgroundKeepAlive ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </Sec>

        {/* 后台推送 */}
        <Sec title="后台推送通知">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700">接收对方消息推送</p>
              <p className="text-[11px] text-gray-400 mt-0.5">开启后，对方回复、主动发消息、发朋友圈、回信时会弹出浏览器/系统通知</p>
            </div>
            <button
              type="button"
              onClick={() => {
                set('pushEnabled', !form.pushEnabled);
                if (!form.pushEnabled && 'Notification' in window) {
                  Notification.requestPermission().then(p => {
                    if (p !== 'granted') toast.error('请开启通知权限，并将应用添加到主屏幕以获得最佳体验');
                  });
                }
              }}
              className={`relative w-12 h-7 rounded-full transition-colors ${form.pushEnabled ? 'bg-[var(--accent-color)]' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${form.pushEnabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          <button
            type="button"
            onClick={async () => {
              const ok = await testPush('SoulCard', `测试推送：你收到一条来自 ${form.nickname || '对方'} 的新消息`);
              if (ok) toast.success('已发送测试推送');
            }}
            className="mt-3 w-full h-10 rounded-xl border border-gray-200 text-sm text-gray-600 active:bg-gray-50 transition-colors"
          >
            测试推送
          </button>
        </Sec>

        {/* 一起听歌 */}
        <Sec title="一起听歌">
          <div className="space-y-3">
            {/* 开关 */}
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-gray-700">开启一起听</span>
              <Switch
                checked={form.musicEnabled !== false}
                onCheckedChange={(v: boolean) => set('musicEnabled', v)}
              />
            </div>
            {/* 关闭时提示 */}
            {form.musicEnabled === false && (
              <p className="text-[11px] text-gray-400 text-center py-2">一起听已关闭，聊天中不会显示音乐浮窗</p>
            )}
            {/* 歌单管理（仅开启时显示） */}
            {form.musicEnabled !== false && (
              <>
                <div className="space-y-2">
                  {(form.musicPlaylist || []).map(song => (
                    <div key={song.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                      <Music className="w-4 h-4 text-[var(--accent-color)] shrink-0" />
                      <span className="flex-1 min-w-0 text-sm text-gray-700 truncate">{song.name}</span>
                      <span className="text-[11px] text-gray-400 shrink-0 truncate max-w-[120px]">{song.url.includes('.mp3') ? '直链' : '外链'}</span>
                      <button type="button" onClick={() => removeSong(song.id)} className="p-1 rounded-full hover:bg-gray-200 transition-colors shrink-0">
                        <X className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    </div>
                  ))}
                  {(form.musicPlaylist || []).length === 0 && (
                    <p className="text-[11px] text-gray-300 text-center py-2">暂无歌曲，点击下方添加</p>
                  )}
                </div>
                {/* 添加歌曲 */}
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide block">添加歌曲</label>
                  <input
                    value={newSongName}
                    onChange={e => setNewSongName(e.target.value)}
                    placeholder="歌曲名，如：你是我的风景"
                    className="w-full h-9 px-3 rounded-xl bg-gray-50 text-sm text-gray-800 outline-none border border-gray-100 focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/20 transition-colors"
                  />
                  <div className="flex gap-2">
                    <input
                      value={newSongUrl}
                      onChange={e => setNewSongUrl(e.target.value)}
                      placeholder="网易云链接、歌曲ID 或 .mp3 直链"
                      className="flex-1 h-9 px-3 rounded-xl bg-gray-50 text-sm text-gray-800 outline-none border border-gray-100 focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/20 transition-colors"
                    />
                    <Button size="sm" className="h-9 rounded-xl bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white px-3" onClick={addSong}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-gray-300">支持：网易云分享链接、纯歌曲ID、.mp3 直链</p>
                </div>
              </>
            )}
          </div>
        </Sec>

        </>)}

      </div>
    </div>
  );
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4 space-y-3 bg-white shadow-sm border border-gray-100">
      <p className="text-[13px] font-semibold text-gray-500">{title}</p>
      {children}
    </div>
  );
}
function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-[11px] font-medium text-gray-400 block mb-1.5 uppercase tracking-wide">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full h-10 px-3 rounded-xl bg-gray-50 text-sm text-gray-800 outline-none border border-gray-100 focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/20 transition-colors" />
    </div>
  );
}
