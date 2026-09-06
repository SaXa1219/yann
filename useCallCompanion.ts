import { useCallback, useEffect, useRef, useState } from 'react';
import { getCards } from '@/services/storage';
import { generateSpeech } from '@/services/tts';
import { generateId } from '@/utils/id';
import { toast } from 'sonner';

const SILENCE_AFTER_SPEECH_MS = 500;
const TYPING_DELAY_MS = 500;
const CARD_FADE_MS = 1100;
const CARD_HOLD_MS = 2600;
const CARD_BLANK_MS = 450;
const VOLUME_THRESHOLD = 6;

interface ReplyMsg {
  id: string;
  content: string;
}

type CardAnim = 'entering' | 'visible' | 'exiting' | 'blank';

export interface CompanionBubble {
  id: string;
  content: string;
}

export function useCallCompanion(
  contactId: string,
  active: boolean,
  ttsEnabled = false,
  voiceId = 'male-qn-qingse',
  ttsApiKey = '',
  ttsGroupId = '',
  ttsSpeed = 1,
) {
  const [isListening, setIsListening] = useState(false);
  const [current, setCurrent] = useState<ReplyMsg | null>(null);
  const [anim, setAnim] = useState<CardAnim>('blank');
  const [typing, setTyping] = useState(false);
  const [bubbles, setBubbles] = useState<CompanionBubble[]>([]);

  const isListeningRef = useRef(false);
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const hasSpokenRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const processingRef = useRef(false);
  const queueRef = useRef<ReplyMsg[]>([]);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const showNextRef = useRef<() => void>(() => {});

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(id => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const stop = useCallback(() => {
    clearTimers();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    try { audioCtxRef.current?.close(); } catch { /* noop */ }
    audioCtxRef.current = null;
    analyserRef.current = null;
    setIsListening(false);
    setTyping(false);
    setCurrent(null);
    setAnim('blank');
    setBubbles([]);
    processingRef.current = false;
    queueRef.current = [];
    silenceStartRef.current = null;
    hasSpokenRef.current = false;
    ttsAudioRef.current?.pause();
    ttsAudioRef.current = null;
  }, [clearTimers]);

  useEffect(() => {
    return () => { stop(); };
  }, [stop]);

  const pickCards = useCallback((count: number) => {
    const pool = getCards(contactId).filter(c => !c.blocked);
    if (pool.length === 0) return [];
    return [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length));
  }, [contactId]);

  const generateReplies = useCallback((): ReplyMsg[] => {
    const pool = pickCards(20);
    if (pool.length === 0) {
      toast.error('请先添加字卡内容');
      return [];
    }
    const total = 1 + Math.floor(Math.random() * 3);
    const replies: ReplyMsg[] = [];
    for (let i = 0; i < total; i++) {
      const combine = pool.length >= 2 && Math.random() < 0.2;
      if (combine) {
        const count = Math.min(2 + Math.floor(Math.random() * 2), pool.length);
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        const picked = shuffled.slice(0, count);
        replies.push({ id: generateId(), content: picked.map(c => c.content).join('，') });
      } else {
        const card = pool[Math.floor(Math.random() * pool.length)];
        replies.push({ id: generateId(), content: card.content });
      }
    }
    return replies;
  }, [pickCards]);

  const removeBubble = useCallback((id: string) => {
    setBubbles(prev => prev.filter(b => b.id !== id));
  }, []);

  const showNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      processingRef.current = false;
      setTyping(false);
      setAnim('blank');
      return;
    }
    const [next, ...rest] = queueRef.current;
    queueRef.current = rest;
    setCurrent(next);
    setAnim('entering');
    setBubbles(prev => [...prev, { id: next.id, content: next.content }]);

    const visibleId = window.setTimeout(() => {
      setAnim('visible');
      if (ttsEnabled) {
        // TTS 模式：朗读完成后才进入下一张
        generateSpeech({ text: next.content, voiceId, apiKey: ttsApiKey, groupId: ttsGroupId, speed: ttsSpeed }).then(({ audioUrl }) => {
          if (!processingRef.current) return; // 已被挂断则忽略
          const audio = new Audio(audioUrl);
          ttsAudioRef.current = audio;
          const advance = () => scheduleAdvance(next);
          audio.onended = advance;
          audio.onerror = advance;
          audio.play().catch(advance);
        }).catch(() => {
          // 合成失败时按默认停留时间兜底
          scheduleAdvance(next);
        });
      }
    }, 60);
    timersRef.current.push(visibleId);

    if (!ttsEnabled) {
      scheduleAdvance(next);
    }
  }, [removeBubble, ttsEnabled, voiceId]);

  const scheduleAdvance = useCallback((next: ReplyMsg) => {
    const exitId = window.setTimeout(() => setAnim('exiting'), CARD_FADE_MS + CARD_HOLD_MS);
    const blankId = window.setTimeout(() => {
      setCurrent(null);
      setAnim('blank');
    }, CARD_FADE_MS + CARD_HOLD_MS + CARD_FADE_MS);
    const removeBubbleId = window.setTimeout(() => removeBubble(next.id), CARD_FADE_MS + CARD_HOLD_MS + CARD_FADE_MS + CARD_BLANK_MS);
    const nextId = window.setTimeout(() => showNextRef.current?.(), CARD_FADE_MS + CARD_HOLD_MS + CARD_FADE_MS + CARD_BLANK_MS);
    timersRef.current.push(exitId, blankId, removeBubbleId, nextId);
  }, [removeBubble]);

  useEffect(() => { showNextRef.current = showNext; }, [showNext]);

  const onSpeechEnd = useCallback(() => {
    if (processingRef.current) return;
    processingRef.current = true;
    setTyping(true);
    const id = window.setTimeout(() => {
      const items = generateReplies();
      if (items.length === 0) {
        setTyping(false);
        processingRef.current = false;
        return;
      }
      queueRef.current = items;
      showNext();
    }, TYPING_DELAY_MS);
    timersRef.current.push(id);
  }, [generateReplies, showNext]);

  const startDetection = useCallback(() => {
    if (!streamRef.current || rafRef.current) return;
    silenceStartRef.current = null;
    hasSpokenRef.current = false;

    const detect = () => {
      if (!isListeningRef.current || !analyserRef.current) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += Math.abs(data[i] - 128);
      const avg = sum / data.length;
      const now = performance.now();

      if (avg > VOLUME_THRESHOLD) {
        silenceStartRef.current = null;
        if (!hasSpokenRef.current) hasSpokenRef.current = true;
      } else if (hasSpokenRef.current) {
        if (!silenceStartRef.current) {
          silenceStartRef.current = now;
        } else {
          const elapsed = now - silenceStartRef.current;
          if (elapsed >= SILENCE_AFTER_SPEECH_MS) {
            hasSpokenRef.current = false;
            silenceStartRef.current = null;
            onSpeechEnd();
          }
        }
      }
      rafRef.current = requestAnimationFrame(detect);
    };
    rafRef.current = requestAnimationFrame(detect);
  }, [onSpeechEnd]);

  const start = useCallback(async () => {
    if (isListeningRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      analyserRef.current = analyser;
      setIsListening(true);
      startDetection();
    } catch {
      toast.error('无法使用麦克风，请检查权限');
    }
  }, [startDetection]);

  useEffect(() => {
    if (active && !isListeningRef.current) {
      start();
    } else if (!active && isListeningRef.current) {
      stop();
    }
  }, [active, start, stop]);

  return { isListening, current, anim, typing, bubbles, start, stop };
}
