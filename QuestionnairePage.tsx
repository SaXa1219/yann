import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { generateId } from '@/utils/id';
import { ArrowLeft, Plus, Trash2, Send, HelpCircle, ChevronRight, X, MessageSquare } from 'lucide-react';
import type { QuestionnaireItem, Question } from '@/types/types';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

function QuestionCard({
  index, question, onChange, onDelete, canDelete
}: {
  index: number;
  question: Question;
  onChange: (q: Question) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const updateOption = (optIdx: number, val: string) => {
    const next = [...question.options];
    next[optIdx] = val;
    onChange({ ...question, options: next });
  };
  const addOption = () => {
    onChange({ ...question, options: [...question.options, ''] });
  };
  const removeOption = (optIdx: number) => {
    if (question.options.length <= 2) { toast.error('至少需要2个选项'); return; }
    onChange({ ...question, options: question.options.filter((_, i) => i !== optIdx) });
  };
  const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const mode = question.type || 'choice';
  const setMode = (type: 'choice' | 'multi' | 'text') => {
    onChange({ ...question, type, options: type === 'text' ? [] : (question.options.length >= 2 ? question.options : ['', '']) });
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      <div className="flex items-start gap-2 mb-3">
        <span className="text-sm font-semibold text-[var(--accent-color)] shrink-0 mt-2">{index + 1}.</span>
        <div className="flex-1 min-w-0">
          <textarea
            value={question.text}
            onChange={e => onChange({ ...question, text: e.target.value })}
            placeholder={mode === 'text' ? '输入想问对方的问题…' : '输入问题…'}
            rows={2}
            className="w-full resize-none text-sm text-gray-800 outline-none bg-transparent placeholder:text-gray-300"
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => setMode('choice')}
              className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${mode === 'choice' ? 'bg-[var(--accent-color)] text-white' : 'bg-gray-100 text-gray-500 hover:text-[var(--accent-color)]'}`}
            >单选</button>
            <button
              onClick={() => setMode('multi')}
              className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${mode === 'multi' ? 'bg-[var(--accent-color)] text-white' : 'bg-gray-100 text-gray-500 hover:text-[var(--accent-color)]'}`}
            >多选</button>
            <button
              onClick={() => setMode('text')}
              className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${mode === 'text' ? 'bg-[var(--accent-color)] text-white' : 'bg-gray-100 text-gray-500 hover:text-[var(--accent-color)]'}`}
            >问字卡</button>
          </div>
        </div>
        {canDelete && (
          <button onClick={onDelete} className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {mode === 'text' ? (
        <div className="pl-5 text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" />
          对面将回答你
        </div>
      ) : (
        <div className="space-y-2 pl-5">
          {question.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-400 w-5">{labels[i]}</span>
              <input
                value={opt}
                onChange={e => updateOption(i, e.target.value)}
                placeholder={`选项 ${labels[i]}`}
                className="flex-1 h-9 px-3 rounded-lg bg-gray-50 text-sm text-gray-800 outline-none border border-gray-100 focus:border-[var(--accent-color)] transition-colors placeholder:text-gray-300"
              />
              {question.options.length > 2 && (
                <button onClick={() => removeOption(i)} className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addOption}
            className="flex items-center gap-1 text-xs text-[var(--accent-color)] hover:text-[var(--accent-hover)] transition-colors mt-1"
          >
            <Plus className="w-3.5 h-3.5" />添加选项
          </button>
        </div>
      )}
    </div>
  );
}

const DRAFT_KEY = 'questionnaire_draft';

export default function QuestionnairePage() {
  const navigate = useNavigate();
  const { questionnaires, addQuestionnaire, deleteQuestionnaire, sendQuestionnaire } = useApp();
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('测一测');
  const [questions, setQuestions] = useState<Question[]>([
    { id: generateId(), text: '', options: ['', ''] },
  ]);

  // 进入创建时自动恢复草稿；已发送的残留草稿直接清除，避免刷新后回到输入界面
  useEffect(() => {
    if (!isCreating) return;
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    try {
      const d = JSON.parse(saved);
      if (d.sentAt) { localStorage.removeItem(DRAFT_KEY); return; }
      if (typeof d.title === 'string') setTitle(d.title);
      if (Array.isArray(d.questions)) setQuestions(d.questions);
    } catch { /* ignore */ }
  }, [isCreating]);

  // 首次挂载：若存在未发送的草稿，自动进入创建视图，避免刷新后内容丢失
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    try {
      const d = JSON.parse(saved);
      if (d.sentAt) { localStorage.removeItem(DRAFT_KEY); return; }
      if (Array.isArray(d.questions) && d.questions.some((q: Question) => q.text?.trim())) {
        setIsCreating(true);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (isCreating) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, questions }));
    }
  }, [isCreating, title, questions]);

  const updateQuestion = (idx: number, q: Question) => {
    setQuestions(prev => prev.map((item, i) => i === idx ? q : item));
  };
  const addQuestion = () => {
    setQuestions(prev => [...prev, { id: generateId(), text: '', options: ['', ''] }]);
  };
  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) { toast.error('至少需要1道题'); return; }
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSend = () => {
    const validQuestions = questions.filter(q => {
      if (!q.text.trim()) return false;
      if (q.type === 'text') return true;
      return q.options.every(o => o.trim());
    });
    if (validQuestions.length === 0) { toast.error('请至少填写一道完整的问题'); return; }
    if (!title.trim()) { toast.error('请输入问卷标题'); return; }
    const q: QuestionnaireItem = {
      id: generateId(),
      title: title.trim(),
      questions: validQuestions.map(vq => ({ ...vq, text: vq.text.trim(), options: vq.options.map(o => o.trim()) })),
      sentAt: Date.now(),
    };
    // 先标记草稿为已发送并持久化：即使中途刷新，问卷也已保存，不会回到输入界面
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, questions, sentAt: Date.now() }));
    sendQuestionnaire(q);
    localStorage.removeItem(DRAFT_KEY);
    toast.success('对面正在填写中…');
    setIsCreating(false);
    setTitle('测一测');
    setQuestions([{ id: generateId(), text: '', options: ['', ''] }]);
  };

  const handleDelete = (id: string) => {
    if (!confirm('确定删除这份问卷吗？')) return;
    deleteQuestionnaire(id);
    toast.success('已删除');
  };

  // 详情弹窗
  const [detailItem, setDetailItem] = useState<QuestionnaireItem | null>(null);

  return (
    <div className="flex flex-col min-h-dvh bg-gray-50">
      {/* Header */}
      <header className="shrink-0 h-14 px-4 flex items-center bg-white border-b border-gray-100 z-10">
        <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="flex-1 text-center text-base font-medium text-gray-800 pr-9">测一测</h1>
      </header>

      {/* 创建问卷 */}
      {isCreating ? (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide block mb-1.5">问卷标题</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="测一测"
              className="w-full h-10 px-3 rounded-xl bg-gray-50 text-sm text-gray-800 outline-none border border-gray-100 focus:border-[var(--accent-color)] transition-colors"
            />
          </div>

          {questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              index={i}
              question={q}
              onChange={nq => updateQuestion(i, nq)}
              onDelete={() => removeQuestion(i)}
              canDelete={questions.length > 1}
            />
          ))}

          <button
            onClick={addQuestion}
            className="w-full h-11 rounded-xl border border-dashed border-gray-200 flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-[var(--accent-color)] hover:border-[var(--accent-color)]/30 transition-colors"
          >
            <Plus className="w-4 h-4" />添加一题
          </button>

          <div className="flex gap-2 pt-2">
            <Button variant="ghost" className="flex-1 h-11 rounded-xl text-gray-500" onClick={() => setIsCreating(false)}>
              取消
            </Button>
            <Button className="flex-1 h-11 rounded-xl bg-[var(--accent-color)] text-white hover:bg-[var(--accent-hover)]" onClick={handleSend}>
              <Send className="w-4 h-4 mr-1.5" />邀请对方回答
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* 新建按钮 */}
          <button
            onClick={() => setIsCreating(true)}
            className="w-full h-14 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center gap-2 text-sm font-medium text-[var(--accent-color)] hover:bg-gray-50 transition-colors mb-4"
          >
            <Plus className="w-5 h-5" />
            新建问卷
          </button>

          {/* 问卷列表 */}
          {questionnaires.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-24 gap-3 text-gray-300">
              <HelpCircle className="w-12 h-12" />
              <p className="text-sm">还没有问卷，点击上方新建吧</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-400 mb-2">历史问卷</p>
              {questionnaires.slice().reverse().map(item => (
                <button
                  key={item.id}
                  onClick={() => setDetailItem(item)}
                  className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-start gap-3 active:scale-[0.99] transition-transform"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 leading-relaxed break-words">{item.title}</p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {item.questions.length} 道题{item.answers ? ' · 已回答' : ' · 待回答'}
                    </p>
                    {item.answers && (
                      <div className="mt-2 space-y-1">
                        {item.questions.map((q, i) => {
                          const ans = item.answers?.find(a => a.questionId === q.id);
                          const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
                          const selected = ans?.optionIndex !== undefined ? (Array.isArray(ans.optionIndex) ? ans.optionIndex : [ans.optionIndex]) : [];
                          const text =
                            q.type === 'text'
                              ? (ans?.text || '未回答')
                              : selected.length
                                ? selected.map((idx, k) => `${labels[idx]}. ${q.options[idx]}`).join('； ')
                                : '未回答';
                          return (
                            <p key={q.id} className="text-[11px] text-gray-500">
                              {i + 1}. {q.text}
                              <span className="text-[var(--accent-color)] font-medium ml-1">{text}</span>
                            </p>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(item.id); }}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors shrink-0 mt-0.5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 详情弹窗 */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setDetailItem(null)}>
          <div className="bg-white rounded-3xl max-w-sm w-full max-h-[80vh] overflow-y-auto p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-800">{detailItem.title}</h3>
              <button onClick={() => setDetailItem(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              {detailItem.questions.map((q, i) => {
                const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
                const ans = detailItem.answers?.find(a => a.questionId === q.id);
                const selected = ans?.optionIndex !== undefined ? (Array.isArray(ans.optionIndex) ? ans.optionIndex : [ans.optionIndex]) : [];
                const isMulti = q.type === 'multi';
                return (
                  <div key={q.id} className="bg-gray-50 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm font-medium text-gray-800">{i + 1}. {q.text}</p>
                      {isMulti && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-color)]/10 text-[var(--accent-color)] shrink-0">多选</span>}
                    </div>
                    {q.type === 'text' ? (
                      <div className="text-xs flex items-center gap-1.5 text-[var(--accent-color)] font-semibold">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {ans?.text ? `字卡：${ans.text}` : '等待对方用字卡回答'}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {q.options.map((opt, j) => (
                          <div key={j} className={`text-xs flex items-center gap-1.5 ${
                            selected.includes(j) ? 'text-[var(--accent-color)] font-semibold' : 'text-gray-400'
                          }`}>
                            <span className={`w-4 h-4 ${isMulti ? 'rounded' : 'rounded-full'} flex items-center justify-center text-[9px] shrink-0 ${
                              selected.includes(j) ? 'bg-[var(--accent-color)] text-white' : 'bg-gray-200 text-gray-500'
                            }`}>{labels[j]}</span>
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-5 flex items-center justify-center gap-1 text-xs text-gray-400">
              <HelpCircle className="w-3.5 h-3.5" />
              {detailItem.answers ? '对方已回答' : '等待对方回答…'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
