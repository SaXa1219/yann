import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, ChevronRight, Download, Upload, Trash2, Mic, RefreshCw, HelpCircle } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { exportBackup, importBackup, clearAllData } from '@/services/storage';
import { dbUsedBytes } from '@/services/db';
import { toast } from 'sonner';

export default function SettingsHub() {
  const navigate = useNavigate();
  const { contact, appearance, updateAppearance } = useApp();
  const importRef = useRef<HTMLInputElement>(null);
  const isDark = appearance.darkMode;

  const handleExport = () => {
    const data = exportBackup();
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `soulcard_backup_${Date.now()}.json`;
    a.click();
    toast.success('备份已导出');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        await importBackup(ev.target?.result as string);
        toast.success('备份已恢复，即将刷新…');
        setTimeout(() => window.location.reload(), 1000);
      } catch { toast.error('备份文件无效'); }
      // 必须清空，否则同一文件再次选择不会触发 onChange
      e.target.value = '';
    };
    reader.onerror = () => {
      toast.error('读取文件失败');
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleRefreshVersion = async () => {
    toast.success('正在刷新版本…');
    try {
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map(n => caches.delete(n)));
      }
    } catch { /* ignore */ }
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
    } catch { /* ignore */ }
    setTimeout(() => window.location.reload(), 300);
  };

  return (
    <div className={`min-h-dvh ${isDark ? 'bg-[#0d0d0d]' : 'bg-[#FAFAFA]'}`}>
      {/* ── 顶栏 ── */}
      <header className={`sticky top-0 z-10 backdrop-blur-md border-b h-12 px-4 flex items-center justify-between ${isDark ? 'bg-[#1a1a1a]/90 border-gray-800' : 'bg-white/90 border-gray-100'}`}>
        <div className="flex items-center">
          <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')} className={`mr-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className={`text-[15px] font-bold tracking-tight ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>设置</h1>
        </div>
      </header>

      {/* ══ 群聊提示 ══ */}
      {contact.isGroup && (
        <div className={`mx-4 mt-3 rounded-xl border p-3 ${isDark ? 'bg-[var(--accent-color)]/10 border-[var(--accent-color)]/20' : 'bg-[var(--accent-color)]/5 border-[var(--accent-color)]/10'}`}>
          <p className="text-xs text-[var(--accent-color)]">群聊使用成员各自的字卡和设置，无需单独配置</p>
        </div>
      )}

      {/* ── 联系人设置 ── */}
      <div className={`mb-2.5 ${isDark ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
        <p className={`text-[11px] font-semibold px-4 pt-3 pb-1.5 uppercase tracking-widest ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>全局</p>
        <button onClick={() => navigate('/settings/contact?mode=main')}
          className={`w-full flex items-center gap-3.5 px-4 py-3 transition-colors ${isDark ? 'active:bg-gray-800' : 'active:bg-gray-50'}`}>
          <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <User className="w-[18px] h-[18px] text-[var(--accent-color)]" strokeWidth={1.6} />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className={`text-[14px] font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>联系人设置</p>
            <p className={`text-[12px] truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>回复时间、朋友圈、强调色、电话壁纸等全局设置</p>
          </div>
          <ChevronRight className={`w-4 h-4 shrink-0 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
        </button>
        <button onClick={() => navigate('/settings/minimax')}
          className={`w-full flex items-center gap-3.5 px-4 py-3 transition-colors ${isDark ? 'active:bg-gray-800' : 'active:bg-gray-50'}`}>
          <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <Mic className="w-[18px] h-[18px] text-[var(--accent-color)]" strokeWidth={1.6} />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className={`text-[14px] font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>MiniMax 语音</p>
            <p className={`text-[12px] truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>开启字卡语音消息与电话陪伴朗读</p>
          </div>
          <ChevronRight className={`w-4 h-4 shrink-0 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
        </button>
        <button onClick={() => navigate('/settings/features')}
          className={`w-full flex items-center gap-3.5 px-4 py-3 transition-colors ${isDark ? 'active:bg-gray-800' : 'active:bg-gray-50'}`}>
          <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <HelpCircle className="w-[18px] h-[18px] text-[var(--accent-color)]" strokeWidth={1.6} />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className={`text-[14px] font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>全部功能介绍</p>
            <p className={`text-[12px] truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>查看所有功能与使用方法</p>
          </div>
          <ChevronRight className={`w-4 h-4 shrink-0 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
        </button>
      </div>

      {/* 存储空间 */}
      <div className={`mb-2.5 ${isDark ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
        <p className={`text-[11px] font-semibold px-4 pt-3 pb-1.5 uppercase tracking-widest ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>存储</p>
        <StorageUsageBar isDark={isDark} />
      </div>

      <div className={`h-2.5 ${isDark ? 'bg-[#0d0d0d]' : 'bg-[#FAFAFA]'}`} />

      {/* 数据备份 */}
      <div className={`mb-2.5 ${isDark ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
        <p className={`text-[11px] font-semibold px-4 pt-3 pb-1.5 uppercase tracking-widest ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>数据</p>
        <button onClick={handleExport}
          className={`w-full flex items-center gap-3.5 px-4 py-3 transition-colors border-b ${isDark ? 'active:bg-gray-800 border-gray-800' : 'active:bg-gray-50 border-gray-100'}`}>
          <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <Download className="w-[18px] h-[18px] text-[var(--accent-color)]" strokeWidth={1.6} />
          </div>
          <div className="flex-1 text-left">
            <p className={`text-[14px] font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>导出备份</p>
            <p className={`text-[12px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>保存为 JSON 文件</p>
          </div>
          <ChevronRight className={`w-4 h-4 shrink-0 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
        </button>
        <label className={`flex items-center gap-3.5 px-4 py-3 cursor-pointer transition-colors ${isDark ? 'active:bg-gray-800' : 'active:bg-gray-50'}`}>
          <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <Upload className="w-[18px] h-[18px] text-[var(--accent-color)]" strokeWidth={1.6} />
          </div>
          <div className="flex-1 text-left">
            <p className={`text-[14px] font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>导入备份</p>
            <p className={`text-[12px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>从 JSON 文件恢复数据</p>
          </div>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          <ChevronRight className={`w-4 h-4 shrink-0 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
        </label>
      </div>

      {/* 刷新版本 */}
      <div className={`mb-2.5 ${isDark ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
        <p className={`text-[11px] font-semibold px-4 pt-3 pb-1.5 uppercase tracking-widest ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>版本</p>
        <button onClick={handleRefreshVersion}
          className={`w-full flex items-center gap-3.5 px-4 py-3 transition-colors border-b ${isDark ? 'active:bg-gray-800 border-gray-800' : 'active:bg-gray-50 border-gray-100'}`}>
          <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <RefreshCw className="w-[18px] h-[18px] text-[var(--accent-color)]" strokeWidth={1.6} />
          </div>
          <div className="flex-1 text-left">
            <p className={`text-[14px] font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>刷新</p>
            <p className={`text-[12px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>清除缓存并重新加载，保留设置与数据</p>
          </div>
          <ChevronRight className={`w-4 h-4 shrink-0 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
        </button>
      </div>

      {/* 清除数据 */}
      <div className={`mb-2.5 ${isDark ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
        <p className={`text-[11px] font-semibold px-4 pt-3 pb-1.5 uppercase tracking-widest ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>危险操作</p>
        <button onClick={() => {
          if (window.confirm('确定要清除所有数据吗？此操作不可恢复！')) {
            clearAllData();
            toast.success('数据已清除，即将刷新…');
            setTimeout(() => window.location.reload(), 800);
          }
        }}
          className={`w-full flex items-center gap-3.5 px-4 py-3 transition-colors ${isDark ? 'active:bg-red-500/10' : 'active:bg-red-50'}`}>
          <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <Trash2 className="w-[18px] h-[18px] text-red-400" strokeWidth={1.6} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[14px] font-semibold text-red-500">清除全部数据</p>
            <p className={`text-[12px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>删除所有聊天记录、字卡、设置等</p>
          </div>
          <ChevronRight className={`w-4 h-4 shrink-0 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
        </button>
      </div>

      <p className={`text-center text-[11px] py-8 ${isDark ? 'text-gray-700' : 'text-gray-300'}`}>yann语</p>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function StorageUsageBar({ isDark }: { isDark: boolean }) {
  const [used, setUsed] = useState(0);
  useEffect(() => {
    const update = () => setUsed(dbUsedBytes());
    update();
    const timer = setInterval(update, 3000);
    return () => clearInterval(timer);
  }, []);
  const label = formatBytes(used);
  // 以 500MB 作为进度条参考上限，IndexedDB 实际可用空间通常可达几 GB
  const MAX_REF = 500 * 1024 * 1024;
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-[13px] font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>已用存储</span>
        <span className={`text-[12px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label} / 约 500MB+</span>
      </div>
      <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
        <div
          className="h-full rounded-full bg-[var(--accent-color)] transition-all duration-500"
          style={{ width: `${Math.min((used / MAX_REF) * 100, 100)}%` }}
        />
      </div>
      <p className={`text-[11px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>使用 IndexedDB 存储，可用空间大幅提升</p>
    </div>
  );
}
