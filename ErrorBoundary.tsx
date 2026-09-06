import React from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; error?: Error; }

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] 捕获到错误:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    if (confirm('确定要清除所有本地数据吗？此操作不可恢复。')) {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('soulcard_')) localStorage.removeItem(k);
      });
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh w-full flex flex-col items-center justify-center bg-gray-50 px-6 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">出错了</h1>
          <p className="text-sm text-gray-500 mb-6 max-w-xs leading-relaxed">
            应用遇到了意外问题。您可以尝试刷新页面，或者清除数据后重新开始。
          </p>
          {this.state.error && (
            <pre className="text-[11px] text-gray-400 bg-gray-100 rounded-lg px-3 py-2 mb-6 max-w-xs break-all text-left">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-3">
            <button
              onClick={this.handleReload}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#07c160] text-white rounded-full text-sm font-medium active:opacity-80 transition-opacity"
            >
              <RotateCcw className="w-4 h-4" />
              刷新页面
            </button>
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-full text-sm font-medium active:opacity-80 transition-opacity"
            >
              清除数据
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
