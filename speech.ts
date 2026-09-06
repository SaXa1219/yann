import { supabase } from '@/db/supabase';

/**
 * 将音频 data URL（任意浏览器可解码格式：webm/m4a/mp3/wav 等）
 * 解码并重采样为 16kHz 单声道 16bit PCM WAV，返回 ArrayBuffer。
 */
async function dataUrlToWav(dataUrl: string): Promise<ArrayBuffer> {
  const res = await fetch(dataUrl);
  const raw = await res.arrayBuffer();

  const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
  const audioCtx = new AudioCtx({ sampleRate: 16000 });
  try {
    const audioBuffer = await audioCtx.decodeAudioData(raw.slice(0));
    const pcm = audioBuffer.getChannelData(0);

    const wav = new ArrayBuffer(44 + pcm.length * 2);
    const v = new DataView(wav);
    const w = (o: number, s: string) => {
      for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
    };
    w(0, 'RIFF');
    v.setUint32(4, 36 + pcm.length * 2, true);
    w(8, 'WAVE');
    w(12, 'fmt ');
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, 1, true);
    v.setUint32(24, 16000, true);
    v.setUint32(28, 32000, true);
    v.setUint16(32, 2, true);
    v.setUint16(34, 16, true);
    w(36, 'data');
    v.setUint32(40, pcm.length * 2, true);
    for (let i = 0; i < pcm.length; i++) {
      const s = Math.max(-1, Math.min(1, pcm[i]));
      v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return wav;
  } finally {
    await audioCtx.close();
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

/**
 * 将语音字卡的 data URL 转为文字。
 * @returns 识别出的文字；失败时抛出 Error。
 */
export async function transcribeVoice(dataUrl: string): Promise<string> {
  const wav = await dataUrlToWav(dataUrl);
  const speech = arrayBufferToBase64(wav);
  const len = wav.byteLength;

  const { data, error } = await supabase.functions.invoke('short-speech-recognition', {
    body: { speech, len, format: 'wav', rate: 16000, cuid: 'yann-web-user' },
    method: 'POST',
  });

  if (error) {
    const msg = await error?.context?.text?.();
    throw new Error(msg || error.message || '语音识别服务调用失败');
  }
  if (!data || data.err_no !== 0) {
    const errMsg = data?.err_msg || '语音识别失败';
    throw new Error(errMsg);
  }
  const result = Array.isArray(data.result) ? data.result[0] : '';
  return result ?? '';
}