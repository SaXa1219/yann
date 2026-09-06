import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { ArrowLeft, CheckCircle2, XCircle, Wallet } from 'lucide-react';
import { toast } from 'sonner';

export default function TransferDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { messages, updateMessage, contact, appearance } = useApp();

  const msg = messages.find(m => m.id === id);

  if (!msg || msg.type !== 'transfer') {
    return (
      <div className="min-h-dvh bg-white flex flex-col items-center justify-center text-gray-400">
        <p>转账记录不存在</p>
        <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')} className="mt-4 text-[var(--accent-color)] text-sm">返回</button>
      </div>
    );
  }

  const amount = msg.transferAmount ?? 0;
  const note = msg.transferNote || '转账';
  const status = msg.transferStatus;
  const isFromSystem = msg.sender === 'system';
  const timeStr = new Date(msg.timestamp).toLocaleString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  const handleAccept = () => {
    updateMessage(msg.id, { transferStatus: 'accepted' });
    toast.success('已收款');
    setTimeout(() => window.history.length > 1 ? navigate(-1) : navigate('/'), 400);
  };

  const handleReject = () => {
    updateMessage(msg.id, { transferStatus: 'rejected' });
    toast('已退还');
    setTimeout(() => window.history.length > 1 ? navigate(-1) : navigate('/'), 400);
  };

  const accent = appearance.transferColor || 'var(--accent-color)';

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#F7F8FA' }}>
      {/* 顶部栏 */}
      <header className="h-12 flex items-center px-4" style={{ background: '#F7F8FA' }}>
        <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')} className="text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="flex-1 text-center text-[15px] font-semibold text-gray-800 pr-8">转账详情</h1>
      </header>

      {/* 主体 */}
      <div className="flex-1 flex flex-col items-center px-6 pt-10">
        {/* 状态图标 */}
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5 shadow-sm"
          style={{ background: status === 'pending' ? accent + '15' : status === 'accepted' ? '#07c16015' : '#f2f3f5' }}>
          {status === 'pending' ? (
            <Wallet className="w-8 h-8" style={{ color: accent }} />
          ) : status === 'accepted' ? (
            <CheckCircle2 className="w-8 h-8 text-[#07c160]" />
          ) : (
            <XCircle className="w-8 h-8 text-gray-400" />
          )}
        </div>

        <p className="text-[15px] text-gray-500 mb-2">
          {status === 'pending' ? (isFromSystem ? '待你收款' : '待对方收款')
            : status === 'accepted' ? '已收款'
            : '已退还'}
        </p>

        <p className="text-[36px] font-bold tracking-tight mb-2" style={{ color: '#1a1a1a' }}>
          <span className="text-[20px] font-semibold mr-1">¥</span>{amount.toFixed(2)}
        </p>

        <p className="text-[13px] text-gray-400 mb-10">{note}</p>

        {/* 信息卡片 */}
        <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-sm space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">转账说明</span>
            <span className="text-gray-800 font-medium">{note}</span>
          </div>
          <div className="h-px bg-gray-100" />
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">转账时间</span>
            <span className="text-gray-800">{timeStr}</span>
          </div>
          <div className="h-px bg-gray-100" />
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">转账状态</span>
            <span className="font-medium" style={{ color: status === 'accepted' ? '#07c160' : status === 'rejected' ? '#999' : accent }}>
              {status === 'pending' ? '待收款' : status === 'accepted' ? '已收款' : '已退还'}
            </span>
          </div>
        </div>

        {/* 操作按钮 */}
        {status === 'pending' && isFromSystem ? (
          <div className="w-full max-w-sm flex flex-col items-center gap-3 mt-10">
            <button
              onClick={handleAccept}
              className="w-full h-12 rounded-full text-white text-base font-semibold active:opacity-80 transition-opacity shadow-sm sc-transfer-btn"
              style={{ background: accent }}
            >
              确认收款
            </button>
            <button
              onClick={handleReject}
              className="text-gray-400 text-sm font-medium active:opacity-60 h-10"
            >
              退还转账
            </button>
          </div>
        ) : (
          <div className="w-full max-w-sm mt-10">
            <button
              disabled
              className="w-full h-12 rounded-full text-gray-400 text-base font-semibold bg-gray-200"
            >
              {status === 'accepted' ? '已收款' : '已退还'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
