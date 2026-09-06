import React, { useState, useRef } from 'react';
import { generateId } from '@/utils/id';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Trash2, Play, Pause, Mic, FileText, Loader2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import type { VoiceCard } from '@/types/types';
import { toast } from 'sonner';
import { transcribeVoice } from '@/utils/speech';

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function VoiceCardPage() {
  const navigate = useNavigate();
  const { voiceCards, addVoiceCard, deleteVoiceCard, updateVoiceCard } = useApp();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [transcribingId, setTranscribingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleTranscribe = async (vc: VoiceCard) => {
    if (transcribingId) return;
    setTranscribingId(vc.id);
    try {
      const text = await transcribeVoice(vc.data);
      if (text) {
        updateVoiceCard(vc.id, { transcript: text });
        toast.success('已识别');
      } else {
        toast.error('未识别到内容，请检查语音是否清晰');
      }
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.includes('3301')) toast.error('语音质量过差，请重新录制或更换更清晰的音频');
      else if (msg.includes('3308')) toast.error('语音过长，仅支持 60 秒以内');
      else toast.error('语音识别失败，请重试');
    } finally {
      setTranscribingId(null);
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    let successCount = 0;
    let failCount = 0;

    files.forEach(file => {
      const isAudio = file.type.startsWith('audio/');
      const isVideo = file.type.startsWith('video/');
      if (!isAudio && !isVideo) { toast.error(`${file.name} 不是音频或视频文件`); failCount++; return; }
      const maxSize = isVideo ? 8 * 1024 * 1024 : 30 * 1024 * 1024;
      if (file.size > maxSize) { toast.error(`${file.name} 超过${isVideo ? '8' : '30'}MB`); failCount++; return; }

      const reader = new FileReader();
      reader.onerror = () => { toast.error(`${file.name} 读取失败`); failCount++; };
      reader.onload = ev => {
        const data = ev.target?.result as string;
        if (!data) { toast.error(`${file.name} 读取结果为空`); failCount++; return; }

        if (isVideo) {
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.src = data;
          let resolved = false;
          const timer = setTimeout(() => {
            if (!resolved) { toast.error(`${file.name} 视频解析超时，格式可能不支持`); failCount++; video.src = ''; }
          }, 8000);
          video.onloadedmetadata = () => {
            clearTimeout(timer); resolved = true;
            const vc: VoiceCard = {
              id: generateId(),
              name: file.name.replace(/\.[^.]+$/, ''),
              data,
              duration: Math.round(video.duration || 0),
              createdAt: Date.now(),
            };
            addVoiceCard(vc);
            successCount++;
            toast.success(`已导入语音：${vc.name}`);
          };
          video.onerror = () => { clearTimeout(timer); resolved = true; toast.error(`${file.name} 视频解析失败`); failCount++; };
        } else {
          const audio = new Audio(data);
          let resolved = false;
          const timer = setTimeout(() => {
            if (!resolved) { toast.error(`${file.name} 音频解析超时，格式可能不支持`); failCount++; audio.src = ''; }
          }, 8000);
          audio.onloadedmetadata = () => {
            clearTimeout(timer); resolved = true;
            const vc: VoiceCard = {
              id: generateId(),
              name: file.name.replace(/\.[^.]+$/, ''),
              data,
              duration: Math.round(audio.duration || 0),
              createdAt: Date.now(),
            };
            addVoiceCard(vc);
            successCount++;
            toast.success(`已导入语音：${vc.name}`);
          };
          audio.onerror = () => { clearTimeout(timer); resolved = true; toast.error(`${file.name} 音频解析失败`); failCount++; };
        }
      };
      reader.readAsDataURL(file);
    });
    if (files.length > 0) toast.info(`正在导入 ${files.length} 条语音…`);
    e.target.value = '';
  };

  const togglePlay = (vc: VoiceCard) => {
    if (playingId === vc.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) { audioRef.current.pause(); }
    const a = new Audio(vc.data);
    audioRef.current = a;
    a.play();
    setPlayingId(vc.id);
    a.onended = () => setPlayingId(null);
  };

  return (
    <div className="min-h-dvh bg-[#FAFAFA]">
      <header className="sticky top-0 z-10 px-4 h-12 flex items-center gap-2 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <Button variant="ghost" size="icon" className="h-9 w-9 -ml-1" onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}>
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Button>
        <h1 className="text-[15px] font-bold text-gray-900">语音字卡</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* 导入 */}
        <label className="flex items-center gap-4 rounded-2xl p-4 bg-white shadow-sm border border-gray-100 cursor-pointer active:bg-gray-50 transition-colors">
          <div className="w-11 h-11 rounded-[10px] bg-[#FFF0F7] flex items-center justify-center shrink-0">
            <Upload className="w-5 h-5 text-[var(--accent-color)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-gray-900">导入语音文件</p>
            <p className="text-[12px] text-gray-400 mt-0.5">支持 MP3、WAV、M4A、MP4 等，可多选，每条 ≤30MB</p>
          </div>
          <input type="file" accept="audio/*,video/*" multiple className="hidden" onChange={handleUpload} />
        </label>

        <p className="text-[12px] px-1 text-gray-400">共 {voiceCards.length} 条语音字卡 · 对方回复时选一条</p>

        {voiceCards.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
              <Mic className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-[13px] text-gray-300">暂无语音字卡，点上方导入</p>
          </div>
        ) : (
          <div className="space-y-2">
            {voiceCards.map(vc => (
              <div key={vc.id} className="rounded-2xl px-4 py-3 bg-white shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => togglePlay(vc)}
                    className="w-10 h-10 rounded-[10px] bg-[#FFF0F7] flex items-center justify-center shrink-0">
                    {playingId === vc.id
                      ? <Pause className="w-4 h-4 text-[var(--accent-color)]" />
                      : <Play className="w-4 h-4 text-[var(--accent-color)]" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-gray-800 truncate">{vc.name}</p>
                    <p className="text-[12px] text-gray-400">{formatDuration(vc.duration)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 shrink-0 text-[var(--accent-color)] hover:bg-[#FFF0F7]"
                    disabled={!!transcribingId}
                    onClick={() => handleTranscribe(vc)}
                  >
                    {transcribingId === vc.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <FileText className="w-4 h-4" />}
                    <span className="ml-1 text-[12px]">转文字</span>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                    onClick={() => { deleteVoiceCard(vc.id); toast.success('已删除'); }}>
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </div>
                {vc.transcript && (
                  <div className="mt-2 rounded-xl bg-[#FFF6FB] border border-[#FFE3F0] px-3 py-2">
                    <p className="text-[13px] text-gray-700 leading-relaxed break-words">{vc.transcript}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
