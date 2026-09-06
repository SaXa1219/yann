import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, Edit2, Calendar, Check, Clock, Heart, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type { DaysMatterEvent } from '@/types/types';

interface DaysMatterEditorProps {
  events: DaysMatterEvent[];
  onChange: (events: DaysMatterEvent[]) => void;
  formOpen?: boolean;
  onFormOpenChange?: (open: boolean) => void;
}

function diffDays(dateStr: string, mode: DaysMatterEvent['mode']) {
  const target = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const ms = target.getTime() - now.getTime();
  const days = Math.round(ms / (1000 * 60 * 60 * 24));
  if (mode === 'countdown') return days;
  return -days;
}

export default function DaysMatterEditor({ events, onChange, formOpen = false, onFormOpenChange }: DaysMatterEditorProps) {
  const [label, setLabel] = useState('');
  const [date, setDate] = useState('');
  const [mode, setMode] = useState<DaysMatterEvent['mode']>('countup');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (formOpen && !editingId) {
      // 打开弹窗且非编辑状态时重置为添加模式
      setLabel(''); setDate(''); setMode('countup');
    }
  }, [formOpen, editingId]);

  const reset = () => {
    setLabel('');
    setDate('');
    setMode('countup');
    setEditingId(null);
  };

  const add = () => {
    if (!label.trim() || !date) return;
    const event: DaysMatterEvent = {
      id: editingId || crypto.randomUUID(),
      label: label.trim(),
      date,
      mode,
    };
    if (editingId) {
      onChange(events.map(e => (e.id === editingId ? event : e)));
    } else {
      onChange([...events, event]);
    }
    reset();
    onFormOpenChange?.(false);
  };

  const edit = (e: DaysMatterEvent) => {
    setLabel(e.label);
    setDate(e.date);
    setMode(e.mode);
    setEditingId(e.id);
    onFormOpenChange?.(true);
  };

  const remove = (id: string) => {
    onChange(events.filter(e => e.id !== id));
  };

  const sorted = useMemo(() => {
    return [...events].sort((a, b) => Math.abs(diffDays(a.date, a.mode)) - Math.abs(diffDays(b.date, b.mode)));
  }, [events]);

  const nearest = sorted[0];

  return (
    <div className="space-y-5">
      {/* 最近事件 Hero 卡片 */}
      {nearest && (
        <div className="relative overflow-hidden rounded-[28px] bg-[var(--accent-color)] p-6 text-white shadow-lg">
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute right-10 bottom-0 w-16 h-16 rounded-full bg-white/10" />
          <div className="relative z-10 flex flex-col items-start">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-white/15 px-2.5 py-1 rounded-full">
              {nearest.mode === 'countup' ? <Heart className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              {nearest.mode === 'countup' ? '正数日' : '倒数日'}
            </span>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{nearest.label}</p>
            <p className="text-sm text-white/80 mt-1">{nearest.date}</p>
            <p className="mt-4 text-5xl font-bold leading-none">
              {Math.abs(diffDays(nearest.date, nearest.mode))}<span className="text-lg font-medium ml-1">天</span>
            </p>
          </div>
        </div>
      )}

      {/* 紧凑添加 / 编辑弹窗 */}
      <Dialog open={formOpen} onOpenChange={v => { if (!v) { reset(); } onFormOpenChange?.(v); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md rounded-2xl p-0">
          <DialogHeader className="px-5 pt-5 pb-2">
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--accent-color)]" />
              {editingId ? '编辑事件' : '添加事件'}
            </DialogTitle>
          </DialogHeader>
          <div className="px-5 pb-6 space-y-3">
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="如：在一起纪念日、生日"
              className="w-full h-11 px-4 rounded-xl bg-gray-50 text-sm text-gray-800 outline-none border border-gray-100 focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/20"
            />
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-gray-50 text-sm text-gray-800 outline-none border border-gray-100 focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/20"
            />
            <div className="flex gap-2">
              {(['countup', 'countdown'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 h-10 rounded-xl text-sm border transition-colors ${
                    mode === m
                      ? 'bg-[var(--accent-color)] text-white border-transparent'
                      : 'bg-gray-50 text-gray-600 border-gray-100'
                  }`}
                >
                  {m === 'countup' ? '正数日' : '倒数日'}
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                onClick={add}
                disabled={!label.trim() || !date}
                className="flex-1 h-10 rounded-xl bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white"
              >
                {editingId ? <><Check className="w-4 h-4 mr-1" /> 保存</> : <><Plus className="w-4 h-4 mr-1" /> 添加</>}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { reset(); onFormOpenChange?.(false); }}
                className="h-10 rounded-xl border-gray-200"
              >
                取消
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 时间轴事件列表 */}
      <div className="relative pl-6 space-y-5">
        {events.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
              <Flag className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">还没有事件</p>
            <p className="text-xs text-gray-400 mt-1">添加一个纪念日或倒数日吧</p>
          </div>
        )}
        {sorted.map((e, idx) => {
          const d = diffDays(e.date, e.mode);
          return (
            <div key={e.id} className="relative">
              {/* 时间轴线 */}
              {idx !== sorted.length - 1 && <div className="absolute left-[-18px] top-8 bottom-[-20px] w-px bg-gray-200" />}
              <div className="absolute left-[-22px] top-3 w-2.5 h-2.5 rounded-full bg-[var(--accent-color)] ring-4 ring-white" />
              <div className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">{e.label}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-color)]/10 text-[var(--accent-color)]">
                      {e.mode === 'countup' ? '已过' : '还剩'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> {e.date}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold text-[var(--accent-color)]">{Math.abs(d)}</p>
                  <p className="text-[10px] text-gray-400">天</p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button type="button" onClick={() => edit(e)} className="p-2 rounded-xl hover:bg-gray-50 text-gray-400"><Edit2 className="w-4 h-4" /></button>
                  <button type="button" onClick={() => remove(e.id)} className="p-2 rounded-xl hover:bg-red-50 text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
