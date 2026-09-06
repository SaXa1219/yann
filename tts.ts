import { toast } from 'sonner';
import type { MiniMaxSettings } from '@/types/types';

export interface GenerateSpeechResult {
  audioUrl: string;
  audioLength: number; // 毫秒
}

export interface GenerateSpeechOptions {
  text: string;
  voiceId?: string;
  apiKey?: string;
  groupId?: string;
  speed?: number;
}

export async function generateSpeech(options: GenerateSpeechOptions): Promise<GenerateSpeechResult>;
export async function generateSpeech(text: string, voiceId?: string): Promise<GenerateSpeechResult>;
export async function generateSpeech(
  optionsOrText: GenerateSpeechOptions | string,
  maybeVoiceId?: string,
): Promise<GenerateSpeechResult> {
  const opts: GenerateSpeechOptions = typeof optionsOrText === 'string'
    ? { text: optionsOrText, voiceId: maybeVoiceId }
    : optionsOrText;
  const { text, voiceId = 'male-qn-qingse', apiKey = '', groupId = '', speed = 1 } = opts;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error('未配置 Supabase 环境变量，无法调用语音合成');
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/tts-minimax`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ text: text.trim(), voice_id: voiceId, api_key: apiKey, group_id: groupId, speed }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `语音合成失败 (${res.status})`);
  }

  const data = (await res.json()) as Partial<GenerateSpeechResult>;
  if (!data.audioUrl) {
    throw new Error('语音合成未返回音频地址');
  }

  return { audioUrl: data.audioUrl, audioLength: data.audioLength ?? 0 };
}

export function getGenerateSpeechOptions(settings: MiniMaxSettings, voiceId?: string): Omit<GenerateSpeechOptions, 'text'> {
  return {
    voiceId: voiceId ?? settings.voiceId,
    apiKey: settings.apiKey,
    groupId: settings.groupId,
    speed: settings.speed,
  };
}

export function playAudio(url: string): { audio: HTMLAudioElement; promise: Promise<void> } {
  const audio = new Audio(url);
  let rejectPromise: (reason?: Error) => void = () => {};
  const promise = new Promise<void>((resolve, reject) => {
    rejectPromise = reject;
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error('音频播放失败'));
  });
  audio.play().catch(err => {
    toast.error('当前浏览器阻止了自动播放，请点击播放按钮');
    rejectPromise(err instanceof Error ? err : new Error(String(err)));
  });
  return { audio, promise };
}
